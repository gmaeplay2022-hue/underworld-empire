import test from "node:test";
import assert from "node:assert/strict";
import { COUNTY_DEFINITIONS, INITIAL_DISTRICT_COUNT, createWorld, countWorld } from "../src/game/world.ts";

test("the fixed virtual Taiwan contains 22 counties and exactly 96 districts", () => {
  assert.equal(COUNTY_DEFINITIONS.length, 22);
  assert.equal(INITIAL_DISTRICT_COUNT, 96);
  assert.equal(COUNTY_DEFINITIONS.reduce((sum, county) => sum + county.districts, 0), 96);
});

test("the same world seed reproduces the same factions and district state", () => {
  const first = createWorld(20261122);
  const second = createWorld(20261122);
  assert.deepEqual(first.factions, second.factions);
  assert.deepEqual(first.districts, second.districts);
});

test("balanced generation creates controlled, neutral and unclaimed land", () => {
  const world = createWorld(20261122);
  const counts = countWorld(world);
  assert.equal(counts.districts, 96);
  assert.equal(counts.controlled, 52);
  assert.equal(counts.neutral, 18);
  assert.equal(counts.unclaimed, 26);
});

test("all eight major AI factions exist, while only a subset starts with territory", () => {
  const world = createWorld(20261122);
  const major = world.factions.filter(faction => faction.isMajor);
  const active = new Set(world.districts.filter(district => district.controllerId?.startsWith("major-")).map(district => district.controllerId));
  assert.equal(major.length, 8);\n  assert.equal(new Set(major.map(faction => faction.name)).size, 8);
  assert.ok(active.size >= 6 && active.size <= 8);
});

test("each district has at most one controller and a separate influence map", () => {
  const world = createWorld(20261122);
  for (const district of world.districts) {
    assert.ok(district.controllerId === null || typeof district.controllerId === "string");
    assert.equal(typeof district.influences, "object");
    if (district.controllerId) assert.ok(district.influences[district.controllerId] >= 50);
  }
});
