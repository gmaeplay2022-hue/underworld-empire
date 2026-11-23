import test from "node:test";
import assert from "node:assert/strict";
import { COUNTY_DEFINITIONS, INITIAL_DISTRICT_COUNT, createWorld, countWorld } from "../src/game/world.ts";

test("the fixed virtual Taiwan contains 22 counties and exactly 66 districts", () => {
  assert.equal(COUNTY_DEFINITIONS.length, 22);
  assert.equal(INITIAL_DISTRICT_COUNT, 66);
  assert.equal(COUNTY_DEFINITIONS.reduce((sum, county) => sum + county.districts, 0), 66);
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
  assert.equal(counts.districts, 66);
  assert.equal(counts.controlled, 36);
  assert.equal(counts.neutral, 18);
  assert.equal(counts.unclaimed, 12);
});

test("all eight major AI factions exist, while only a subset starts with territory", () => {
  const world = createWorld(20261122);
  const major = world.factions.filter(faction => faction.isMajor);
  const active = new Set(world.districts.filter(district => district.controllerId?.startsWith("major-")).map(district => district.controllerId));
  assert.equal(major.length, 8);
  assert.equal(new Set(major.map(faction => faction.name)).size, 8);
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

test("V1.1 generates the approved eight faction archetypes and complete character rosters", () => {
  const world = createWorld(20261122);
  const major = world.factions.filter(faction => faction.isMajor);
  const counts = major.reduce((result, faction) => {
    result[faction.archetype] = (result[faction.archetype] ?? 0) + 1;
    return result;
  }, {});
  assert.equal(counts["地方組織"], 2);
  assert.equal(counts["商業勢力"], 1);
  assert.equal(counts["地方派系"], 1);
  assert.equal(counts["產業勢力"], 1);
  assert.equal(counts["地下勢力"], 2);
  assert.equal(counts["外來勢力"], 1);
  for (const faction of major) {
    assert.ok(world.people.some(person => person.factionId === faction.id && person.role === "領導者"));
    assert.ok(world.people.filter(person => person.factionId === faction.id && person.role === "核心幹部").length >= 2);
    assert.ok(world.people.filter(person => person.factionId === faction.id && person.role === "重要成員").length >= 3);
    assert.ok(faction.headquartersCountyId);
  }
  assert.ok(["商業競逐型","地方派系型","產業發展型","權力競爭型","外來勢力型"].includes(world.worldTendency));
  assert.equal(world.generatorVersion, "1.3.0");
  for (const person of world.people) {
    for (const key of ["combat","intelligence","leadership","charisma","management","prestige","loyalty"]) {
      assert.ok(Number.isInteger(person[key]) && person[key] >= 0 && person[key] <= 100, `${key} must be 0-100`);
    }
  }
});

test("V1.1 preserves balanced territory counts and places active major factions at their headquarters", () => {
  const world = createWorld(20261122);
  const counts = countWorld(world);
  assert.equal(counts.controlled, 36);
  assert.equal(counts.neutral, 18);
  assert.equal(counts.unclaimed, 12);
  for (const faction of world.factions.filter(item => item.isMajor)) {
    if (world.districts.some(district => district.controllerId === faction.id)) {
      assert.ok(world.districts.some(district => district.controllerId === faction.id && district.countyId === faction.headquartersCountyId));
    }
  }
});

test("V1.1 generates independent local and institutional key figures", () => {
  const world = createWorld(20261122);
  assert.equal(world.people.filter(person => person.role === "地方關鍵人物").length, 6);
  for (const role of ["政治人物","行政人物","執法人員","司法人物"]) {
    assert.equal(world.people.filter(person => person.role === role).length, 1);
  }
});
