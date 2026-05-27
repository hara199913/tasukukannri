import { useState, useRef, useEffect, useCallback } from "react";

const PRIORITIES = ["高", "中", "低"];
const PRIORITY_COLOR = { 高: "#ef4444", 中: "#f59e0b", 低: "#6b7280" };
const REPEAT_OPTIONS = [
  { value: "none", label: "繰り返しなし" },
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" },
  { value: "weekday", label: "平日のみ" },
];
const REPEAT_BADGE = { daily: "🔁 毎日", weekly: "🔁 毎週", weekday: "🔁 平日" };
const TABS = [
  { key: "private", label: "🏠 プライベート", color: "#6366f1", light: "#eef2ff", border: "#c7d2fe" },
  { key: "work",    label: "💼 仕事",         color: "#0ea5e9", light: "#e0f2fe", border: "#bae6fd" },
];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const TAGS = ["仕事", "会議", "買い物", "勉強", "健康", "家事", "趣味", "その他"];
const TAG_COLOR = { 仕事:"#6366f1", 会議:"#8b5cf6", 買い物:"#f59e0b", 勉強:"#3b82f6", 健康:"#22c55e", 家事:"#f97316", 趣味:"#ec4899", その他:"#6b7280" };

let idCtr = 200;
const mkId = () => idCtr++;
const toISO = (d) => { const dt = typeof d === "string" ? new Date(d) : d; return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
const todayISO = () => toISO(new Date());
const todayDS = () => new Date().toDateString();
const fmtISO = (iso) => { if (!iso) return ""; const [y,m,d] = iso.split("-"); const dt = new Date(iso); return `${y}/${m}/${d}（${WEEKDAYS[dt.getDay()]}）`; };
const fmtShort = (iso) => { if (!iso) return ""; const dt = new Date(iso); return `${dt.getMonth()+1}/${dt.getDate()}（${WEEKDAYS[dt.getDay()]}）`; };
const todayFull = () => { const d = new Date(); return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`; };
const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate()+n); return toISO(d); };
const nowStr = () => { const d = new Date(); return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
const isOverdue = (iso) => iso && iso < todayISO();
const isDueToday = (iso) => iso === todayISO();

function shouldReset(task) {
  if (task.repeat === "none" || !task.done) return false;
  const last = new Date(task.lastReset), now = new Date();
  if (task.repeat === "daily") return now.toDateString() !== last.toDateString();
  if (task.repeat === "weekday") { const d = now.getDay(); return d !== 0 && d !== 6 && now.toDateString() !== last.toDateString(); }
  if (task.repeat === "weekly") return (now - last) / 86400000 >= 7;
  return false;
}
function applyResets(tasks) { return tasks.map(t => shouldReset(t) ? { ...t, done: false, lastReset: todayDS() } : t); }
function load(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

const DEFAULT_TASKS = {
  private: [
    { id: 1, text: "読書（30分）", done: false, priority: "低", repeat: "daily", lastReset: todayDS(), createdAt: todayISO(), memo: "", tags: ["趣味"], scheduledDate: todayISO() },
    { id: 2, text: "部屋の掃除", done: false, priority: "中", repeat: "weekly", lastReset: todayDS(), createdAt: todayISO(), memo: "", tags: ["家事"], scheduledDate: todayISO() },
  ],
  work: [
    { id: 3, text: "週次レポートを作成する", done: false, priority: "高", repeat: "none", lastReset: todayDS(), createdAt: todayISO(), memo: "毎週金曜日提出", tags: ["仕事"], scheduledDate: todayISO() },
    { id: 4, text: "メールを確認して返信する", done: false, priority: "中", repeat: "daily", lastReset: todayDS(), createdAt: todayISO(), memo: "", tags: ["仕事"], scheduledDate: todayISO() },
  ],
};

// ── Pomodoro ──────────────────────────────────────────
function PomodoroTimer({ dark, borderColor, textMain, textSub, cardBg }) {
  const [mins, setMins] = useState(25);
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("work"); // work | break
  const ref = useRef(null);
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSecs(s => {
          if (s > 0) return s - 1;
          setMins(m => {
            if (m > 0) { return m - 1; }
            setRunning(false);
            const next = mode === "work" ? "break" : "work";
            setMode(next);
            setMins(next === "work" ? 25 : 5);
            return 0;
          });
          return s > 0 ? s - 1 : 59;
        });
      }, 1000);
    } else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [running, mode]);
  const reset = () => { setRunning(false); setMins(mode === "work" ? 25 : 5); setSecs(0); };
  const pct = mode === "work" ? ((25*60 - mins*60 - secs) / (25*60)) * 100 : ((5*60 - mins*60 - secs) / (5*60)) * 100;
  return (
    <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: textMain }}>🍅 ポモドーロタイマー</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
          <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke={borderColor} strokeWidth="6"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke={mode==="work"?"#ef4444":"#22c55e"} strokeWidth="6" strokeDasharray={`${2*Math.PI*34}`} strokeDashoffset={`${2*Math.PI*34*(1-pct/100)}`} strokeLinecap="round" style={{transition:"stroke-dashoffset 1s"}}/>
          </svg>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:15, fontWeight:800, color:textMain }}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: mode==="work"?"#ef4444":"#22c55e", fontWeight: 700, marginBottom: 8 }}>{mode==="work"?"🔴 集中時間":"🟢 休憩時間"}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setRunning(r => !r)} style={{ padding: "7px 16px", background: running?"#f59e0b":mode==="work"?"#ef4444":"#22c55e", color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>{running?"⏸ 一時停止":"▶ 開始"}</button>
            <button onClick={reset} style={{ padding:"7px 14px", background:"transparent", border:`1px solid ${borderColor}`, borderRadius:8, fontSize:13, color:textSub, cursor:"pointer" }}>↺ リセット</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────
function CalendarView({ allTasks, dark, borderColor, textMain, textSub, cardBg, tabInfo, onDateClick }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const allT = [...allTasks.private, ...allTasks.work];
  const taskMap = {};
  allT.forEach(t => { if (t.scheduledDate) { if (!taskMap[t.scheduledDate]) taskMap[t.scheduledDate] = []; taskMap[t.scheduledDate].push(t); } });
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => setViewDate(new Date(year, month-1, 1))} style={{ background:"none", border:`1px solid ${borderColor}`, borderRadius:6, padding:"4px 10px", cursor:"pointer", color:textMain }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15, color: textMain }}>{year}年{month+1}月</span>
        <button onClick={() => setViewDate(new Date(year, month+1, 1))} style={{ background:"none", border:`1px solid ${borderColor}`, borderRadius:6, padding:"4px 10px", cursor:"pointer", color:textMain }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:4 }}>
        {WEEKDAYS.map((w,i) => <div key={w} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:i===0?"#ef4444":i===6?"#3b82f6":textSub, padding:"4px 0" }}>{w}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = toISO(new Date(year, month, d));
          const dayTasks = taskMap[iso] || [];
          const isToday = iso === todayISO();
          const doneCnt = dayTasks.filter(t => t.done).length;
          return (
            <div key={i} onClick={() => onDateClick(iso)}
              style={{ minHeight:48, padding:"4px 3px", borderRadius:7, background: isToday ? `${tabInfo.color}22` : "transparent", border:`1px solid ${isToday ? tabInfo.color : borderColor}`, cursor:"pointer", transition:"background .15s" }}>
              <div style={{ fontSize:12, fontWeight:isToday?800:400, color:isToday?tabInfo.color:textMain, textAlign:"center", marginBottom:2 }}>{d}</div>
              {dayTasks.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                  {dayTasks.slice(0,2).map((t,j) => <div key={j} style={{ fontSize:9, background:PRIORITY_COLOR[t.priority]+"33", color:PRIORITY_COLOR[t.priority], borderRadius:3, padding:"1px 3px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", textDecoration:t.done?"line-through":"none" }}>{t.text}</div>)}
                  {dayTasks.length > 2 && <div style={{ fontSize:9, color:textSub, textAlign:"center" }}>+{dayTasks.length-2}</div>}
                </div>
              )}
              {dayTasks.length > 0 && <div style={{ fontSize:9, color:textSub, textAlign:"center", marginTop:1 }}>{doneCnt}/{dayTasks.length}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(() => load("dark", false));
  const [tab, setTab] = useState("private");
  const [allTasks, setAllTasks] = useState(() => {
    const saved = load("tasks3", null);
    const base = saved || DEFAULT_TASKS;
    return { private: applyResets(base.private), work: applyResets(base.work) };
  });
  const [history, setHistory] = useState(() => load("history2", { private: [], work: [] }));
  const [viewDate, setViewDate] = useState(todayISO()); // 表示中の日付
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("中");
  const [repeat, setRepeat] = useState("none");
  const [memo, setMemo] = useState("");
  const [scheduledDate, setScheduledDate] = useState(todayISO());
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filter, setFilter] = useState("すべて");
  const [filterTag, setFilterTag] = useState("");
  const [search, setSearch] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showOtherDays, setShowOtherDays] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("すべて");
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editMemo, setEditMemo] = useState({});
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef(null);

  useEffect(() => { const iv = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(iv); }, []);
  useEffect(() => { save("tasks3", allTasks); }, [allTasks]);
  useEffect(() => { save("history2", history); }, [history]);
  useEffect(() => { save("dark", dark); }, [dark]);

  const tasks = allTasks[tab];
  const setTasks = fn => setAllTasks(prev => ({ ...prev, [tab]: typeof fn === "function" ? fn(prev[tab]) : fn }));
  const addHist = (tk, entry) => setHistory(prev => ({ ...prev, [tk]: [entry, ...prev[tk]] }));
  const tabInfo = TABS.find(t => t.key === tab);

  // 今日 / 他の日 分離
  const todayTasks = tasks.filter(t => t.scheduledDate === viewDate);
  const otherTasks = tasks.filter(t => t.scheduledDate !== viewDate);

  const addTask = () => {
    const t = input.trim(); if (!t) return;
    setTasks(prev => [...prev, { id: mkId(), text: t, done: false, priority, repeat, lastReset: todayDS(), createdAt: todayISO(), memo, tags: selectedTags, scheduledDate }]);
    setInput(""); setMemo(""); setSelectedTags([]); setScheduledDate(todayISO()); setShowAdvanced(false);
    inputRef.current?.focus();
  };
  const toggleDone = id => {
    const task = tasks.find(t => t.id === id); if (!task) return;
    const bd = !task.done;
    if (bd) addHist(tab, { text: task.text, priority: task.priority, repeat: task.repeat, type: "done", at: nowStr(), createdAt: task.createdAt, tags: task.tags });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: bd, lastReset: bd ? todayDS() : t.lastReset } : t));
    if (bd) setExpandedId(null);
  };
  const deleteTask = id => {
    const task = tasks.find(t => t.id === id);
    if (task) addHist(tab, { text: task.text, priority: task.priority, repeat: task.repeat, type: "deleted", at: nowStr(), createdAt: task.createdAt, tags: task.tags });
    setTasks(prev => prev.filter(t => t.id !== id));
  };
  const clearDone = () => setTasks(prev => prev.filter(t => !t.done));
  const saveEdit = (id) => { if (editText.trim()) setTasks(prev => prev.map(t => t.id === id ? { ...t, text: editText.trim() } : t)); setEditingId(null); };
  const saveMemo = (id) => { if (editMemo[id] !== undefined) setTasks(prev => prev.map(t => t.id === id ? { ...t, memo: editMemo[id] } : t)); };
  const changePriority = (id, p) => setTasks(prev => prev.map(t => t.id === id ? { ...t, priority: p } : t));
  const changeRepeat = (id, r) => setTasks(prev => prev.map(t => t.id === id ? { ...t, repeat: r } : t));
  const changeScheduled = (id, v) => setTasks(prev => prev.map(t => t.id === id ? { ...t, scheduledDate: v } : t));
  const toggleTaskTag = (id, tag) => setTasks(prev => prev.map(t => t.id === id ? { ...t, tags: (t.tags||[]).includes(tag) ? t.tags.filter(x=>x!==tag) : [...(t.tags||[]), tag] } : t));

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ tasks: allTasks, history }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `tasks_${todayISO()}.json`; a.click();
  };

  const onDragStart = id => setDragId(id);
  const onDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const onDrop = id => {
    if (!dragId || dragId === id) { setDragId(null); setDragOverId(null); return; }
    setTasks(prev => { const arr=[...prev], fi=arr.findIndex(t=>t.id===dragId), ti=arr.findIndex(t=>t.id===id); const [item]=arr.splice(fi,1); arr.splice(ti,0,item); return arr; });
    setDragId(null); setDragOverId(null);
  };

  const filterFn = t => {
    if (filter==="未完了" && t.done) return false;
    if (filter==="完了" && !t.done) return false;
    if (filter==="繰り返し" && t.repeat==="none") return false;
    if (filterTag && !(t.tags||[]).includes(filterTag)) return false;
    if (search && !t.text.toLowerCase().includes(search.toLowerCase()) && !(t.memo||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  };

  const filteredToday = todayTasks.filter(filterFn);
  const done = todayTasks.filter(t => t.done).length;
  const pct = todayTasks.length ? Math.round(done/todayTasks.length*100) : 0;

  const allDone = [...history.private, ...history.work].filter(h => h.type==="done");
  const todayDone = allDone.filter(h => h.at.startsWith(todayISO().replace(/-/g,"/")));
  const weekDone = allDone.filter(h => (new Date()-new Date(h.at.replace(/\//g,"-")))/86400000 <= 7);
  const currentHistory = history[tab].filter(h => historyFilter==="完了"?h.type==="done":historyFilter==="削除"?h.type==="deleted":true);

  const timeStr = `${String(currentTime.getHours()).padStart(2,"0")}:${String(currentTime.getMinutes()).padStart(2,"0")}`;
  const isViewingToday = viewDate === todayISO();

  // theme
  const bg = dark?"#111827":"#f8fafc", cardBg = dark?"#1f2937":"#fff", borderColor = dark?"#374151":"#e5e7eb";
  const textMain = dark?"#f9fafb":"#1f2937", textSub = dark?"#9ca3af":"#6b7280";
  const inputBg = dark?"#374151":"#fff", sectionBg = dark?"#1f2937":"#f9fafb";

  const TaskCard = ({ task, showDate=false }) => {
    const overdue = isOverdue(task.scheduledDate) && !task.done;
    const isExp = expandedId === task.id;
    const isEditing = editingId === task.id;
    return (
      <div draggable onDragStart={()=>onDragStart(task.id)} onDragOver={e=>onDragOver(e,task.id)} onDrop={()=>onDrop(task.id)}
        style={{ border:`1px solid ${dragOverId===task.id?tabInfo.color:borderColor}`, borderLeft:`4px solid ${task.done?"#d1d5db":overdue?"#ef4444":PRIORITY_COLOR[task.priority]}`, borderRadius:8, background:cardBg, opacity:task.done?0.6:1, marginBottom:6, transition:"border .1s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px" }}>
          <span style={{ color:textSub, fontSize:13, cursor:"grab", flexShrink:0 }}>⠿</span>
          <input type="checkbox" checked={task.done} onChange={()=>toggleDone(task.id)} style={{ width:17, height:17, cursor:"pointer", accentColor:tabInfo.color, flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            {isEditing ? (
              <input autoFocus value={editText} onChange={e=>setEditText(e.target.value)}
                onBlur={()=>saveEdit(task.id)} onKeyDown={e=>{ if(e.key==="Enter") saveEdit(task.id); if(e.key==="Escape") setEditingId(null); }}
                style={{ width:"100%", padding:"3px 6px", border:`1px solid ${tabInfo.color}`, borderRadius:6, fontSize:14, background:inputBg, color:textMain, outline:"none" }} />
            ) : (
              <div style={{ fontSize:14, textDecoration:task.done?"line-through":"none", color:textMain, cursor:"pointer" }}
                onClick={()=>setExpandedId(isExp?null:task.id)}
                onDoubleClick={()=>{ setEditingId(task.id); setEditText(task.text); }}>
                {task.text}
              </div>
            )}
            <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginTop:3, alignItems:"center" }}>
              {task.repeat!=="none" && <span style={{ fontSize:10, color:tabInfo.color, background:tabInfo.light, border:`1px solid ${tabInfo.border}`, borderRadius:8, padding:"1px 6px" }}>{REPEAT_BADGE[task.repeat]}</span>}
              {showDate && task.scheduledDate && <span style={{ fontSize:10, color:textSub, background:sectionBg, border:`1px solid ${borderColor}`, borderRadius:8, padding:"1px 6px" }}>📅 {fmtShort(task.scheduledDate)}</span>}
              {overdue && <span style={{ fontSize:10, color:"#ef4444", background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8, padding:"1px 6px" }}>⚠️ 日程超過</span>}
              {(task.tags||[]).map(tag=><span key={tag} style={{ fontSize:10, color:TAG_COLOR[tag] }}>#{tag}</span>)}
              {task.memo && <span style={{ fontSize:10, color:textSub }}>📝</span>}
            </div>
          </div>
          <select value={task.priority} onChange={e=>changePriority(task.id,e.target.value)} style={{ fontSize:11, border:`1px solid ${borderColor}`, borderRadius:6, padding:"2px 3px", background:inputBg, color:PRIORITY_COLOR[task.priority], cursor:"pointer", flexShrink:0 }}>
            {PRIORITIES.map(p=><option key={p}>{p}</option>)}
          </select>
          <button onClick={()=>{ setEditingId(task.id); setEditText(task.text); }} style={{ background:"none", border:"none", color:textSub, fontSize:14, cursor:"pointer", flexShrink:0 }}>✏️</button>
          <button onClick={()=>deleteTask(task.id)} style={{ background:"none", border:"none", color:dark?"#6b7280":"#d1d5db", fontSize:18, cursor:"pointer", lineHeight:1, padding:"0 2px", flexShrink:0 }}>×</button>
        </div>
        {isExp && (
          <div style={{ padding:"0 12px 12px", borderTop:`1px solid ${borderColor}` }}>
            <div style={{ paddingTop:10, display:"flex", flexDirection:"column", gap:10 }}>
              <div>
                <div style={{ fontSize:12, color:textSub, marginBottom:4 }}>📝 メモ</div>
                <textarea value={editMemo[task.id]??task.memo??""} onChange={e=>setEditMemo(p=>({...p,[task.id]:e.target.value}))} onBlur={()=>saveMemo(task.id)} placeholder="メモを入力..."
                  style={{ width:"100%", padding:"7px 10px", border:`1px solid ${borderColor}`, borderRadius:7, fontSize:13, background:inputBg, color:textMain, outline:"none", resize:"vertical", minHeight:54, boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:12, color:textSub }}>繰り返し</span>
                  <select value={task.repeat} onChange={e=>changeRepeat(task.id,e.target.value)} style={{ padding:"4px 8px", border:`1px solid ${borderColor}`, borderRadius:7, fontSize:12, background:inputBg, color:textMain, cursor:"pointer" }}>
                    {REPEAT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:12, color:textSub }}>実施日</span>
                  <input type="date" value={task.scheduledDate||""} onChange={e=>changeScheduled(task.id,e.target.value)} style={{ padding:"4px 8px", border:`1px solid ${borderColor}`, borderRadius:7, fontSize:12, background:inputBg, color:textMain, cursor:"pointer" }} />
                </div>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {TAGS.map(tag=>(
                  <button key={tag} onClick={()=>toggleTaskTag(task.id,tag)}
                    style={{ padding:"2px 9px", borderRadius:20, fontSize:11, cursor:"pointer", border:`1px solid ${TAG_COLOR[tag]}`, background:(task.tags||[]).includes(tag)?TAG_COLOR[tag]:"transparent", color:(task.tags||[]).includes(tag)?"#fff":TAG_COLOR[tag] }}>
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", maxWidth:620, margin:"0 auto", padding:"20px 16px", color:textMain, background:bg, minHeight:"100vh" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>📋 タスク管理</h2>
        <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer"
          style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", background:"#10a37f", color:"#fff", borderRadius:8, fontSize:12, fontWeight:600, textDecoration:"none" }}>
          <svg width="13" height="13" viewBox="0 0 41 41" fill="none"><path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.99-3.191 10.079 10.079 0 0 0-9.612 6.879 9.967 9.967 0 0 0-6.69 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.99 3.19 10.079 10.079 0 0 0 9.617-6.879 9.967 9.967 0 0 0 6.69-4.834 10.079 10.079 0 0 0-1.243-11.817zm-17.66 13.248a7.461 7.461 0 0 1-4.778-1.724l.236-.134 7.932-4.578a.891.891 0 0 0 .451-.779v-11.18l3.352 1.935a.08.08 0 0 1 .045.057v9.258c-.003 4.13-3.352 7.481-7.237 7.145zm-15.497-6.866a7.461 7.461 0 0 1-.894-5.003l.236.142 7.932 4.578a.9.9 0 0 0 .903 0l9.684-5.59v3.87a.086.086 0 0 1-.034.066L14.93 25.142a7.513 7.513 0 0 1-10.555-1.89zm-2.016-17.26A7.46 7.46 0 0 1 6.26 2.065l-.005.153v9.154a.9.9 0 0 0 .449.778l9.684 5.59-3.352 1.935a.082.082 0 0 1-.076.006L4.947 14.2a7.513 7.513 0 0 1-.588-8.208zm27.415 6.44l-9.684-5.59 3.352-1.935a.082.082 0 0 1 .076-.006l8.013 4.626a7.512 7.512 0 0 1-1.158 13.528v-9.307a.9.9 0 0 0-.6-.316zm3.34-5.043l-.236-.143-7.932-4.577a.9.9 0 0 0-.903 0l-9.683 5.59v-3.87a.086.086 0 0 1 .033-.066l8.016-4.625a7.513 7.513 0 0 1 10.705 7.69zm-20.96 6.896l-3.352-1.935a.08.08 0 0 1-.045-.058v-9.258a7.513 7.513 0 0 1 12.32-5.767l-.236.134-7.932 4.578a.891.891 0 0 0-.451.779l-.304 11.527zm1.82-3.925l4.313-2.489 4.313 2.487v4.976l-4.313 2.489-4.313-2.489V20.36z" fill="currentColor"/></svg>
          ChatGPT
        </a>
        <div style={{ marginLeft:"auto", display:"flex", gap:5 }}>
          <button onClick={()=>setShowPomodoro(s=>!s)} style={{ padding:"5px 9px", background:showPomodoro?tabInfo.color:cardBg, color:showPomodoro?"#fff":textSub, border:`1px solid ${borderColor}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>🍅</button>
          <button onClick={()=>setShowCalendar(s=>!s)} style={{ padding:"5px 9px", background:showCalendar?tabInfo.color:cardBg, color:showCalendar?"#fff":textSub, border:`1px solid ${borderColor}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>📅</button>
          <button onClick={()=>setShowStats(s=>!s)} style={{ padding:"5px 9px", background:showStats?tabInfo.color:cardBg, color:showStats?"#fff":textSub, border:`1px solid ${borderColor}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>📊</button>
          <button onClick={()=>setShowHistory(s=>!s)} style={{ padding:"5px 9px", background:showHistory?tabInfo.color:cardBg, color:showHistory?"#fff":textSub, border:`1px solid ${borderColor}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>🕐</button>
          <button onClick={exportData} style={{ padding:"5px 9px", background:cardBg, color:textSub, border:`1px solid ${borderColor}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>💾</button>
          <button onClick={()=>setDark(d=>!d)} style={{ padding:"5px 9px", background:cardBg, border:`1px solid ${borderColor}`, borderRadius:8, fontSize:13, cursor:"pointer" }}>{dark?"☀️":"🌙"}</button>
        </div>
      </div>

      {/* 日付バー */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:dark?"#1f2937":`${tabInfo.color}12`, border:`1px solid ${tabInfo.border}`, borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:tabInfo.color }}>{todayFull()}</div>
          <div style={{ fontSize:12, color:textSub, marginTop:1 }}>{timeStr} · {done}/{todayTasks.length} 完了</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:26, fontWeight:800, color:tabInfo.color }}>{pct}%</div>
          <div style={{ fontSize:10, color:textSub }}>完了率</div>
        </div>
      </div>

      {/* Pomodoro */}
      {showPomodoro && <PomodoroTimer dark={dark} borderColor={borderColor} textMain={textMain} textSub={textSub} cardBg={cardBg} />}

      {/* Calendar */}
      {showCalendar && <CalendarView allTasks={allTasks} dark={dark} borderColor={borderColor} textMain={textMain} textSub={textSub} cardBg={cardBg} tabInfo={tabInfo} onDateClick={iso=>{ setViewDate(iso); setShowCalendar(false); }} />}

      {/* Stats */}
      {showStats && (
        <div style={{ background:sectionBg, border:`1px solid ${borderColor}`, borderRadius:12, padding:16, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:textMain }}>📊 統計</h3>
            <button onClick={exportData} style={{ fontSize:12, color:tabInfo.color, background:"none", border:`1px solid ${tabInfo.border}`, borderRadius:6, padding:"3px 10px", cursor:"pointer" }}>💾 エクスポート</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            {[{label:"今日完了",value:todayDone.length,color:"#22c55e"},{label:"今週完了",value:weekDone.length,color:"#6366f1"},{label:"総完了数",value:allDone.length,color:"#0ea5e9"}].map(s=>(
              <div key={s.label} style={{ background:cardBg, border:`1px solid ${borderColor}`, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:textSub }}>{s.label}</div>
              </div>
            ))}
          </div>
          {TABS.map(t=>{ const tt=allTasks[t.key]; const dp=tt.filter(x=>x.done).length; const pp=tt.length?Math.round(dp/tt.length*100):0; return (
            <div key={t.key} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}><span style={{ color:textMain }}>{t.label}</span><span style={{ color:textSub }}>{dp}/{tt.length} ({pp}%)</span></div>
              <div style={{ height:6, background:borderColor, borderRadius:3, overflow:"hidden" }}><div style={{ width:`${pp}%`, height:"100%", background:t.color, borderRadius:3 }} /></div>
            </div>
          );})}
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div style={{ background:sectionBg, border:`1px solid ${borderColor}`, borderRadius:12, padding:16, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:textMain }}>🕐 履歴 — {tabInfo.label}</h3>
            {history[tab].length>0 && <button onClick={()=>setHistory(p=>({...p,[tab]:[]})) } style={{ fontSize:12, color:"#ef4444", background:"none", border:"1px solid #fca5a5", borderRadius:6, padding:"3px 10px", cursor:"pointer" }}>クリア</button>}
          </div>
          <div style={{ display:"flex", gap:5, marginBottom:10 }}>
            {["すべて","完了","削除"].map(f=>(
              <button key={f} onClick={()=>setHistoryFilter(f)} style={{ padding:"4px 12px", border:"1px solid", borderRadius:20, fontSize:12, cursor:"pointer", background:historyFilter===f?tabInfo.color:cardBg, color:historyFilter===f?"#fff":textSub, borderColor:historyFilter===f?tabInfo.color:borderColor, fontWeight:historyFilter===f?600:400 }}>
                {f==="完了"?"✅ 完了":f==="削除"?"🗑 削除":f}
              </button>
            ))}
          </div>
          {currentHistory.length===0 ? <div style={{ textAlign:"center", color:textSub, padding:"16px 0", fontSize:14 }}>履歴がありません</div> : (
            <div style={{ display:"flex", flexDirection:"column", gap:5, maxHeight:240, overflowY:"auto" }}>
              {currentHistory.map((h,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", background:cardBg, border:`1px solid ${borderColor}`, borderLeft:`4px solid ${h.type==="done"?"#22c55e":"#f87171"}`, borderRadius:8 }}>
                  <span>{h.type==="done"?"✅":"🗑"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:textMain, fontWeight:500 }}>{h.text}</div>
                    <div style={{ fontSize:11, color:textSub }}>{h.priority}{h.repeat!=="none"&&` · ${REPEAT_BADGE[h.repeat]}`}{h.createdAt&&` · 作成:${fmtShort(h.createdAt)}`}</div>
                  </div>
                  <div style={{ fontSize:11, color:textSub, whiteSpace:"nowrap" }}>{h.at}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", marginBottom:14, border:`1px solid ${borderColor}`, borderRadius:10, overflow:"hidden" }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>{ setTab(t.key); setFilter("すべて"); setFilterTag(""); setSearch(""); }}
            style={{ flex:1, padding:"11px 0", border:"none", cursor:"pointer", fontWeight:700, fontSize:14, background:tab===t.key?t.color:sectionBg, color:tab===t.key?"#fff":textSub, transition:"background .2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 検索 */}
      <div style={{ position:"relative", marginBottom:10 }}>
        <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:textSub, fontSize:13 }}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="タスクを検索..."
          style={{ width:"100%", padding:"8px 12px 8px 32px", border:`1px solid ${borderColor}`, borderRadius:8, fontSize:13, outline:"none", background:inputBg, color:textMain, boxSizing:"border-box" }} />
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:5, marginBottom:6, flexWrap:"wrap" }}>
        {["すべて","未完了","完了","繰り返し"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"4px 11px", border:"1px solid", borderRadius:20, fontSize:12, cursor:"pointer", background:filter===f?tabInfo.color:cardBg, color:filter===f?"#fff":textSub, borderColor:filter===f?tabInfo.color:borderColor, fontWeight:filter===f?600:400 }}>
            {f==="繰り返し"?"🔁 繰り返し":f}
          </button>
        ))}
        {TAGS.filter(tag=>tasks.some(t=>(t.tags||[]).includes(tag))).map(tag=>(
          <button key={tag} onClick={()=>setFilterTag(filterTag===tag?"":tag)} style={{ padding:"4px 11px", border:`1px solid ${TAG_COLOR[tag]}`, borderRadius:20, fontSize:12, cursor:"pointer", background:filterTag===tag?TAG_COLOR[tag]:"transparent", color:filterTag===tag?"#fff":TAG_COLOR[tag] }}>
            #{tag}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ background:sectionBg, border:`1px solid ${borderColor}`, borderRadius:10, padding:12, marginBottom:14 }}>
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="新しいタスクを入力..."
            style={{ flex:1, padding:"9px 12px", border:`1px solid ${borderColor}`, borderRadius:8, fontSize:14, outline:"none", background:inputBg, color:textMain }} />
          <button onClick={addTask} style={{ padding:"10px 16px", background:tabInfo.color, color:"#fff", border:"none", borderRadius:8, fontWeight:600, fontSize:14, cursor:"pointer" }}>追加</button>
        </div>
        {/* 実施日クイック選択 */}
        <div style={{ display:"flex", gap:5, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:12, color:textSub }}>実施日:</span>
          {[
            { label:"昨日", val:addDays(todayISO(),-1) },
            { label:"今日", val:todayISO() },
            { label:"明日", val:addDays(todayISO(),1) },
            { label:"明後日", val:addDays(todayISO(),2) },
          ].map(opt=>(
            <button key={opt.label} onClick={()=>setScheduledDate(opt.val)}
              style={{ padding:"4px 10px", border:`1px solid ${scheduledDate===opt.val?tabInfo.color:borderColor}`, borderRadius:20, fontSize:12, cursor:"pointer", background:scheduledDate===opt.val?tabInfo.color:"transparent", color:scheduledDate===opt.val?"#fff":textSub, fontWeight:scheduledDate===opt.val?700:400 }}>
              {opt.label}
            </button>
          ))}
          <input type="date" value={scheduledDate} onChange={e=>setScheduledDate(e.target.value)}
            style={{ padding:"4px 8px", border:`1px solid ${borderColor}`, borderRadius:7, fontSize:12, background:inputBg, color:textMain, cursor:"pointer" }} />
        </div>
        <button onClick={()=>setShowAdvanced(s=>!s)} style={{ background:"none", border:"none", color:textSub, fontSize:12, cursor:"pointer", padding:0, marginBottom:showAdvanced?8:0 }}>
          {showAdvanced?"▲ 詳細設定を閉じる":"▼ 詳細設定（優先度・タグ・メモ）"}
        </button>
        {showAdvanced && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, flex:1 }}>
                <span style={{ fontSize:12, color:textSub, whiteSpace:"nowrap" }}>優先度</span>
                <select value={priority} onChange={e=>setPriority(e.target.value)} style={{ flex:1, padding:"6px 8px", border:`1px solid ${borderColor}`, borderRadius:7, fontSize:13, background:inputBg, color:textMain, cursor:"pointer" }}>
                  {PRIORITIES.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5, flex:2 }}>
                <span style={{ fontSize:12, color:textSub, whiteSpace:"nowrap" }}>繰り返し</span>
                <select value={repeat} onChange={e=>setRepeat(e.target.value)} style={{ flex:1, padding:"6px 8px", border:`1px solid ${borderColor}`, borderRadius:7, fontSize:13, background:inputBg, color:textMain, cursor:"pointer" }}>
                  {REPEAT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="メモ（任意）"
              style={{ width:"100%", padding:"7px 10px", border:`1px solid ${borderColor}`, borderRadius:7, fontSize:13, background:inputBg, color:textMain, outline:"none", boxSizing:"border-box", marginBottom:8 }} />
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {TAGS.map(tag=>(
                <button key={tag} onClick={()=>setSelectedTags(p=>p.includes(tag)?p.filter(t=>t!==tag):[...p,tag])}
                  style={{ padding:"3px 9px", borderRadius:20, fontSize:11, cursor:"pointer", border:`1px solid ${TAG_COLOR[tag]}`, background:selectedTags.includes(tag)?TAG_COLOR[tag]:"transparent", color:selectedTags.includes(tag)?"#fff":TAG_COLOR[tag] }}>
                  #{tag}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 今日のタスク */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ fontWeight:700, fontSize:14, color:textMain }}>
          {isViewingToday ? `📌 今日のタスク` : `📅 ${fmtShort(viewDate)} のタスク`}
          {!isViewingToday && <button onClick={()=>setViewDate(todayISO())} style={{ marginLeft:8, fontSize:11, color:tabInfo.color, background:"none", border:`1px solid ${tabInfo.border}`, borderRadius:6, padding:"2px 8px", cursor:"pointer" }}>今日に戻る</button>}
          <span style={{ marginLeft:6, fontSize:12, color:textSub }}>{filteredToday.length}件</span>
        </div>
        {todayTasks.some(t=>t.done) && <button onClick={clearDone} style={{ fontSize:11, color:"#ef4444", background:"none", border:"1px solid #fca5a5", borderRadius:6, padding:"3px 10px", cursor:"pointer" }}>完了を一括削除</button>}
      </div>

      <div style={{ marginBottom:16 }}>
        {filteredToday.length===0 && <div style={{ textAlign:"center", color:textSub, padding:"24px 0", fontSize:14 }}>タスクがありません</div>}
        {filteredToday.map(task=><TaskCard key={task.id} task={task} />)}
      </div>

      {/* 他の日のタスク */}
      {otherTasks.length > 0 && (
        <div>
          <button onClick={()=>setShowOtherDays(s=>!s)}
            style={{ width:"100%", padding:"10px", background:sectionBg, border:`1px solid ${borderColor}`, borderRadius:10, fontWeight:600, fontSize:13, color:textSub, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:showOtherDays?10:0 }}>
            <span>📦 他の日のタスク ({otherTasks.length}件)</span>
            <span>{showOtherDays?"▲":"▼"}</span>
          </button>
          {showOtherDays && (
            <div>
              {[...new Set(otherTasks.map(t=>t.scheduledDate))].sort().map(date=>{
                const dayTasks = otherTasks.filter(t=>t.scheduledDate===date).filter(filterFn);
                if (!dayTasks.length) return null;
                const isPast = date < todayISO();
                return (
                  <div key={date} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:isPast?"#ef4444":tabInfo.color }}>{fmtISO(date)}</span>
                      {isPast && <span style={{ fontSize:11, color:"#ef4444", background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8, padding:"1px 7px" }}>⚠️ 過去</span>}
                      <button onClick={()=>setViewDate(date)} style={{ fontSize:11, color:tabInfo.color, background:"none", border:`1px solid ${tabInfo.border}`, borderRadius:6, padding:"2px 8px", cursor:"pointer" }}>この日を表示</button>
                    </div>
                    {dayTasks.map(task=><TaskCard key={task.id} task={task} showDate={false} />)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
