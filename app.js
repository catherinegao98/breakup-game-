import { firebaseConfig } from './config.js';
import { CARDS } from './cards.js';
import { ASSETS } from './assets.js';
import { NAMES, PAIRS, STAGES, initial, project, processRoom } from './engine.js';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=x=>Array.isArray(x)?x:[];
let uid=null,roomId=null,ownerUid=null,seats={},state=null,mine={},demo=false,demoRoom=null,api=null,db=null;
let stops=[],heartbeat=null,pending=null,connected=false,hostAlive=false,hostAt=0,hostBusy=false,hostDirty=false,selectedTab='table',filter='rules';
let authPromise=null;
const isHost=()=>uid===ownerUid;
const role=()=>Object.keys(seats).find(k=>seats[k].uid===uid);
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function friendly(e){const code=e?.code||'';if(code.includes('permission'))return '数据库拒绝访问：请确认已发布上传包中的 database.rules.json，且角色已入座。';if(code.includes('operation-not-allowed'))return '请在 Firebase Authentication 中启用匿名登录。';if(code.includes('unauthorized-domain'))return '请将 catherinegao98.github.io 加到 Firebase Authentication 授权域名。';if(code.includes('network'))return '无法连接 Firebase，请检查网络后重试。';return e?.message||'操作失败，请重试';}
async function bootFirebase(){
  if(authPromise)return authPromise;
  authPromise=(async()=>{
    if(!firebaseConfig.apiKey||!firebaseConfig.databaseURL)throw new Error('尚未配置 Firebase。可以先打开单机演示；联机配置请看上传包中的 README。');
    const base='https://www.gstatic.com/firebasejs/10.14.1/';
    const [app,auth,database]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-database.js')]);
    const fb=app.initializeApp(firebaseConfig);const a=auth.getAuth(fb);
    await auth.setPersistence(a,auth.browserLocalPersistence);
    await a.authStateReady();if(!a.currentUser)await auth.signInAnonymously(a);
    uid=a.currentUser.uid;api=database;db=database.getDatabase(fb);
  })();
  try{await authPromise;}catch(e){authPromise=null;throw e;}
}
function path(part=''){return api.ref(db,`rooms/${roomId}${part?'/'+part:''}`);}
function roomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=crypto.getRandomValues(new Uint8Array(8));return Array.from(bytes,n=>chars[n%chars.length]).join('');}
function validRoom(value){const v=value.trim().toUpperCase();if(!/^[A-Z0-9]{8}$/.test(v))throw new Error('请输入8位字母或数字房间号');return v;}
async function create(){await bootFirebase();demo=false;
  for(let attempt=0;attempt<5;attempt++){
    roomId=roomCode();ownerUid=uid;const engine=initial();
    const data={meta:{ownerUid:uid,heartbeat:api.serverTimestamp(),createdAt:api.serverTimestamp()},engine:JSON.stringify(engine),...project(engine,{})};
    try{const result=await api.runTransaction(path(),old=>old===null?data:undefined,{applyLocally:false});if(result.committed){await attach();return;}}catch(e){if(attempt===4)throw e;}
  }throw new Error('创建失败，请重试并检查数据库规则');
}
async function join(code){await bootFirebase();demo=false;roomId=validRoom(code);
  const snap=await api.get(path('meta'));if(!snap.exists())throw new Error('房间不存在，请核对房间号');ownerUid=snap.val().ownerUid;await attach();
}
function stop(){stops.forEach(fn=>fn());stops=[];clearInterval(heartbeat);heartbeat=null;pending=null;hostDirty=false;}
function showGame(){ $('welcome').hidden=true;$('game').hidden=false;$('room-label').textContent=roomId;$('mode-label').textContent=demo?'单机演示 / DEMO':'朋友局 / LIVE';}
async function attach(){
  stop();showGame();sessionStorage.setItem('breakup-room',roomId);
  stops.push(api.onValue(api.ref(db,'.info/connected'),snap=>{connected=snap.val()===true;renderConnection();},e=>toast(friendly(e))));
  stops.push(api.onValue(path('meta/heartbeat'),snap=>{hostAt=snap.val()||0;renderConnection();},e=>toast(friendly(e))));
  stops.push(api.onValue(path('seats'),snap=>{seats=Object.fromEntries(Object.entries(snap.val()||{}).filter(([,v])=>v?.uid));render();},e=>toast(friendly(e))));
  stops.push(api.onValue(path('public'),snap=>{state=snap.val();render();},e=>toast(friendly(e))));
  stops.push(api.onValue(path(`private/${uid}`),snap=>{mine=snap.val()||{};render();},e=>toast(friendly(e))));
  stops.push(api.onValue(path(`receipts/${uid}`),snap=>{const r=snap.val();if(r&&pending?.id===r.id){pending=null;toast(r.ok?'操作完成':r.message);render();}},e=>toast(friendly(e))));
  stops.push(api.onValue(path(`inbox/${uid}`),snap=>{const command=snap.val();if(command){pending={id:command.id};renderConnection();}else if(pending){pending=null;render();}},e=>toast(friendly(e))));
  if(isHost()) {
    // 房主只在存在请求或新座位未投影时发起事务；心跳不会触发循环写入。
    stops.push(api.onValue(path(),snap=>{const r=snap.val();if(r&&(Object.keys(r.inbox||{}).length||Object.values(r.seats||{}).some(seat=>seat?.uid&&!r.private?.[seat.uid])))scheduleHost();},e=>toast(friendly(e))));
    const pulse=()=>{if(connected)api.set(path('meta/heartbeat'),api.serverTimestamp()).catch(e=>toast(friendly(e)));};
    pulse();heartbeat=setInterval(pulse,12000);
  }
}
async function scheduleHost(){
  hostDirty=true;if(hostBusy)return;hostBusy=true;
  try{while(hostDirty){hostDirty=false;await api.runTransaction(path(),r=>r?processRoom(r):undefined,{applyLocally:false});}}
  catch(e){toast('DM 处理失败：'+friendly(e));}
  finally{hostBusy=false;}
}
async function chooseSeat(index){
  if(role()!==undefined)return;
  try{const result=await api.runTransaction(path(`seats/${index}`),old=>old?undefined:{uid,name:NAMES[index]},{applyLocally:false});if(!result.committed)toast('这个角色已被选走，请选其他角色');}
  catch(e){toast(friendly(e));}
}
function renderConnection(){
  hostAlive=demo||(hostAt>0&&Date.now()-hostAt<45000);
  let text=demo?'这是单浏览器演示：可切换角色体验流程，数据不会同步给朋友。':!connected?'网络未连接：暂时不能操作，正在等待重连。':!hostAlive?'DM 页面暂未在线，操作已暂停。请兼任 DM 的玩家重新打开原浏览器中的房间。':pending?'请求已提交，等待 DM 处理；请勿重复点击。':'已连接 · DM 页面请保持开启，所有玩家共享本局进度。';
  $('connection').textContent=text;$('connection').classList.toggle('warning',!demo&&(!connected||!hostAlive));
  document.querySelectorAll('[data-command]').forEach(b=>b.disabled=!!pending||(!demo&&(!connected||!hostAlive)));
}
async function send(action,payload={}){
  if(!state||role()===undefined)return toast('请先选择角色');
  if(pending)return toast('上一个操作仍在处理中');
  const cmd={id:crypto.randomUUID(),action,payload,epoch:state.epoch,at:Date.now()};
  if(demo){demoRoom.inbox={[uid]:cmd};processRoom(demoRoom);const receipt=demoRoom.receipts[uid];syncDemo();if(!receipt.ok)toast(receipt.message);return;}
  if(!connected||!hostAlive)return toast('请等待网络和 DM 恢复连接');
  pending={id:cmd.id};renderConnection();
  try{await api.set(path(`inbox/${uid}`),cmd);}catch(e){pending=null;renderConnection();toast(friendly(e));}
}
function startDemo(){
  stop();demo=true;uid='demo0';ownerUid=uid;roomId='演示房间';
  seats=Object.fromEntries(NAMES.map((name,i)=>[i,{name,uid:`demo${i}`} ]));
  demoRoom={meta:{ownerUid},seats,engine:initial(),...project(initial(),seats)};connected=true;hostAlive=true;showGame();syncDemo();
}
function syncDemo(){state=demoRoom.public;mine=demoRoom.private[uid]||{};render();}
const command=(action,label,extra='',className='primary')=>`<button class="${className}" data-command="${action}" ${extra}>${label}</button>`;
const empty=text=>`<p class="empty">${esc(text)}</p>`;
function options(exclude=[],selected){return NAMES.map((n,i)=>exclude.includes(String(i))?'':`<option value="${i}" ${String(selected)===String(i)?'selected':''}>${n}</option>`).join('');}
function select(id,label,exclude=[]){return `<label for="${id}">${label}</label><select id="${id}">${options(exclude)}</select>`;}
function picture(asset){return `<button class="image-card" aria-label="${esc(asset.title)}" data-image="${esc(asset.src)}" data-caption="${esc(asset.title)}"><img src="./${esc(asset.src)}" alt="" loading="lazy"><span>${esc(asset.title)}</span></button>`;}
function textCard(card,revealed=false){return `<article class="text-card"><span class="card-kind">SCOOP CARD / 自定义爆料</span><p>${esc(card.text)}</p><span class="truth">真实角色：${esc(card.character)}</span>${!revealed?command('choosePlay','打出这张爆料',`data-card="${card.id}"`):''}</article>`;}
function render(){
  if(!state)return;const r=role();
  $('seat-panel').hidden=r!==undefined;$('play-area').hidden=r===undefined;
  $('seat-options').innerHTML=NAMES.map((name,i)=>`<button class="seat" data-seat="${i}" ${seats[i]?'disabled':''}>${name}<small>${seats[i]?'已入座':'点击选择角色'} · ${PAIRS[Math.floor(i/2)]}</small></button>`).join('');
  if(r===undefined){renderConnection();return;}
  $('identity').innerHTML=`${NAMES[r]} ${isHost()?'<span class="badge">兼任 DM</span>':''}${demo?`<label class="tiny" for="demo-role">演示切换角色</label><select id="demo-role">${options([],r)}</select>`:''}`;
  $('phase-label').textContent=STAGES[state.stage]||state.stage;
  $('scores').innerHTML=PAIRS.map((name,i)=>`<div class="score"><span>${name}</span><strong>${state.love?.[i]??0}</strong></div>`).join('');
  $('admin-tab').hidden=!isHost();if(selectedTab==='admin'&&!isHost())selectedTab='table';
  const steps=Object.entries(STAGES).map(([key,name],i)=>`<span class="stage-step ${key===state.stage?'current':''}"><span>${i+1}</span>${name}</span>`).join('');
  $('tab-table').innerHTML=`<div class="steps">${steps}</div>`+renderTable(r);
  $('tab-hand').innerHTML=renderHand(r);
  $('tab-history').innerHTML=renderHistory();
  $('tab-admin').innerHTML=isHost()?renderAdmin():'';
  renderLibrary();switchTab(selectedTab);renderConnection();
}
function renderTable(r){
  if(state.stage==='lobby')return `<div class="panel"><p class="eyebrow">BEFORE THE SHOW</p><h2>等大家到齐，就开演</h2><p>已入座 ${Object.keys(seats).length} / 6 人。${isHost()?'你既是玩家，也是本局 DM。去「DM 控台」推进节目。':'兼任 DM 的玩家负责推进节目。'}</p><div class="seat-grid">${NAMES.map((n,i)=>`<div class="seat" style="padding:15px">${n}<small>${seats[i]?'已就位':'等待加入'}</small></div>`).join('')}</div></div>`;
  if(state.stage==='intro')return `<div class="panel"><p class="eyebrow">LIGHTS, CAMERA, BREAKUP</p><h2>欢迎来到分手现场</h2><p>请线下完成角色介绍、小剧场和开场互动。你可以在「规则与图片」查看自己的心声、评分卡和规则图册。</p><p>DM 可在控台记录互动恩爱值，准备好后进入爆料阶段。</p></div>`;
  if(state.stage==='scoop'){
    const a=state.active;
    let content=state.scoopEnded?'<h2>爆料告一段落</h2><p>本阶段已结束，等待 DM 推进节目。</p>':!a?`<h2>轮到 ${NAMES[state.turn]} 出牌</h2><p>从自己的手牌选一张，事件如实描述，宣称的角色可以更换。</p>${Number(r)===state.turn?command('openHand','查看我的手牌'):'<p class="tiny">等待对方出牌，暂时不用操作。</p>'}`:`<h2>${NAMES[a.speaker]} → ${a.target!==null&&a.target!==undefined?NAMES[a.target]:'正在选择下一位'}</h2><p>宣称事件属于：<b>${NAMES[a.claim]}</b>。具体事件由出题玩家线下宣读。</p>`;
    if(a&&String(a.target)===r)content+=`<div class="flow-controls">${command('respond','相信', 'data-choice="believe"')}${command('respond','质疑','data-choice="challenge"','secondary')}${list(a.seen).length<5?command('respond','私下查看，再传给别人','data-choice="peek"','secondary'):''}</div><p class="tiny">相信／质疑会公开卡牌并自动记录惩罚。查看后由你继续出题。</p>`;
    if(a&&a.speaker===r&&(a.target===null||a.target===undefined)){const card=CARDS.scoops.find(c=>c.id===mine.activeCardId);content+=`${card?`<div class="text-card"><span class="card-kind">刚刚收到的爆料 / 仅你可见</span><p>${esc(card.text)}</p><span class="truth">真实角色：${esc(card.character)}</span></div>`:''}<p>再选一个未看过这张牌的人，继续出题。</p>${select('pass-target','下一位玩家',list(a.seen))}${select('pass-claim','你宣称的事件角色')}<div class="flow-controls">${command('pass','继续传递')}</div>`;}
    return `<div class="panel"><p class="eyebrow">SCOOP TIME</p>${content}</div><div class="panel"><h3>受罚次数</h3><div class="seat-grid">${NAMES.map((n,i)=>`<div>${n} <b>${state.penalties?.[i]||0}</b> 次</div>`).join('')}</div><p class="tiny">每次受罚队伍 +5；第三次额外 +${state.thirdBonus??5}，随即结束。当前设置可由 DM 在开场前调整。</p></div>`;
  }
  if(state.stage==='virtue')return `<div class="panel"><p class="eyebrow">VIRTUE SHOW</p><h2>美德展示，线下开牌</h2><p>本环节使用实体牌；网页提供原卡图片与规则，DM 记录分数。</p><p>每人初始6张，同队第一次打光手牌后补4张。任一队第二次打光，或达到6轮，结束并结算。</p>${command('libraryVirtue','查看美德卡图片')}</div>`;
  if(state.stage==='gift')return renderGift(r);
  if(state.stage==='voyage'){
    const ids=list(state.events),latest=ids.at(-1);
    return `<div class="panel"><p class="eyebrow">THE AEGEAN SEA</p><h2>爱琴海航行</h2><p>行动卡、船位、落水及猜拳按原规则在线下执行。DM 抽取事件，所有玩家同步看到图片；6张事件抽完后不会重复。</p>${isHost()?command('event',state.eventCount?'抽取下一张事件':'事件已抽完'):''}<p class="tiny">剩余事件 ${state.eventCount??0} 张</p>${latest!==undefined?`<div class="event-current">${picture(ASSETS.events[latest])}</div>`:empty('等待 DM 抽取第一张事件')}</div><div class="panel"><h3>已抽事件</h3><div class="gallery">${ids.map(id=>picture(ASSETS.events[id])).join('')}</div></div>`;
  }
  const lowest=Math.min(...state.love);const winners=PAIRS.filter((_,i)=>state.love[i]===lowest);
  return `<div class="panel"><p class="eyebrow">THE FINAL GOODBYE</p><h2>今天，分手成功了吗？</h2><p>恩爱值最低：${winners.map(esc).join('、')}。</p><p>如有并列，按手册线下裁定；此处不擅自指定胜者。</p><span class="big-label">${lowest} 分</span><p>请线下完成分手仪式和各角色结局。</p></div>`;
}
function renderGift(r){
  const g=state.gift;if(!g)return empty('等待初始化礼物');
  let content='';
  if(g.round<=2){const who=g.order[g.index];const type=g.index<2?'偷窥':g.index<4?'交换':'翻转';content=`<span class="action-label">第 ${g.round} / 2 轮 · 行动 ${g.index+1} / 6</span><h2 style="margin-top:15px">${NAMES[who]}，轮到你${type}</h2><p>${type==='偷窥'?'私下查看任意两人的礼物，只有你能看到结果。':type==='交换'?'交换任意两人的礼物，不会公开内容。':'将任意一人的礼物好坏翻转。'}</p><p class="tiny">本轮顺序：${list(g.order).map(i=>NAMES[i]).join(' → ')}</p>`;
    if(who===Number(r))content+=`${select('gift-a',type==='翻转'?'选择一名玩家':'第一名玩家')}${type!=='翻转'?select('gift-b','第二名玩家'):''}<div class="flow-controls">${command('giftAction','确认'+type)}</div>`;
  }else content=`<h2>${g.settled?'礼物已经结算':g.revealed?'礼物揭晓时刻':'两轮行动完成'}</h2><p>${g.revealed?'请轮流念出自己收到的礼物，结合线下互赠环节完成表演。':'等待 DM 揭晓礼物，所有人的盒子依然保持隐藏。'}</p>`;
  const boxes=`<div class="gift-boxes">${NAMES.map((n,i)=>{const box=g.boxes?.[i];return `<div class="gift-box"><span>${box?(box.type==='good'?'💍':'🧦'):'🎁'}</span><b>${n}</b><p>${box?esc(box.text):'尚未揭晓'}</p></div>`;}).join('')}</div>`;
  return `<div class="panel"><p class="eyebrow">GIFT EXCHANGE</p>${content}${boxes}</div><div class="panel"><h3>我记下的偷窥结果</h3><p class="tiny">这是你执行偷窥时看到的快照；后续交换、翻转不会更新旧记录。</p>${list(mine.peeks).length?list(mine.peeks).map(record=>`<div class="text-card"><span class="card-kind">第${record.round}轮 · 行动${record.index+1}</span>${record.items.map(item=>`<p>${NAMES[item.role]}：${item.type==='good'?'好礼物':'坏礼物'}<br><small>${esc(item.text)}</small></p>`).join('')}</div>`).join(''):empty('你还没有偷窥记录')}</div>`;
}
function renderHand(r){
  const cards=list(mine.hand).map(id=>CARDS.scoops.find(c=>c.id===id)).filter(Boolean);
  const myPenalties=list(state.punishLog).filter(x=>x.role===Number(r));
  return `<div class="panel"><p class="eyebrow">FOR YOUR EYES ONLY</p><h2>我的爆料手牌 <span class="pill">${cards.length} 张</span></h2><p>原始角色和事件都在这里。出题时可替换角色名字，不能编造事件内容。</p><div class="grid">${cards.map(c=>textCard(c)).join('')}</div>${!cards.length?empty('当前没有爆料手牌。进入爆料阶段时，每人随机获得3张。'):''}</div><div class="panel"><h3>我的惩罚</h3>${myPenalties.length?myPenalties.map(x=>`<div class="text-card"><span class="card-kind">第${x.count}次惩罚 / 自定义卡</span><p>${esc((x.type==='first'?CARDS.punishFirst:CARDS.punishSecond)[x.id])}</p></div>`).join(''):empty('暂时没有惩罚')}</div>`;
}
function renderHistory(){return `<div class="panel"><p class="eyebrow">SHOW LOG</p><h2>本局记录</h2><ul class="log-list">${list(state.log).slice().reverse().map(t=>`<li>${esc(t)}</li>`).join('')}</ul>${!list(state.log).length?empty('节目尚未开始'):''}</div><div class="panel"><h3>公开爆料</h3><div class="grid">${list(state.revealed).map(x=>{const c=CARDS.scoops.find(c=>c.id===x.cardId);return c?textCard(c,true):'';}).join('')}</div></div><div class="panel"><h3>所有惩罚记录</h3>${list(state.punishLog).map(x=>`<p><b>${NAMES[x.role]} · 第${x.count}次</b><br>${esc((x.type==='first'?CARDS.punishFirst:CARDS.punishSecond)[x.id])}</p>`).join('')}</div>`;}
function renderAdmin(){
  const keys=Object.keys(STAGES),next=keys[keys.indexOf(state.stage)+1];
  return `<div class="panel"><p class="eyebrow">DIRECTOR'S DESK</p><h2>兼任 DM 控台</h2><p>保持此页面开启，其他玩家的操作由这里处理。DM 正常界面不会展示其他人的手牌或礼物。</p>${next?command('stage',`进入下一阶段：${STAGES[next]}`,`data-stage="${next}"`):'<p>节目已结束。</p>'}${state.stage==='scoop'&&!state.scoopEnded?`<div class="flow-controls">${command('finishScoop','线下裁定：提前结束爆料','','secondary')}</div>`:''}${state.stage==='gift'?`<div class="flow-controls">${command('revealGift','两轮完成后揭晓礼物','','secondary')}${command('settleGift','结算礼物恩爱值')}</div>`:''}${state.stage==='lobby'?`<label for="third-bonus">第三次受罚：基础 +5 之外额外加分</label><select id="third-bonus"><option value="5" ${state.thirdBonus===5?'selected':''}>额外 +5（按手册字面，合计 +10）</option><option value="0" ${state.thirdBonus===0?'selected':''}>不额外加分（合计 +5）</option></select>${command('thirdBonus','保存此设置','','secondary')}<p class="tiny">手册第50页同时写“受罚 +5”和第三次“额外 +5”，默认按字面叠加；如你们线下裁定第三次仅 +5，可在开场前改为0。</p>`:''}</div><div class="panel"><h3>恩爱值调整</h3><p>用于表演、惩罚动作遗漏、美德和航行结算等线下裁定。</p><label for="score-pair">队伍</label><select id="score-pair">${PAIRS.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select><label for="score-delta">分数变化</label><input id="score-delta" type="number" min="-20" max="20" value="1"><label for="score-reason">原因</label><input id="score-reason" maxlength="80" placeholder="例如：互动 / 美德结算"><div class="flow-controls">${command('score','记录分数')}</div></div><div class="panel"><h3>重新开始</h3><p>清空本局卡牌、礼物、分数和记录，保留六人的座位。</p>${command('reset','重置本局','','danger')}</div>`;
}
const categories={rules:'规则图册',events:'航行事件',actions:'航行行动',scores:'评分卡',boats:'船只',virtues:'美德卡',hearts:'我的心声',clues:'观众来电'};
function renderLibrary(){
  $('library-filters').innerHTML=Object.entries(categories).map(([k,n])=>`<button data-filter="${k}" class="${filter===k?'active':''}">${n}</button>`).join('');
  const assets=(ASSETS[filter]||[]).filter(a=>filter!=='hearts'||a.role===Number(role()));
  $('gallery').innerHTML=assets.map(picture).join('');
}
function switchTab(name){selectedTab=name;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.tab-content').forEach(el=>el.hidden=el.id!==`tab-${name}`);}
function showPicture(src,caption){$('viewer-image').src='./'+src;$('viewer-image').alt=caption;$('viewer-caption').textContent=caption;$('image-viewer').showModal();}
document.addEventListener('click',async event=>{
  const el=event.target.closest('button');if(!el)return;
  if(el.dataset.tab){switchTab(el.dataset.tab);return;}
  if(el.dataset.filter){filter=el.dataset.filter;renderLibrary();return;}
  if(el.dataset.image){showPicture(el.dataset.image,el.dataset.caption);return;}
  if(el.dataset.seat){await chooseSeat(Number(el.dataset.seat));return;}
  const a=el.dataset.command;if(!a)return;
  if(a==='openHand'){switchTab('hand');return;}
  if(a==='libraryVirtue'){filter='virtues';renderLibrary();switchTab('library');return;}
  if(a==='choosePlay'){
    if(state.stage!=='scoop'||state.scoopEnded||state.active||Number(role())!==state.turn)return toast('现在还不能打出这张牌，请查看当前节目');
    const card=CARDS.scoops.find(c=>c.id===el.dataset.card);
    $('tab-hand').innerHTML=`<div class="panel"><h2>发起一次爆料</h2><p>${esc(card.text)}</p>${select('play-target','向谁出题',[role()])}${select('play-claim','你宣称这件事属于谁')}<div class="flow-controls">${command('play','确认打出',`data-card="${card.id}"`)}<button data-command="cancelPlay" class="secondary">取消</button></div></div>`;renderConnection();return;
  }
  if(a==='cancelPlay'){render();return;}
  const value=id=>$(id)?.value;
  if(a==='play')return send(a,{cardId:el.dataset.card,target:Number(value('play-target')),claim:Number(value('play-claim'))});
  if(a==='pass')return send(a,{target:Number(value('pass-target')),claim:Number(value('pass-claim'))});
  if(a==='respond')return send(a,{choice:el.dataset.choice});
  if(a==='giftAction')return send(a,{a:Number(value('gift-a')),b:Number(value('gift-b'))});
  if(a==='stage')return send(a,{stage:el.dataset.stage});
  if(a==='thirdBonus')return send(a,{value:Number(value('third-bonus'))});
  if(a==='score')return send(a,{pair:Number(value('score-pair')),delta:Number(value('score-delta')),reason:value('score-reason')});
  if(a==='reset'&&!confirm('确定清空分数和本局进度？六人的角色会保留。'))return;
  if(a==='finishScoop'&&!confirm('确定以线下裁定提前结束爆料？'))return;
  return send(a);
});
document.addEventListener('change',e=>{if(e.target.id==='demo-role'){uid='demo'+e.target.value;syncDemo();}});
$('close-viewer').onclick=()=>$('image-viewer').close();
$('image-viewer').addEventListener('click',e=>{if(e.target===$('image-viewer'))$('image-viewer').close();});
async function lockButton(id,fn){const b=$(id);b.disabled=true;try{await fn();}catch(e){toast(friendly(e));}finally{b.disabled=false;}}
$('create').onclick=()=>lockButton('create',create);
$('join').onclick=()=>lockButton('join',()=>join($('room-code').value));
$('room-code').addEventListener('keydown',e=>{if(e.key==='Enter')$('join').click();});
$('demo').onclick=startDemo;
$('leave').onclick=()=>{if(isHost()&&!demo&&!confirm('离开后其他玩家将无法操作，直到你重新打开房间。确定退出？'))return;stop();sessionStorage.removeItem('breakup-room');location.href=location.pathname;};
$('copy-room').onclick=async()=>{if(demo)return toast('演示房间不能邀请朋友');const url=new URL(location.href);url.search='';url.searchParams.set('room',roomId);try{await navigator.clipboard.writeText(url.href);toast('邀请链接已复制');}catch{prompt('复制此链接发送给朋友',url.href);}};
$('setup-note').textContent=firebaseConfig.apiKey?'联机需要六人的浏览器都能访问 Firebase。':'联机尚未配置。可先体验演示；配置方法见 README。';
const requested=new URLSearchParams(location.search).get('room')||sessionStorage.getItem('breakup-room');
if(requested){$('room-code').value=requested;if(firebaseConfig.apiKey)lockButton('join',()=>join(requested));}
setInterval(()=>{if(roomId&&!demo)renderConnection();},5000);
