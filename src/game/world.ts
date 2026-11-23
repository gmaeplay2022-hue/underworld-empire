export type County = { id: string; name: string; region: string; districts: number; x: number; y: number; economy: number; population: number };
export type Faction = { id: string; name: string; archetype: string; description: string; strength: number; founded: number; isMajor: boolean; cohesion: number; treasury: number; headquartersCountyId?: string; influenceCountyIds?: string[]; goals?: string[]; internalTension?: number; worldRole?: string };
export type Person = { id: string; name: string; age: number; factionId: string; familyId: string; generation: number; parentIds: string[]; role: string; combat: number; intelligence: number; leadership: number; charisma: number; management: number; loyalty: number; diplomacy?: number; health: number; status: "active" | "retired"; personality?: string; values?: string; ambition?: string; skills?: string[]; trust?: number; affinity?: number; respect?: number; fear?: number; background?: string; };
export type Relationship = { fromFactionId: string; toFactionId: string; score: number; status: "allied" | "friendly" | "neutral" | "rival" | "hostile" };
export type WorldEvent = { id: string; day: number; category: "community" | "organization" | "diplomacy" | "economy" | "territory"; title: string; description: string; choices?: Array<{id:string;label:string}>; resolved?: boolean };
export type District = { id: string; countyId: string; name: string; population: number; economy: number; development: number; stability: number; governmentAttention: number; controllerId: string | null; influences: Record<string, number>; status: "controlled" | "neutral" | "unclaimed" };
export type PlayerStats = { cash: number; reputation: number; trust: number; publicPressure: number; dailyIncome: number; dailyUpkeep: number };
export type WorldState = { player?: { organizationName: string; leaderName: string; startDistrictId: string; birthplace?: string }; playerStats?: PlayerStats; schemaVersion: 2; generatorVersion: "1.0.0" | "1.1.0"; seed: number; name: string; day: number; difficulty: "standard"; worldTendency?: string; counties: County[]; factions: Faction[]; districts: District[]; people: Person[]; relationships: Relationship[]; events: WorldEvent[]; history: string[]; createdAt: string };

const countyRows: Array<[string,string,number,number,number]> = [
  ["taipei","台北市",6,9,2],["new-taipei","新北市",6,8,3],["keelung","基隆市",3,11,2],["taoyuan","桃園市",5,7,4],["hsinchu-city","新竹市",3,6,5],["hsinchu-county","新竹縣",5,8,5],
  ["miaoli","苗栗縣",4,7,6],["taichung","台中市",6,8,7],["changhua","彰化縣",5,7,8],["nantou","南投縣",4,9,8],["yunlin","雲林縣",4,7,9],
  ["chiayi-city","嘉義市",3,8,10],["chiayi-county","嘉義縣",4,9,10],["tainan","台南市",5,8,11],["kaohsiung","高雄市",6,9,12],["pingtung","屏東縣",5,10,13],
  ["yilan","宜蘭縣",5,12,4],["hualien","花蓮縣",4,12,7],["taitung","台東縣",4,12,10],["penghu","澎湖縣",3,3,10],["kinmen","金門縣",3,2,13],["lienchiang","連江縣",3,4,1]
];
export const COUNTY_DEFINITIONS: County[] = countyRows.map(([id,name,districts,x,y],i)=>({id,name,region:i<6?"北部":i<11?"中部":i<16?"南部":i<19?"東部":"離島",districts,x,y,economy:0,population:0}));
export const INITIAL_DISTRICT_COUNT = COUNTY_DEFINITIONS.reduce((n,c)=>n+c.districts,0);

