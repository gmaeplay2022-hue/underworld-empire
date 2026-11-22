import type { Person, Relationship, WorldEvent, WorldState } from "./world";
export type PolicyAction = "community" | "governance" | "development";
export type TurnResult = { world: WorldState; message: string };
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
export function initialPlayerStats(){return {cash:120,reputation:20,trust:52,publicPressure:8,dailyIncome:5,dailyUpkeep:2};}
function statusFor(score:number):Relationship["status"]{return score>=65?"allied":score>=30?"friendly":score<=-65?"hostile":score<=-30?"rival":"neutral";}
function pairKey(a:string,b:string){return [a,b].sort().join("|");}
function setRelation(world:WorldState,a:string,b:string,score:number):Relationship[]{const key=pairKey(a,b);const rest=world.relationships.filter(r=>pairKey(r.fromFactionId,r.toFactionId)!==key);return [...rest,{fromFactionId:a,toFactionId:b,score:clamp(score,-100,100),status:statusFor(clamp(score,-100,100))}];}
function relationScore(world:WorldState,a:string,b:string){return world.relationships.find(r=>pairKey(r.fromFactionId,r.toFactionId)===pairKey(a,b))?.score??0;}
function event(world:WorldState,category:WorldEvent["category"],title:string,description:string):WorldEvent{return {id:"event-"+world.day+"-"+(world.events.length+1),day:world.day,category,title,description};}
function record(world:WorldState,message:string){return [message,...world.history].slice(0,150);}
export function advanceDay(world:WorldState):TurnResult{
 if(!world.player)return {world,message:"請先建立玩家組織，再開始每日回合。"};
 const current=world.playerStats??initialPlayerStats();const controlled=world.districts.filter(d=>d.controllerId==="player");
 const income=current.dailyIncome+controlled.reduce((sum,d)=>sum+Math.floor(d.economy*.025),0);const upkeep=current.dailyUpkeep+Math.max(0,Math.floor((controlled.length-1)/4));const cash=Math.max(0,current.cash+income-upkeep);const day=world.day+1;
 const playerStats={...current,cash,reputation:clamp(current.reputation+(controlled.length?1:0)),trust:clamp(current.trust+(current.cash>=upkeep?1:-2)),publicPressure:clamp(current.publicPressure+(controlled.some(d=>d.stability<42)?2:-1))};
 const districts=world.districts.map(d=>({...d,influences:{...d.influences}}));const factions=world.factions.map(f=>({...f}));const generatedEvents:WorldEvent[]=[];
 for(const faction of factions.filter(f=>f.id!=="player")){
  const target=districts.filter(d=>d.status!=="controlled"||d.controllerId===faction.id).sort((a,b)=>(a.influences[faction.id]??0)-(b.influences[faction.id]??0))[0];
  if(target){const drift=1+((world.seed+day*11+faction.id.length*7+target.id.length)%3);target.influences[faction.id]=clamp((target.influences[faction.id]??0)+drift);
   if(target.controllerId===null&&target.influences[faction.id]>=66&&target.status!=="neutral"){target.controllerId=faction.id;target.status="controlled";faction.strength=clamp(faction.strength+1,0,100);generatedEvents.push(event({...world,day,events:[...world.events,...generatedEvents]},"territory","地方網絡形成新控制",faction.name+"在"+target.name+"建立了穩定的地方影響。"));}
  }
  if(day%7===0)faction.cohesion=clamp(faction.cohesion+(faction.treasury>60?1:-1));faction.treasury=Math.max(0,faction.treasury+Math.floor(faction.strength*.04)-3);
 }
 if(day%7===0){const stable=districts.filter(d=>d.stability>=65).length;generatedEvents.push(event({...world,day,events:[...world.events,...generatedEvents]},"community","地方週報","本週共有 "+stable+" 個地盤維持穩定。地方組織持續調整資源與人際關係。"));}
 const people=world.people.map(p=>({...p,age:p.age+(day%365===0?1:0),health:clamp(p.health-(day%30===0?1:0))}));
 if(day%365===0)generatedEvents.push(event({...world,day,events:[...world.events,...generatedEvents]},"organization","年度人事檢視","新的一年開始，各組織重新評估幹部責任與長期接班安排。"));
 const history=generatedEvents.reduce((h,e)=>[e.title+"："+e.description,...h].slice(0,150),record(world,"第 "+day+" 天結算：收入 "+income+"、維持支出 "+upkeep+"，可用資金 "+cash+"。"));
 return {world:{...world,day,playerStats,districts,factions,people,events:[...generatedEvents,...world.events].slice(0,80),history},message:"第 "+day+" 天結算完成：收入 "+income+"、支出 "+upkeep+"，AI 勢力與地方事件已更新。"};
}
export function applyPolicy(world:WorldState,action:PolicyAction):TurnResult{
 if(!world.player)return {world,message:"請先建立玩家組織。"};const current=world.playerStats??initialPlayerStats();
 const policy:Record<PolicyAction,{cost:number;label:string}>={community:{cost:8,label:"地方公益"},governance:{cost:6,label:"內部治理"},development:{cost:14,label:"長期建設"}};
 const item=policy[action];if(current.cash<item.cost)return {world,message:"資金不足：此項政策需要 "+item.cost+" 點資金。"};
 const playerStats={...current,cash:current.cash-item.cost,reputation:clamp(current.reputation+(action==="community"?4:action==="development"?1:0)),trust:clamp(current.trust+(action==="governance"?5:action==="community"?2:1)),publicPressure:clamp(current.publicPressure-(action==="community"?3:action==="governance"?1:0)),dailyIncome:current.dailyIncome+(action==="development"?2:0)};
 return {world:{...world,playerStats,history:record(world,"玩家採取政策："+item.label+"。")},message:"已完成「"+item.label+"」，組織指標已更新。"};
}
export function claimDistrict(world:WorldState,districtId:string):TurnResult{
 if(!world.player)return {world,message:"請先建立玩家組織。"};const district=world.districts.find(d=>d.id===districtId);if(!district)return {world,message:"找不到指定地盤。"};if(district.controllerId)return {world,message:"此地盤已有主要控制者，請透過外交或競爭改變局勢。"};
 const current=world.playerStats??initialPlayerStats();const cost=district.status==="neutral"?32:22;if(current.cash<cost)return {world,message:"資金不足，需要 "+cost+" 點組織資源。"};
 const playerStats={...current,cash:current.cash-cost,reputation:clamp(current.reputation+2),publicPressure:clamp(current.publicPressure+(district.status==="neutral"?2:1))};
 const districts=world.districts.map(d=>d.id===districtId?{...d,controllerId:"player",status:"controlled" as const,influences:{...d.influences,player:78},stability:clamp(d.stability-2)}:d);const msg="玩家組織取得「"+district.name+"」的主要管理權。";
 return {world:{...world,playerStats,districts,history:record(world,msg)},message:msg};
}
export function negotiate(world:WorldState,factionId:string):TurnResult{
 if(!world.player)return {world,message:"請先建立玩家組織。"};const faction=world.factions.find(f=>f.id===factionId);if(!faction||factionId==="player")return {world,message:"找不到可交涉的組織。"};
 const current=world.playerStats??initialPlayerStats();if(current.cash<5)return {world,message:"資金不足，需要 5 點交涉資源。"};const score=clamp(relationScore(world,"player",factionId)+12,-100,100);const relationships=setRelation(world,"player",factionId,score);
 const playerStats={...current,cash:current.cash-5,trust:clamp(current.trust+1)};const msg="與「"+faction.name+"」完成一次公開協商，雙方關係目前為「"+statusFor(score)+"」。";
 return {world:{...world,playerStats,relationships,history:record(world,msg)},message:msg};
}
export function recruitPerson(world:WorldState):TurnResult{
 if(!world.player)return {world,message:"請先建立玩家組織。"};const current=world.playerStats??initialPlayerStats();const roster=world.people.filter(p=>p.factionId==="player"&&p.status==="active");
 if(roster.length>=8)return {world,message:"核心幹部已達 8 人上限。"};if(current.cash<30)return {world,message:"資金不足，需要 30 點招募資源。"};
 const names=["沈以安","方承志","江若彤","葉書廷","高予晴","邱柏翰","宋品妍","杜明軒","簡沛瑜","許庭維"];const index=(world.seed+world.day+roster.length*7)%names.length;
 const person:Person={id:"person-player-"+(roster.length+1),name:names[index],age:24+(world.seed+world.day)%24,factionId:"player",role:"核心幹部",leadership:40+(world.seed%31),management:45+((world.seed+17)%31),diplomacy:40+((world.seed+29)%31),loyalty:68,health:100,status:"active"};
 const playerStats={...current,cash:current.cash-30,trust:clamp(current.trust+2)};const msg="新幹部「"+person.name+"」加入組織，擅長管理與協調。";
 return {world:{...world,people:[...world.people,person],playerStats,history:record(world,msg)},message:msg};
}
export function resolveDispute(world:WorldState,districtId:string):TurnResult{
 if(!world.player)return {world,message:"請先建立玩家組織。"};const district=world.districts.find(d=>d.id===districtId);if(!district||!district.controllerId||district.controllerId==="player")return {world,message:"請選擇由其他組織控制的地盤。"};
 const current=world.playerStats??initialPlayerStats();const opponent=world.factions.find(f=>f.id===district.controllerId);if(!opponent)return {world,message:"無法辨識對方組織。"};if(current.cash<35)return {world,message:"資金不足，需要 35 點協調資源。"};
 const own=world.factions.find(f=>f.id==="player");const leaders=world.people.filter(p=>p.factionId==="player"&&p.status==="active");const talent=leaders.reduce((n,p)=>n+p.leadership*.15+p.diplomacy*.1,0);
 const roll=((world.seed+world.day*31+district.id.length*17)%21)-10;const score=(own?.strength??22)+current.reputation*.25+current.trust*.15+talent+roll;const defense=opponent.strength+district.stability*.3+(100-(district.influences.player??0))*.15;const won=score>=defense;
 const playerStats={...current,cash:current.cash-35,publicPressure:clamp(current.publicPressure+(won?5:9)),trust:clamp(current.trust+(won?2:-5)),reputation:clamp(current.reputation+(won?3:-2))};
 const districts=world.districts.map(d=>d.id!==districtId?d:won?{...d,controllerId:"player",status:"controlled" as const,influences:{...d.influences,player:82,[opponent.id]:Math.min(35,d.influences[opponent.id]??20)}}:{...d,stability:clamp(d.stability-5),influences:{...d.influences,player:clamp((d.influences.player??0)+8)}});
 const msg=won?"協調結果有利：玩家組織取得「"+district.name+"」的主要管理權。":"協調未能取得共識：「"+district.name+"」的局勢更加緊張。";
 return {world:{...world,playerStats,districts,history:record(world,msg)},message:msg};
}
export function developDistrict(world:WorldState,districtId:string):TurnResult{
 if(!world.player)return {world,message:"請先建立玩家組織。"};const district=world.districts.find(d=>d.id===districtId);if(!district||district.controllerId!=="player")return {world,message:"只能投資自己管理的地盤。"};
 const current=world.playerStats??initialPlayerStats();if(current.cash<18)return {world,message:"資金不足，需要 18 點建設資源。"};
 const playerStats={...current,cash:current.cash-18,reputation:clamp(current.reputation+1)};const districts=world.districts.map(d=>d.id===districtId?{...d,development:clamp(d.development+7),stability:clamp(d.stability+4),economy:clamp(d.economy+3)}:d);
 const msg="完成「"+district.name+"」的地方建設，發展與穩定度提升。";return {world:{...world,playerStats,districts,history:record(world,msg)},message:msg};
}