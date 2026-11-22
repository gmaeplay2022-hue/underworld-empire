import { useMemo, useState } from "react";
import WorldGame from "./WorldGame";

type Stats = { reputation: number; trust: number; cash: number; heat: number };
type Choice = { label: string; description: string; result: string; delta: Partial<Stats>; next?: string };

const chapters = [
  {
    eyebrow: "第一章・雨夜的約定",
    title: "一張沒有署名的名片",
    location: "台灣・台北市・萬華區",
    date: "2026 年 11 月 22 日｜晚上 21:40",
    paragraphs: [
      "雨水沿著騎樓鐵皮滴落。二十九歲的林奕辰站在老公寓二樓，望著桌上那張褪色的黑白照片。",
      "三天前，帶他長大的地方前輩突然病倒。留下的不是什麼龐大帝國，而是一間快付不出租金的茶行、幾個仍願意留下的老朋友，以及一群對未來沒有把握的人。",
      "今晚，街口的阿凱帶來消息：附近幾個地方勢力都在觀望，想知道這個小團體接下來由誰作主。奕辰明白，第一步若走錯，大家可能就散了。",
      "桌上的手機亮起。前輩傳來最後一段語音：「不要只想著讓人怕你。要想清楚，等風雨過去，還有誰願意站在你身邊。」"
    ],
    prompt: "你要如何回應這個夜晚？",
    choices: [
      { label: "先安定自己人", description: "召集夥伴談清楚未來方向，先穩住彼此的信任。", result: "你沒有急著對外宣示。那晚，幾個老夥伴留下來談到天亮。團體的氣氛穩定了一些，但手頭仍然拮据。", delta: { trust: 9, reputation: 2, cash: -2, heat: -1 } },
      { label: "拜訪地方老店家", description: "從社區關係開始，聽聽街坊真正擔心的是什麼。", result: "你走訪幾間熟識的店家，沒有承諾做不到的事，只把大家的困難記下來。地方對你的態度稍有改善。", delta: { reputation: 7, trust: 3, cash: -1, heat: -2 } },
      { label: "接受外部勢力的會面", description: "先聽對方開出的條件，但不急著答應。", result: "會面地點選在一間營業到深夜的咖啡館。對方提出合作試探，你沒有表態，只換到一個值得留意的名字。", delta: { reputation: 4, cash: 3, trust: -2, heat: 3 } }
    ]
  },
  {
    eyebrow: "第二章・留下來的人",
    title: "信任不是免費的",
    location: "台灣・台北市・大同區",
    date: "2026 年 11 月 23 日｜上午 10:15",
    paragraphs: [
      "隔天早上，茶行的鐵門才拉起一半，阿凱便帶著兩個人走進來。有人想離開，有人想把剩下的資源分一分，也有人主張先找一個靠山。",
      "奕辰看著牆上那張舊照片，忽然理解前輩留下的真正難題：不是如何擴張，而是如何讓一群背景不同的人，願意為共同的明天負責。",
      "此時，一位社區協會的理事打來電話，邀請你出席週末的地方活動。另一邊，外部勢力也傳來第二次會面邀請。"
    ],
    prompt: "你要把有限的時間與資源放在哪裡？",
    choices: [
      { label: "投入社區活動", description: "用公開、合法的方式建立地方信任。", result: "你帶著夥伴協助整理活動場地。有人仍然對你保持距離，但也有人第一次願意主動打招呼。", delta: { reputation: 8, trust: 5, cash: -3, heat: -2 } },
      { label: "召開內部會議", description: "釐清分工、財務與共同規範，避免團體先從內部瓦解。", result: "每個人都說出了自己的顧慮。你們訂下簡單的共同規範，並決定所有重大決策都要留下紀錄。", delta: { trust: 10, reputation: 2, cash: -1, heat: -1 } },
      { label: "與外部勢力保持對話", description: "先了解局勢，保留談判空間，不做排他承諾。", result: "你聽見更多地方局勢的傳聞，也察覺對方並不完全信任你。這場對話沒有結論，但替未來留下了空間。", delta: { reputation: 3, cash: 2, trust: -1, heat: 2 } }
    ]
  }
];

const initialStats: Stats = { reputation: 18, trust: 42, cash: 24, heat: 8 };

