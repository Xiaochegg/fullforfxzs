/* ═══════════════════════════════════════════════════
   Minecraft PVP 排行榜 · app.js
   纯前端演示版 · 数据 localStorage 存储
   后端对接：见文件末尾 API 对接区
   ═══════════════════════════════════════════════════ */
'use strict';

/* ── 1) 常量定义 ── */
const MODES = {
  sword:   { name: '剑斗',      icon: 'sword',   inTotal: true,  desc: '剑术对决' },
  axe:     { name: '盾斧',      icon: 'axe',     inTotal: true,  desc: '盾斧攻防' },
  diamond: { name: '钻石药水',  icon: 'diamond', inTotal: true,  desc: '钻石附魔药水战' },
  alloy:   { name: '合金药水',  icon: 'alloy',   inTotal: true,  desc: '合金强化药水战' },
  hammer:  { name: '重锤',      icon: 'hammer',  inTotal: true,  desc: '重锤粉碎' },
  crystal: { name: '水晶',      icon: 'crystal', inTotal: true,  desc: '水晶爆破' },
  jiahao:  { name: '嘉豪',      icon: 'jiahao',  inTotal: false, desc: '娱乐模式·不计总分' },
  heart:   { name: '心动',      icon: 'heart',   inTotal: false, desc: '点赞榜·不影响积分' }
};

/* ── 1.1) 真实 MC 物品图标映射（原版贴图 PNG，替换 emoji） ──
   素材来源：Minecraft 官方 Java 版贴图 + Minecraft Wiki Invicon（透明背景）
   本地路径：assets/items/*.png（16x16 原版贴图已放大到 128x128 保真） */
const ICON = {
  sword:   'assets/items/sword.png',          // 钻石剑
  axe:     'assets/items/axe.png',            // 钻石斧
  diamond: 'assets/items/potion_diamond.png', // 钻石药水 → 水肺药水（深蓝）
  alloy:   'assets/items/potion_alloy.png',   // 合金药水 → 力量药水（橙金）
  hammer:  'assets/items/hammer.png',         // 重锤 → 狼牙棒 Mace
  crystal: 'assets/items/crystal.png',        // 水晶 → 末影水晶
  jiahao:  'assets/items/jiahao.png',         // 嘉豪 → 龙头
  heart:   'assets/items/heart.png',          // 心动 → 爱心
  heartEmpty:'assets/items/heart_empty.png',  // 未点赞爱心（空心）
  total:   'assets/items/total.png',          // 总榜 → 下界之星
  crown:   'assets/items/crown.png',          // 第1名皇冠 → 金头盔
  crownSilver:'assets/items/crown_silver.png',// 第2名 → 铁头盔
  crownBronze:'assets/items/crown_bronze.png',// 第3名 → 皮革头盔
  theme:   'assets/items/theme.png',          // 主题 → 画
  diy:     'assets/items/diy.png',            // DIY → 工作台
  music:   'assets/items/music.png',          // 音乐 → 音乐唱片
  musicPlay:'assets/items/music_play.png',   // 播放中 → 音符盒
  about:   'assets/items/about.png',          // 关于 → 成书
  admin:   'assets/items/admin.png'           // 管理 → 命令方块
};
/* 生成模式/功能图标 HTML（img 像素风） */
function mcIcon(key, cls){
  const src = ICON[key] || ICON.sword;
  return '<img class="mc-ic '+(cls||'')+'" src="'+src+'" alt="" aria-hidden="true">';
}
const MODE_KEYS = Object.keys(MODES);
const TOTAL_KEY = 'total'; // 虚拟总榜

/* 段位体系：HT1 最高 → LT5 最低，每个模式独立计算 */
const TIERS = [
  { id: 'HT1', min: 1000, label: 'HT1', cls: 'badge-HT1', color: '#f5b942' }, // 金
  { id: 'HT2', min: 600,  label: 'HT2', cls: 'badge-HT2', color: '#e04040' }, // 红
  { id: 'HT3', min: 300,  label: 'HT3', cls: 'badge-HT3', color: '#a64ae0' }, // 紫
  { id: 'LT4', min: 100,  label: 'LT4', cls: 'badge-LT4', color: '#3f9fe0' }, // 蓝
  { id: 'LT5', min: 0,    label: 'LT5', cls: 'badge-LT5', color: '#8a8a8a' }  // 灰
];
function tierOf(score){ for(const t of TIERS){ if(score >= t.min) return t; } return TIERS[TIERS.length-1]; }

const DB_KEY = 'mc_pvp_db_v1';
const CFG_KEY = 'mc_pvp_cfg_v1';
const SESSION_KEY = 'mc_pvp_session_v1';
const ADMIN_DEFAULT = 'admin888';

/* ── 2) 状态与存储 ── */
let DB = null;          // 业务数据
let CFG = null;         // DIY/主题配置
let session = null;     // 登录会话
let currentMode = 'sword';

/* 默认演示数据（首次加载时注入） */
const AVATARS = ['🧑','👩','🧔','👦','👧','🧙','⚔️','🛡️','💎','🔥','🌊','🌿','⚡','☄️','🐺','🐉','🤖','👻','😎','🤠'];
const SEED_NAMES = [
  ['Notch_Steve','9'], ['Herobrine_X','9'], ['Creeper_Killer','9'], ['Alex_PvP','9'],
  ['DiamondSword','9'], ['EnderDragon','9'], ['ZombieHunter','9'], ['SkeletonKing','9'],
  ['PiglinWarrior','9'], ['EndermanPro','9'], ['WitherLord','9'], ['BlazeRider','9'],
  ['GhastMaster','9'], ['SlimeKing','9'], ['GuardianX','9'], ['PhantomSlayer','9'],
  ['WardenKing','9'], ['AllayFairy','9'], ['AxolotlBoy','9'], ['FoxTail','9']
];
function seedPlayers(){
  const list = {};
  SEED_NAMES.forEach((n,i)=>{
    const id = 'p'+(i+1);
    const scores = {};
    MODE_KEYS.forEach(m=>{ if(m!=='heart') scores[m] = Math.floor(Math.random()*950)+50; });
    list[id] = {
      id, name: n[0], pwd: n[1], avatar: AVATARS[i % AVATARS.length],
      scores, createdAt: Date.now() - i*86400000
    };
  });
  // 让部分玩家有高段位，便于展示
  list.p1.scores.sword = 1320; list.p1.scores.axe = 1080;
  list.p2.scores.sword = 980;  list.p2.scores.diamond = 1150;
  list.p3.scores.alloy = 890;  list.p3.scores.crystal = 1200;
  list.p5.scores.hammer = 760;
  return list;
}
function defaultDB(){
  return {
    version: 1,
    players: seedPlayers(),
    likes: { counts: {}, today: todayStr(), used: {} }, // 心动榜：点赞数 + 今日已用次数
    logs: [],
    adminPwd: ADMIN_DEFAULT
  };
}
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function loadDB(){
  try{ const raw = localStorage.getItem(DB_KEY); if(raw){ DB = JSON.parse(raw); } }catch(e){}
  if(!DB || !DB.players){ DB = defaultDB(); saveDB(); }
  // 跨天重置点赞次数
  if(DB.likes.today !== todayStr()){
    DB.likes.today = todayStr();
    DB.likes.used = {};
    saveDB();
  }
}
function saveDB(){ try{ localStorage.setItem(DB_KEY, JSON.stringify(DB)); }catch(e){} }
function defaultCfg(){
  return { theme:'blackstone', density:'standard', showAvatar:true, showBadge:true, showScore:true, radius:14, blur:14 };
}
function loadCfg(){
  try{ const raw = localStorage.getItem(CFG_KEY); if(raw){ CFG = JSON.parse(raw); } }catch(e){}
  if(!CFG){ CFG = defaultCfg(); saveCfg(); }
}
function saveCfg(){ try{ localStorage.setItem(CFG_KEY, JSON.stringify(CFG)); }catch(e){} }
function loadSession(){ try{ const raw = localStorage.getItem(SESSION_KEY); if(raw){ session = JSON.parse(raw); } }catch(e){} }
function saveSession(){ if(session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); }

