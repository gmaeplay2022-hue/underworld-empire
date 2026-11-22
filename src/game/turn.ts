import type { PlayerStats, WorldState } from "./world";

export type PolicyAction = "community" | "governance" | "development";
export type TurnResult = { world: WorldState; message: string };

export function initialPlayerStats(): PlayerStats {
  return { cash: 100, reputation: 20, trust: 50, publicPressure: 10, dailyIncome: 4, dailyUpkeep: 2 };
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function advanceDay(world: WorldState): TurnResult {
  if (!world.player) return { world, message: "請先建立玩家組織，再開始每日回合。" };
  const current = world.playerStats ?? initialPlayerStats();
  const controlled = world.districts.filter(d => d.controllerId === "player");
  const territoryIncome = controlled.reduce((sum, d) => sum + Math.floor(d.economy * 0.025), 0);
  const income = current.dailyIncome + territoryIncome;
  const upkeep = current.dailyUpkeep + Math.max(0, Math.floor((controlled.length - 1) / 4));
  const cash = Math.max(0, current.cash + income - upkeep);
  const nextDay = world.day + 1;
  const pressureDelta = controlled.some(d => d.stability < 45) ? 2 : -1;
  const playerStats: PlayerStats = {
    ...current,
    cash,
    reputation: clamp(current.reputation + (controlled.length > 0 ? 1 : 0)),
    trust: clamp(current.trust + (current.cash >= upkeep ? 1 : -1)),
    publicPressure: clamp(current.publicPressure + pressureDelta),
  };

  // AI influence changes are abstract simulation values; control does not change automatically.
  const districts = world.districts.map(district => {
    const influences = { ...district.influences };
    for (const faction of world.factions) {
      if (faction.id === district.controllerId) continue;
      const drift = ((world.seed + nextDay * 17 + faction.id.length * 13 + district.id.length) % 3);
      if (drift > 0 && (district.status === "neutral" || district.status === "unclaimed" || influences[faction.id] !== undefined)) {
        influences[faction.id] = clamp((influences[faction.id] ?? 0) + drift, 0, 100);
      }
    }
    return { ...district, influences };
  });
  const entry = `第 ${nextDay} 天結算：收入 ${income}、維持支出 ${upkeep}，可用資金 ${cash}。`;
  const history = [entry, ...world.history].slice(0, 100);
  return { world: { ...world, day: nextDay, playerStats, districts, history }, message: entry };
}

export function applyPolicy(world: WorldState, action: PolicyAction): TurnResult {
  if (!world.player) return { world, message: "請先建立玩家組織。" };
  const current = world.playerStats ?? initialPlayerStats();
  const policies: Record<PolicyAction, { cost: number; message: string }> = {
    community: { cost: 8, message: "投入地方公共活動，社區信任與聲望有所提升。" },
    governance: { cost: 6, message: "完善內部制度與分工，團隊信任更加穩固。" },
    development: { cost: 14, message: "投入合法地方建設與組織能力，未來每日收入提高。" },
  };
  const policy = policies[action];
  if (current.cash < policy.cost) return { world, message: `資金不足：此項政策需要 ${policy.cost} 點資金。` };
  const playerStats: PlayerStats = {
    ...current,
    cash: current.cash - policy.cost,
    reputation: clamp(current.reputation + (action === "community" ? 4 : action === "development" ? 1 : 0)),
    trust: clamp(current.trust + (action === "governance" ? 5 : action === "community" ? 2 : 1)),
    publicPressure: clamp(current.publicPressure - (action === "community" ? 3 : action === "governance" ? 1 : 0)),
    dailyIncome: current.dailyIncome + (action === "development" ? 2 : 0),
  };
  return { world: { ...world, playerStats }, message: policy.message };
}
