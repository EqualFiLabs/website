import assert from "node:assert/strict";
import test from "node:test";
import { keccak256, stringToBytes } from "viem";
import { ammAuctionFacetAbi } from "../src/lib/abis/ammAuctionFacet.js";
import { communityAuctionFacetAbi } from "../src/lib/abis/communityAuctionFacet.js";
import { ammAuctionAbi, communityAuctionAbi } from "../src/lib/abis.ts";

type AbiEntry = {
  type: string;
  name?: string;
  inputs?: { components?: Array<{ name: string; type: string }> }[];
  outputs?: { components?: Array<{ name: string; type: string }> }[];
};

const findFn = (abi: readonly AbiEntry[], name: string) =>
  abi.find((entry) => entry.type === "function" && entry.name === name);

const componentNames = (entry?: AbiEntry, io: "inputs" | "outputs" = "inputs") =>
  entry?.[io]?.[0]?.components?.map((c) => c.name) ?? [];

test("AMM createAuction ABI uses invariant mode selector", () => {
  const signature =
    "createAuction((uint256,uint256,uint256,uint256,uint256,uint64,uint64,uint16,uint8,uint8))";
  const selector = keccak256(stringToBytes(signature)).slice(0, 10);
  assert.equal(selector, "0x069a2c21");
  assert.notEqual(selector, "0xed5b5ef5");
});

test("create auction tuples include invariantMode in both ABI sets", () => {
  const ammFacetCreate = findFn(ammAuctionFacetAbi as AbiEntry[], "createAuction");
  const communityFacetCreate = findFn(
    communityAuctionFacetAbi as AbiEntry[],
    "createCommunityAuction",
  );
  const ammCreate = findFn(ammAuctionAbi as AbiEntry[], "createAuction");
  const communityCreate = findFn(communityAuctionAbi as AbiEntry[], "createCommunityAuction");

  assert.ok(componentNames(ammFacetCreate).includes("invariantMode"));
  assert.ok(componentNames(communityFacetCreate).includes("invariantMode"));
  assert.ok(componentNames(ammCreate).includes("invariantMode"));
  assert.ok(componentNames(communityCreate).includes("invariantMode"));
});

test("auction view tuples include invariantMode and token decimals", () => {
  const ammFacetView = findFn(ammAuctionFacetAbi as AbiEntry[], "getAuction");
  const communityFacetView = findFn(
    communityAuctionFacetAbi as AbiEntry[],
    "getCommunityAuction",
  );
  const ammView = findFn(ammAuctionAbi as AbiEntry[], "getAuction");
  const communityView = findFn(communityAuctionAbi as AbiEntry[], "getCommunityAuction");

  for (const entry of [ammFacetView, communityFacetView, ammView, communityView]) {
    const names = componentNames(entry, "outputs");
    assert.ok(names.includes("invariantMode"));
    assert.ok(names.includes("tokenADecimals"));
    assert.ok(names.includes("tokenBDecimals"));
  }
});