/* ── 3) 业务工具函数 ── */
function getTotalScore(p){ // 总榜 = 除嘉豪/心动的6个模式之和
  let s=0; MODE_KEYS.forEach(m=>{ if(MODES[m].inTotal) s += (p.scores[m]||0); }); return s;
}
function playerList(){ return Object.values(DB.players); }
/* 生成榜单：mode 为模式key或 total */
function buildRank(mode){
  const list = playerList();
  if(mode === 'total'){
    return list.map(p=>({p, score:getTotalScore(p), tier: tierOf(getTotalScore(p))}))
      .sort((a,b)=>b.score-a.score);
  }
  if(mode === 'heart'){
    return list.map(p=>({p, score: DB.likes.counts[p.id]||0}))
      .sort((a,b)=>b.score-a.score);
  }
  return list.map(p=>({p, score:p.scores[mode]||0, tier: tierOf(p.scores[mode]||0)}))
    .sort((a,b)=>b.score-a.score);
}
/* 获取玩家在指定模式中的排名（1-based） */
function rankOf(mode, pid){
  const rank = buildRank(mode);
  const idx = rank.findIndex(r=>r.p.id===pid);
  return idx<0 ? null : idx+1;
}
function addLog(action, detail){
  DB.logs.unshift({ t: Date.now(), action, detail });
  if(DB.logs.length>200) DB.logs.length=200;
}
function fmtTime(ts){ const d=new Date(ts); return (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function hashPwd(p){ // 简单演示哈希（非安全，仅供演示）
  let h=0; for(let i=0;i<p.length;i++){ h = (h*31 + p.charCodeAt(i))|0; } return 'h'+Math.abs(h);
}

/* ── 4) UI 渲染 ── */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* 粒子爆裂特效：使用 MC 物品图片小图标 */
function burstParticles(x, y, key){
  const layer = $('#particles');
  const keys = key ? [key] : ['heart','heart','crystal','sword','heart','crystal','sword','heart'];
  for(let i=0;i<12;i++){
    const el = document.createElement('img');
    el.className = 'particle';
    const k = keys[Math.floor(Math.random()*keys.length)];
    el.src = ICON[k] || ICON.heart;
    el.style.left = x+'px'; el.style.top = y+'px';
    const ang = Math.random()*Math.PI*2, dist = 40+Math.random()*70;
    el.style.setProperty('--dx', Math.cos(ang)*dist+'px');
    el.style.setProperty('--dy', (Math.sin(ang)*dist-30)+'px');
    el.style.setProperty('--rot', (Math.random()*360-180)+'deg');
    el.style.width = (12+Math.random()*10)+'px';
    el.style.height = 'auto';
    layer.appendChild(el);
    setTimeout(()=>el.remove(), 950);
  }
}
/* 震动反馈 */
function vibrate(ms){ if(navigator.vibrate) try{ navigator.vibrate(ms||20); }catch(e){} }

function esc(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'"',"'":'&#39;'}[c])); }

/* 渲染单个榜单项 */
function renderItem(row, idx, mode){
  const {p, score, tier} = row;
  const rank = idx+1;
  const crown = rank===1?mcIcon('crown','crown-ic'):rank===2?mcIcon('crownSilver','crown-ic'):rank===3?mcIcon('crownBronze','crown-ic'):'';
  const rankCls = rank===1?'r1':rank===2?'r2':rank===3?'r3':'';
  // P3：升降箭头（演示版无 prev_rank，用伪随机稳定值模拟，接入后端后替换为 p.prev_rank）
  const prevRank = (p.prev_rank !== undefined) ? p.prev_rank : ((idx*7)%5 === 0 ? rank+2 : ((idx*3)%4===0 ? Math.max(1,rank-2) : rank));
  const trend = prevRank > rank ? '▲' : (prevRank < rank ? '▼' : '—');
  const trendCls = prevRank > rank ? 'up' : (prevRank < rank ? 'down' : 'flat');
  // P3：总榜称号（≥450 战神 / ≥300 宗师 / ≥100 精英 / 其余 新秀）
  const title = score>=450?'战神':score>=300?'宗师':score>=100?'精英':'新秀';
  const div = document.createElement('div');
  div.className = 'list-item';
  div.dataset.pid = p.id;               // 整行可点击 → 打开玩家个人面板
  div.style.cursor = 'pointer';
  div.style.animationDelay = (idx*0.03)+'s';
  let html = '';
  html += '<div class="rank-no '+rankCls+'"><span class="crown">'+crown+'</span>'+rank+'</div>';
  if(CFG.showAvatar){
    // P3：真实 MC 头像（mc-heads.net），onerror 兜底为 emoji，lazy 加载
    html += '<div class="avatar" data-avatar>'
      + '<img class="avatar-img" loading="lazy" width="38" height="38" '
      + 'src="https://mc-heads.net/avatar/'+encodeURIComponent(p.name)+'/64" '
      + 'alt="'+esc(p.name)+' 的头像" '
      + 'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">'
      + '<span class="avatar-fallback" style="display:none">'+esc(p.avatar||'🧑')+'</span></div>';
  }
  html += '<div class="p-info"><div class="p-name" data-name>'+esc(p.name)
    + ' <span class="trend '+trendCls+'">'+trend+'</span>'
    + ' <span class="rank-title">'+title+'</span></div><div class="p-sub">';
  if(CFG.showBadge){
    const t = tier || tierOf(score);
    html += '<span class="badge '+t.cls+'">'+t.label+'</span>';
  }
  if(mode === 'heart'){
    const totalRank = rankOf('total', p.id);
    html += '<span>'+mcIcon('heart','ic-sm')+' '+(score||0)+'</span><span>总榜 #'+(totalRank||'-')+'</span>';
  } else if(mode === 'total'){
    html += '<span>6模式合计</span>';
  } else {
    html += '<span>'+(MODES[mode] ? MODES[mode].desc : '')+'</span>';
  }
  html += '</div></div>';
  if(CFG.showScore){
    if(mode === 'heart'){
      html += '<div class="heart-col"><div class="heart-num">'+(score||0)+'</div><div style="font-size:9px;color:var(--t-dim)">'+mcIcon('heart','ic-sm')+' 点赞</div></div>';
    } else {
      html += '<div class="p-score"><b>'+score+'</b><span>积分</span></div>';
    }
  }
  if(mode === 'heart'){
    const liked = session && (DB.likes.used[session.pid]||0) > 0;
    html += '<button class="like-btn '+(liked?'liked':'')+'" data-like="'+p.id+'" '+(session?'':'disabled')+'>'
      + mcIcon(liked?'heart':'heartEmpty','like-ic')+'</button>';
  }
  div.innerHTML = html;
  return div;
}

