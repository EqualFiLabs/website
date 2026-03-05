import assert from "node:assert/strict";
import test from "node:test";
import { derivativeViewFacetAbi } from "../src/lib/abis/derivativeViewFacet.js";
import { futuresFacetAbi } from "../src/lib/abis/futuresFacet.ts";
import { optionsFacetAbi } from "../src/lib/abis/optionsFacet.ts";
import {
  mapFuturesSeries,
  mapOptionSeries,
  toCreateFuturesSeriesParams,
  toCreateOptionSeriesParams,
} from "../src/lib/derivatives/client.ts";

type AbiFn = {
  type: string;
  name?: string;
  inputs?: { components?: Array<{ name: string; type: string }> }[];
  outputs?: { components?: Array<{ name: string; type: string }> }[];
};

const fn = (name: string) =>
  (derivativeViewFacetAbi as AbiFn[]).find((entry) => entry.type === "function" && entry.name === name);

const writeFn = (abi: readonly AbiFn[], name: string) =>
  abi.find((entry) => entry.type === "function" && entry.name === name);

test("create option/futures ABI includes contractSize in params tuple", () => {
  const createOption = writeFn(optionsFacetAbi as unknown as AbiFn[], "createOptionSeries");
  const createFutures = writeFn(futuresFacetAbi as unknown as AbiFn[], "createFuturesSeries");
  assert.ok(createOption, "createOptionSeries missing");
  assert.ok(createFutures, "createFuturesSeries missing");

  const optionFields = createOption.inputs?.[0]?.components?.map((c) => `${c.name}:${c.type}`);
  const futuresFields = createFutures.inputs?.[0]?.components?.map((c) => `${c.name}:${c.type}`);

  assert.ok(optionFields?.includes("contractSize:uint256"), "createOptionSeries missing contractSize");
  assert.ok(futuresFields?.includes("contractSize:uint256"), "createFuturesSeries missing contractSize");
});

test("getOptionSeries ABI matches onchain OptionSeries layout", () => {
  const entry = fn("getOptionSeries");
  assert.ok(entry, "getOptionSeries missing");

  const components = entry.outputs?.[0]?.components?.map((c) => `${c.name}:${c.type}`);
  assert.deepEqual(components, [
    "makerPositionKey:bytes32",
    "makerPositionId:uint256",
    "underlyingPoolId:uint256",
    "strikePoolId:uint256",
    "underlyingAsset:address",
    "strikeAsset:address",
    "strikePrice:uint256",
    "expiry:uint64",
    "totalSize:uint256",
    "remaining:uint256",
    "collateralLocked:uint256",
    "createFeeBps:uint16",
    "exerciseFeeBps:uint16",
    "reclaimFeeBps:uint16",
    "isCall:bool",
    "isAmerican:bool",
    "reclaimed:bool",
  ]);
});

test("getFuturesSeries ABI matches onchain FuturesSeries layout", () => {
  const entry = fn("getFuturesSeries");
  assert.ok(entry, "getFuturesSeries missing");

  const components = entry.outputs?.[0]?.components?.map((c) => `${c.name}:${c.type}`);
  assert.deepEqual(components, [
    "makerPositionKey:bytes32",
    "makerPositionId:uint256",
    "underlyingPoolId:uint256",
    "quotePoolId:uint256",
    "underlyingAsset:address",
    "quoteAsset:address",
    "forwardPrice:uint256",
    "expiry:uint64",
    "totalSize:uint256",
    "remaining:uint256",
    "underlyingLocked:uint256",
    "createFeeBps:uint16",
    "exerciseFeeBps:uint16",
    "reclaimFeeBps:uint16",
    "graceUnlockTime:uint64",
    "isEuropean:bool",
    "reclaimed:bool",
  ]);
});

