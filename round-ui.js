import {ASSETS} from './assets.js';
import {virtue,VIRTUE_NAMES,actionCard,ACTION_NAMES,EVENT_NAMES,BOAT_NAMES,GIFT_ACTIONS,EVENT_TIERS,ACTION_TIERS,tierName} from './decks.js';
const names=['奥特慢','小怪兽','灰小子','人鱼公主','猪八戒','嫦娥'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=x=>Array.isArray(x)?x:[];
const button=(a,t,cls='primary',extra='')=>`<button class="${cls}" data-command="${a}" ${extra}>${t}</button>`;
const pic=a=>`<button class="image-card" aria-label="${esc(a.title)}" data-image="${esc(a.src)}" data-caption="${esc(a.title)}"><img src="./${esc(a.src)}" alt="" loading="lazy"><span>${esc(a.title)}</span></button>`;
const panel=(title,body)=>`<div class="panel"><h2>${title}</h2>${body}</div>`;
const empty=t=>`<p class="empty">${t}</p>`;
function select(id,label,opts=names.map((n,i)=>[i,n]),selected){return `<label for="${id}">${label}</label><select id="${id}">${opts.map(([v,n])=>`<option value="${v}" ${v===selected?'selected':''}>${esc(n)}</option>`).join('')}</select>`;}
const count=(id,label,value=1)=>`<label for="${id}">${label}</label><input id="${id}" type="number" min="1" max="10" value="${value}">`;
function card(id,selectable=false,field='virtue-card'){
  const c=virtue(id);if(!c)return '';
  return `<article class="text-card"><span class="card-kind">${esc(c.title)}</span>${c.asset!==null?pic(ASSETS.virtues[c.asset]):'<span class="badge">手册规则文字版</span>'}<p class="tiny">${esc(c.effect)}</p>${selectable?`<label class="card-select"><input type="checkbox" name="${field}" value="${id}">选择这张牌</label>`:''}</article>`;
}
const actionFace=(id,selectable=false)=>{const c=actionCard(id);return `<article class="text-card"><span class="card-kind">${esc(c.title)}</span>${pic(ASSETS.actions[c.type])}${selectable?`<label class="card-select"><input type="checkbox" name="action-card" value="${id}">选择弃牌</label>`:''}${button('navPlay','打出此行动牌','secondary',`data-card="${id}"`)}</article>`;};
function counts(values){return `<div class="seat-grid">${names.map((n,i)=>`<div>${n} <b>${values?.[i]||0}</b> 张</div>`).join('')}</div>`;}
export function roundTable(s,m,r,host){
  if(s.stage==='clues'){
    const c=s.clues;if(!c)return '';
    return panel('观众来电，按序分享',`<p>六张来电已随机分给六人，每人只能看自己的那张。依次公开编号1—6；被提到的人先自我介绍，再解释内容。</p>${c.ended?'<p>六张来电均已分享，等待 DM 进入爆料。</p>':`<h3>当前：观众来电 ${c.index+1}</h3>${list(c.revealed).includes(c.index)?pic(ASSETS.clues[c.index]):m.clue===c.index?button('clueReveal','公开我的这张来电'):empty('等待持有这张来电的玩家公开')}`}${host&&!c.ended?`<div class="flow-controls">${button('clueNext','本条分享完成，下一条','secondary')}</div>`:''}`)+panel('已公开来电',`<div class="gallery">${list(c.revealed).map(id=>pic(ASSETS.clues[id])).join('')}</div>`);
  }
  if(s.stage==='debate')return panel('吵架与评分',`<p>线下依次发言；DM 可在此时发放本人角色的3张心声辅助卡。每名玩家用1—4分分别评价自己和 CP 以外的四人，每个分值只用一次。</p>${host&&!s.heartsOpen?button('releaseHearts','发放本人角色心声辅助卡'):''}<p>心声发放时机由本局 DM 裁定，不将它擅自做成随机抽牌。</p><h3>评分提交进度</h3>${counts(s.ratingCounts)}${s.ratingsOpen?`<h3>已揭晓评分</h3><ul class="log-list">${names.map((n,i)=>`<li>${n} 收到总分 ${Object.values(s.ratings||{}).reduce((sum,ratings)=>sum+(ratings?.[i]||0),0)}</li>`).join('')}</ul><p>按手册处理队伍排名、并列及恩爱值，DM 在控台记录。</p>`:empty('分值仅本人可见，所有人完成后由 DM 揭晓。')}${host&&!s.ratingsOpen?button('revealRatings','六人完成后揭晓评分'):''}`);
  if(s.stage==='virtue'){
    const v=s.virtue;if(!v)return '';
    let body=`<p>本阶段实际发牌：78张共享牌堆，每人初始6张。只显示自己的手牌；已出牌与牌效展示牌才公开。</p><span class="pill">第${v.round}/6轮</span> <span class="pill">牌堆 ${v.deckCount} 张</span><h3 style="margin-top:18px">${v.ended?'美德阶段结束':`轮到 ${names[v.turn]}${v.extra?'（体贴额外回合）':''}`}</h3>${counts(v.handCounts)}`;
    if(v.pending){const c=virtue(v.pending.effectId);body+=`<div class="notice"><b>${names[v.pending.role]} 执行 ${esc(c.title)}</b><br>${esc(c.effect)}<br>按牌面决定目标与选择，由 DM 操作牌效控台，牌张实际在各自私密手牌间变化。</div><div class="gallery">${v.pending.cards.map(id=>{const x=virtue(id);return x.asset!==null?pic(ASSETS.virtues[x.asset]):`<p>${esc(x.title)}：${esc(x.effect)}</p>`;}).join('')}</div>`;}
    if(v.requests?.[r])body+=`<div class="notice">等待你${v.requests[r].mode==='show'?'展示':'弃掉'}${v.requests[r].count}张牌，请去「我的手牌」选择。</div>`;
    if(!v.pending&&!v.ended&&v.turn===Number(r))body+=button('openHand','选择我的美德手牌');
    const shown=list(v.pending?.shown).map(x=>`<p>${names[x.role]} ${x.mode==='show'?'展示':'弃掉'}：${x.cards.map(id=>esc(virtue(id).title)).join('、')}</p>`).join('');
    return panel('美德展示',body)+(shown?panel('当前牌效公开信息',shown):'')+(list(v.flipped).length?panel('慷慨已翻开的牌',`<div class="grid">${v.flipped.map(id=>card(id)).join('')}</div>`):'')+panel('队伍打光次数',`<p>奥特慢 × 小怪兽：${v.wins[0]}；灰小子 × 人鱼公主：${v.wins[1]}；猪八戒 × 嫦娥：${v.wins[2]}</p>`);
  }
  if(s.stage==='voyage'){
    const g=s.voyage;if(!g)return '';
    let body=`<p>${esc(g.choice)}。暗牌内容保存在 DM 处理端，公共页面只显示牌背和已翻开的事件。</p><p class="tiny">${g.route*3}张事件，三条路线各${g.route}格；行动牌堆剩${g.deckCount}张。猜拳、动作和事件选择由 DM 按牌面裁定。</p>`;
    if(g.ended)body+='<h3>航行结束</h3>';
    else if(g.step==='seating'){const who=g.order[g.seatIndex];body+=`<h3>轮到 ${names[who]} 选船</h3><p>根据恩爱值排名轮流登船，同队内部先后顺序可由 DM 在线下裁定。</p>${who===Number(r)?`<div class="flow-controls">${BOAT_NAMES.map((n,i)=>button('navSeat',`${n}（${g.boats[i]?.length||0}/${i+1}）`,'secondary',`data-boat="${i}"`)).join('')}</div>`:''}`;}
    else if(g.step==='turn'){const who=g.order[g.turnIndex];body+=`<h3>第${g.round}轮 · ${names[who]} 的回合</h3><p>${g.drawn?'已摸牌，可出牌或结束回合。':'先摸1张行动牌，再开始出牌。'}</p>${who===Number(r)?`<div class="flow-controls">${!g.drawn?button('navDraw',g.initial===1&&g.deckCount===0&&!list(g.discard).length?'简化牌堆已空：跳过本次摸牌':'摸一张行动牌'):button('openHand','查看我的行动手牌')}${g.drawn?button('navEndTurn','结束我的回合','secondary'):''}</div>`:''}`;}
    else body+=`<h3>${g.step==='sailing'?'行船与翻事件':'本轮航行结算'}</h3>${host?button(g.step==='sailing'?'navSail':'navSettle',g.step==='sailing'?'按船序推进下一艘船':'结算本轮领先船得分'):''}`;
    if(Object.keys(g.overflow||{}).length)body+=`<div class="notice">${Object.keys(g.overflow).map(i=>`${names[i]} 需弃${g.overflow[i]}张`).join('；')}。本人在手牌区弃到4张后继续。</div>`;
    if(g.pending)body+=`<div class="notice"><b>待结算${g.pending.kind==='event'?'事件':'行动'}：${esc(g.pending.kind==='event'?EVENT_NAMES[g.pending.type]:ACTION_NAMES[g.pending.type])}</b><br>等待 DM 处理船位、落水或摸牌，然后确认结算。</div><div class="event-current">${pic((g.pending.kind==='event'?ASSETS.events:ASSETS.actions)[g.pending.type])}</div>`;
    const board=BOAT_NAMES.map((name,b)=>`<article class="boat-track"><h3>${name} · 位置 ${g.positions[b]}</h3><p>${list(g.boats[b]).map(i=>names[i]).join('、')||'空船'}</p><div class="route-cards">${Array.from({length:g.route},(_,index)=>{const revealed=list(g.revealed).find(e=>e.boat===b&&e.index===index);return revealed?pic(ASSETS.events[revealed.type]):`<div class="card-back" aria-label="第${index+1}格未翻开的事件"><span>？</span><small>事件 ${index+1}</small></div>`;}).join('')}</div></article>`).join('');
    const aboard=new Set(Object.values(g.boats).flat());
    return panel('爱琴海航行',body)+panel('三艘船的暗牌路线',board+`<p>${g.step==='seating'?'待登船':'落水'}：${names.filter((_,i)=>!aboard.has(i)).join('、')||'无人'}</p>`);
  }
  return null;
}
export function roundHand(s,m,r){
  if(s.stage==='clues')return panel('我的观众来电',typeof m.clue==='number'?`<p>仅你可见。轮到此编号时，去「当前节目」公开并朗读。</p><div class="event-current">${pic(ASSETS.clues[m.clue])}</div>`:empty('等待发放'));
  if(s.stage==='debate'){
    const hearts=s.heartsOpen?ASSETS.hearts.filter(a=>a.role===Number(r)):[];const ratings=m.ratings||{};const remaining=[1,2,3,4].filter(n=>!Object.values(ratings).includes(n));const targets=names.map((n,i)=>[i,n]).filter(([i])=>Math.floor(i/2)!==Math.floor(Number(r)/2)&&ratings[i]===undefined);
    return panel('我的心声辅助卡',hearts.length?`<div class="gallery">${hearts.map(pic).join('')}</div>`:empty('等待 DM 在本阶段发放，只会发给对应角色本人'))+panel('我的评分卡',`<p>剩余分值：${remaining.join('、')||'已全部使用'}。已提交分值仅你可见，揭晓前别人看不到。</p>${remaining.length?`${select('rating-target','给谁评分',targets)}${select('rating-value','使用哪张评分卡',remaining.map(n=>[n,`${n}分`]))}<div class="flow-controls">${button('rate','提交这一份评分')}</div>`:'<p>四份评分已完成。</p>'}<ul class="log-list">${Object.entries(ratings).map(([t,n])=>`<li>${names[t]}：${n}分</li>`).join('')}</ul>`);
  }
  if(s.stage==='virtue'){
    const v=s.virtue,ids=list(m.virtueHand),req=v?.requests?.[r];
    return panel(`我的美德手牌 · ${ids.length}张`,`<p>每张是独立牌实例。选择1—5张；多张须同色、同数字或顺子。</p><div class="grid">${ids.map(id=>card(id,true)).join('')}</div>${req?`<p class="notice">请${req.mode==='show'?'展示':'弃掉'}${req.count}张</p>${button('vChoose','提交所选牌')}`:v&&!v.pending&&v.turn===Number(r)&&!v.ended?`${select('v-effect','执行哪张所选牌的效果',ids.map(id=>[id,virtue(id).title]))}<p class="tiny">顺子自动采用最大数字；同数字可从所选牌中指定效果。</p>${button('vPlay','打出所选美德牌')}`:empty('等待轮到你出牌，或等待当前牌效结算')}`);
  }
  if(s.stage==='gift')return panel('我的紫色礼物行动牌',`<p>每轮随机私发一张，数字决定行动顺序。到你的编号时，去「当前节目」执行。已用牌保留作记录。</p><div class="grid">${list(m.giftCards).map(c=>{const def=GIFT_ACTIONS[c.number-1];return `<article class="text-card purple-card"><span class="card-kind">第${c.round}轮 · 行动${c.number} · ${c.used?'已执行':'待执行'}</span><h3>${def.title}</h3><p>${def.text}</p><span class="truth">仅本人可见 · 文字牌</span></article>`;}).join('')}</div>${button('openTable','去当前节目执行','secondary')}`);
  if(s.stage==='voyage')return panel(`我的行动手牌 · ${list(m.actionHand).length}张`,`<p>只有你能看到这些牌；打出后才公开。根据卡面区分自己的回合与任何时候使用。</p><div class="grid">${list(m.actionHand).map(id=>actionFace(id,!!s.voyage?.overflow?.[r])).join('')}</div>${s.voyage?.overflow?.[r]?button('navDiscard','弃掉勾选的多余手牌'):''}`);
  return null;
}
export function roundAdmin(s){
  let html='';const v=s.virtue,g=s.voyage;
  if(s.stage==='virtue'&&v&&!v.ended){
    html+=panel('美德牌效控台',`<p>玩家按牌面作出选择，DM 只裁定效果与目标，不读取他人手牌。摸牌、换牌和暗抽真实修改私密手牌；需要展示或弃牌时，由本人选择。</p>${!v.pending?'<p>等待当前玩家出牌。</p>':`<p><b>${esc(virtue(v.pending.effectId).title)}</b>：${esc(virtue(v.pending.effectId).effect)}</p>${select('v-target','牌效对象')}${count('v-count','处理张数')}<div class="flow-controls">${button('vDraw','给对象摸牌')}${button('vRequestDiscard','请求对象弃牌','secondary')}${button('vRequestShow','请求对象展示','secondary')}</div>${select('v-a','换牌／暗抽的获得者')}${select('v-b','另一名玩家／被暗抽者')}<div class="flow-controls">${button('vSwap','两人交换全部手牌','secondary')}${button('vSteal','获得者暗抽对方1张','secondary')}</div>${virtue(v.pending.effectId).kind===2?`<h3>慷慨翻牌与分配</h3>${button('vFlip','翻开牌堆顶1张','secondary')}<div class="grid">${list(v.flipped).map(id=>card(id,true,'flipped-card')).join('')}</div><p class="tiny">勾选要分配的翻牌，并使用上方「牌效对象」指定接收者；出现同色时必须把全部翻牌给出牌者。六色成功则分配后自动清空出牌者手牌。</p>${button('vAssign','分配勾选的翻牌','secondary')}`:''}<div class="flow-controls">${button('vFinish','牌效已完成，结束本回合')}${virtue(v.pending.effectId).kind===4?button('vFinishExtra','牌效完成，给予体贴额外回合','secondary'):''}</div>`}<div class="flow-controls">${button('vRecycle','牌堆不足：洗弃牌补入牌堆底','secondary')}${button('vEnd','线下裁定：结束美德阶段','danger')}</div>`);
  }
  if(['lobby','gift'].includes(s.stage)){
    const c=s.voyageConfig;
    html+=panel('航行自定义分级配比',`<p>按本局约定，以影响范围和控制力分级：轻度3张、中度2张、重度1张。默认15张事件、20张航行行动牌，效果仍为原图内容；配比是朋友局自定义，并非手册给出的官方配比。紫色礼物行动牌独立发放，不混入此牌堆。</p><p class="tiny">若按每图仅一张：事件共6张、每船2格，行动共10张只能选初始每人1张。这属于简化玩法；牌堆和弃牌都空时跳过摸牌，已有弃牌则由 DM 洗回。若按手册数量，事件合计15张、行动至少18张；重复图片仅代表相同效果的不同牌实例，配比须由本局确认。</p><div class="deck-count-grid">${EVENT_NAMES.map((n,i)=>`<label>${n} · ${tierName(EVENT_TIERS[i])}<input type="number" min="0" max="15" id="event-count-${i}" value="${c?.events[i]??''}" placeholder="张数"></label>`).join('')}</div><div class="deck-count-grid">${ACTION_NAMES.map((n,i)=>`<label>${n} · ${tierName(ACTION_TIERS[i])}<input type="number" min="0" max="10" id="action-count-${i}" value="${c?.actions[i]??''}" placeholder="张数"></label>`).join('')}</div>${select('nav-initial','每人初始行动牌',[[3,'3张（手册）'],[1,'1张（6事件／10行动简化版）']],c?.initial??3)}<div class="flow-controls">${button('voyageSetup','确认本局航行牌组')}</div>${c?`<p>已确认：${c.events.reduce((a,b)=>a+b,0)}事件／${c.actions.reduce((a,b)=>a+b,0)}行动／每人${c.initial}张。</p>`:''}`);
  }
  if(s.stage==='voyage'&&g&&!g.ended){
    const loc=names.map((n,r)=>{const b=Object.entries(g.boats).find(([,ps])=>list(ps).includes(r));return `<label>${n}<select id="nav-location-${r}">${[[-1,'落水'],[0,'快艇'],[1,'帆船'],[2,'游轮']].map(([i,t])=>`<option value="${i}" ${Number(b?.[0]??-1)===i?'selected':''}>${t}</option>`).join('')}</select></label>`;}).join('');
    if(g.step==='seating'&&g.seatIndex===0)html+=panel('确认登船／出牌顺序',`<p>恩爱值高的队伍在前，同队可自行决定谁先；并列由 DM 裁定。第一人登船前可以保存。</p><div class="deck-count-grid">${g.order.map((r,index)=>`<label>第${index+1}位<select id="nav-order-${index}">${names.map((name,i)=>`<option value="${i}" ${i===r?'selected':''}>${name}</option>`).join('')}</select></label>`).join('')}</div>${button('navOrder','保存登船顺序','secondary')}`);
    html+=panel('航行牌效裁定',`<p>猜拳、表演、救援和领队决策在线下完成。DM 根据当前公开牌面更新状态；系统检查船只容量、手牌上限和回合权限。</p>${g.pending?`${select('nav-target','牌效摸牌对象')}${count('nav-count','摸牌张数')}<div class="flow-controls">${button('navEffectDraw','给对象摸行动牌','secondary')}</div><div class="deck-count-grid">${loc}</div>${button('navTokens','保存六人的船位／落水','secondary')}${select('nav-boat','事件引发额外前进的船',BOAT_NAMES.map((n,i)=>[i,n]))}<div class="flow-controls">${button('navMove','该船因牌效额外前进并翻事件','secondary')}${g.pending.kind==='event'&&g.pending.type===1?button('navSwapPositions','漩涡：与所选船互换位置','secondary'):''}${button('navFinish','确认当前牌效结算完成')}${g.pending.kind==='action'&&g.pending.type===6?button('navFinishCancel','装疯卖傻生效：抵消上一张','secondary'):''}</div><p class="tiny">额外移动翻出的事件会排队处理；请逐张确认。当前另有${g.queued}个待结算事件。</p>`:'<p>等待出牌或按船序翻事件。</p>'}<div class="flow-controls">${g.step==='turn'&&!g.drawn&&g.deckCount===0&&!list(g.discard).length?button('navSkipDraw','无牌且无弃牌：裁定跳过当前摸牌','secondary'):''}${button('navRecycle','牌堆空了：洗回行动弃牌','secondary')}${button('navEnd','线下裁定：结束航行','danger')}</div>`);
  }
  return html;
}
export function phaseRules(s){
  const map={lobby:'开局选择角色，六人到齐后由 DM 推进。还未发放的卡牌不会出现在这里。',intro:'完成线下角色介绍与小剧场，之后进入观众来电。',clues:'每人一张来电，按编号1—6公开，被提到的人先介绍再解释。',scoop:'每人3张私密爆料。按回合出题，相信／质疑时公开，私下查看后由该玩家继续传递。',debate:'心声仅本人角色可见，DM 发放。每人1—4分各一次，给自己和 CP 以外四人评分。',virtue:'每人初始6张；顺时针出1—5张。任一队累计两次打光或6轮结束。牌效按原卡面由 DM 裁定，网站管理真实私牌。',gift:'初始礼物隐藏，两轮行动后统一揭晓并结算一次。',voyage:'本人行动手牌私密；先摸1张，再出牌，再结束回合。事件随船前进逐格翻开；手牌超过4张必须弃牌。',end:'按最终恩爱值完成分手仪式，并列在线下裁定。'};
  const images=s.stage==='scoop'?ASSETS.rules.slice(2,4):s.stage==='virtue'?ASSETS.rules.slice(6,14):[];
  return panel('本阶段规则',`<p>${map[s.stage]||''}</p><p class="tiny">这里不再提供尚未抽到或揭示的游戏牌。已经获得的牌在「我的手牌」，公开牌在「当前节目」。</p><div class="gallery">${images.map(pic).join('')}</div>`);
}
export async function roundCommand(a,el,send){
  const value=id=>document.getElementById(id)?.value;
  const num=id=>Number(value(id));const chosen=name=>Array.from(document.querySelectorAll(`input[name="${name}"]:checked`),x=>x.value);
  if(a==='rate'){await send(a,{target:num('rating-target'),value:num('rating-value')});return true;}
  if(a==='voyageSetup'){const eventValues=Array.from({length:6},(_,i)=>value(`event-count-${i}`));const actionValues=Array.from({length:10},(_,i)=>value(`action-count-${i}`));if([...eventValues,...actionValues].some(v=>v===''))throw new Error('请填写每种牌的张数；不使用的种类填0');await send(a,{events:eventValues.map(Number),actions:actionValues.map(Number),initial:num('nav-initial')});return true;}
  if(a==='vPlay'){const cards=chosen('virtue-card');let effectId=value('v-effect');const cs=cards.map(virtue);if(cs.length&&!cards.includes(effectId))effectId=cs.reduce((a,b)=>a.number>=b.number?a:b).id;const sorted=cs.slice().sort((a,b)=>a.number-b.number);if(cs.length>1&&sorted.every((c,i)=>i===0||c.number===sorted[i-1].number+1)&&!cs.every(c=>c.kind===cs[0].kind))effectId=sorted.at(-1).id;await send(a,{cards,effectId});return true;}
  if(a==='vChoose'){await send(a,{cards:chosen('virtue-card')});return true;}
  if(a==='vDraw'){await send(a,{target:num('v-target'),count:num('v-count')});return true;}
  if(a==='vRequestDiscard'||a==='vRequestShow'){await send('vRequest',{target:num('v-target'),count:num('v-count'),mode:a==='vRequestShow'?'show':'discard'});return true;}
  if(a==='vSwap'||a==='vSteal'){await send(a,{a:num('v-a'),b:num('v-b')});return true;}
  if(a==='vAssign'){const cards=chosen('flipped-card');if(!cards.length)throw new Error('先勾选要分配的翻牌');await send(a,{target:num('v-target'),cards});return true;}
  if(a==='vFinishExtra'){await send('vFinish',{extra:true});return true;}
  if(a==='navSkipDraw'){await send(a);return true;}
  if(a==='navSeat'){await send(a,{boat:Number(el.dataset.boat)});return true;}
  if(a==='navPlay'){await send(a,{cardId:el.dataset.card});return true;}
  if(a==='navDiscard'){await send(a,{cards:chosen('action-card')});return true;}
  if(a==='navTokens'){await send(a,{locations:Array.from({length:6},(_,i)=>num(`nav-location-${i}`))});return true;}
  if(a==='navEffectDraw'){await send(a,{target:num('nav-target'),count:num('nav-count')});return true;}
  if(a==='navMove'||a==='navSwapPositions'){await send(a,{boat:num('nav-boat')});return true;}
  if(a==='navFinishCancel'){await send('navFinish',{cancelPrevious:true});return true;}
  if(a==='navOrder'){await send(a,{order:Array.from({length:6},(_,i)=>num(`nav-order-${i}`))});return true;}
  if(['clueReveal','clueNext','releaseHearts','revealRatings','vFlip','vFinish','vRecycle','vEnd','navDraw','navEndTurn','navSail','navFinish','navRecycle','navSettle','navEnd'].includes(a)){await send(a);return true;}
  return false;
}
