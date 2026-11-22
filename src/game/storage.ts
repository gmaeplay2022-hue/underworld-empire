import type { Faction, Person, Relationship, WorldEvent, WorldState } from "./world";
const DB_NAME="jianghu-local";const DB_VERSION=2;const STORE="worlds";
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,DB_VERSION);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"slot"});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export type SaveSlot={slot:number;label:string;world:WorldState;savedAt:string};
const clamp=(n:number)=>Math.max(0,Math.min(100,Number.isFinite(n)?n:50));
export function migrateWorld(input:unknown):WorldState{
 if(!input||typeof input!=="object")throw new Error("存檔格式錯誤");
 const raw=input as Partial<WorldState>&{factions?:Array<Partial<Faction>&{id:string}>;people?:Person[];relationships?:Relationship[];events?:WorldEvent[]};
 if(!Array.isArray(raw.counties)||!Array.isArray(raw.districts)||!Array.isArray(raw.factions))throw new Error("存檔缺少必要世界資料");
 const factions=raw.factions.map(f=>({...f,cohesion:clamp(f.cohesion??60),treasury:Math.max(0,f.treasury??100)} as Faction));
 const people=Array.isArray(raw.people)?raw.people.map(p=>({...p,familyId:p.familyId??"family-"+p.factionId,generation:p.generation??1,parentIds:p.parentIds??[]})):factions.map((f,i)=>({id:"migrated-"+f.id+"-leader",name:["陳文岳","周明哲","林志遠","許家豪","郭承恩","黃柏勳"][i%6],age:42,factionId:f.id,familyId:"family-"+f.id,generation:1,parentIds:[],role:"領導者",leadership:55,management:55,diplomacy:50,loyalty:75,health:90,status:"active" as const}));
 const relationships=Array.isArray(raw.relationships)?raw.relationships:[];
 const events=Array.isArray(raw.events)?raw.events:[{id:"migration-"+(raw.day??1),day:raw.day??1,category:"organization" as const,title:"存檔資料升級",description:"舊版世界已升級至目前資料格式。"}];
 return {...raw,schemaVersion:2,generatorVersion:"1.0.0",day:Math.max(1,raw.day??1),factions,people,relationships,events,history:Array.isArray(raw.history)?raw.history:[],playerStats:raw.playerStats} as WorldState;
}
// Serialize writes per slot: a slow older autosave must never overwrite a newer state.
const writeQueues=new Map<number,Promise<void>>();
export function enqueueSlotWrite<K>(queues:Map<K,Promise<void>>,key:K,operation:()=>Promise<void>):Promise<void>{
 const previous=queues.get(key)??Promise.resolve();
 const current=previous.catch(()=>{}).then(operation);
 queues.set(key,current);
 return current.finally(()=>{if(queues.get(key)===current)queues.delete(key);});
}
export function saveWorld(slot:number,world:WorldState):Promise<void>{
 if(!Number.isInteger(slot)||slot<0||slot>10)return Promise.reject(new Error("存檔槽必須介於 0 到 10"));
 const snapshot=migrateWorld(structuredClone(world));
 return enqueueSlotWrite(writeQueues,slot,async()=>{
  const db=await openDb();
  try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put({slot,label:snapshot.name,world:snapshot,savedAt:new Date().toISOString()} satisfies SaveSlot);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  finally{db.close();}
 });
}
export async function loadWorld(slot:number):Promise<WorldState|null>{
 const queued=writeQueues.get(slot);if(queued)await queued.catch(()=>{});
 const db=await openDb();
 try{const value=await new Promise<SaveSlot|undefined>((resolve,reject)=>{const request=db.transaction(STORE).objectStore(STORE).get(slot);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});return value?.world?migrateWorld(value.world):null;}
 finally{db.close();}
}
export async function listSaves():Promise<Array<{slot:number;label:string;savedAt:string}>>{
 await Promise.all([...writeQueues.values()].map(p=>p.catch(()=>{})));
 const db=await openDb();
 try{const values=await new Promise<SaveSlot[]>((resolve,reject)=>{const request=db.transaction(STORE).objectStore(STORE).getAll();request.onsuccess=()=>resolve(request.result as SaveSlot[]);request.onerror=()=>reject(request.error);});return values.map(({slot,label,savedAt})=>({slot,label,savedAt})).sort((a,b)=>a.slot-b.slot);}
 finally{db.close();}
}
export function exportWorld(world:WorldState){return JSON.stringify(migrateWorld(world),null,2);}
export async function importWorld(slot:number,json:string){const parsed=JSON.parse(json) as unknown;const world=migrateWorld(parsed);await saveWorld(slot,world);return world;}