test("option and futures mappers support both tuple and object shape", () => {
  const optionTuple = [
    "0x1234000000000000000000000000000000000000000000000000000000000000",
    11n,
    1n,
    2n,
    "0x0000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000002",
    3000n,
    1_700_000_000n,
    25n,
    20n,
    20n,
    100,
    120,
    90,
    true,
    false,
    false,
  ];
  const optionObject = {
    makerPositionKey: optionTuple[0],
    makerPositionId: optionTuple[1],
    underlyingPoolId: optionTuple[2],
    strikePoolId: optionTuple[3],
    underlyingAsset: optionTuple[4],
    strikeAsset: optionTuple[5],
    strikePrice: optionTuple[6],
    expiry: optionTuple[7],
    totalSize: optionTuple[8],
    remaining: optionTuple[9],
    collateralLocked: optionTuple[10],
    createFeeBps: optionTuple[11],
    exerciseFeeBps: optionTuple[12],
    reclaimFeeBps: optionTuple[13],
    isCall: optionTuple[14],
    isAmerican: optionTuple[15],
    reclaimed: optionTuple[16],
  };
  assert.deepEqual(mapOptionSeries(optionTuple), mapOptionSeries(optionObject));

  const futuresTuple = [
    "0xabcd000000000000000000000000000000000000000000000000000000000000",
    22n,
    3n,
    5n,
    "0x0000000000000000000000000000000000000003",
    "0x0000000000000000000000000000000000000004",
    2500n,
    1_700_100_000n,
    100n,
    60n,
    60n,
    100,
    110,
    90,
    1_700_200_000n,
    true,
    false,
  ];
  const futuresObject = {
    makerPositionKey: futuresTuple[0],
    makerPositionId: futuresTuple[1],
    underlyingPoolId: futuresTuple[2],
    quotePoolId: futuresTuple[3],
    underlyingAsset: futuresTuple[4],
    quoteAsset: futuresTuple[5],
    forwardPrice: futuresTuple[6],
    expiry: futuresTuple[7],
    totalSize: futuresTuple[8],
    remaining: futuresTuple[9],
    underlyingLocked: futuresTuple[10],
    createFeeBps: futuresTuple[11],
    exerciseFeeBps: futuresTuple[12],
    reclaimFeeBps: futuresTuple[13],
    graceUnlockTime: futuresTuple[14],
    isEuropean: futuresTuple[15],
    reclaimed: futuresTuple[16],
  };
  assert.deepEqual(mapFuturesSeries(futuresTuple), mapFuturesSeries(futuresObject));
});

test("create params preserve custom fee controls and zero fees when disabled", () => {
  const optionDefaultFees = toCreateOptionSeriesParams({
    positionId: 1n,
    underlyingPoolId: 1n,
    strikePoolId: 2n,
    strikePrice: 2000n,
    expiry: 1_700_000_100n,
    totalSize: 10n,
    contractSize: 1n,
    isCall: true,
    isAmerican: true,
    useCustomFees: false,
  });
  assert.equal(optionDefaultFees.useCustomFees, false);
  assert.equal(optionDefaultFees.createFeeBps, 0);
  assert.equal(optionDefaultFees.exerciseFeeBps, 0);
  assert.equal(optionDefaultFees.reclaimFeeBps, 0);

  const futuresCustomFees = toCreateFuturesSeriesParams({
    positionId: 2n,
    underlyingPoolId: 4n,
    quotePoolId: 5n,
    forwardPrice: 3000n,
    expiry: 1_700_001_000n,
    totalSize: 12n,
    contractSize: 1n,
    isEuropean: false,
    useCustomFees: true,
    createFeeBps: 77,
    exerciseFeeBps: 88,
    reclaimFeeBps: 99,
  });
  assert.equal(futuresCustomFees.useCustomFees, true);
  assert.equal(futuresCustomFees.createFeeBps, 77);
  assert.equal(futuresCustomFees.exerciseFeeBps, 88);
  assert.equal(futuresCustomFees.reclaimFeeBps, 99);
});

test("invalid custom fee bps throws", () => {
  assert.throws(
    () =>
      toCreateOptionSeriesParams({
        positionId: 3n,
        underlyingPoolId: 1n,
        strikePoolId: 2n,
        strikePrice: 1800n,
        expiry: 1_700_002_000n,
        totalSize: 5n,
        contractSize: 1n,
        isCall: false,
        isAmerican: false,
        useCustomFees: true,
        createFeeBps: 10_001,
        exerciseFeeBps: 1,
        reclaimFeeBps: 1,
      }),
    /Invalid custom fee bps/,
  );
});