/* 渲染榜单 */
function renderList(){
  const wrap = $('#listContent');
  wrap.innerHTML = '';
  let rows;
  if(currentMode === 'total') rows = buildRank('total');
  else if(currentMode === 'heart') rows = buildRank('heart');
  else rows = buildRank(currentMode);
  const frag = document.createDocumentFragment();
  rows.forEach((r,i)=>{ frag.appendChild(renderItem(r, i, currentMode)); });
  wrap.appendChild(frag);
  let title='', sub='';
  if(currentMode==='total'){ title=mcIcon('total','ic-md')+' 总榜'; sub='除嘉豪/心动外 · 积分汇总'; }
  else if(currentMode==='heart'){ title=mcIcon('heart','ic-md')+' 心动榜'; sub='按点赞排序 · 每日限10赞'; }
  else { title = mcIcon(currentMode,'ic-md')+' '+MODES[currentMode].name; sub = MODES[currentMode].desc+' · 段位独立计算'; }
  $('#listTitle').innerHTML = title;
  $('#listSub').textContent = sub;
  if(!rows.length){ wrap.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--t-dim)">暂无玩家，快去后台添加吧</div>'; }
}

/* ── 5) 登录系统 ── */
function openAuth(){
  showDialog(mcIcon('admin','ic-dlg')+' 玩家登录', `
    <div class="row"><label>游戏ID</label><input class="inp-px" id="authName" placeholder="输入游戏ID"></div>
    <div class="row"><label>密码</label><input class="inp-px" id="authPwd" type="password" placeholder="输入密码"></div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn-px green" id="btnLogin">登 录</button>
      <button class="btn-px blue" id="btnRegister">注 册</button>
    </div>
    <div style="font-size:11px;color:var(--t-dim);margin-top:8px">演示账号：Notch_Steve / 9</div>
  `, {closeBtn:true});
  $('#btnLogin').onclick = ()=>{ doLogin(false); };
  $('#btnRegister').onclick = ()=>{ doLogin(true); };
  $('#authName').onkeydown = e=>{ if(e.key==='Enter') doLogin(false); };
  $('#authPwd').onkeydown = e=>{ if(e.key==='Enter') doLogin(false); };
}
function doLogin(isRegister){
  const name = ($('#authName').value||'').trim();
  const pwd = $('#authPwd').value||'';
  if(!name || !pwd){ toast('请输入ID和密码'); return; }
  const p = Object.values(DB.players).find(x=>x.name.toLowerCase()===name.toLowerCase());
  if(isRegister){
    if(p){ toast('该ID已存在，请直接登录'); return; }
    const id = 'u'+Date.now();
    const scores = {};
    MODE_KEYS.forEach(m=>{ if(m!=='heart') scores[m]=0; });
    DB.players[id] = { id, name, pwd: hashPwd(pwd), avatar:'🧑', scores, createdAt:Date.now() };
    addLog('注册', name); saveDB();
    session = { pid:id, name, at:Date.now() };
    saveSession(); closeDialog(); renderUserPanel(); renderList(); toast('注册成功，欢迎 '+name+'！');
  } else {
    if(!p){ toast('账号不存在，请先注册'); return; }
    if(p.pwd !== hashPwd(pwd) && p.pwd !== pwd){ toast('密码错误'); return; }
    session = { pid:p.id, name:p.name, at:Date.now() };
    saveSession(); closeDialog(); renderUserPanel(); renderList(); toast('欢迎回来，'+p.name+'！');
  }
}
function logout(){
  session = null; saveSession(); renderUserPanel(); renderList();
  toast('已退出登录');
}

/* 用户面板 */
function renderUserPanel(){
  const el = $('#userPanel');
  const me = session && DB.players[session.pid];
  if(!me){
    el.classList.remove('hidden');
    el.innerHTML = `<button class="btn-px blue" id="btnAuth" style="width:100%">${mcIcon('admin','ic-xs')} 登录 / 注册</button>`;
    $('#btnAuth').onclick = openAuth;
    return;
  }
  el.classList.remove('hidden');
  const total = getTotalScore(me);
  const totalRank = rankOf('total', me.id);
  const heartCount = DB.likes.counts[me.id]||0;
  let html = '';
  html += `<div class="up-head"><div class="up-avatar">${esc(me.avatar||'🧑')}</div><div style="flex:1;min-width:0">
    <div class="up-name">${esc(me.name)}</div>
    <div class="up-sub">总榜排名 #${totalRank||'-'} · 被赞 ${heartCount}</div></div>
    <button class="btn-px red sm" id="btnLogout">退出</button></div>`;
  html += `<div class="up-grid">`;
  html += `<div class="up-cell"><b>${total}</b><span>总积分</span></div>`;
  html += `<div class="up-cell"><b>${tierOf(total).label}</b><span>总段位</span></div>`;
  html += `<div class="up-cell"><b>${heartCount}</b><span>被点赞</span></div>`;
  html += `<div class="up-cell"><b>#${totalRank||'-'}</b><span>总榜</span></div>`;
  html += `</div>`;
  el.innerHTML = html;
  $('#btnLogout').onclick = logout;
}

