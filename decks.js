export const VIRTUE_NAMES=['包容','默契','慷慨','担当','体贴','勇敢','善变'];
export const VIRTUE_EFFECTS=[
  '立即抽两张牌。若抽牌后手中没有【包容】，可以与任意一名玩家交换全部手牌。',
  '选择除队友以外的一名玩家抽两张牌，对方可以弃一张【默契】并反过来发动，直至一方没有【默契】。',
  '依次翻开牌堆顶，可停止并分配。出现两张同色，自己取得全部翻牌；翻出六种不同颜色，分配翻牌并清空自己手牌。',
  '选择除队友外的一名玩家，若对方展示【担当】，你抽1张，否则对方抽1张。',
  '从牌堆和另一名玩家手中各抽1张，再进行额外回合；额外回合不能再次使用【体贴】。',
  '选择除队友外的一名玩家：无事发生，或你们各弃1张牌；若有人弃【勇敢】，对方摸2张。'
];
export const CHANGE_EFFECTS=[
  '宣布1—6中的一个数字，所有无法展示该数字的玩家各抽1张。',
  '从你开始，所有玩家依次展示一张手牌，与前一位展示的数字相差1；无法展示者抽2张。',
  '所有玩家各盖置一张牌，一同公开；出现相同数字的玩家各抽2张。'
];
// 手册：36种基础牌各2张；善变3种效果各2张，共78个独立实例。
export const VIRTUES=[];
for(let kind=0;kind<6;kind++)for(let number=1;number<=6;number++)for(let copy=0;copy<2;copy++){
  VIRTUES.push({id:`v${kind}-${number}-${copy}`,kind,number,title:`${VIRTUE_NAMES[kind]} ${number}`,effect:VIRTUE_EFFECTS[kind],asset:kind*6+number-1});
}
for(let variant=0;variant<3;variant++)for(let copy=0;copy<2;copy++)VIRTUES.push({id:`v6-${variant}-${copy}`,kind:6,number:7,variant,title:`善变 7 · 效果${variant+1}`,effect:CHANGE_EFFECTS[variant],asset:variant===2?36:null});
export const virtue=id=>VIRTUES.find(c=>c.id===id);
export const ACTION_NAMES=['举起双手','榜一大哥','铁杆粉丝','狠狠共情','注意安全','贴心安慰','装疯卖傻','好大的浪','哎呀脚滑','海底捞人'];
export const EVENT_NAMES=['激流','漩涡','补给','交换','物资','拯救'];
export const BOAT_NAMES=['快艇','帆船','游轮'];
export const actionType=id=>Number(String(id).split('-')[1]);
export const actionCard=id=>({id,type:actionType(id),title:ACTION_NAMES[actionType(id)]});
export function makeActions(counts){return counts.flatMap((n,t)=>Array.from({length:n},(_,i)=>`a-${t}-${i}`));}
// 用户授权的朋友局配比：按影响范围／控制力分级，轻3、中2、重1。
// 事件四轻一中一重恰为15张；航行行动四轻二中四重共20张。
export const EVENT_TIERS=[1,2,1,3,1,1];
export const ACTION_TIERS=[3,1,1,2,1,1,3,3,2,3];
export const tierName=t=>['','轻度','中度','重度'][t];
export const tierCount=t=>4-t;
export const DEFAULT_VOYAGE_CONFIG={events:EVENT_TIERS.map(tierCount),actions:ACTION_TIERS.map(tierCount),initial:3,label:'朋友局自定义分级：轻3／中2／重1（15事件、20行动）'};
export const GIFT_ACTIONS=Array.from({length:6},(_,i)=>({number:i+1,type:i<2?'peek':i<4?'swap':'reverse',title:i<2?'偷窥':i<4?'交换':'翻转',text:i<2?'私下查看包括自己在内任意两名不同玩家的礼物；结果仅执行者可见。':i<4?'交换包括自己在内任意两名不同玩家的礼物，不公开礼物内容。':'翻转包括自己在内任意一名玩家的礼物：好变坏，坏变好。'}));
