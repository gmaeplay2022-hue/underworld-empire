import test from "node:test";
import assert from "node:assert/strict";
import { advanceDay, initialPlayerStats } from "../src/game/turn.ts";
import { createWorld } from "../src/game/world.ts";
import { migrateWorld } from "../src/game/storage.ts";

test("legacy world saves migrate to the current schema without losing the map",()=>{
 const legacy=createWorld(2026);
 delete legacy.people;delete legacy.relationships;delete legacy.events;
 legacy.schemaVersion=1;legacy.generatorVersion="0.2.0";
 for(const faction of legacy.factions){delete faction.cohesion;delete faction.treasury;}
 const migrated=migrateWorld(legacy);
 assert.equal(migrated.schemaVersion,2);
 assert.equal(migrated.generatorVersion,"1.0.0");
 assert.equal(migrated.districts.length,96);
 assert.equal(migrated.people.length,migrated.factions.length);
 assert.ok(Array.isArray(migrated.events));
});
test("legacy character attributes migrate into the finalized six-value model",()=>{\n const world=createWorld(7070);\n const person=world.people[0];\n delete person.combat;delete person.intelligence;delete person.charisma;\n person.diplomacy=73;\n const migrated=migrateWorld(world);\n const restored=migrated.people.find(item=>item.id===person.id);\n assert.equal(restored.charisma,73);\n assert.equal(typeof restored.combat,"number");\n assert.equal(typeof restored.intelligence,"number");\n assert.equal(migrated.generatorVersion,"1.2.0");\n});\n\ntest("organic local organizations can emerge as a world advances",()=>{
 const world=createWorld(8181);
 world.player={organizationName:"測試組織",leaderName:"測試領導",startDistrictId:world.districts[0].id};
 world.playerStats=initialPlayerStats();
 world.factions.push({id:"player",name:"測試組織",archetype:"玩家",description:"測試",strength:28,founded:2026,isMajor:false,cohesion:70,treasury:120});
 world.day=29;
 const before=world.factions.length;
 const result=advanceDay(world);
 assert.ok(result.world.factions.length>=before);
 assert.ok(result.world.events.some(e=>e.day===30&&e.category==="organization"));
});

test("family leadership passes to a successor when a leader retires",()=>{
 const world=createWorld(9191);
 world.player={organizationName:"世代測試",leaderName:"測試領導",startDistrictId:world.districts[0].id};
 world.playerStats=initialPlayerStats();
 const leader=world.people[0];leader.age=77;leader.role="領導者";
 world.day=364;
 const result=advanceDay(world);
 assert.equal(result.world.day,365);
 assert.equal(result.world.people.find(p=>p.id===leader.id).status,"retired");
 const successor=result.world.people.find(p=>p.factionId===leader.factionId&&p.status==="active"&&p.role.includes("領導者"));
 assert.ok(successor);
 assert.equal(successor.generation,leader.generation+1);
 assert.deepEqual(successor.parentIds,[leader.id]);
 assert.ok(result.world.events.some(e=>e.title==="家族世代交替"));
});

test("player organization name follows its new generational leader",()=>{
 const world=createWorld(1234);
 const leader={id:"player-old-leader",name:"舊任領導",age:77,factionId:"player",familyId:"family-player",generation:1,parentIds:[],role:"組織領導者",combat:55,intelligence:60,leadership:60,charisma:60,management:60,loyalty:100,health:100,status:"active"};
 world.player={organizationName:"世代測試",leaderName:leader.name,startDistrictId:world.districts[0].id};
 world.playerStats=initialPlayerStats();
 world.factions.push({id:"player",name:"世代測試",archetype:"玩家",description:"測試",strength:30,founded:2026,isMajor:false,cohesion:70,treasury:120});
 world.people.push(leader);world.day=364;
 const result=advanceDay(world);
 assert.notEqual(result.world.player.leaderName,leader.name);
 assert.equal(result.world.player.leaderName,result.world.people.find(p=>p.factionId==="player"&&p.status==="active"&&p.role.includes("領導者")).name);
});

test("save writes are serialized per slot and preserve request order", async () => {
 const { enqueueSlotWrite } = await import("../src/game/storage.ts");
 const queues = new Map();
 const events = [];
 let releaseFirst;
 const firstGate = new Promise(resolve => { releaseFirst = resolve; });
 const first = enqueueSlotWrite(queues, 0, async () => {
  events.push("first:start");
  await firstGate;
  events.push("first:end");
 });
 const second = enqueueSlotWrite(queues, 0, async () => { events.push("second"); });
 const independent = enqueueSlotWrite(queues, 1, async () => { events.push("other-slot"); });
 await Promise.resolve();
 await Promise.resolve();
 assert.deepEqual(events, ["first:start", "other-slot"]);
 releaseFirst();
 await Promise.all([first, second, independent]);
 assert.deepEqual(events, ["first:start", "other-slot", "first:end", "second"]);
 assert.equal(queues.size, 0);
});

test("a failed save does not block later writes to the same slot", async () => {
 const { enqueueSlotWrite } = await import("../src/game/storage.ts");
 const queues = new Map();
 const events = [];
 const failed = enqueueSlotWrite(queues, 3, async () => { events.push("failed"); throw new Error("disk"); });
 const recovered = enqueueSlotWrite(queues, 3, async () => { events.push("recovered"); });
 await assert.rejects(failed, /disk/);
 await recovered;
 assert.deepEqual(events, ["failed", "recovered"]);
 assert.equal(queues.size, 0);
});
