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
 const current=world.playerStats??initialPlayerStats();let player=world.player?{...world.player}:undefined;const controlled=world.districts.filter(d=>d.controllerId==="player");
 const income=current.dailyIncome+controlled.reduce((sum,d)=>sum+Math.floor(d.economy*.025),0);const upkeep=current.dailyUpkeep+Math.max(0,Math.floor((controlled.length-1)/4));const cash=Math.max(0,current.cash+income-upkeep);const day=world.day+1;
 const playerStats={...current,cash,reputation:clamp(current.reputation+(controlled.length?1:0)),trust:clamp(current.trust+(current.cash>=upkeep?1:-2)),publicPressure:clamp(current.publicPressure+(controlled.some(d=>d.stability<42)?2:-1))};
 const districts=world.districts.map(d=>{const playerControlled=d.controllerId==="player";const attention=playerControlled?clamp(d.governmentAttention+(playerStats.publicPressure>=55?2:playerStats.publicPressure<=25?-1:0)):d.governmentAttention;return {...d,governmentAttention:attention,stability:playerControlled&&attention>=80?clamp(d.stability-1):d.stability,influences:{...d.influences}};});const factions=world.factions.map(f=>({...f}));let relationships=[...world.relationships];let people=world.people.map(p=>{const age=p.age+(day%365===0?1:0);const health=clamp(p.health-(day%180===0?1:0));const retired=p.status==="active"&&(age>=78||health<=0);return {...p,age,health,status:retired?"retired" as const:p.status};});const generatedEvents:WorldEvent[]=[];
 const retiredLeaders=people.filter((p,i)=>p.role.includes("領導者")&&p.status==="retired"&&world.people[i].status==="active");
 for(const retired of retiredLeaders){let successor=people.find(p=>p.factionId===retired.factionId&&p.familyId===retired.familyId&&p.status==="active");if(successor){people=people.map(p=>p.id===successor?.id?{...p,age:Math.max(18,Math.min(p.age,retired.age-18)),generation:retired.generation+1,parentIds:[retired.id],role:"新任領導者",status:"active" as const}:p);}else{const id="person-successor-"+retired.id+"-"+day;successor={id,name:["林承岳","陳以晴","周家睿","許安然","沈柏廷"][((world.seed+day+retired.id.length)%5)],age:18,generation:retired.generation+1,factionId:retired.factionId,familyId:retired.familyId,parentIds:[retired.id],role:"新任領導者",leadership:45,management:48,diplomacy:50,loyalty:85,health:100,status:"active"};people.push(successor);}if(retired.factionId==="player"&&player)player.leaderName=successor.name;generatedEvents.push(event({...world,day,events:[...world.events,...generatedEvents]},"organization","家族世代交替",retired.name+"卸下領導職務，"+(successor?.name??"新任接班人")+"接續組織責任。"));}
 if(day%365===0){
  for(const faction of factions.filter(f=>f.isMajor&&f.id!=="player")){
   const turnoverSignal=(world.seed+day+faction.id.length*17)%7;
   const cadres=people.filter(p=>p.factionId===faction.id&&p.role==="核心幹部"&&p.status==="active").sort((a,b)=>a.loyalty-b.loyalty);
   if(cadres.length&&faction.cohesion<58&&turnoverSignal===0){
    const departing=cadres[0];people=people.map(p=>p.id===departing.id?{...p,status:"retired" as const,role:"離任幹部"}:p);
    const candidates=people.filter(p=>p.factionId===faction.id&&p.role==="重要成員"&&p.status==="active").sort((a,b)=>b.management-a.management);
    if(candidates[0])people=people.map(p=>p.id===candidates[0].id?{...p,role:"核心幹部",loyalty:clamp(p.loyalty+5)}:p);
    const eventText=departing.name+"離開核心管理層，組織依現有人才重新分配職責。";
    generatedEvents.push(event({...world,day,events:[...world.events,...generatedEvents]},"organization","核心幹部人事調整",faction.name+"："+eventText));
   }
  }
 }
 for(const faction of factions.filter(f=>f.id!=="player")){
  const target=districts.filter(d=>d.status!=="controlled"||d.controllerId===faction.id||(d.controllerId==="player"&&relationScore({...world,relationships},faction.id,"player")<=-30)).sort((a,b)=>(a.influences[faction.id]??0)-(b.influences[faction.id]??0))[0];
  if(target){const drift=1+((world.seed+day*11+faction.id.length*7+target.id.length)%3);target.influences[faction.id]=clamp((target.influences[faction.id]??0)+drift);if(target.controllerId==="player")target.influences.player=clamp((target.influences.player??0)-Math.max(1,Math.floor(drift/2)));
   if(target.controllerId===null&&target.influences[faction.id]>=66){target.controllerId=faction.id;target.status="controlled";faction.strength=clamp(faction.strength+1,0,100);generatedEvents.push(event({...world,day,events:[...world.events,...generatedEvents]},"territory","地方網絡形成新控制",faction.name+"在"+target.name+"建立了穩定的地方影響。"));}else if(target.controllerId==="player"&&target.influences[faction.id]>=70&&(target.influences.player??0)<55){target.controllerId=faction.id;target.status="controlled";generatedEvents.push(event({...world,day,events:[...world.events,...generatedEvents]},"territory","地盤控制權出現變化",faction.name+"在"+target.name+"取得更大的地方影響，原有控制關係發生變動。"));}
  }
  if(day%7===0)faction.cohesion=clamp(faction.cohesion+(faction.treasury>60?1:-1));faction.treasury=Math.max(0,faction.treasury+Math.floor(faction.strength*.04)-3);
 }
 const playerFaction=factions.find(f=>f.id==="player");
 if(playerFaction){playerFaction.treasury=playerStats.cash;playerFaction.cohesion=clamp(Math.round((playerStats.trust+100-playerStats.publicPressure)/2));playerFaction.strength=clamp(24+controlled.length*3+Math.floor(playerStats.reputation*.2));}
 if(day%14===0){const ai=factions.filter(f=>f.id!=="player");for(let i=0;i<ai.length;i++){for(let j=i+1;j<ai.length;j++){const old=relationScore({...world,relationships},""+ai[i].id,""+ai[j].id);const drift=((world.seed+day+i*13+j*7)%3)-1;relationships=setRelation({...world,relationships},ai[i].id,ai[j].id,old+drift);}}}
 if(day%30===0&&factions.filter(f=>!f.isMajor&&f.id!=="player").length<18&&districts.some(d=>d.status==="unclaimed"&&!d.controllerId)){
  const n=factions.filter(f=>!f.isMajor&&f.id!=="player").length+1;const id="emergent-"+day;const name=["新城共好社群","青禾地方聯盟","海風文化協會","城南生活網絡","山海青年會"][n%5]+" "+n;
  factions.push({id,name,archetype:"新興地方網絡",description:"由地方居民與新世代人物自然形成的虛構組織。",strength:16+((world.seed+day)%18),founded:2026+Math.floor(day/365),isMajor:false,cohesion:60,treasury:55});
  people.push({id:"person-"+id+"-leader",name:["葉以安","陳思妤","高子維","林沛蓉","周柏廷"][n%5],age:25+(n%18),factionId:id,familyId:"family-"+id,generation:1,parentIds:[],role:"領導者",leadership:45+(n%25),management:48+(n%27),diplomacy:52+(n%24),loyalty:80,health:100,status:"active"});
  for(const other of factions.filter(f=>f.id!==id))relationships.push({fromFactionId:id,toFactionId:other.id,score:0,status:"neutral"});
  generatedEvents.push(event({...world,day,events:[...world.events,...generatedEvents]},"organization","新興地方網絡成立",name+"由地方社群逐步凝聚成形，成為新的世界參與者。"));
 }
 if(day%7===0){const stable=districts.filter(d=>d.stability>=65).length;generatedEvents.push({...event({...world,day,events:[...world.events,...generatedEvents]},"community","地方週報","本週共有 "+stable+" 個地盤維持穩定。地方社群邀請你的組織參與公共活動。"),choices:[{id:"support",label:"投入社區活動（12）"},{id:"organize",label:"召開內部協調（8）"},{id:"decline",label:"婉拒邀請"}],resolved:false});}
 if(day%365===0)generatedEvents.push(event({...world,day,events:[...world.events,...generatedEvents]},"organization","年度人事檢視","新的一年開始，各組織重新評估幹部責任與長期接班安排。"));
 const history=generatedEvents.reduce((h,e)=>[e.title+"："+e.description,...h].slice(0,150),record(world,"第 "+day+" 天結算：收入 "+income+"、維持支出 "+upkeep+"，可用資金 "+cash+"。"));
 return {world:{...world,day,player,playerStats,districts,factions,people,relationships,events:[...generatedEvents,...world.events].slice(0,80),history},message:"第 "+day+" 天結算完成：收入 "+income+"、支出 "+upkeep+"，AI 勢力與地方事件已更新。"};
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
 const person:Person={id:"person-player-"+(roster.length+1),name:names[index],age:24+(world.seed+world.day)%24,factionId:"player",familyId:"family-staff-"+(roster.length+1),generation:1,parentIds:[],role:"核心幹部",leadership:40+(world.seed%31),management:45+((world.seed+17)%31),diplomacy:40+((world.seed+29)%31),loyalty:68,health:100,status:"active"};
 const playerStats={...current,cash:current.cash-30,trust:clamp(current.trust+2),dailyUpkeep:current.dailyUpkeep+1};const msg="新幹部「"+person.name+"」加入組織，擅長管理與協調。";
 return {world:{...world,people:[...world.people,person],playerStats,history:record(world,msg)},message:msg};
}
export function resolveDispute(world:WorldState,districtId:string):TurnResult{
 if(!world.player)return {world,message:"請先建立玩家組織。"};const district=world.districts.find(d=>d.id===districtId);if(!district||!district.controllerId||district.controllerId==="player")return {world,message:"請選擇由其他組織控制的地盤。"};
 const current=world.playerStats??initialPlayerStats();const opponent=world.factions.find(f=>f.id===district.controllerId);if(!opponent)return {world,message:"無法辨識對方組織。"};if(current.cash<35)return {world,message:"資金不足，需要 35 點協調資源。"};
 const own=world.factions.find(f=>f.id==="player");const leaders=world.people.filter(p=>p.factionId==="player"&&p.status==="active");const talent=leaders.reduce((n,p)=>n+p.leadership*.15+p.diplomacy*.1,0);
 const roll=((world.seed+world.day*31+district.id.length*17+world.history.length*13)%21)-10;const score=(own?.strength??22)+current.reputation*.3+current.trust*.2+talent*.6+roll;const defense=opponent.strength*.55+district.stability*.15+(100-(district.influences.player??0))*.08;const won=score>=defense;
 const playerStats={...current,cash:current.cash-35,publicPressure:clamp(current.publicPressure+(won?5:9)),trust:clamp(current.trust+(won?2:-5)),reputation:clamp(current.reputation+(won?3:-2))};
 const relationships=setRelation(world,"player",opponent.id,relationScore(world,"player",opponent.id)+(won?-5:-15));const districts=world.districts.map(d=>d.id!==districtId?d:won?{...d,controllerId:"player",status:"controlled" as const,influences:{...d.influences,player:82,[opponent.id]:Math.min(35,d.influences[opponent.id]??20)}}:{...d,stability:clamp(d.stability-5),influences:{...d.influences,player:clamp((d.influences.player??0)+8)}});
 const msg=won?"協調結果有利：玩家組織取得「"+district.name+"」的主要管理權。":"協調未能取得共識：「"+district.name+"」的局勢更加緊張。";
 return {world:{...world,playerStats,districts,relationships,history:record(world,msg)},message:msg};
}
export function developDistrict(world:WorldState,districtId:string):TurnResult{
 if(!world.player)return {world,message:"請先建立玩家組織。"};const district=world.districts.find(d=>d.id===districtId);if(!district||district.controllerId!=="player")return {world,message:"只能投資自己管理的地盤。"};
 const current=world.playerStats??initialPlayerStats();if(current.cash<18)return {world,message:"資金不足，需要 18 點建設資源。"};
 const playerStats={...current,cash:current.cash-18,reputation:clamp(current.reputation+1)};const districts=world.districts.map(d=>d.id===districtId?{...d,development:clamp(d.development+7),stability:clamp(d.stability+4),economy:clamp(d.economy+3)}:d);
 const msg="完成「"+district.name+"」的地方建設，發展與穩定度提升。";return {world:{...world,playerStats,districts,history:record(world,msg)},message:msg};
}
export function resolveWorldEvent(world:WorldState,eventId:string,choiceId:string):TurnResult{
 if(!world.player)return {world,message:"請先建立玩家組織。"};
 const target=world.events.find(e=>e.id===eventId);if(!target||target.resolved||!target.choices?.some(c=>c.id===choiceId))return {world,message:"這項事件已處理或選項不存在。"};
 const current=world.playerStats??initialPlayerStats();
 const cost=choiceId==="support"?12:choiceId==="organize"?8:0;
 if(current.cash<cost)return {world,message:"資金不足，無法執行這項事件決策。"};
 const playerStats={...current,cash:current.cash-cost,reputation:clamp(current.reputation+(choiceId==="support"?4:choiceId==="organize"?1:0)),trust:clamp(current.trust+(choiceId==="support"?3:choiceId==="organize"?5:-2)),publicPressure:clamp(current.publicPressure+(choiceId==="support"?-3:choiceId==="decline"?2:-1))};
 const events=world.events.map(e=>e.id===eventId?{...e,resolved:true}:e);
 const label=target.choices.find(c=>c.id===choiceId)?.label??choiceId;
 const msg="事件決策「"+target.title+"」：選擇"+label+"。";
 return {world:{...world,playerStats,events,history:record(world,msg)},message:msg};
}
