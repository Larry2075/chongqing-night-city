// Public engineering / owner references, checked 2026-11-14. Absolute elevations
// use a common model datum. They are not a cadastral survey or live water gauge.
export const UNIT=.35;
export const WATER_DATUM=170;
export const elevation = meters => (meters-WATER_DATUM)*UNIT;
export const levels={
  riverwalk:elevation(180), lowerQuay:elevation(175),
  jiabin:elevation(187), cangbai:elevation(227), // 187 m western reach + published ~40 m road-to-road difference
  square:elevation(196), plazaLower:elevation(180),
  bankRoad:elevation(193), archNorth:elevation(254), archSouth:elevation(255),
  rafflesGrade:elevation(196), rafflesPodium:elevation(221) // podium grade/roof are explicit working estimates
};
export const EYE_HEIGHT=1.68*UNIT;
export const BODY_RADIUS=.30*UNIT;
export const CORE_SLOPE=(levels.cangbai-levels.jiabin)/(26.06-2.28);
export function coreHeight(oldY) {
  if(oldY<=0)return oldY;
  if(oldY<2.28)return oldY/2.28*levels.jiabin;
  return levels.jiabin+(oldY-2.28)*CORE_SLOPE;
}
export const surveySources=[
  {subject:'朝天门 196 瓮城、180 城门洞',url:'https://zfcxjw.cq.gov.cn/zwxx_166/zwyw/202512/t20251209_15221671.html',status:'published level names / built public space'},
  {subject:'朝天门两端 254/255 m，滨江路 193 m',url:'https://csdqyfh.ijournals.cn/csdqyfh/article/html/240635',status:'existing levels described in a proposal; proposed new skywalks NOT modelled as built'},
  {subject:'朝天门四部、东水门两侧既有电梯',url:'https://ghzrzyj.cq.gov.cn/zwgk_186/jytablqk/202508/t20250805_14876960_wap.html',status:'official confirmation of built connections; exact door sill levels not surveyed'},
  {subject:'嘉滨路西段 187 m、182/176 m 分层',url:'https://www.cqyz.gov.cn/bm_229/qsthjj/zwgk_97157/jczwgk_99652/jczwgk_61977/zdxmhjyxpj/hpsp/202501/W020250416589289099196.pdf',status:'environmental report; local eastward interpolation remains approximate'},
  {subject:'沧白路—嘉滨路约 40 m',url:'https://www.cq.gov.cn/zwgk/zfxxgkml/zdlyxxgk/jt/jtzx/202603/t20260325_15564274.html',status:'reported vertical difference; 2026 escalator project not represented as already open'},
  {subject:'来福士六栋 250 m、两栋 350 m',url:'https://www.capitaland.com/cn/zh/newsroom/RCCQ-CTBUH.html',status:'owner dimensions'},
  {subject:'水晶连廊 300 × 32.5 × 26.5 m',url:'https://www.capitaland.com/cn/zh/newsroom/To-explore.html',status:'owner dimensions'},
  {subject:'大剧院最高 64 m',url:'https://www.sbp.de/zh-hans/project/重庆大剧院/',status:'structural engineer dimensions'}
];