/* ── 6) 模式切换（玻璃滑动高亮） ── */
function updateGlider(btn){
  const bar = $('#modeBar');
  const glider = $('#modeGlider');
  const idx = $$('.mode-item').indexOf(btn);
  let left = 0, width = 0;
  const items = $$('.mode-item');
  if(items[idx]){
    left = btn.offsetLeft - bar.scrollLeft + btn.offsetWidth/2;
    width = btn.offsetWidth;
  }
  glider.style.width = width+'px';
  glider.style.transform = 'translateX('+(btn.offsetLeft - bar.scrollLeft)+'px)';
}
function switchMode(key){
  currentMode = key;
  $$('.mode-item').forEach(b=>{
    const on = b.dataset.mode===key;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false'); // ✅ 无障碍状态
  });
  const btn = document.querySelector('.mode-item[data-mode="'+key+'"]');
  if(btn){
    btn.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
    setTimeout(()=>updateGlider(btn), 200);
  }
  renderList();
  updateModeFade();
}
/* 模式栏边缘淡出状态机：scroll 监听切换 at-start / at-end / at-both */
function updateModeFade(){
  const bar = $('#modeBar');
  if(!bar) return;
  const maxScroll = bar.scrollWidth - bar.clientWidth;
  const atStart = bar.scrollLeft <= 4;
  const atEnd = bar.scrollLeft >= maxScroll - 4;
  bar.classList.remove('at-start','at-end','at-both');
  if(maxScroll <= 0){ bar.classList.add('at-both'); return; }   // 桌面宽屏放得下 → 无淡出
  if(atStart && atEnd){ bar.classList.add('at-both'); }
  else if(atStart){ bar.classList.add('at-start'); }
  else if(atEnd){ bar.classList.add('at-end'); }
  // 默认（中间）：CSS 基础 mask 即两侧淡出
}

