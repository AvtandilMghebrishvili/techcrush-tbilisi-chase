const KEY = "techcrush-garage-key-v1",
  OUTBOX = "techcrush-garage-outbox-v1",
  LEGACY_OWNER = "techcrush-garage-outbox-owner-v1";
export class ProfileClient {
  constructor() {
    this.profile = null;
    this.version = 0;
    this.pending = null;
    this.busy = false;
    this.gameId = null;
    this.onchange = () => {};
  }
  async request(path, method = "GET", body, token = this.token) {
    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(
        data.error || "Garage unavailable. Please retry.",
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }
  serverNow() {
    return Date.now() + (this.clockOffset || 0);
  }
  accept(data) {
    if (Number.isFinite(data.serverTime))
      this.clockOffset = data.serverTime - Date.now();
    this.preview = !!data.preview;
    this.profile = data.profile;
    this.version = data.version;
    this.driver = data.driver || this.driver;
    if (Object.hasOwn(data, "publicId")) this.publicId = data.publicId;
    if (Object.hasOwn(data, "gameId")) this.gameId = data.gameId;
    this.onchange();
  }
  async init() {
    this.token = localStorage.getItem(KEY);
    if (!/^[a-f0-9]{64}$/.test(this.token || "")) {
      this.token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
        v.toString(16).padStart(2, "0"),
      ).join("");
      localStorage.setItem(KEY, this.token);
    }
    // Older open game tabs still use one outbox. Remember their owner before
    // this browser can switch identities, so their pending run is never reassigned.
    if (!localStorage.getItem(LEGACY_OWNER))
      localStorage.setItem(LEGACY_OWNER, this.token);
    this.accept(await this.request("/api/profile", "POST"));
    try {
      const legacy = localStorage.getItem(OUTBOX);
      const legacyBox = OUTBOX + ":" + localStorage.getItem(LEGACY_OWNER);
      if (legacy && !localStorage.getItem(legacyBox))
        localStorage.setItem(legacyBox, legacy);
      localStorage.removeItem(OUTBOX);
      this.pending = JSON.parse(localStorage.getItem(this.outboxKey) || "null");
    } catch {
      localStorage.removeItem(this.outboxKey);
    }
    if (this.pending)
      try {
        await this.retry();
      } catch (error) {
        this.lastError = error.message;
      }
  }
  get outboxKey() {
    return OUTBOX + ":" + this.token;
  }
  assertCurrentProfile() {
    if (localStorage.getItem(KEY) !== this.token)
      throw Error(
        "The profile changed in another tab. Reload this page before continuing.",
      );
  }
  async restoreGameId(gameId, beforeSwitch) {
    this.assertCurrentProfile();
    if (this.busy || this.pending)
      throw Error("Finish the pending save before opening another profile.");
    this.busy = true;
    this.onchange();
    let token;
    try {
      ({ token } = await this.request("/api/game-id/restore", "POST", {
        gameId,
      }));
      if (!/^[a-f0-9]{64}$/.test(token || ""))
        throw Error("Invalid profile response. Try again.");
      this.assertCurrentProfile();
    } finally {
      this.busy = false;
      this.onchange();
    }
    // A typo must not end the current chase. Bank it only after the ID is valid.
    await beforeSwitch?.();
    return this.restore(token);
  }
  async restore(token) {
    this.assertCurrentProfile();
    if (this.busy || this.pending)
      throw Error("Finish the pending save before restoring another garage.");
    if (!/^[a-f0-9]{64}$/.test(token || ""))
      throw Error("Choose a valid private garage key backup.");
    this.busy = true;
    this.onchange();
    try {
      const data = await this.request("/api/profile", "GET", undefined, token);
      this.assertCurrentProfile();
      localStorage.setItem(KEY, token);
      this.token = token;
      this.accept(data);
    } finally {
      this.busy = false;
      this.onchange();
    }
  }
  async mutate(action) {
    this.assertCurrentProfile();
    if (this.busy) throw Error("Your garage is saving. Please wait.");
    if (this.pending)
      throw Error("Retry the pending save before making another change.");
    this.pending = { id: crypto.randomUUID(), version: this.version, action };
    localStorage.setItem(this.outboxKey, JSON.stringify(this.pending));
    return this.retry();
  }
  async retry() {
    if (!this.pending) return;
    this.assertCurrentProfile();
    this.busy = true;
    this.onchange();
    try {
      const data = await this.request("/api/action", "POST", this.pending);
      this.pending = null;
      localStorage.removeItem(this.outboxKey);
      this.accept(data);
      return data.profile;
    } catch (error) {
      if (error.status === 400 || error.status === 409) {
        this.pending = null;
        localStorage.removeItem(this.outboxKey);
        if (error.data?.profile) this.accept(error.data);
        else if (error.status === 409)
          this.accept(await this.request("/api/profile"));
      }
      throw error;
    } finally {
      this.busy = false;
      this.onchange();
    }
  }
}
