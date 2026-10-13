import {VIRTUES,virtue,VIRTUE_NAMES,makeActions,actionType,ACTION_NAMES,EVENT_NAMES,BOAT_NAMES} from './decks.js';
const names=['奥特慢','小怪兽','灰小子','人鱼公主','猪八戒','嫦娥'];
const check=(ok,msg)=>{if(!ok)throw new Error(msg);};
const pair=r=>Math.floor(Number(r)/2);
const shuffle=(a,rng)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const roleNum=v=>{check(Number.isInteger(v)&&v>=0&&v<6,'角色无效');return v;};
const countNum=(v,max=10)=>{check(Number.isInteger(v)&&v>=1&&v<=max,'张数无效');return v;};
const log=(s,text)=>{s.log=[...(s.log||[]),text].slice(-150);};
const handMap=()=>Object.fromEntries(names.map((_,i)=>[i,[]]));
function take(g,r,n){check(g.deck.length>=n,`牌堆只剩${g.deck.length}张；请 DM 决定是否洗回弃牌后再操作`);g.hands[r].push(...g.deck.splice(0,n));}
export function initVirtue(rng){let g={deck:shuffle(VIRTUES.map(c=>c.id),rng),hands:handMap(),discard:[],turn:Math.floor(rng()*6),round:1,turns:0,wins:[0,0,0],won:[],pending:null,requests:{},flipped:[],extra:false,ended:false};for(let i=0;i<6;i++)take(g,i,6);return g;}
export function initClues(rng){const deck=shuffle([0,1,2,3,4,5],rng);return {hands:Object.fromEntries(deck.map((id,r)=>[r,id])),index:0,revealed:[],ended:false};}
function orderByLove(s){return [0,1,2].sort((a,b)=>s.love[b]-s.love[a]||a-b).flatMap(p=>[p*2,p*2+1]);}
export function initVoyage(s,rng){
  const c=s.voyageConfig;check(c,'先由 DM 配置航行牌堆：手册与卡图数量冲突，不能自动补牌');
  const cards=makeActions(c.actions);const events=c.events.flatMap((n,type)=>Array(n).fill(type));
  check(events.length%3===0&&events.length>=3,'事件牌数必须能均分给三艘船');check(cards.length>=6*c.initial,'行动牌数量不足以发初始手牌');
  const shuffled=shuffle(events,rng);const route=events.length/3;
  let g={deck:shuffle(cards,rng),hands:handMap(),discard:[],order:orderByLove(s),turnIndex:0,step:'seating',round:1,boats:[[],[],[]],positions:[0,0,0],layout:[shuffled.slice(0,route),shuffled.slice(route,route*2),shuffled.slice(route*2)],route,revealed:[],sailIndex:0,pending:null,seatIndex:0,usedSpecial:[],drawn:false,ended:false,overflow:{},choice:c.label,initial:c.initial};
  for(let i=0;i<6;i++)take(g,i,c.initial);return g;
}
function endVirtueEffect(s,g,extra){
  check(!Object.keys(g.requests).length,'仍有玩家未完成弃牌或展示');check(!g.flipped.length,'先分配已翻开的牌');
  if(g.pending.clearAfterGenerous){const actor=g.pending.role;g.discard.push(...g.hands[actor]);g.hands[actor]=[];}
  // 必须等牌效完整结算后，才判断是否打光。
  for(let i=0;i<6;i++)if(!g.hands[i].length){g.wins[pair(i)]++;g.won.push({role:i,round:g.round});s.love[pair(i)]-=5;log(s,`${names[i]} 打光美德手牌，队伍 -5`);if(g.wins[pair(i)]>=2)g.ended=true;else if(!g.ended)take(g,i,4);}
  g.pending=null;
  if(g.ended)return;
  if(extra){g.extra=true;log(s,'DM 确认体贴额外回合');return;}
  g.extra=false;g.turn=(g.turn+1)%6;g.turns++;
  if(g.turns%6===0){if(g.round>=6)g.ended=true;else g.round++;}
}
function overflow(g,r){if(g.hands[r].length>4)g.overflow[r]=g.hands[r].length-4;else delete g.overflow[r];}
export function roundAction(s,role,host,action,p,rng){
  const r=Number(role);const dm=()=>check(host,'仅限 DM');
  if(action==='clueReveal'){check(s.stage==='clues','当前不是观众来电环节');const c=s.clues;check(!c.ended&&c.hands[r]===c.index,'请按来电编号依次分享');check(!c.revealed.includes(c.index),'这张来电已经公开');c.revealed.push(c.index);log(s,`${names[r]} 公开观众来电${c.index+1}`);return true;}
  if(action==='clueNext'){dm();check(s.stage==='clues','当前不是观众来电环节');check(s.clues.revealed.includes(s.clues.index),'先由持牌玩家公开当前来电');s.clues.index++;if(s.clues.index>=6)s.clues.ended=true;return true;}
  if(action==='releaseHearts'){dm();check(s.stage==='debate','在吵架环节发放心声辅助卡');check(!s.heartsOpen,'心声已发放');s.heartsOpen=true;log(s,'DM 发放本人角色的3张心声辅助卡（主持裁定时机）');return true;}
  if(action==='rate'){check(s.stage==='debate','当前不能评分');const t=roleNum(p.target),n=countNum(p.value,4);check(pair(t)!==pair(r),'只能给自己和 CP 以外的四人评分');s.ratings[r] ||= {};check(s.ratings[r][t]===undefined,'已经给这位玩家评分');check(!Object.values(s.ratings[r]).includes(n),'每个分数只能使用一次');s.ratings[r][t]=n;log(s,`${names[r]} 完成一份评分（未公开分值）`);return true;}
  if(action==='revealRatings'){dm();check(s.stage==='debate','当前不能揭晓评分');check(Object.values(s.ratings).length===6&&Object.values(s.ratings).every(v=>Object.keys(v).length===4),'六人都需完成四份评分');check(!s.ratingsOpen,'评分已经揭晓');s.ratingsOpen=true;log(s,'评分揭晓，请按手册排名由 DM 记录恩爱值');return true;}
  if(action==='voyageSetup'){
    dm();check(['lobby','gift'].includes(s.stage),'请在开局或礼物阶段配置航行牌堆');check(Array.isArray(p.events)&&p.events.length===6&&p.events.every(n=>Number.isInteger(n)&&n>=0&&n<=15),'事件配比无效');check(Array.isArray(p.actions)&&p.actions.length===10&&p.actions.every(n=>Number.isInteger(n)&&n>=0&&n<=10),'行动配比无效');
    const total=p.events.reduce((a,b)=>a+b,0);check(total>=3&&total<=30&&total%3===0,'事件总数须为3的倍数，且在3—30之间');check(p.initial===1||p.initial===3,'初始行动牌支持1或3张');check(p.actions.reduce((a,b)=>a+b,0)>=p.initial*6,'行动牌不足六人的初始发牌量');
    s.voyageConfig={events:p.events,actions:p.actions,initial:p.initial,label:`DM 自定义牌组：${total}事件／${p.actions.reduce((a,b)=>a+b,0)}行动／每人${p.initial}张`};log(s,`DM 确认航行牌组：${total}张事件、${p.actions.reduce((a,b)=>a+b,0)}张行动，初始每人${p.initial}张`);return true;
  }
  if(action.startsWith('v')){
    check(s.stage==='virtue'&&s.virtue,'当前不是美德打牌阶段');const g=s.virtue;check(!g.ended,'美德阶段已结束');
    if(action==='vPlay'){
      check(g.turn===r&&!g.pending,'还没轮到你，或当前牌效未结算');const ids=p.cards;check(Array.isArray(ids)&&ids.length>=1&&ids.length<=5&&new Set(ids).size===ids.length,'选择1—5张不同手牌');check(ids.every(id=>g.hands[r].includes(id)),'只能打出自己的牌');
      const cs=ids.map(virtue);const sameKind=cs.every(c=>c.kind===cs[0].kind),sameNumber=cs.every(c=>c.number===cs[0].number);const nums=cs.map(c=>c.number).sort((a,b)=>a-b);const straight=nums.every((n,i)=>i===0||n===nums[i-1]+1);
      check(cs.length===1||sameKind||sameNumber||straight,'多张出牌须同色、同数字或顺子');let effect=virtue(p.effectId);check(effect&&ids.includes(effect.id),'请选择其中一张牌的效果');if(!sameKind&&!sameNumber&&straight)check(effect.number===Math.max(...nums),'顺子必须使用最大数字牌的效果');check(!(g.extra&&effect.kind===4),'体贴额外回合不能再用体贴');
      g.hands[r]=g.hands[r].filter(id=>!ids.includes(id));g.discard.push(...ids);g.pending={role:r,cards:ids,effectId:effect.id,shown:[]};log(s,`${names[r]} 打出 ${cs.map(c=>c.title).join('、')}，执行 ${effect.title}`);return true;
    }
    if(action==='vEnd'){dm();g.ended=true;g.pending=null;g.requests={};g.flipped=[];log(s,'DM 线下裁定结束美德阶段');return true;}
    if(action==='vRecycle'){dm();check(g.deck.length<10,'牌堆充足，暂不洗弃牌');const blocked=g.pending?.cards||[];const pool=g.discard.filter(id=>!blocked.includes(id));check(pool.length,'没有可洗回的弃牌');g.discard=g.discard.filter(id=>blocked.includes(id));g.deck.push(...shuffle(pool,rng));log(s,'DM 将美德弃牌洗后补入牌堆底');return true;}
    check(g.pending,'先由当前玩家出牌，再处理效果');
    if(action==='vDraw'){dm();const t=roleNum(p.target),n=countNum(p.count);take(g,t,n);log(s,`牌效处理：${names[t]} 摸${n}张美德牌`);return true;}
    if(action==='vSwap'){dm();const a=roleNum(p.a),b=roleNum(p.b);check(a!==b,'选择两人');[g.hands[a],g.hands[b]]=[g.hands[b],g.hands[a]];log(s,`牌效处理：${names[a]} 与 ${names[b]} 交换全部手牌`);return true;}
    if(action==='vSteal'){dm();const a=roleNum(p.a),b=roleNum(p.b);check(a!==b&&g.hands[b].length,'对方没有可抽取的手牌');const index=Math.floor(rng()*g.hands[b].length);g.hands[a].push(g.hands[b].splice(index,1)[0]);log(s,`牌效处理：${names[a]} 从 ${names[b]} 暗抽1张`);return true;}
    if(action==='vRequest'){dm();const t=roleNum(p.target),n=countNum(p.count,5);check(!g.requests[t],'该玩家已有待处理请求');check(g.hands[t].length>=n,'该玩家手牌不足');check(['discard','show'].includes(p.mode),'请求类型无效');g.requests[t]={mode:p.mode,count:n};log(s,`等待 ${names[t]} ${p.mode==='show'?'展示':'弃掉'}${n}张美德牌`);return true;}
    if(action==='vChoose'){
      const req=g.requests[r];check(req,'没有等待你处理的牌效');const ids=p.cards;check(Array.isArray(ids)&&ids.length===req.count&&new Set(ids).size===ids.length&&ids.every(id=>g.hands[r].includes(id)),'请选择要求数量的本人手牌');
      if(req.mode==='discard'){g.hands[r]=g.hands[r].filter(id=>!ids.includes(id));g.discard.push(...ids);}g.pending.shown.push({role:r,mode:req.mode,cards:ids});delete g.requests[r];log(s,`${names[r]} ${req.mode==='show'?'展示':'弃掉'} ${ids.map(id=>virtue(id).title).join('、')}`);return true;
    }
    if(action==='vFlip'){dm();check(virtue(g.pending.effectId).kind===2,'仅慷慨可逐张翻牌');check(!g.pending.flipClosed,'已停止翻牌或达到停止条件');check(g.deck.length,'牌堆已空');g.flipped.push(g.deck.shift());const kinds=g.flipped.map(id=>virtue(id).kind);if(new Set(kinds).size<kinds.length){g.pending.flipClosed=true;g.pending.flipDuplicate=true;}else if(new Set(kinds).size===6){g.pending.flipClosed=true;g.pending.clearAfterGenerous=true;}log(s,'慷慨翻开一张牌');return true;}
    if(action==='vAssign'){dm();const t=roleNum(p.target);check(g.flipped.length,'没有待分配的翻牌');let ids=p.cards||[...g.flipped];check(Array.isArray(ids)&&ids.length&&new Set(ids).size===ids.length&&ids.every(id=>g.flipped.includes(id)),'选择待分配的翻牌');if(g.pending.flipDuplicate)check(t===g.pending.role&&ids.length===g.flipped.length,'出现同色时全部翻牌必须给出牌者');g.hands[t].push(...ids);g.flipped=g.flipped.filter(id=>!ids.includes(id));g.pending.flipClosed=true;log(s,`慷慨翻牌分给 ${names[t]}`);return true;}
    if(action==='vFinish'){dm();check(!p.extra||virtue(g.pending.effectId).kind===4,'只有体贴可授予额外回合');endVirtueEffect(s,g,!!p.extra);return true;}
    throw new Error('未知美德操作');
  }
  if(action.startsWith('nav')){
    check(s.stage==='voyage'&&s.voyage,'当前不是航行阶段');const g=s.voyage;check(!g.ended,'航行已结束');const who=g.order[g.turnIndex];
    if(action==='navOrder'){dm();check(g.step==='seating'&&g.seatIndex===0,'第一位登船前才能修改顺序');check(Array.isArray(p.order)&&p.order.length===6&&new Set(p.order).size===6&&p.order.every(r=>Number.isInteger(r)&&r>=0&&r<6),'六人必须各出现一次');check(p.order.every((r,i)=>i===0||s.love[pair(p.order[i-1])]>=s.love[pair(r)]),'恩爱值高的队伍应先登船');g.order=p.order;log(s,'DM 确认登船顺序，同队及并列先后已裁定');return true;}
    if(action==='navSeat'){check(g.step==='seating'&&g.order[g.seatIndex]===r,'请按入船顺序选择');check(Number.isInteger(p.boat)&&p.boat>=0&&p.boat<=2,'船只无效');check(g.boats[p.boat].length<p.boat+1,'船位已满');g.boats[p.boat].push(r);g.seatIndex++;if(g.seatIndex===6){g.step='turn';g.drawn=false;}log(s,`${names[r]} 登上${BOAT_NAMES[p.boat]}`);return true;}
    if(action==='navDraw'){check(g.step==='turn'&&who===r&&!g.drawn&&!g.pending,'只能在自己的回合开始摸一次牌');if(g.initial===1&&!g.deck.length&&!g.discard.length){g.drawn=true;log(s,`简化牌组：牌堆及弃牌都空，${names[r]} 本回合跳过摸牌`);return true;}take(g,r,1);g.drawn=true;overflow(g,r);log(s,`${names[r]} 摸1张行动牌`);return true;}
    if(action==='navSkipDraw'){dm();check(g.step==='turn'&&!g.drawn&&!g.pending&&!g.deck.length&&!g.discard.length,'只有牌堆和弃牌都空、当前玩家尚未摸牌时可裁定');g.drawn=true;log(s,`DM 裁定：牌堆及弃牌都空，${names[who]} 本回合跳过摸牌（朋友局裁定）`);return true;}
    if(action==='navDiscard'){check(g.overflow[r]>0,'当前无需弃多余手牌');const ids=p.cards;check(Array.isArray(ids)&&ids.length===g.overflow[r]&&new Set(ids).size===ids.length&&ids.every(id=>g.hands[r].includes(id)),'请弃到手牌剩4张');g.hands[r]=g.hands[r].filter(id=>!ids.includes(id));g.discard.push(...ids);overflow(g,r);log(s,`${names[r]} 弃掉多余行动牌`);return true;}
    if(action==='navPlay'){
      check(g.hands[r].includes(p.cardId),'只能打出自己的行动牌');check(!Object.keys(g.overflow).length,'先弃掉多余手牌');const t=actionType(p.cardId);const anytime=[0,2,4,6,7].includes(t);check(anytime?g.step!=='seating':g.step==='turn'&&who===r&&g.drawn,'这张牌只能在自己的出牌回合使用');
      if(g.pending){check([2,4,6].includes(t),'先结算当前行动或事件，只有响应牌可以插入');if(t===4)check(g.pending.kind==='action'&&g.pending.type===8,'注意安全只能响应哎呀脚滑');g.responseStack ||= [];g.responseStack.push(g.pending);}
      if([0,7].includes(t)){check(!g.usedSpecial.includes(t),'这项特殊效果整场只能使用一次');g.usedSpecial.push(t);}g.hands[r]=g.hands[r].filter(id=>id!==p.cardId);g.discard.push(p.cardId);g.pending={kind:'action',role:r,cardId:p.cardId,type:t};log(s,`${names[r]} 打出 ${ACTION_NAMES[t]}，等待 DM 裁定`);return true;
    }
    if(action==='navEndTurn'){check(g.step==='turn'&&who===r&&g.drawn&&!g.pending,'先摸牌并结算牌效');check(!Object.keys(g.overflow).length,'先弃掉多余手牌');g.turnIndex++;g.drawn=false;if(g.turnIndex===6){g.step='sailing';g.sailIndex=0;}return true;}
    if(action==='navSail'){dm();check(g.step==='sailing'&&!g.pending,'当前不能推进船只');check(!Object.keys(g.overflow).length,'先完成弃牌');while(g.sailIndex<3&&(!g.boats[g.sailIndex].length||g.positions[g.sailIndex]>g.route))g.sailIndex++;
      if(g.sailIndex===3){g.step='settle';return true;}const b=g.sailIndex++;g.positions[b]++;
      if(g.positions[b]>g.route){for(const player of g.boats[b])s.love[pair(player)]+=30;g.ended=true;log(s,`${BOAT_NAMES[b]} 首先驶出路线，船上每名玩家 +30，航行结束`);return true;}
      const index=g.positions[b]-1,type=g.layout[b][index];if(!g.revealed.some(e=>e.boat===b&&e.index===index)){g.revealed.push({boat:b,index,type});g.pending={kind:'event',boat:b,index,type};log(s,`${BOAT_NAMES[b]} 前进至${g.positions[b]}，翻开 ${EVENT_NAMES[type]}`);}else log(s,`${BOAT_NAMES[b]} 前进至已揭示的事件格，不重复翻牌`);return true;
    }
    if(action==='navMove'){dm();check(g.pending,'仅在结算牌效期间处理额外移动');check(Number.isInteger(p.boat)&&p.boat>=0&&p.boat<3,'船只无效');const b=p.boat;check(g.boats[b].length,'空船不执行额外移动');check(g.positions[b]<=g.route,'船已驶出路线');g.positions[b]++;if(g.positions[b]>g.route){if(!g.finishAfterEffects)for(const player of g.boats[b])s.love[pair(player)]+=30;g.ended=true;g.pending=null;g.eventQueue=[];g.responseStack=[];log(s,`${BOAT_NAMES[b]} 因事件首先驶出路线，船上每人 +30，航行立即结束`);return true;}const index=g.positions[b]-1,type=g.layout[b][index];if(!g.revealed.some(e=>e.boat===b&&e.index===index)){g.revealed.push({boat:b,index,type});g.eventQueue ||= [];g.eventQueue.push({kind:'event',boat:b,index,type});log(s,`${BOAT_NAMES[b]} 牌效额外前进，翻开 ${EVENT_NAMES[type]}，加入待结算队列`);}return true;}
    if(action==='navTokens'){dm();check(g.pending,'先翻开事件或打出行动牌');check(Array.isArray(p.locations)&&p.locations.length===6&&p.locations.every(x=>[-1,0,1,2].includes(x)),'请配置六人的船位或落水');const boats=g.boats.map((players,b)=>players.filter(r=>p.locations[r]===b));p.locations.forEach((b,i)=>{if(b>=0&&!boats[b].includes(i))boats[b].push(i);});check(boats.every((a,b)=>a.length<=b+1),'船位超过容量');g.boats=boats;log(s,'DM 根据牌效更新船位／落水状态（原船队顺序保留，新上船者排末尾）');return true;}
    if(action==='navSwapPositions'){dm();check(g.pending?.kind==='event'&&g.pending.type===1,'只有漩涡事件可互换船的位置');const a=g.pending.boat,b=p.boat;check(Number.isInteger(b)&&b>=0&&b<3&&b!==a,'选择另一艘船');[g.positions[a],g.positions[b]]=[g.positions[b],g.positions[a]];if(g.boats[a].length)g.boats[a].push(g.boats[a].shift());log(s,`${BOAT_NAMES[a]} 与 ${BOAT_NAMES[b]} 互换位置，原领队移至队尾`);return true;}
    if(action==='navEffectDraw'){dm();check(g.pending,'当前没有牌效');const t=roleNum(p.target),n=countNum(p.count,5);take(g,t,n);overflow(g,t);log(s,`牌效：${names[t]} 摸${n}张行动牌`);return true;}
    if(action==='navFinish'){dm();check(g.pending,'没有待结算的牌效');check(!Object.keys(g.overflow).length,'先完成弃牌');const cancels=g.pending.kind==='action'&&(g.pending.type===4||(g.pending.type===6&&p.cancelPrevious));if(cancels&&g.responseStack?.length){const cancelled=g.responseStack.pop();log(s,`${ACTION_NAMES[g.pending.type]} 抵消 ${cancelled.kind==='action'?ACTION_NAMES[cancelled.type]:EVENT_NAMES[cancelled.type]}`);}g.pending=g.responseStack?.pop()||g.eventQueue?.shift()||null;if(!g.pending&&g.finishAfterEffects)g.ended=true;return true;}
    if(action==='navRecycle'){dm();check(g.deck.length===0,'牌堆未空');check(g.discard.length,'没有弃牌可洗回');g.deck=shuffle(g.discard,rng);g.discard=[];log(s,'DM 将行动弃牌洗回牌堆');return true;}
    if(action==='navSettle'){dm();check(g.step==='settle'&&!g.pending,'先完成本轮三艘船的行船与事件');const occupied=g.boats.map((a,b)=>a.length?b:-1).filter(b=>b>=0);if(occupied.length){const highest=Math.max(...occupied.map(b=>g.positions[b]));const leaders=occupied.filter(b=>g.positions[b]===highest);const delta=leaders.length===1?10:leaders.length===2?5:0;for(const b of leaders)for(const p of g.boats[b])s.love[pair(p)]+=delta;log(s,`航行第${g.round}轮结算：领先船${leaders.length}艘，每名在领先船的玩家 +${delta}；落水者按手册线下执行`);}g.round++;g.order=orderByLove(s);g.turnIndex=0;g.step='turn';g.drawn=false;return true;}
    if(action==='navEnd'){dm();check(!g.pending,'先完成当前牌效');g.ended=true;log(s,'DM 根据路线终点条件结束航行；终点额外分数请在控台记录');return true;}
    throw new Error('未知航行操作');
  }
  return false;
}
export function roundProject(s){
  const v=s.virtue,g=s.voyage,c=s.clues;
  return {version:s.version||1,clues:c?{index:c.index,revealed:c.revealed,ended:c.ended}:null,heartsOpen:!!s.heartsOpen,ratingsOpen:!!s.ratingsOpen,ratingCounts:Object.fromEntries(names.map((_,i)=>[i,Object.keys(s.ratings?.[i]||{}).length])),...(s.ratingsOpen?{ratings:s.ratings}:{}),voyageConfig:s.voyageConfig||null,
    virtue:v?{turn:v.turn,round:v.round,wins:v.wins,ended:v.ended,extra:v.extra,deckCount:v.deck.length,discard:v.discard,pending:v.pending,requests:v.requests,flipped:v.flipped,handCounts:Object.fromEntries(names.map((_,i)=>[i,v.hands[i].length]))}:null,
    voyage:g?{order:g.order,turnIndex:g.turnIndex,step:g.step,round:g.round,boats:g.boats,positions:g.positions,route:g.route,revealed:g.revealed,sailIndex:g.sailIndex,pending:g.pending,seatIndex:g.seatIndex,drawn:g.drawn,ended:g.ended,overflow:g.overflow,choice:g.choice,initial:g.initial,deckCount:g.deck.length,discard:g.discard,queued:g.eventQueue?.length||0,handCounts:Object.fromEntries(names.map((_,i)=>[i,g.hands[i].length]))}:null};
}
export function roundPrivate(s,r){return {giftCards:s.stage==='gift'?Object.entries(s.gift?.deals||{}).map(([round,order])=>({round:Number(round),number:order.indexOf(Number(r))+1,used:(s.gift.history||[]).some(h=>h.round===Number(round)&&h.role===Number(r))})):[],clue:s.stage==='clues'?s.clues?.hands[r]:null,hearts:s.heartsOpen?[0,1,2]:[],ratings:s.ratings?.[r]||{},virtueHand:s.stage==='virtue'?s.virtue?.hands[r]||[]:[],actionHand:s.stage==='voyage'?s.voyage?.hands[r]||[]:[]};}
