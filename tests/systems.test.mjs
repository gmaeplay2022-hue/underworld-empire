import test from "node:test";
import assert from "node:assert/strict";
import { advanceDay, claimDistrict, negotiate, recruitLocalMembers, recruitPerson, reformDistrict, resolveDispute, developDistrict, resolveWorldEvent, initialPlayerStats } from "../src/game/turn.ts";
import { createWorld } from "../src/game/world.ts";

function startedWorld(){
 const world=createWorld(20261122);
 const district=world.districts.find(d=>d.status!=="controlled");
 district.controllerId="player";district.status="controlled";district.influences.player=82;
 world.player={organizationName:"測試組織",leaderName:"測試領導者",startDistrictId:district.id};
 world.playerStats=initialPlayerStats();
 world.factions.push({id:"player",name:"測試組織",archetype:"玩家組織",description:"測試",strength:60,founded:2026,isMajor:false,cohesion:70,treasury:120});
 world.people.push({id:"player-leader",name:"測試領導者",age:29,factionId:"player",role:"組織領導者",combat:65,intelligence:75,leadership:80,charisma:70,management:75,loyalty:100,health:100,status:"active"});
 world.relationships=world.factions.filter(f=>f.id!=="player").map(f=>({fromFactionId:"player",toFactionId:f.id,score:0,status:"neutral"}));
 return world;
}
test("new worlds include generated leaders and diplomacy links",()=>{
 const world=createWorld(77);
 assert.equal(world.schemaVersion,2);
 assert.ok(world.people.length>world.factions.length);
 for(const faction of world.factions){
  const roster=world.people.filter(person=>person.factionId===faction.id);
  assert.ok(roster.length>=6, faction.name+" should have a complete character roster");
  assert.ok(roster.some(person=>person.role==="領導者"), faction.name+" should have a generated leader");
 }
 assert.ok(world.relationships.length>0);
 assert.equal(world.events[0].day,1);
});
test("players can claim unclaimed land and pay its cost",()=>{
 const world=startedWorld();const district=world.districts.find(d=>d.status==="unclaimed"&&d.controllerId===null);
 const result=claimDistrict(world,district.id);
 assert.equal(result.world.districts.find(d=>d.id===district.id).controllerId,"player");
 assert.equal(result.world.playerStats.cash,98);
});
test("players can negotiate and improve faction relations",()=>{
 const world=startedWorld();const faction=world.factions.find(f=>f.id!=="player");
 const result=negotiate(world,faction.id);
 const relation=result.world.relationships.find(r=>[r.fromFactionId,r.toFactionId].includes("player")&&[r.fromFactionId,r.toFactionId].includes(faction.id));
 assert.equal(relation.score,14);
 assert.equal(result.world.playerStats.cash,115);
});
test("players can recruit key staff and invest in controlled districts",()=>{
 const world=startedWorld();const recruited=recruitPerson(world);
 assert.equal(recruited.world.people.filter(p=>p.factionId==="player").length,2);
 const district=recruited.world.districts.find(d=>d.controllerId==="player");
 const developed=developDistrict(recruited.world,district.id);
 assert.equal(developed.world.districts.find(d=>d.id===district.id).development,district.development+7);
});
test("weekly turns create a world event and update AI organizations",()=>{
 const world=startedWorld();world.day=6;
 const result=advanceDay(world);
 assert.equal(result.world.day,7);
 assert.ok(result.world.events.some(e=>e.day===7));
 assert.ok(result.world.factions.every(f=>f.treasury>=0));
});
test("abstract territory disputes always charge the declared coordination cost",()=>{
 const world=startedWorld();const target=world.districts.find(d=>d.controllerId&&d.controllerId!=="player");
 const result=resolveDispute(world,target.id);
 assert.equal(result.world.playerStats.cash,85);
 assert.ok(result.message.includes("協調"));
});

test("weekly community events present choices and resolve exactly once",()=>{
 const world=startedWorld();world.day=6;
 const weekly=advanceDay(world).world;
 const pending=weekly.events.find(e=>e.day===7&&e.choices);
 assert.ok(pending);
 const result=resolveWorldEvent(weekly,pending.id,"support");
 assert.equal(result.world.events.find(e=>e.id===pending.id).resolved,true);
 assert.equal(result.world.playerStats.cash,weekly.playerStats.cash-12);
 const repeated=resolveWorldEvent(result.world,pending.id,"support");
 assert.match(repeated.message,/已處理/);
 assert.equal(repeated.world.playerStats.cash,weekly.playerStats.cash-12);
});

test("high public pressure raises government attention in player districts",()=>{
 const world=startedWorld();world.playerStats.publicPressure=80;
 const district=world.districts.find(d=>d.controllerId==="player");
 const before=district.governmentAttention;
 const result=advanceDay(world);
 assert.equal(result.world.districts.find(d=>d.id===district.id).governmentAttention,Math.min(100,before+2));
});

test("district reform advances through stages and improves local support",()=>{
 const world=startedWorld();const district=world.districts.find(d=>d.controllerId==="player");
 const first=reformDistrict(world,district.id);
 const afterFirst=first.world.districts.find(d=>d.id===district.id);
 assert.equal(afterFirst.reformStage,"reforming");assert.equal(afterFirst.reformProgress,1);
 assert.ok(afterFirst.localSupport>0);assert.equal(first.world.playerStats.cash,104);
 let next=first.world;for(let i=0;i<3;i++)next=reformDistrict(next,district.id).world;
 const mature=next.districts.find(d=>d.id===district.id);
 assert.equal(mature.reformStage,"established");assert.equal(mature.reformProgress,4);
});
test("local members can be recruited only after district reform",()=>{
 const world=startedWorld();const district=world.districts.find(d=>d.controllerId==="player");
 const blocked=recruitLocalMembers(world,district.id);assert.match(blocked.message,/先完成/);
 const reformed=reformDistrict(world,district.id).world;
 const before=reformed.people.filter(p=>p.factionId==="player").length;
 const result=recruitLocalMembers(reformed,district.id);
 assert.ok(result.world.people.filter(p=>p.factionId==="player").length>before);
 assert.ok(result.world.people.some(p=>p.role==="地方成員"));
 assert.equal(result.world.playerStats.cash,92);
});
