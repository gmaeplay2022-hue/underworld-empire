import type { District, Faction, WorldState } from "./world";

export type OrganizationTier = "地方小組織" | "地方勢力" | "區域勢力" | "跨縣市勢力" | "大型組織";
const tiers: OrganizationTier[] = ["地方小組織","地方勢力","區域勢力","跨縣市勢力","大型組織"];

export function getOrganizationTier(world: WorldState, factionId: string): OrganizationTier {
  const owned = world.districts.filter(d => d.controllerId === factionId);
  const mature = owned.filter(d => (d.reformProgress ?? (d.reformStage === "established" ? 4 : 0)) >= 4).length;
  const roster = world.people.filter(p => p.factionId === factionId && p.status === "active");
  const staffed = owned.filter(d => !!d.managerPersonId).length;
  const faction = world.factions.find(f => f.id === factionId);
  const avgSupport = owned.length ? owned.reduce((n,d)=>n+(d.localSupport ?? d.stability),0)/owned.length : 0;
  const score = owned.length * 2 + mature * 1.5 + Math.min(12,roster.length) * .65 +
    Math.min(owned.length,staffed) * .8 + (faction?.treasury ?? 0) / 100 +
    avgSupport / 20 + (faction?.cohesion ?? 50) / 25;
  return tiers[score >= 45 ? 4 : score >= 30 ? 3 : score >= 19 ? 2 : score >= 9 ? 1 : 0];
}

export function tierCapacity(tier: OrganizationTier): number {
  return ({ "地方小組織": 1, "地方勢力": 2, "區域勢力": 4, "跨縣市勢力": 7, "大型組織": 12 })[tier];
}

function clamp(value:number){return Math.max(0,Math.min(100,Math.round(value)));}
function relation(world:WorldState,a:string,b:string){return world.relationships.find(r=>(r.fromFactionId===a&&r.toFactionId===b)||(r.fromFactionId===b&&r.toFactionId===a))?.score??0;}

/** Weekly, deterministic abstract influence settlement. No real-world operational mechanics. */
export function settleTerritoryCompetition(world:WorldState, districts:District[], factions:Faction[], day:number) {
  const events: Array<{id:string;day:number;category:"territory"|"organization";title:string;description:string}> = [];
  if(day % 7 !== 0) return { districts, factions, events };
  const next = districts.map(d => ({...d, influences:{...d.influences}}));
  for(const d of next) {
    const contenders = factions.filter(f=>f.id!=="player").map(f=>f.id);
    if(world.player) contenders.push("player");
    for(const id of contenders) {
      const faction = factions.find(f=>f.id===id);
      if(!faction) continue;
      const current = d.influences[id] ?? 0;
      const seed = (world.seed + day*13 + d.id.length*7 + id.length*11 + faction.strength) % 5;
      const relationshipFactor = d.controllerId && d.controllerId!==id ? relation(world,id,d.controllerId) : 0;
      const pressure = Math.max(0,Math.min(2,Math.floor((faction.strength-45)/25)+1));
      const drift = d.controllerId===id ? 0 : Math.max(-1,Math.min(2,pressure + (seed===0?1:0) + (relationshipFactor>=30?1:relationshipFactor<=-50?-1:0)));
      d.influences[id] = clamp(current + drift);
    }
    const currentId=d.controllerId;
    const currentFaction=factions.find(f=>f.id===currentId);
    const candidates=factions.filter(f=>f.id!=="player"||!!world.player).map(f=>{
      const influence=d.influences[f.id]??0;
      const support=f.id==="player"?(d.localSupport??35):d.stability;
      const staff=f.id==="player"?(d.managerPersonId?8:0):0;
      return {f,score:influence*.48+f.strength*.22+support*.16+f.cohesion*.08+staff+relation(world,f.id,currentId??f.id)*.04};
    }).sort((a,b)=>b.score-a.score);
    const leader=candidates[0];
    if(!leader) continue;
    const incumbentScore=candidates.find(c=>c.f.id===currentId)?.score??0;
    const margin=leader.score-incumbentScore;
    const influence=d.influences[leader.f.id]??0;
    const eligible=leader.f.id!==currentId && influence>= (currentId?72:60) && margin>=12 && d.stability<=82;
    if(eligible) {
      const previous=currentId?factions.find(f=>f.id===currentId)?.name??"原控制組織":"地方自治網絡";
      d.controllerId=leader.f.id; d.status="controlled";
      d.influences[leader.f.id]=Math.max(influence,72);
      if(leader.f.id==="player") d.localSupport=clamp((d.localSupport??35)+4);
      events.push({id:"competition-"+day+"-"+d.id,day,category:"territory",title:"地盤影響力與控制關係變動",description:leader.f.name+"在「"+d.name+"」的地方支持與影響力超越原有控制方（"+previous+"），主要管理權發生變化。"});
    }
    if(d.controllerId==="player") {
      const support=d.localSupport??35;
      d.localSupport=clamp(support+(d.stability>=65?1:-1)+(d.influences.player>=70?1:0));
      d.governmentAttention=clamp(d.governmentAttention+(d.localSupport<30?1:0)-(d.localSupport>70?1:0));
    }
  }
  return {districts:next,factions,events};
}