/* ── 7) 弹窗系统 ── */
let dialogCleanup = null;
function showDialog(title, bodyHTML, opts={}){
  const overlay = $('#overlay');
  overlay.classList.remove('hidden');
  document.body.classList.add('dialog-open');   // P0：弹窗打开时给 body 加状态类（CSS 据此暂停后台动画）
  const root = $('#dialogRoot');
  root.innerHTML = `
    <div class="dialog-wrap" id="dlgWrap">
      <div class="dialog-box mc-dialog${opts.refract ? ' glass-refract' : ''}">
        <div class="dialog-head">
          <div class="dialog-title px-title">${title}</div>
          ${opts.closeBtn!==false ? '<button class="dialog-close" id="dlgClose">✕</button>' : ''}
        </div>
        <div class="dialog-body">${bodyHTML}</div>
      </div>
    </div>`;
  const close = ()=>{
    overlay.classList.add('hidden'); root.innerHTML='';
    document.body.classList.remove('dialog-open');   // 关闭 → 恢复后台动画
    if(dialogCleanup){ dialogCleanup(); dialogCleanup=null; }
  };
  const cbtn = $('#dlgClose');
  if(cbtn) cbtn.onclick = close;
  overlay.onclick = (e)=>{ if(e.target===overlay) close(); };
  // 保存关闭函数供外部使用
  window.__closeDialog = close;
  return close;
}
function closeDialog(){ if(window.__closeDialog) window.__closeDialog(); }
function toast(msg){
  let t = $('#toastBox');
  if(!t){ t = document.createElement('div'); t.id='toastBox'; t.style.cssText='position:fixed;left:50%;bottom:100px;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;z-index:999;border:2px solid var(--t-border);max-width:86vw;text-align:center;'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.opacity = 1;
  t.style.transition = 'opacity .4s';
  clearTimeout(t._tm);
  t._tm = setTimeout(()=>{ t.style.opacity = 0; }, 2000);
}

/* ── 8) 顶部导航：主题 / DIY / 音乐 / 关于 / 管理 ── */
/* 8.1 主题 */
const THEMES = {
  blackstone:{ name:'经典黑石', bg:'#14141c', fg:'#f2e9d8' },
  nether:   { name:'下界红',   bg:'#1c0d0d', fg:'#ffd9c9' },
  diamond:  { name:'钻石白',   bg:'#eef4fa', fg:'#243447' },
  jade:     { name:'翡翠绿',   bg:'#0c1a12', fg:'#d8f5e4' }
};
function openTheme(){
  let html = '<div class="theme-grid">';
  Object.keys(THEMES).forEach(k=>{
    const t = THEMES[k];
    const on = CFG.theme===k ? ' on':'';
    html += `<button class="theme-cell${on}" data-theme-k="${k}">
      <span class="swatch" style="background:${t.bg};color:${t.fg}">⬛</span>${t.name}</button>`;
  });
  html += '</div><div style="font-size:11px;color:var(--t-dim)">切换主题时全站配色平滑过渡</div>';
  showDialog(mcIcon('theme','ic-dlg')+' 主题切换', html, {closeBtn:true});
  $$('.theme-cell').forEach(b=>{
    b.onclick = ()=>{
      CFG.theme = b.dataset.themeK;
      saveCfg(); applyCfg();
      $$('.theme-cell').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
    };
  });
}
/* 8.2 DIY 布局 */
function openDIY(){
  const densityMap = { compact:'紧凑', standard:'标准', loose:'宽松' };
  let html = '';
  html += `<div class="diy-row"><span class="lbl">列表密度</span><div class="seg" id="segDensity">`;
  Object.keys(densityMap).forEach(k=>{
    html += `<button class="${CFG.density===k?'on':''}" data-d="${k}">${densityMap[k]}</button>`;
  });
  html += `</div></div>`;
  const mkSwitch = (key,label)=>{ const on = CFG[key]; html += `<div class="diy-row"><span class="lbl">${label}</span><div class="seg"><button class="${on?'on':''}" data-sw="${key}" data-v="1">显示</button><button class="${!on?'on':''}" data-sw="${key}" data-v="0">隐藏</button></div></div>`; };
  mkSwitch('showAvatar','头像');
  mkSwitch('showBadge','段位徽章');
  mkSwitch('showScore','积分列');
  html += `<div class="diy-row"><span class="lbl">面板圆角 ${CFG.radius}px</span><input type="range" min="4" max="24" value="${CFG.radius}" id="rRadius" style="flex:1;max-width:140px"></div>`;
  html += `<div class="diy-row"><span class="lbl">玻璃强度 ${CFG.blur}px</span><input type="range" min="2" max="30" value="${CFG.blur}" id="rBlur" style="flex:1;max-width:140px"></div>`;
  showDialog(mcIcon('diy','ic-dlg')+' DIY 布局', html, {closeBtn:true});
  $('#segDensity').querySelectorAll('button').forEach(b=>{
    b.onclick = ()=>{ CFG.density=b.dataset.d; saveCfg(); applyCfg(); $('#segDensity').querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); };
  });
  $$('[data-sw]').forEach(b=>{
    b.onclick = ()=>{
      CFG[b.dataset.sw] = b.dataset.v==='1';
      saveCfg(); applyCfg();
      $$('[data-sw="'+b.dataset.sw+'"]').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
    };
  });
  $('#rRadius').oninput = e=>{ CFG.radius = +e.target.value; saveCfg(); applyCfg(); };
  $('#rBlur').oninput = e=>{ CFG.blur = +e.target.value; saveCfg(); applyCfg(); };
}
/* 8.3 音乐 */
let audioCtx=null, musicGain=null, musicTimer=null, musicPlaying=false;
function openMusic(){
  let html = `<div style="text-align:center;padding:6px 0">
    <div style="font-size:40px;margin-bottom:8px">${mcIcon('music','ic-big')}</div>
    <div style="font-weight:bold;margin-bottom:4px">MC 像素轻音乐（WebAudio 合成）</div>
    <div style="font-size:11px;color:var(--t-dim);margin-bottom:12px">C418 风格 · 本地合成 · 无需网络 · 版权安全</div>
    <button class="btn-px gold" id="musicToggle" style="width:100%">${musicPlaying?'暂停':'播放'}</button>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn-px blue sm" id="musicVolDown">音量 -</button>
      <button class="btn-px blue sm" id="musicVolUp">音量 +</button>
    </div>
    <div style="font-size:10px;color:var(--t-dim);margin-top:10px">提示：如需上传本地音频，可在 index.html 中配置 &lt;audio&gt; 标签对接。</div>
  </div>`;
  showDialog(mcIcon('music','ic-dlg')+' 音乐播放器', html, {closeBtn:true});
  $('#musicToggle').onclick = ()=>{ toggleMusic(); $('#musicToggle').textContent = musicPlaying?'暂停':'播放'; };
  $('#musicVolDown').onclick = ()=>{ if(musicGain) musicGain.gain.value = Math.max(0, (musicGain.gain.value||0.15)-0.05); };
  $('#musicVolUp').onclick = ()=>{ if(musicGain) musicGain.gain.value = Math.min(1, (musicGain.gain.value||0.15)+0.05); };
}
function toggleMusic(){
  if(musicPlaying){ stopMusic(); return; }
  startMusic();
}
function startMusic(){
  try{
    if(!audioCtx){ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
    if(audioCtx.state==='suspended') audioCtx.resume();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(audioCtx.destination);
    musicPlaying = true;
    $('#miniPlayer').classList.remove('hidden');
    $('#mpBtn').innerHTML = mcIcon('musicPlay','ic-sm');
    // 启动旋律循环
    scheduleMelody();
  }catch(e){ toast('音乐初始化失败：'+e.message); }
}
function stopMusic(){
  musicPlaying = false;
  if(musicTimer){ clearTimeout(musicTimer); musicTimer=null; }
  $('#miniPlayer').classList.add('hidden');
}
function scheduleMelody(){
  if(!musicPlaying) return;
  const now = audioCtx.currentTime;
  const scale = [0,2,4,5,7,9,11,12,14,16];
  // 简单C418风旋律（每0.28秒一个音符）
  const steps = 8;
  for(let i=0;i<steps;i++){
    const t = now + i*0.28;
    const n = scale[Math.floor(Math.random()*scale.length)] + 60;
    playNote(n, t, 0.22, 'triangle');
    if(i%2===0) playNote(n-12, t, 0.3, 'sine', 0.4);
  }
  // 低音
  const bassNote = 36 + [0,3,5,7][Math.floor(Math.random()*4)];
  playNote(bassNote, now, 2, 'sine', 0.5);
  musicTimer = setTimeout(scheduleMelody, steps*280);
}
function playNote(midi, t, dur, type, vol){
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type||'triangle';
  o.frequency.value = 440 * Math.pow(2, (midi-69)/12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol||0.12, t+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(musicGain);
  o.start(t); o.stop(t+dur+0.05);
}
/* 8.4 关于 */
function openAbout(){
  const html = `<div style="text-align:center;padding:4px 0">
    <div style="font-size:44px;margin-bottom:6px">${mcIcon('sword','ic-big')}</div>
    <div style="font-weight:bold;font-size:16px;margin-bottom:2px">Minecraft PVP 排行榜</div>
    <div style="font-size:11px;color:var(--t-dim);margin-bottom:10px">版本 v1.1.0 · 前端演示版</div>
    <div style="text-align:left;font-size:12px;line-height:1.9;background:var(--t-bg2);border-radius:10px;padding:10px;margin-bottom:8px">
      <b>功能特性：</b><br>
      · 8大独立模式 + 总榜（嘉豪/心动不计总分）<br>
      · HT/LT 五级段位体系（每模式独立）<br>
      · 心动榜每日10赞 · 跨天自动重置<br>
      · 玻璃拟态滑动模式栏 + 平滑过渡<br>
      · 4套主题 + DIY布局自定义<br>
      · 管理员后台（增删改/导数据/日志）<br>
      · 数据 localStorage 存储，预留后端接口<br>
    </div>
    <div style="text-align:left;font-size:11px;color:var(--t-dim);background:var(--t-bg2);border-radius:10px;padding:10px;margin-bottom:8px">
      <b>更新日志：</b><br>
      v1.1.0 — 原版物品图标 + 苹果玻璃动效<br>
    </div>
    <div style="font-size:11px;color:var(--t-dim)">制作者：Operit · Powered by MC</div>
  </div>`;
  showDialog(mcIcon('about','ic-dlg')+' 关于', html, {closeBtn:true});
}

/* ── 8.5) 玩家个人面板（点击榜单项打开） ──
   v1.1 语义澄清：不再用"音乐播放器"隐喻。
   - 进度条 → 只读胜率条（展示模式达标率，不可拖拽）
   - 主按钮 → 「展开对战记录」（数据计数动画 + 折叠明细）
   - ⏮/⏭ → 切换上/下一名玩家 */
let ppListCache = [];      // 当前榜单顺序缓存（供上/下一名）
let ppIndexCache = 0;

function openPlayerPanel(pid){
  const p = DB.players[pid];
  if(!p){ toast('玩家不存在'); return; }
  const total = getTotalScore(p);
  const totalRank = rankOf('total', pid);
  const heartCount = DB.likes.counts[pid]||0;
  // 各模式积分 + 独立段位
  let modeHtml = '';
  MODE_KEYS.forEach(m=>{
    if(m==='heart') return;
    const s = p.scores[m]||0;
    const t = tierOf(s);
    const rank = rankOf(m, pid);
    const pct = Math.min(100, Math.round(s/1500*100));   // 只读胜率条（相对满分1500）
    modeHtml += `<div class="pp-mode">
      <span class="pp-mode-icon">${mcIcon(m,'ic-sm')}</span>
      <span class="pp-mode-name">${MODES[m].name}</span>
      <span class="badge ${t.cls}">${t.label}</span>
      <span class="pp-mode-rank">#${rank||'-'}</span>
      <span class="pp-mode-score">${s}</span>
      <span class="pp-winrate" data-win="${pct}"><i style="width:${pct}%"></i><em>${pct}%</em></span>
    </div>`;
  });
  // 历史记录（该玩家相关的操作日志）
  let logsHtml = '';
  DB.logs.filter(l=> l.detail && l.detail.indexOf(p.name)>=0).slice(0,6).forEach(l=>{
    logsHtml += `<div class="log-line">${fmtTime(l.t)} · ${esc(l.action)} ${esc(l.detail||'')}</div>`;
  });
  if(!logsHtml) logsHtml = '<div class="log-line" style="color:var(--t-dim)">暂无操作记录</div>';

  // 记录榜单顺序（用于上/下一名切换）
  if(currentMode==='total') ppListCache = buildRank('total');
  else if(currentMode==='heart') ppListCache = buildRank('heart');
  else ppListCache = buildRank(currentMode);
  ppIndexCache = Math.max(0, ppListCache.findIndex(r=>r.p.id===pid));

  const html = `
    <div style="text-align:center;padding:4px 0 10px">
      <div class="pp-avatar">${esc(p.avatar||'🧑')}</div>
      <div class="pp-name px-title">${esc(p.name)}</div>
      <div class="pp-badges">
        <span class="badge ${tierOf(total).cls}">总段位 ${tierOf(total).label}</span>
        <span class="badge" style="background:linear-gradient(180deg,#ff6b81,#e0355a);color:#fff">${mcIcon('heart','ic-xs')} ${heartCount}</span>
      </div>
      <div class="pp-stats">
        <div class="pp-stat"><b data-count>${total}</b><span>总积分</span></div>
        <div class="pp-stat"><b>#${totalRank||'-'}</b><span>总榜排名</span></div>
        <div class="pp-stat"><b>${heartCount}</b><span>被点赞</span></div>
      </div>
      <!-- v1.1 语义澄清：主按钮 → 展开对战记录（非播放） -->
      <div class="pp-actions">
        <button class="btn-px blue sm" id="ppPrev">上一位</button>
        <button class="btn-px gold sm" id="ppToggle">${mcIcon('crystal','ic-xs')} 展开战绩</button>
        <button class="btn-px blue sm" id="ppNext">下一位</button>
      </div>
    </div>
    <div id="ppDetail" class="pp-detail">
      <div style="font-size:12px;font-weight:bold;margin:8px 0 4px;color:var(--t-accent)">${mcIcon('sword','ic-xs')} 各模式战绩（独立段位 · 胜率条只读）</div>
      ${modeHtml}
      <div style="font-size:12px;font-weight:bold;margin:10px 0 4px;color:var(--t-accent)">${mcIcon('about','ic-xs')} 最近操作</div>
      ${logsHtml}
    </div>
  `;
  const isMe = session && session.pid === pid;
  showDialog(isMe ? mcIcon('admin','ic-dlg')+' 我的个人面板' : mcIcon('admin','ic-dlg')+' 玩家档案', html, {closeBtn:true});
  // 主按钮：数据计数动画 + 折叠展开
  $('#ppToggle').onclick = function(){
    const d = $('#ppDetail');
    const collapsed = d.classList.toggle('collapsed');
    this.innerHTML = collapsed ? mcIcon('crystal','ic-xs')+' 展开战绩' : mcIcon('hammer','ic-xs')+' 收起战绩';
    if(!collapsed){ runCountUp(); }
  };
  // 上一位/下一位
  $('#ppPrev').onclick = ()=>{
    if(ppListCache.length<=1){ toast('没有更多玩家'); return; }
    const prev = ppListCache[(ppIndexCache-1+ppListCache.length)%ppListCache.length];
    closeDialog(); openPlayerPanel(prev.p.id);
  };
  $('#ppNext').onclick = ()=>{
    if(ppListCache.length<=1){ toast('没有更多玩家'); return; }
    const next = ppListCache[(ppIndexCache+1)%ppListCache.length];
    closeDialog(); openPlayerPanel(next.p.id);
  };
}
/* 数据计数动画：从 0 滚动到目标值 */
function runCountUp(){
  const el = document.querySelector('[data-count]');
  if(!el) return;
  const target = parseInt(el.textContent)||0;
  const dur = 700, t0 = performance.now();
  function tick(t){
    const k = Math.min(1,(t-t0)/dur);
    el.textContent = Math.round(target*(1-Math.pow(1-k,3)));  // easeOutCubic
    if(k<1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ── 9) 点赞交互（心动榜） ── */
function handleLike(pid, btn){
  if(!session){ toast('请先登录后再点赞'); openAuth(); return; }
  const used = DB.likes.used[session.pid] || 0;
  if(used >= 10){ toast('今日点赞已达上限（10次）明天再来吧！'); vibrate(30); return; }
  DB.likes.counts[pid] = (DB.likes.counts[pid]||0) + 1;
  DB.likes.used[session.pid] = used + 1;
  addLog('点赞', (DB.players[pid]||{}).name + ' +1');
  saveDB();
  // 粒子特效 + 震动
  const rect = btn.getBoundingClientRect();
  burstParticles(rect.left + rect.width/2, rect.top + rect.height/2);
  vibrate(20);
  btn.classList.add('burst');
  setTimeout(()=>btn.classList.remove('burst'), 400);
  toast('点赞成功！（今日剩余 '+(9-used)+' 次）');
  renderList();
}

/* ── 10) 管理后台 ── */
function openAdmin(){
  showDialog(mcIcon('admin','ic-dlg')+' 管理员验证', `
    <div class="row"><label>管理员密码</label><input class="inp-px" id="adminPwd" type="password" placeholder="默认 admin888"></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn-px gold" id="adminEnter" style="flex:1">进入后台</button>
    </div>
  `, {closeBtn:true});
  $('#adminEnter').onclick = ()=>{
    const pwd = $('#adminPwd').value || '';
    if(pwd === (DB.adminPwd||ADMIN_DEFAULT)){
      closeDialog();
      renderAdminPanel();
    } else { toast('密码错误'); vibrate(40); }
  };
  $('#adminPwd').onkeydown = e=>{ if(e.key==='Enter') $('#adminEnter').click(); };
}
/* 管理后台主面板 */
function renderAdminPanel(){
  let html = '';
  html += `<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
    <button class="btn-px green sm" id="admAdd">${mcIcon('diy','ic-xs')} 添加玩家</button>
    <button class="btn-px blue sm" id="admResetHeart">${mcIcon('heart','ic-xs')} 重置心动榜</button>
    <button class="btn-px sm" id="admExport">${mcIcon('about','ic-xs')} 导出JSON</button>
    <button class="btn-px sm" id="admImport">${mcIcon('diy','ic-xs')} 导入JSON</button>
  </div>`;
  html += `<div style="font-size:11px;color:var(--t-dim);margin-bottom:6px">玩家管理（点击"保存"即重算段位与排名）：</div>`;
  html += `<div id="admList">`;
  playerList().sort((a,b)=>getTotalScore(b)-getTotalScore(a)).forEach(p=>{
    html += `<div class="admin-row">
      <span class="a-name">${esc(p.name)}</span>`;
    html += `<select data-adm-mode="${p.id}" data-role="modeSel">`;
    MODE_KEYS.forEach(m=>{
      if(m==='heart') return;
      html += `<option value="${m}">${MODES[m].name}</option>`;
    });
    html += `</select>`;
    html += `<input type="number" data-adm-val="${p.id}" data-role="val" value="0" min="0" style="width:70px">`;
    html += `<button class="btn-px sm" data-adm-set="${p.id}">设置</button>`;
    html += `<button class="btn-px red sm" data-adm-del="${p.id}">删</button>`;
    html += `</div>`;
  });
  html += `</div>`;
  html += `<div style="margin-top:12px;font-size:11px;color:var(--t-dim)">${mcIcon('about','ic-xs')} 操作日志：</div><div id="admLogs">`;
  DB.logs.slice(0,20).forEach(l=>{
    html += `<div class="log-line">${fmtTime(l.t)} · ${esc(l.action)} ${esc(l.detail||'')}</div>`;
  });
  html += `</div>`;
  showDialog(mcIcon('admin','ic-dlg')+' 管理后台', html, {closeBtn:true});
  // 绑定事件
  $('#admAdd').onclick = admAddPlayer;
  $('#admResetHeart').onclick = ()=>{ DB.likes.counts = {}; DB.likes.used = {}; addLog('重置心动榜',''); saveDB(); toast('心动榜已重置'); renderAdminPanel(); };
  $('#admExport').onclick = admExport;
  $('#admImport').onclick = admImport;
  $$('[data-adm-set]').forEach(b=>{
    b.onclick = ()=>{
      const pid = b.dataset.admSet;
      const mode = document.querySelector('[data-adm-mode="'+pid+'"]').value;
      const val = parseInt(document.querySelector('[data-adm-val="'+pid+'"]').value)||0;
      DB.players[pid].scores[mode] = val;
      addLog('改积分', DB.players[pid].name+' '+MODES[mode].name+'='+val);
      saveDB(); renderList(); toast('已更新 '+DB.players[pid].name+' 的 '+MODES[mode].name+' 积分');
    };
  });
  $$('[data-adm-del]').forEach(b=>{
    b.onclick = ()=>{
      const pid = b.dataset.admDel;
      const nm = DB.players[pid].name;
      if(confirm('确认删除玩家 '+nm+' ？')){
        delete DB.players[pid];
        addLog('删除玩家', nm);
        saveDB(); renderList(); renderAdminPanel(); toast('已删除 '+nm);
      }
    };
  });
}
function admAddPlayer(){
  showDialog(mcIcon('diy','ic-dlg')+' 添加玩家', `
    <div class="row"><label>游戏ID</label><input class="inp-px" id="newName" placeholder="玩家ID"></div>
    <div class="row"><label>密码</label><input class="inp-px" id="newPwd" value="9"></div>
    <div class="row"><label>头像(emoji)</label><input class="inp-px" id="newAvatar" value="🧑"></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn-px green" id="newSave" style="flex:1">保存</button>
    </div>
  `, {closeBtn:true});
  $('#newSave').onclick = ()=>{
    const name = ($('#newName').value||'').trim();
    if(!name){ toast('请输入ID'); return; }
    if(Object.values(DB.players).some(p=>p.name.toLowerCase()===name.toLowerCase())){ toast('ID已存在'); return; }
    const id = 'u'+Date.now();
    const scores = {};
    MODE_KEYS.forEach(m=>{ if(m!=='heart') scores[m]=0; });
    DB.players[id] = { id, name, pwd: hashPwd($('#newPwd').value||'9'), avatar: $('#newAvatar').value||'🧑', scores, createdAt:Date.now() };
    addLog('添加玩家', name);
    saveDB(); closeDialog(); renderAdminPanel(); renderList(); toast('已添加 '+name);
  };
}
function admExport(){
  const data = JSON.stringify(DB, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mc-pvp-data-'+todayStr()+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('已导出数据');
}
function admImport(){
  showDialog(mcIcon('diy','ic-dlg')+' 导入数据', `
    <div class="row"><label>粘贴JSON数据</label><textarea class="inp-px" id="importBox" rows="6" style="resize:vertical"></textarea></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn-px green" id="importSave" style="flex:1">导入</button>
    </div>
  `, {closeBtn:true});
  $('#importSave').onclick = ()=>{
    try{
      const data = JSON.parse($('#importBox').value);
      if(!data.players) throw new Error('缺少players字段');
      DB = data;
      saveDB(); closeDialog(); renderList(); renderUserPanel(); toast('导入成功！');
    }catch(e){ toast('导入失败：'+e.message); }
  };
}

/* ── 11) 配置应用 ── */
function applyCfg(){
  const root = document.documentElement;
  root.dataset.theme = CFG.theme || 'blackstone';
  // 密度
  $$('#app').forEach(el=>{ el.classList.remove('density-compact','density-standard','density-loose'); });
  const app = $('#app');
  app.classList.remove('density-compact','density-standard','density-loose');
  app.classList.add('density-'+CFG.density);
  // 圆角/模糊
  root.style.setProperty('--t-radius', CFG.radius+'px');
  root.style.setProperty('--t-blur', CFG.blur+'px');
  renderUserPanel();
  renderList();
}

/* ── 12) 下拉刷新「意图闸门」重做（最终版） ──
   必须同时满足：起点在顶 + 纵向意图 + 高阈值 + 松手判定 + 冷却 + 弹窗禁用 */
const PTR = {
  armed:false, pulling:false, sy:0, sx:0, dy:0,
  TH:88, DAMP:.35, MAX:140, cool:false
};
function ptrDialogOpen(){
  return !!document.querySelector('#overlay:not(.hidden)') || document.body.classList.contains('dialog-open');
}
function setPull(v){
  PTR.dy = v;
  const ind = $('#ptrIndicator'), ring = $('#ptrRing'), txt = $('#ptrText');
  if(!ind) return;
  if(v <= 0){ ind.classList.remove('show','spin'); txt.textContent='下拉刷新'; ring.style.transform=''; return; }
  ind.classList.add('show'); ind.classList.remove('spin');
  const prog = Math.min(1, v / PTR.TH);
  ring.style.transform = 'rotate(' + Math.round(prog*360) + 'deg)';
  txt.textContent = v >= PTR.TH ? '释放立即刷新' : '下拉刷新';
}
function springBack(){ setPull(0); }
function doRefresh(){
  PTR.cool = true;
  const ind = $('#ptrIndicator'), txt = $('#ptrText');
  if(ind){ ind.classList.add('spin'); }
  if(txt) txt.textContent = '刷新中…';
  // 真实重载数据
  try{ renderList(); renderUserPanel(); }catch(e){}
  setTimeout(()=>{ springBack(); }, 550);
  setTimeout(()=>{ PTR.cool = false; }, 2050);   // 冷却 1.5s + 回弹余量
}
function initPullRefresh(){
  document.addEventListener('touchstart', e=>{
    PTR.armed = (window.scrollY === 0) && !PTR.cool && !ptrDialogOpen();
    PTR.sx = e.touches[0].clientX; PTR.sy = e.touches[0].clientY;
    PTR.pulling = false; PTR.dy = 0;
  }, {passive:true});
  document.addEventListener('touchmove', e=>{
    if(!PTR.armed) return;
    const dx = e.touches[0].clientX - PTR.sx;
    const dy = e.touches[0].clientY - PTR.sy;
    // 横滑意图 → 立即退出（模式栏横滑场景），本次手势永不再介入
    if(!PTR.pulling && Math.abs(dx) > Math.abs(dy)){ PTR.armed = false; return; }
    // 已滚离顶部 → 复位
    if(window.scrollY > 0){ PTR.dy = 0; setPull(0); return; }
    // 纵向下拉 → 阻尼位移 + 阻止原生滚动
    if(dy > 0){
      PTR.pulling = true;
      e.preventDefault();
      setPull(Math.min(PTR.MAX, dy * PTR.DAMP));
    }
  }, {passive:false});
  document.addEventListener('touchend', ()=>{
    if(PTR.pulling && PTR.dy >= PTR.TH && !PTR.cool){ doRefresh(); }
    else { springBack(); }
    PTR.armed = PTR.pulling = false; PTR.dy = 0;
  }, {passive:true});
}

/* ── 13) 初始化 ── */
function init(){
  loadDB(); loadCfg(); loadSession();
  applyCfg();
  renderUserPanel();
  renderList();
  updateGlider(document.querySelector('.mode-item.on'));
  // 模式切换
  $$('.mode-item').forEach(btn=>{
    btn.addEventListener('click', ()=>switchMode(btn.dataset.mode));
  });
  // P3：模式栏横向滚动 → 实时更新渐隐遮罩
  $('#modeBar').addEventListener('scroll', updateModeFade, {passive:true});
  updateModeFade();
  // 首屏：当前选中模式立即居中一次（behavior:'auto'，无动画直接定位）
  requestAnimationFrame(()=>{
    const onBtn = document.querySelector('.mode-item.on');
    if(onBtn){ onBtn.scrollIntoView({behavior:'auto', inline:'center', block:'nearest'}); updateModeFade(); }
  });
  // 顶部导航
  $$('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const k = btn.dataset.nav;
      // ✅ 无障碍：记录当前激活入口
      $$('.nav-item').forEach(b=>b.setAttribute('aria-pressed', b===btn ? 'true' : 'false'));
      if(k==='theme') openTheme();
      else if(k==='diy') openDIY();
      else if(k==='music') openMusic();
      else if(k==='about') openAbout();
      else if(k==='admin') openAdmin();
    });
  });
  // 点击事件委托：点赞按钮优先，否则打开玩家个人面板
  $('#listContent').addEventListener('click', e=>{
    const likeBtn = e.target.closest('[data-like]');
    if(likeBtn){ handleLike(likeBtn.dataset.like, likeBtn); return; }
    const item = e.target.closest('[data-pid]');
    if(item) openPlayerPanel(item.dataset.pid);
  });
  // 迷你播放条
  $('#mpBtn').onclick = ()=>{ toggleMusic(); $('#mpBtn').innerHTML = musicPlaying?mcIcon('musicPlay','ic-sm'):mcIcon('music','ic-sm'); };
  $('#mpClose').onclick = ()=>{ stopMusic(); };
  // 窗口尺寸变化时修正滑块
  window.addEventListener('resize', ()=>{
    const btn = document.querySelector('.mode-item.on');
    if(btn) updateGlider(btn);
  });
  initPullRefresh();
  // ✅ Footer 年份自动更新
  const fy = document.getElementById('footerYear');
  if(fy) fy.textContent = new Date().getFullYear();
}
document.addEventListener('DOMContentLoaded', init);

/* ═══════════════════════════════════════════════════════════
   /*** API 对接区 ***
   当前为前端演示版，数据全部存于 localStorage。
   对接真实后端时，只需替换 loadDB/saveDB 的实现，例如：

   const BASE = 'https://your-backend.com/api';   // ← 后端地址
   async function loadDB(){
     const res = await fetch(BASE+'/players');
     DB = await res.json();
   }
   async function saveDB(){
     await fetch(BASE+'/players', {
       method:'POST', headers:{'Content-Type':'application/json'},
       body: JSON.stringify(DB)
     });
   }
   其余 UI/交互逻辑无需改动，即可无缝升级为在线多人版。
   ═══════════════════════════════════════════════════════════ */
