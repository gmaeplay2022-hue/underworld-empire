import test from "node:test";
import assert from "node:assert/strict";
import { advanceDay, applyPolicy, initialPlayerStats } from "../src/game/turn.ts";
import { createWorld } from "../src/game/world.ts";

function playerWorld() {
  const world = createWorld(42);
  const district = world.districts.find(d => d.status !== "controlled")!;
  district.controllerId = "player";
  district.status = "controlled";
  district.influences.player = 82;
  world.player = { organizationName: "測試組織", leaderName: "測試領導者", startDistrictId: district.id };
  world.playerStats = initialPlayerStats();
  return world;
}

test("daily turn advances one day and settles income and upkeep", () => {
  const world = playerWorld();
  const result = advanceDay(world);
  assert.equal(result.world.day, world.day + 1);
  assert.equal(result.world.playerStats?.cash, 100 + 4 + Math.floor(world.districts.find(d => d.controllerId === "player")!.economy * 0.025) - 2);
  assert.match(result.message, /收入/);
});

test("daily turn cannot advance without a player organization", () => {
  const world = createWorld(42);
  const result = advanceDay(world);
  assert.equal(result.world.day, world.day);
  assert.match(result.message, /建立玩家組織/);
});

test("policy actions charge their cost and apply bounded benefits", () => {
  const world = playerWorld();
  const result = applyPolicy(world, "community");
  assert.equal(result.world.playerStats?.cash, 92);
  assert.equal(result.world.playerStats?.reputation, 24);
  assert.equal(result.world.playerStats?.trust, 52);
});

test("policy actions reject unaffordable spending without changing state", () => {
  const world = playerWorld();
  world.playerStats!.cash = 1;
  const result = applyPolicy(world, "development");
  assert.equal(result.world.playerStats?.cash, 1);
  assert.match(result.message, /資金不足/);
});
