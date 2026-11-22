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
test("organic local organizations can emerge as a world advances",()=>{
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
