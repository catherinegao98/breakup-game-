import { CARDS } from './cards.js';
import {initVirtue,initClues,initVoyage,roundAction,roundProject,roundPrivate} from './rounds.js';
import {DEFAULT_VOYAGE_CONFIG} from './decks.js';
export const NAMES = ['奥特慢','小怪兽','灰小子','人鱼公主','猪八戒','嫦娥'];
export const PAIRS = ['奥特慢 × 小怪兽','灰小子 × 人鱼公主','猪八戒 × 嫦娥'];
export const STAGES = {lobby:'准备入场',intro:'节目开场',clues:'观众来电',scoop:'爆料时刻',debate:'吵架与评分',virtue:'美德展示',gift:'交换礼物',voyage:'爱琴海航行',end:'分手仪式'};
export function shuffle(items, rng = Math.random) {
  const a = [...items];
  for (let i=a.length-1;i>0;i--) {const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const cp=role=>Math.floor(Number(role)/2);
const arr=value=>Array.isArray(value)?value:[];
export function initial(epoch = 1) {
  return {version:2,epoch,stage:'lobby',love:[0,0,0],log:[],hands:{},active:null,revealed:[],penalties:[0,0,0,0,0,0],punishUsed:{first:[],second:[]},punishLog:[],scoopEnded:false,turn:0,gift:null,thirdBonus:5,clues:null,heartsOpen:false,ratings:{},ratingsOpen:false,virtue:null,voyage:null,voyageConfig:structuredClone(DEFAULT_VOYAGE_CONFIG)};
}
export function apply(state, seats, ownerUid, uid, cmd, rng=Math.random) {
  let s=structuredClone(state);
  const role=Object.keys(seats||{}).find(k=>seats[k].uid===uid);
  assert(role!==undefined,'请先选择角色');
  const isHost=uid===ownerUid;
  assert(cmd.epoch===s.epoch,'房间已重置，请刷新状态后重试');
  const p=cmd.payload||{};
  const needHost=()=>assert(isHost,'此操作仅限 DM');
  const needStage=name=>assert(s.stage===name,'当前阶段不能执行此操作');
  const full=()=>assert(Object.keys(seats).length===6 && new Set(Object.values(seats).map(x=>x.uid)).size===6,'需要六名不同玩家全部入座');
  const note=text=>{s.log=[...arr(s.log),text].slice(-100);};
  const target=v=>{assert(Number.isInteger(v)&&v>=0&&v<6,'请选择有效角色');return String(v);};
  const nextTurn=()=>{s.turn=(s.turn+1)%6;};
  const action=cmd.action;
  if(action==='reset') {needHost();s=initial(s.epoch+1);note('DM 重置了本局，保留角色座位');return s;}
  assert(s.version===2,'这是旧版房间，请由 DM 重置或创建新房间');
  if(roundAction(s,role,isHost,action,p,rng))return s;
  if(action==='score') {needHost();assert(Number.isInteger(p.pair)&&p.pair>=0&&p.pair<3,'队伍无效');assert(Number.isInteger(p.delta)&&Math.abs(p.delta)<=20&&p.delta!==0,'单次调整为 -20 至 20 的非零整数');s.love[p.pair]+=p.delta;note(`${PAIRS[p.pair]} ${p.delta>0?'+':''}${p.delta}：${String(p.reason||'DM 调整').slice(0,80)}`);return s;}
  if(action==='stage') {
    needHost();assert(p.stage in STAGES && p.stage!=='lobby','阶段无效');
    const order=Object.keys(STAGES);
    assert(order.indexOf(p.stage)===order.indexOf(s.stage)+1,'请按顺序推进阶段');
    if(p.stage==='intro')full();
    if(p.stage==='clues')s.clues=initClues(rng);
    if(p.stage==='scoop')assert(s.clues?.ended,'先完成六张观众来电的按序分享');
    if(p.stage==='scoop') {full();const deck=shuffle(CARDS.scoops.map(c=>c.id),rng);for(let i=0;i<6;i++)s.hands[i]=deck.slice(i*3,i*3+3);s.turn=Math.floor(rng()*6);}
    if(p.stage==='debate')assert(s.scoopEnded,'请先完成或由 DM 裁定结束爆料阶段');
    if(p.stage==='virtue'){assert(s.ratingsOpen,'请先完成四人评分并揭晓');s.virtue=initVirtue(rng);}
    if(p.stage==='gift') {
      assert(s.virtue?.ended,'请先完成美德阶段');
      full();const gifts=shuffle([...CARDS.giftGoodText.map(text=>({type:'good',text})),...CARDS.giftBadText.map(text=>({type:'bad',text}))],rng);
      s.gift={boxes:Object.fromEntries(gifts.map((g,i)=>[i,g])),order:shuffle([0,1,2,3,4,5],rng),round:1,index:0,history:[],peeks:{},revealed:false,settled:false};
      s.gift.deals={1:[...s.gift.order]};
    }
    if(p.stage==='voyage'){assert(s.gift?.settled,'请先完成礼物揭晓与结算');s.voyage=initVoyage(s,rng);}
    if(p.stage==='end')assert(s.voyage?.ended,'请先完成航行或由 DM 裁定结束');
    s.stage=p.stage;note(`进入「${STAGES[p.stage]}」`);return s;
  }
  if(action==='finishScoop') {needHost();needStage('scoop');s.scoopEnded=true;s.active=null;note('DM 提前结束爆料（线下裁定）');return s;}
  if(action==='thirdBonus') {needHost();needStage('lobby');assert(p.value===0||p.value===5,'仅支持 0 或 5');s.thirdBonus=p.value;note(`第三次受罚额外加分设置为 ${p.value}`);return s;}
  if(['play','pass','respond'].includes(action)) {
    needStage('scoop');assert(!s.scoopEnded,'爆料已结束');
    if(action==='play') {
      assert(!s.active,'请先完成当前爆料');assert(Number(role)===s.turn,'还没轮到你出牌');
      assert(arr(s.hands[role]).includes(p.cardId),'这张卡不在你的手中');
      const t=target(p.target);assert(t!==role,'不能指定自己');target(p.claim);
      s.active={cardId:p.cardId,speaker:role,target:t,claim:p.claim,seen:[role],origin:role};
      note(`${NAMES[role]} 向 ${NAMES[t]} 发起爆料`);
    } else if(action==='pass') {
      const a=s.active;assert(a&&a.speaker===role&&a.target===null,'你现在不能继续传递');
      const t=target(p.target);assert(!a.seen.includes(t),'不能指定已经看过此牌的玩家');target(p.claim);
      a.target=t;a.claim=p.claim;note(`${NAMES[role]} 将爆料传给 ${NAMES[t]}`);
    } else {
      const a=s.active;assert(a&&a.target===role,'当前没有等待你回应的爆料');
      assert(['peek','believe','challenge'].includes(p.choice),'回应无效');
      if(p.choice==='peek') {
        assert(a.seen.length<5,'你是最后一位未看牌玩家，必须相信或质疑');
        s.hands[a.speaker]=arr(s.hands[a.speaker]).filter(id=>id!==a.cardId);
        s.hands[role]=[...arr(s.hands[role]),a.cardId];a.seen.push(role);a.speaker=role;a.target=null;
        note(`${NAMES[role]} 私下查看了爆料，等待继续传递`);
      } else {
        const card=CARDS.scoops.find(c=>c.id===a.cardId);
        const truthful=card.character===NAMES[a.claim];
        const correct=p.choice==='believe'?truthful:!truthful;
        const loser=correct?a.speaker:role;
        s.hands[a.speaker]=arr(s.hands[a.speaker]).filter(id=>id!==a.cardId);
        s.revealed=[...arr(s.revealed),{cardId:a.cardId,claim:a.claim,loser:Number(loser),choice:p.choice}];
        s.penalties[loser]++;s.love[cp(loser)]+=5;
        const count=s.penalties[loser];
        if(count<=2) {
          const type=count===1?'first':'second';const pool=type==='first'?CARDS.punishFirst:CARDS.punishSecond;
          const used=arr(s.punishUsed[type]);const available=pool.map((_,i)=>i).filter(i=>!used.includes(i));
          assert(available.length>0,'惩罚池已空，请联系 DM');
          const id=available[Math.floor(rng()*available.length)];s.punishUsed[type]=[...used,id];
          s.punishLog=[...arr(s.punishLog),{role:Number(loser),count,type,id}];
        } else {s.scoopEnded=true;s.love[cp(loser)]+=s.thirdBonus;}
        note(`${NAMES[loser]} 第${count}次受罚，队伍 +${count===3?5+s.thirdBonus:5}${count===3?'；爆料结束':''}`);
        s.active=null;nextTurn();
        for(let i=0;i<6&&!arr(s.hands[s.turn]).length;i++)nextTurn();
        if(Object.values(s.hands).every(h=>!arr(h).length))s.scoopEnded=true;
      }
    }
    return s;
  }
  if(action==='giftAction') {
    needStage('gift');const g=s.gift;assert(g&&!g.revealed&&g.round<=2,'礼物行动已结束');
    assert(g.order[g.index]===Number(role),'还没轮到你执行礼物行动');
    const a=target(p.a),b=g.index<4?target(p.b):null;
    if(g.index<4)assert(a!==b,'请选择两名不同玩家');
    const type=g.index<2?'peek':g.index<4?'swap':'reverse';
    if(type==='peek') {
      const records=arr(g.peeks[role]);g.peeks[role]=[...records,{round:g.round,index:g.index,items:[{role:Number(a),...g.boxes[a]},{role:Number(b),...g.boxes[b]}]}];
    } else if(type==='swap') [g.boxes[a],g.boxes[b]]=[g.boxes[b],g.boxes[a]];
    else {const old=g.boxes[a];const good=old.type!=='good';const pool=good?CARDS.giftGoodText:CARDS.giftBadText;g.boxes[a]={type:good?'good':'bad',text:pool[Math.floor(rng()*pool.length)]};}
    g.history=[...arr(g.history),{round:g.round,index:g.index,role:Number(role),type,a:Number(a),...(b!==null?{b:Number(b)}:{})}];
    note(`礼物第${g.round}轮：${NAMES[role]} ${type==='peek'?'偷窥':type==='swap'?'交换':'翻转'} ${NAMES[a]}${b!==null?'、'+NAMES[b]:''}`);
    g.index++;if(g.index===6){g.index=0;g.round++;if(g.round===2){g.order=shuffle([0,1,2,3,4,5],rng);g.deals[2]=[...g.order];}}
    return s;
  }
  if(action==='revealGift') {needHost();needStage('gift');assert(s.gift.round>2,'请先完成两轮礼物行动');assert(!s.gift.revealed,'已经揭晓');s.gift.revealed=true;note('礼物全部揭晓');return s;}
  if(action==='settleGift') {
    needHost();needStage('gift');const g=s.gift;assert(g.revealed,'请先揭晓礼物');assert(!g.settled,'礼物已经结算，不能重复计分');
    for(let i=0;i<3;i++){const a=g.boxes[i*2].type,b=g.boxes[i*2+1].type;const delta=a===b?(a==='good'?15:-15):0;s.love[i]+=delta;note(`${PAIRS[i]} 礼物结算 ${delta>=0?'+':''}${delta}`);}g.settled=true;return s;
  }
  throw new Error('未知操作');
}
export function project(s,seats) {
  const g=s.gift;
  const active=s.active?{speaker:s.active.speaker,target:s.active.target,claim:s.active.claim,seen:s.active.seen}:null;
  const publicState={epoch:s.epoch,stage:s.stage,love:s.love,log:arr(s.log),active,turn:s.turn,scoopEnded:s.scoopEnded,penalties:s.penalties,punishLog:arr(s.punishLog),revealed:arr(s.revealed),handCounts:Object.fromEntries(NAMES.map((_,i)=>[i,arr(s.hands[i]).length])),thirdBonus:s.thirdBonus,...roundProject(s),gift:g?{round:g.round,index:g.index,...(g.round<=2?{currentRole:g.order[g.index],currentNumber:g.index+1}:{}),history:arr(g.history),revealed:g.revealed,settled:g.settled,...(g.revealed?{boxes:g.boxes}:{})}:null};
  const privateState={};
  for(const [role,seat] of Object.entries(seats||{}))privateState[seat.uid]={epoch:s.epoch,role:Number(role),...roundPrivate(s,role),hand:s.stage==='scoop'?arr(s.hands[role]):[],peeks:arr(g?.peeks?.[role]),activeCardId:s.active?.speaker===role?s.active.cardId:null};
  return {public:publicState,private:privateState};
}
// DM 在整个房间的事务中执行：结果、私牌、公共状态与移除请求同时提交。
export function processRoom(room,rng=Math.random) {
  if(!room?.engine)return room;
  room.seats=Object.fromEntries(Object.entries(room.seats||{}).filter(([,v])=>v?.uid));
  const encoded=typeof room.engine==='string';
  if(encoded)room.engine=JSON.parse(room.engine);
  for(const [uid,cmd] of Object.entries(room.inbox||{}).sort((a,b)=>(a[1].at||0)-(b[1].at||0))) {
    if(!cmd?.id) {delete room.inbox[uid];continue;}
    room.receipts ||= {};
    if(room.receipts[uid]?.id!==cmd.id) {
      try {room.engine=apply(room.engine,room.seats||{},room.meta.ownerUid,uid,cmd,rng);room.receipts[uid]={id:cmd.id,ok:true,message:'已完成'};}
      catch(e){room.receipts[uid]={id:cmd.id,ok:false,message:e.message};}
    }
    delete room.inbox[uid];
  }
  Object.assign(room,project(room.engine,room.seats||{}));
  if(encoded)room.engine=JSON.stringify(room.engine);
  return room;
}
