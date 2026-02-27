const BPS_MAX = 10_000;

export function parseRequiredUint(input: string, label: string): bigint {
  const value = input.trim();
  if (!value) {
    throw new Error(`${label} is required`);
  }
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return BigInt(value);
}

export function parseOptionalUint(input: string, label: string): bigint | undefined {
  const value = input.trim();
  if (!value) {
    return undefined;
  }
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return BigInt(value);
}

export function parseBps(input: string, label: string): number {
  const value = input.trim();
  if (!value) {
    throw new Error(`${label} is required`);
  }
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} must be an integer`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > BPS_MAX) {
    throw new Error(`${label} must be between 0 and ${BPS_MAX}`);
  }
  return parsed;
}

export function formatUnixTimestamp(value: bigint | number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  let seconds: bigint;
  try {
    seconds = typeof value === "bigint" ? value : BigInt(String(value));
  } catch {
    return "-";
  }

  const millis = Number(seconds * 1000n);
  if (!Number.isFinite(millis)) {
    return "-";
  }
  return new Date(millis).toLocaleString();
}

export function asString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return "";
}
