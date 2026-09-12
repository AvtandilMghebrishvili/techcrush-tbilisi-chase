const KEY = "techcrush-garage-key-v1",
  OUTBOX = "techcrush-garage-outbox-v1";
export class ProfileClient {
  constructor() {
    this.profile = null;
    this.version = 0;
    this.pending = null;
    this.busy = false;
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
  accept(data) {
    this.profile = data.profile;
    this.version = data.version;
    this.driver = data.driver || this.driver;
    if (Object.hasOwn(data, "publicId")) this.publicId = data.publicId;
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
    this.accept(await this.request("/api/profile", "POST"));
    try {
      this.pending = JSON.parse(localStorage.getItem(OUTBOX) || "null");
    } catch {
      localStorage.removeItem(OUTBOX);
    }
    if (this.pending)
      try {
        await this.retry();
      } catch (error) {
        this.lastError = error.message;
      }
  }
  async restore(token) {
    if (this.busy || this.pending)
      throw Error("Finish the pending save before restoring another garage.");
    if (!/^[a-f0-9]{64}$/.test(token || ""))
      throw Error("Choose a valid private garage key backup.");
    this.busy = true;
    this.onchange();
    try {
      const data = await this.request("/api/profile", "GET", undefined, token);
      localStorage.setItem(KEY, token);
      this.token = token;
      this.accept(data);
    } finally {
      this.busy = false;
      this.onchange();
    }
  }
  async mutate(action) {
    if (this.busy) throw Error("Your garage is saving. Please wait.");
    if (this.pending)
      throw Error("Retry the pending save before making another change.");
    this.pending = { id: crypto.randomUUID(), version: this.version, action };
    localStorage.setItem(OUTBOX, JSON.stringify(this.pending));
    return this.retry();
  }
  async retry() {
    if (!this.pending) return;
    this.busy = true;
    this.onchange();
    try {
      const data = await this.request("/api/action", "POST", this.pending);
      this.pending = null;
      localStorage.removeItem(OUTBOX);
      this.accept(data);
      return data.profile;
    } catch (error) {
      if (error.status === 400 || error.status === 409) {
        this.pending = null;
        localStorage.removeItem(OUTBOX);
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
