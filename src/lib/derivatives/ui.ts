const BPS_MAX = 10_000;

type PoolLike = {
  id?: string;
  pid?: number | string;
  ticker?: string;
  tokenName?: string;
};

type PositionLike = {
  tokenId?: string | number;
  poolName?: string;
};

export type DropdownOption = {
  value: string;
  label: string;
};

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

const parseSortNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

export function buildPoolIdOptions(pools: PoolLike[] | null | undefined): DropdownOption[] {
  const safePools = Array.isArray(pools) ? pools : [];
  const seen = new Set<string>();
  const options: DropdownOption[] = [];

  for (const pool of safePools) {
    const pid = pool?.pid;
    if (pid === undefined || pid === null || pid === "") {
      continue;
    }
    const value = String(pid);
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    const ticker = pool?.ticker || pool?.id || "POOL";
    const name = pool?.tokenName || pool?.id || ticker;
    options.push({
      value,
      label: `${ticker} (pid ${value}) - ${name}`,
    });
  }

  options.sort((a, b) => parseSortNumber(a.value) - parseSortNumber(b.value));
  return options;
}

export function buildPositionIdOptions(positions: PositionLike[] | null | undefined): DropdownOption[] {
  const safePositions = Array.isArray(positions) ? positions : [];
  const seen = new Set<string>();
  const options: DropdownOption[] = [];

  for (const position of safePositions) {
    const tokenId = position?.tokenId;
    if (tokenId === undefined || tokenId === null || tokenId === "") {
      continue;
    }
    const value = String(tokenId);
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    const poolName = position?.poolName || "Unknown pool";
    options.push({
      value,
      label: `#${value} (${poolName})`,
    });
  }

  options.sort((a, b) => parseSortNumber(a.value) - parseSortNumber(b.value));
  return options;
}
