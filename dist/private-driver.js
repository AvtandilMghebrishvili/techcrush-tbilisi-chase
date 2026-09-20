export const PRIVATE_DRIVER_NAME = "PHANTOM_7Q9X4M2K";
const LEGACY_PRIVATE_NAMES = new Set(["citiars", "test"]);
export const isPrivateDriverName = (value) => {
  const name = String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US");
  return (
    name === PRIVATE_DRIVER_NAME.toLocaleLowerCase("en-US") ||
    LEGACY_PRIVATE_NAMES.has(name)
  );
};
export const isPrivateProfile = (profile) =>
  isPrivateDriverName(profile?.driver?.name) ||
  Object.values(profile?.events || {}).some((event) =>
    isPrivateDriverName(event?.handle),
  );
