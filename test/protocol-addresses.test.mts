import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runInNewContext } from "node:vm";

import test from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resolverPath = path.resolve(__dirname, "../src/lib/protocolAddresses.js");

const loadResolver = async () => {
  const source = await readFile(resolverPath, "utf8");
  const transformed = source
    .replace("export const resolveProtocolAddresses = ", "const resolveProtocolAddresses = ")
    .concat("\nmodule.exports = { resolveProtocolAddresses };");

  const module = { exports: {} as Record<string, unknown> };
  runInNewContext(transformed, {
    module,
    exports: module.exports,
    process,
  });
  return module.exports.resolveProtocolAddresses as (poolsConfig: Record<string, unknown>) => {
    diamondAddress: string;
    positionNFTAddress: string;
    faucetAddress: string;
  };
};

test("resolveProtocolAddresses prefers pools config values", async () => {
  const resolveProtocolAddresses = await loadResolver();
  const previousDiamond = process.env.NEXT_PUBLIC_DIAMOND_ADDRESS;
  const previousPosition = process.env.NEXT_PUBLIC_POSITION_NFT;
  const previousFaucet = process.env.NEXT_PUBLIC_FAUCET_ADDRESS;

  process.env.NEXT_PUBLIC_DIAMOND_ADDRESS = "0x1111111111111111111111111111111111111111";
  process.env.NEXT_PUBLIC_POSITION_NFT = "0x2222222222222222222222222222222222222222";
  process.env.NEXT_PUBLIC_FAUCET_ADDRESS = "0x3333333333333333333333333333333333333333";

  try {
    const resolved = resolveProtocolAddresses({
      diamondAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      positionNFTAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      faucetAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
    });

    assert.equal(resolved.diamondAddress, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(resolved.positionNFTAddress, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(resolved.faucetAddress, "0xcccccccccccccccccccccccccccccccccccccccc");
  } finally {
    if (previousDiamond === undefined) delete process.env.NEXT_PUBLIC_DIAMOND_ADDRESS;
    else process.env.NEXT_PUBLIC_DIAMOND_ADDRESS = previousDiamond;

    if (previousPosition === undefined) delete process.env.NEXT_PUBLIC_POSITION_NFT;
    else process.env.NEXT_PUBLIC_POSITION_NFT = previousPosition;

    if (previousFaucet === undefined) delete process.env.NEXT_PUBLIC_FAUCET_ADDRESS;
    else process.env.NEXT_PUBLIC_FAUCET_ADDRESS = previousFaucet;
  }
});

test("resolveProtocolAddresses falls back to env values when pools config omits addresses", async () => {
  const resolveProtocolAddresses = await loadResolver();
  const previousDiamond = process.env.NEXT_PUBLIC_DIAMOND_ADDRESS;
  const previousPosition = process.env.NEXT_PUBLIC_POSITION_NFT;
  const previousFaucet = process.env.NEXT_PUBLIC_FAUCET_ADDRESS;

  process.env.NEXT_PUBLIC_DIAMOND_ADDRESS = "0x4444444444444444444444444444444444444444";
  process.env.NEXT_PUBLIC_POSITION_NFT = "0x5555555555555555555555555555555555555555";
  process.env.NEXT_PUBLIC_FAUCET_ADDRESS = "0x6666666666666666666666666666666666666666";

  try {
    const resolved = resolveProtocolAddresses({});

    assert.equal(resolved.diamondAddress, "0x4444444444444444444444444444444444444444");
    assert.equal(resolved.positionNFTAddress, "0x5555555555555555555555555555555555555555");
    assert.equal(resolved.faucetAddress, "0x6666666666666666666666666666666666666666");
  } finally {
    if (previousDiamond === undefined) delete process.env.NEXT_PUBLIC_DIAMOND_ADDRESS;
    else process.env.NEXT_PUBLIC_DIAMOND_ADDRESS = previousDiamond;

    if (previousPosition === undefined) delete process.env.NEXT_PUBLIC_POSITION_NFT;
    else process.env.NEXT_PUBLIC_POSITION_NFT = previousPosition;

    if (previousFaucet === undefined) delete process.env.NEXT_PUBLIC_FAUCET_ADDRESS;
    else process.env.NEXT_PUBLIC_FAUCET_ADDRESS = previousFaucet;
  }
});

test("resolveProtocolAddresses uses NEXT_PUBLIC_POSITION_NFT_ADDRESS as legacy fallback", async () => {
  const resolveProtocolAddresses = await loadResolver();
  const previousPosition = process.env.NEXT_PUBLIC_POSITION_NFT;
  const previousLegacyPosition = process.env.NEXT_PUBLIC_POSITION_NFT_ADDRESS;

  delete process.env.NEXT_PUBLIC_POSITION_NFT;
  process.env.NEXT_PUBLIC_POSITION_NFT_ADDRESS = "0x7777777777777777777777777777777777777777";

  try {
    const resolved = resolveProtocolAddresses({});
    assert.equal(resolved.positionNFTAddress, "0x7777777777777777777777777777777777777777");
  } finally {
    if (previousPosition === undefined) delete process.env.NEXT_PUBLIC_POSITION_NFT;
    else process.env.NEXT_PUBLIC_POSITION_NFT = previousPosition;

    if (previousLegacyPosition === undefined) delete process.env.NEXT_PUBLIC_POSITION_NFT_ADDRESS;
    else process.env.NEXT_PUBLIC_POSITION_NFT_ADDRESS = previousLegacyPosition;
  }
});
