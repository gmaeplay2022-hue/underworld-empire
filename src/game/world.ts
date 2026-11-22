export type County = { id: string; name: string; region: string; districts: number; x: number; y: number; economy: number; population: number };
export type Faction = { id: string; name: string; archetype: string; description: string; strength: number; founded: number; isMajor: boolean };
export type District = { id: string; countyId: string; name: string; population: number; economy: number; development: number; stability: number; governmentAttention: number; controllerId: string | null; influences: Record<string, number>; status: "controlled" | "neutral" | "unclaimed" };
export type WorldState = { player?: { organizationName: string; leaderName: string; startDistrictId: string }; schemaVersion: 1; generatorVersion: "0.2.0"; seed: number; name: string; day: number; difficulty: "standard"; counties: County[]; factions: Faction[]; districts: District[]; history: string[]; createdAt: string };

const countyRows: Array<[string,string,number,number,number]> = [
  ["taipei","台北市",6,9,2],["new-taipei","新北市",6,8,3],["keelung","基隆市",3,11,2],["taoyuan","桃園市",5,7,4],["hsinchu-city","新竹市",3,6,5],["hsinchu-county","新竹縣",5,8,5],
  ["miaoli","苗栗縣",4,7,6],["taichung","台中市",6,8,7],["changhua","彰化縣",5,7,8],["nantou","南投縣",4,9,8],["yunlin","雲林縣",4,7,9],
  ["chiayi-city","嘉義市",3,8,10],["chiayi-county","嘉義縣",4,9,10],["tainan","台南市",5,8,11],["kaohsiung","高雄市",6,9,12],["pingtung","屏東縣",5,10,13],
  ["yilan","宜蘭縣",5,12,4],["hualien","花蓮縣",4,12,7],["taitung","台東縣",4,12,10],["penghu","澎湖縣",3,3,10],["kinmen","金門縣",3,2,13],["lienchiang","連江縣",3,4,1]
];
export const COUNTY_DEFINITIONS: County[] = countyRows.map(([id,name,districts,x,y],i)=>({id,name,region:i<6?"北部":i<11?"中部":i<16?"南部":i<19?"東部":"離島",districts,x,y,economy:0,population:0}));
export const INITIAL_DISTRICT_COUNT = COUNTY_DEFINITIONS.reduce((n,c)=>n+c.districts,0);

const archetypes = [
  ["老牌地方組織","重視傳承與地方關係，行事謹慎。"],
  ["都會型組織","擅長整合資源，重視聲望與組織效率。"],
  ["家族型組織","內部關係緊密，重視世代與忠誠。"],
  ["新興組織","組織年輕、彈性高，發展方向仍在變化。"],
  ["跨區域組織","具有跨地區人脈，管理與協調成本較高。"],
  ["保守型組織","優先維持穩定，較少採取高風險決策。"],
  ["擴張型組織","積極尋求發展機會，但容易引發競爭。"],
  ["轉型中的組織","正經歷領導與組織結構調整。"]
] as const;
const nameA = ["青岑","遠川","東序","長夜","白潮","新港","山河","霧城","南庭","北辰","群岳","明川"];
const nameB = ["會","社","堂","聯盟","同盟","商會","協進會","家族"];
const localNames = ["榕樹里聯誼會","溪畔地方網絡","港灣商圈協會","山城文化社群","舊城街坊會","新城共好聯盟","海風地方協會","中央市場自治會","南境青年社群","河岸生活協會"];
const districtWords = ["北城","中城","南城","東岸","西門","河岸","新站","舊城","港灣","山城","林園","商業核心","文教區","工業帶","外圍城鎮","海線","丘陵","新市鎮"];
function rng(seed:number){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function pick<T>(r:()=>number,items:readonly T[]):T{return items[Math.floor(r()*items.length)];}
function shuffle<T>(r:()=>number,items:T[]):T[]{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function createWorld(seed:number,difficulty:"standard"="standard"):WorldState{
 const r=rng(seed); const counties=COUNTY_DEFINITIONS.map(c=>({...c,population:Math.round((35+r()*165)*1000),economy:Math.round(25+r()*75)}));
 const factions:Faction[]=archetypes.map((a,i)=>({id:"major-"+(i+1),name:nameA[Math.floor(r()*nameA.length)]+nameB[Math.floor(r()*nameB.length)],archetype:a[0],description:a[1],strength:35+Math.floor(r()*46),founded:1985+Math.floor(r()*35),isMajor:true}));
 const localCount=8+Math.floor(r()*3);
 for(let i=0;i<localCount;i++) factions.push({id:"local-"+(i+1),name:localNames[i%localNames.length],archetype:"地方網絡",description:"由地方人物與社群關係逐步形成的虛構地方組織。",strength:12+Math.floor(r()*24),founded:2005+Math.floor(r()*20),isMajor:false});
 const districts:District[]=[]; let index=0;
 for(const county of counties){const used=new Set<string>();for(let j=0;j<county.districts;j++){let name=pick(r,districtWords);let attempts=0;while(used.has(name)&&attempts++<30)name=pick(r,districtWords);used.add(name);districts.push({id:"d-"+String(++index).padStart(3,"0"),countyId:county.id,name,population:Math.round(8+r()*52),economy:Math.round(15+r()*85),development:Math.round(20+r()*80),stability:Math.round(45+r()*50),governmentAttention:Math.round(5+r()*55),controllerId:null,influences:{},status:"unclaimed"});}}
 const order=shuffle(r,districts);
 // Balanced opening: 40 districts held by a variable subset of major factions, 12 by local groups, 18 neutral, 26 unclaimed.
 const activeMajors=shuffle(r,factions.slice(0,8)).slice(0,6+Math.floor(r()*3));
 order.slice(0,40).forEach((d,i)=>{const f=activeMajors[i%activeMajors.length];d.controllerId=f.id;d.status="controlled";d.influences[f.id]=55+Math.floor(r()*36);});
 order.slice(40,52).forEach((d,i)=>{const f=factions[8+(i%localCount)];d.controllerId=f.id;d.status="controlled";d.influences[f.id]=50+Math.floor(r()*35);});
 order.slice(52,70).forEach(d=>{d.status="neutral";d.stability=65+Math.floor(r()*30);});
 for(const d of districts){if(d.controllerId){for(const f of shuffle(r,factions.filter(f=>f.id!==d.controllerId)).slice(0,1+Math.floor(r()*2)))d.influences[f.id]=8+Math.floor(r()*24);} }
 return {schemaVersion:1,generatorVersion:"0.2.0",seed,name:"江湖世界・"+seed,day:1,difficulty,counties,factions,districts,history:["世界建立：各地區的地方網絡與組織開始形成新的局勢。"],createdAt:new Date().toISOString()};
}
export function seedFromNow(){return (Date.now() ^ Math.floor(Math.random()*0xffffffff))>>>0;}
export function countWorld(world:WorldState){return {districts:world.districts.length,controlled:world.districts.filter(d=>d.controllerId).length,neutral:world.districts.filter(d=>d.status==="neutral").length,unclaimed:world.districts.filter(d=>d.status==="unclaimed").length,factions:world.factions.length};}
