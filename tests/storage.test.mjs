import test from "node:test";
import assert from "node:assert/strict";
import { createWorld } from "../src/game/world.ts";
import { exportWorld, parseWorldExport, migrateWorld } from "../src/game/storage.ts";

test("portable JSON export round-trips a complete Jianghu world", () => {
  const world = createWorld(20261122);
  const restored = parseWorldExport(exportWorld(world));
  assert.equal(restored.seed, world.seed);
  assert.equal(restored.name, world.name);
  assert.equal(restored.day, world.day);
  assert.equal(restored.factions.length, world.factions.length);
  assert.equal(restored.people.length, world.people.length);
  assert.equal(restored.districts.length, 96);
});

test("legacy raw world JSON remains importable", () => {
  const world = createWorld(20261122);
  const restored = parseWorldExport(JSON.stringify(world));
  assert.equal(restored.seed, world.seed);
  assert.equal(restored.schemaVersion, 2);
});

test("invalid or incomplete JSON saves are rejected", () => {
  assert.throws(() => parseWorldExport("{not-json"));
  assert.throws(() => parseWorldExport(JSON.stringify({ format: "jianghu-save", formatVersion: 1, world: { name: "broken" } })));
  assert.throws(() => migrateWorld(null));
});