export default function App() {
  const [mode, setMode] = useState<"world" | "story">("world");
  const [chapterIndex, setChapterIndex] = useState(0);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [log, setLog] = useState<string[]>(["故事開始：林奕辰接下了前輩留下的小型地方組織。"]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const chapter = chapters[chapterIndex];
  const completed = chapterIndex >= chapters.length;
  const progress = useMemo(() => Math.round((chapterIndex / chapters.length) * 100), [chapterIndex]);

  function choose(choice: Choice, index: number) {
    if (showResult) return;
    setSelected(index);
    setStats(current => ({
      reputation: Math.max(0, current.reputation + (choice.delta.reputation ?? 0)),
      trust: Math.max(0, Math.min(100, current.trust + (choice.delta.trust ?? 0))),
      cash: Math.max(0, current.cash + (choice.delta.cash ?? 0)),
      heat: Math.max(0, Math.min(100, current.heat + (choice.delta.heat ?? 0)))
    }));
    setLog(current => [choice.result, ...current]);
    setShowResult(true);
  }

  function next() {
    setChapterIndex(value => value + 1);
    setSelected(null);
    setShowResult(false);
  }

  function restart() {
    setChapterIndex(0);
    setStats(initialStats);
    setLog(["故事開始：林奕辰接下了前輩留下的小型地方組織。"]);
    setSelected(null);
    setShowResult(false);
  }

  return mode === "world" ? <WorldGame onStory={() => setMode("story")} /> : (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">江</span><span>JIANGHU<small>江湖・故事模式</small></span></a>
        <div className="top-actions"><button className="mode-pill" onClick={() => setMode("world")}>世界地圖</button><span className="mode-pill">單人劇情</span><span className="chapter-count">第 {Math.min(chapterIndex + 1, chapters.length)} / {chapters.length} 章</span></div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="kicker"><span /> JIANGHU · FICTIONAL TAIWAN CHRONICLE</div>
          <h1>江湖</h1>
          <p>一座城市，無數選擇。真正的勢力，從人心開始。</p>
        </div>
        <div className="hero-stamp"><span>STORY</span><strong>MODE</strong><small>VOL. 01</small></div>
      </section>

      <section className="status-grid" aria-label="主角狀態">
        <Stat label="地方聲望" value={stats.reputation} suffix="點" note="社區與外界觀感" />
        <Stat label="團隊信任" value={stats.trust} suffix="%" note="夥伴對你的信任" />
        <Stat label="可用資金" value={stats.cash} suffix="萬" note="虛構遊戲數值" />
        <Stat label="外部關注" value={stats.heat} suffix="%" note="局勢與公共壓力" />
      </section>

      <div className="progress-wrap"><div className="progress-label"><span>故事進度</span><b>{progress}%</b></div><div className="progress"><i style={{ width: progress + "%" }} /></div></div>

      {completed ? (
        <section className="ending panel">
          <div className="kicker">PROLOGUE COMPLETE</div>
          <h2>序章告一段落</h2>
          <p>林奕辰的故事才剛開始。你已經做出最初的選擇，也為這個小團體定下了第一個方向。</p>
          <p className="muted">後續章節將延伸人物關係、地方網絡、組織治理與多線結局。這是目前可遊玩的序章版本。</p>
          <button className="primary" onClick={restart}>重新體驗序章</button>
        </section>
      ) : (
        <div className="game-layout">
          <article className="story panel">
            <div className="story-meta"><span>{chapter.eyebrow}</span><span>{chapter.date}</span></div>
            <div className="scene-image"><div className="scene-overlay"><span>SCENE 0{chapterIndex + 1}</span><b>{chapter.location}</b></div></div>
            <h2>{chapter.title}</h2>
            <div className="narrative">{chapter.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
            <div className="choice-area">
              <h3>{chapter.prompt}</h3>
              <div className="choices">
                {chapter.choices.map((choice, i) => (
                  <button key={choice.label} className={selected === i ? "choice selected" : "choice"} onClick={() => choose(choice, i)} disabled={showResult}>
                    <span className="choice-number">0{i + 1}</span><span className="choice-text"><b>{choice.label}</b><small>{choice.description}</small></span><span className="choice-arrow">↗</span>
                  </button>
                ))}
              </div>
            </div>
            {showResult && <div className="result-box"><div className="kicker">你的選擇帶來變化</div><p>{chapter.choices[selected!].result}</p><button className="primary" onClick={next}>{chapterIndex === chapters.length - 1 ? "查看序章結尾" : "進入下一章"} →</button></div>}
          </article>

          <aside className="side-column">
            <section className="panel character">
              <div className="section-head"><span>主角檔案</span><span className="live-dot">● 故事進行中</span></div>
              <div className="portrait"><span>林</span><i>FICTIONAL CHARACTER</i></div>
              <h3>林奕辰</h3><p className="role">地方組織代理負責人</p>
              <div className="bio-row"><span>年齡</span><b>29 歲</b></div>
              <div className="bio-row"><span>出身</span><b>台北・萬華</b></div>
              <div className="bio-row"><span>性格</span><b>冷靜、重情、謹慎</b></div>
              <div className="bio-row"><span>目標</span><b>守住夥伴與立足之地</b></div>
            </section>
            <section className="panel journal">
              <div className="section-head"><span>事件紀錄</span><span className="record-count">{log.length} 條</span></div>
              {log.slice(0, 4).map((item, i) => <div className="log-item" key={i}><i />{item}</div>)}
            </section>
            <section className="notice"><b>虛構故事聲明</b><p>人物、組織與事件皆為虛構。遊戲以抽象策略數值呈現權力、人際與社會壓力，不提供現實犯罪操作內容。</p></section>
          </aside>
        </div>
      )}
      <footer><span>JIANGHU</span><span>台灣架空故事世界 · 原創虛構作品</span></footer>
    </main>
  );
}

function Stat({ label, value, suffix, note }: { label: string; value: number; suffix: string; note: string }) {
  return <div className="stat"><span>{label}</span><strong>{value}<small>{suffix}</small></strong><em>{note}</em></div>;
}