const archetypes = [
  {type:"地方組織",description:"以地方人際網絡、社區信任與組織凝聚為發展基礎。",size:"medium",count:2},
  {type:"商業勢力",description:"以資金、合法商業往來與跨業合作建立影響力。",size:"large",count:1},
  {type:"地方派系",description:"重視地方聲望、公共關係與地方議題的協調。",size:"medium",count:1},
  {type:"產業勢力",description:"以產業鏈、物流、建設與區域資源形成長期布局。",size:"large",count:1},
  {type:"地下勢力",description:"以非正式人際網絡與組織整合形成虛構競爭關係。",size:"small",count:1},
  {type:"地下勢力",description:"重視組織紀律、內部整合與長期生存。",size:"medium",count:1},
  {type:"外來勢力",description:"具跨區域聯繫，持續尋找在地合作與發展機會。",size:"medium",count:1}
] as const;
const nameA = ["青岑","遠川","東序","長夜","白潮","新港","山河","霧城","南庭","北辰","群岳","明川","松嶺","海隅","禾川","星野"];
const nameB = ["會","社","堂","聯盟","同盟","商會","協進會","家族","企業聯合","發展會"];
const localNames = ["榕樹里聯誼會","溪畔地方網絡","港灣商圈協會","山城文化社群","舊城街坊會","新城共好聯盟","海風地方協會","中央市場自治會","南境青年社群","河岸生活協會"];
const districtWords = ["北城","中城","南城","東岸","西門","河岸","新站","舊城","港灣","山城","林園","商業核心","文教區","工業帶","外圍城鎮","海線","丘陵","新市鎮"];
const surnames=["陳","林","黃","張","李","王","吳","劉","蔡","楊","許","鄭","謝","郭","洪","曾","邱","廖","周","徐"];
const givenNames=["文岳","明哲","志遠","家豪","承恩","柏勳","建宏","立群","宗翰","宇翔","以安","思妤","子維","沛蓉","柏廷","安然","承岳","佳穎","冠宇","雅婷","昱辰","品妍","家睿","語彤"];
const personalities=["沉穩務實","擅長協調","果斷強勢","謹慎保守","重視人情","理性計算","理想導向","外柔內剛","積極進取","低調觀察"];
const values=["重視承諾與信任","重視秩序與穩定","重視公平與聲望","重視家庭與傳承","重視效率與成果","重視自主與改革"];
const ambitions=["維持組織長期穩定","擴大地方合作網絡","培養可靠的接班團隊","改善地方公共環境","取得更大的決策責任","推動組織轉型"];
const skills=["組織管理","溝通協調","財務規劃","公共關係","產業經營","人才培育","策略判斷","地方服務"];
const tendencies=["商業競逐型","地方派系型","產業發展型","權力競爭型","外來勢力型"];
function rng(seed:number){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function pick<T>(r:()=>number,items:readonly T[]):T{return items[Math.floor(r()*items.length)];}
function shuffle<T>(r:()=>number,items:T[]):T[]{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function personName(r:()=>number){return pick(r,surnames)+pick(r,givenNames);}
function makePerson(r:()=>number,id:string,factionId:string,role:string,age:number,familyId:string,generation=1,parentIds:string[]=[]):Person{
 const personality=pick(r,personalities);
 return {id,name:personName(r),age,factionId,familyId,generation,parentIds,role,combat:25+Math.floor(r()*71),intelligence:35+Math.floor(r()*61),leadership:35+Math.floor(r()*61),charisma:30+Math.floor(r()*66),management:35+Math.floor(r()*61),loyalty:45+Math.floor(r()*51),health:75+Math.floor(r()*26),status:"active",personality,values:pick(r,values),ambition:pick(r,ambitions),skills:shuffle(r,skills).slice(0,2+Math.floor(r()*2)),trust:35+Math.floor(r()*61),affinity:25+Math.floor(r()*71),respect:25+Math.floor(r()*71),fear:Math.floor(r()*41),background:"出身與經歷依本世界種子生成的虛構人物。"};
}
export function createWorld(seed:number,difficulty:"standard"="standard"):WorldState{
 const r=rng(seed); const counties=COUNTY_DEFINITIONS.map(c=>({...c,population:Math.round((35+r()*165)*1000),economy:Math.round(25+r()*75)}));
 const usedFactionNames=new Set<string>();
 const specs=archetypes.flatMap(a=>Array.from({length:a.count},()=>a));
 const shuffledSpecs=shuffle(r,[...specs]);const headquartersOrder=shuffle(r,counties);
 const factions:Faction[]=shuffledSpecs.map((a,i)=>{let name=pick(r,nameA)+pick(r,nameB);while(usedFactionNames.has(name))name=pick(r,nameA)+pick(r,nameB);usedFactionNames.add(name);const headquarters=headquartersOrder[i];const size=a.size;const strength=size==="large"?62+Math.floor(r()*20):size==="small"?25+Math.floor(r()*20):42+Math.floor(r()*27);return {id:"major-"+(i+1),name,archetype:a.type,description:a.description,strength,founded:1985+Math.floor(r()*35),isMajor:true,cohesion:50+Math.floor(r()*46),treasury:size==="large"?380+Math.floor(r()*220):size==="small"?90+Math.floor(r()*100):190+Math.floor(r()*210),headquartersCountyId:headquarters.id,influenceCountyIds:[headquarters.id,...shuffle(r,counties.filter(c=>c.id!==headquarters.id)).slice(0,1+Math.floor(r()*3)).map(c=>c.id)],goals:shuffle(r,ambitions).slice(0,2),internalTension:Math.floor(r()*46),worldRole:a.type};});
 const localCount=8+Math.floor(r()*3);
 for(let i=0;i<localCount;i++){const headquarters=pick(r,counties);factions.push({id:"local-"+(i+1),name:localNames[i%localNames.length]+"・"+pick(r,["東區","西區","新城","河岸","港區","山城"]),archetype:"地方網絡",description:"由地方人物與社群關係逐步形成的虛構地方組織。",strength:12+Math.floor(r()*24),founded:2005+Math.floor(r()*20),isMajor:false,cohesion:50+Math.floor(r()*35),treasury:45+Math.floor(r()*100),headquartersCountyId:headquarters.id,influenceCountyIds:[headquarters.id],goals:shuffle(r,ambitions).slice(0,1),internalTension:Math.floor(r()*35)});}
 const districts:District[]=[];let index=0;
 for(const county of counties){const used=new Set<string>();for(let j=0;j<county.districts;j++){let name=pick(r,districtWords);let attempts=0;while(used.has(name)&&attempts++<30)name=pick(r,districtWords);used.add(name);districts.push({id:"d-"+String(++index).padStart(3,"0"),countyId:county.id,name,population:Math.round(8+r()*52),economy:Math.round(15+r()*85),development:Math.round(20+r()*80),stability:Math.round(45+r()*50),governmentAttention:Math.round(5+r()*55),controllerId:null,influences:{},status:"unclaimed"});}}
 const order=shuffle(r,districts);const activeMajors=shuffle(r,factions.slice(0,8)).slice(0,6+Math.floor(r()*3));
 const headquarterDistricts:District[]=[];for(const faction of activeMajors){const home=shuffle(r,districts.filter(d=>d.countyId===faction.headquartersCountyId&&!d.controllerId))[0];if(home)headquarterDistricts.push(home);}
 headquarterDistricts.forEach((d,i)=>{const f=activeMajors[i];d.controllerId=f.id;d.status="controlled";d.influences[f.id]=65+Math.floor(r()*26);});
 const remainingMajorDistricts=order.filter(d=>!d.controllerId).slice(0,Math.max(0,40-headquarterDistricts.length));
 remainingMajorDistricts.forEach((d,i)=>{const f=activeMajors[i%activeMajors.length];d.controllerId=f.id;d.status="controlled";d.influences[f.id]=55+Math.floor(r()*36);});
 const remainingAfterMajor=shuffle(r,districts.filter(d=>!d.controllerId));
 remainingAfterMajor.slice(0,12).forEach((d,i)=>{const f=factions[8+(i%localCount)];d.controllerId=f.id;d.status="controlled";d.influences[f.id]=50+Math.floor(r()*35);});
 remainingAfterMajor.slice(12,30).forEach(d=>{d.status="neutral";d.stability=65+Math.floor(r()*30);});
 for(const d of districts){if(d.controllerId){for(const f of shuffle(r,factions.filter(f=>f.id!==d.controllerId)).slice(0,1+Math.floor(r()*2)))d.influences[f.id]=8+Math.floor(r()*24);}}
 const people:Person[]=[];
 for(const f of factions){const leader=makePerson(r,"person-"+f.id+"-leader",f.id,"領導者",38+Math.floor(r()*24),"family-"+f.id);people.push(leader);const cadreCount=2+Math.floor(r()*2);for(let i=0;i<cadreCount;i++)people.push(makePerson(r,"person-"+f.id+"-cadre-"+(i+1),f.id,"核心幹部",29+Math.floor(r()*27),"family-"+f.id));const memberCount=3+Math.floor(r()*3);for(let i=0;i<memberCount;i++)people.push(makePerson(r,"person-"+f.id+"-member-"+(i+1),f.id,"重要成員",22+Math.floor(r()*35),"family-"+f.id));}
 for(let i=0;i<6;i++)people.push(makePerson(r,"person-local-key-"+(i+1),"independent-local","地方關鍵人物",32+Math.floor(r()*35),"family-local-"+(i+1)));
 const institutionRoles=["政治人物","行政人物","執法人員","司法人物"];
 institutionRoles.forEach((role,i)=>people.push(makePerson(r,"person-institution-"+(i+1),"institution-"+(i+1),role,40+Math.floor(r()*20),"family-institution-"+(i+1))));
 const relations=factions.flatMap((f,i)=>factions.slice(i+1).map(other=>{let score=Math.floor(r()*61)-30;const sameRegion=f.headquartersCountyId===other.headquartersCountyId;if(sameRegion)score-=12;const businessPair=["商業勢力","產業勢力"].includes(f.archetype)&&["商業勢力","產業勢力"].includes(other.archetype);if(businessPair)score+=18;score=Math.max(-85,Math.min(85,score));return {fromFactionId:f.id,toFactionId:other.id,score,status:(score>=65?"allied":score>=30?"friendly":score<=-65?"hostile":score<=-30?"rival":"neutral") as Relationship["status"]};}));
 const events:WorldEvent[]=[{id:"event-1",day:1,category:"community",title:"新局勢形成",description:"各地地方網絡開始觀察新世界的變化，新的合作與競爭關係逐漸浮現。"}];
 return {schemaVersion:2,generatorVersion:"1.1.0",seed,name:"江湖世界・"+seed,day:1,difficulty,worldTendency:pick(r,tendencies),counties,factions,districts,people,relationships:relations,events,history:["世界建立：八大核心勢力、地方網絡與重要人物已依世界種子形成初始局勢。"],createdAt:new Date().toISOString()};
}
export function seedFromNow(){return (Date.now() ^ Math.floor(Math.random()*0xffffffff))>>>0;}
export function countWorld(world:WorldState){return {districts:world.districts.length,controlled:world.districts.filter(d=>d.controllerId).length,neutral:world.districts.filter(d=>d.status==="neutral").length,unclaimed:world.districts.filter(d=>d.status==="unclaimed").length,factions:world.factions.length};}
