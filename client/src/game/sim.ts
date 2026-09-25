// 格斗游戏核心模拟：纯数据 + 固定步长，不依赖 Phaser / DOM。
// 房主每帧权威执行；客机用其中的 stepFighter 做本地预测。
import {
  AIR_ACCEL,
  AIR_FRICTION,
  ATK_ACTIVE,
  ATK_BASE,
  ATK_DMG,
  ATK_GROWTH,
  ATK_HITBOX,
  ATK_STARTUP,
  ATK_TOTAL,
  BLAZE_KB_MUL,
  BLAST,
  COYOTE_FRAMES,
  DART_LIFE,
  DART_SPEED,
  DASH_COOLDOWN_FRAMES,
  DASH_END_MOMENTUM,
  DASH_FRAMES,
  DASH_SPEED,
  DOUBLE_JUMP_V,
  DROP_THROUGH_FRAMES,
  DT,
  FAST_FALL,
  FIGHTER_H,
  FIGHTER_W,
  GRAVITY,
  GROUND_ACCEL,
  GROUND_FRICTION,
  HITSTUN_PER_POWER,
  JUMP_BUFFER_FRAMES,
  JUMP_CUT_VY,
  JUMP_V,
  MAPS,
  MAX_DMG,
  MAX_FALL,
  NEON_SPEED_FRAMES,
  NEON_SPEED_MUL,
  NIGHTMARE_BLIND_FRAMES,
  NIGHTMARE_SPEED,
  RESPAWN_FRAMES,
  RESPAWN_INVULN,
  RUN_SPEED,
  PHANTOM_DASH,
  PHANTOM_SPEED,
  FIREBALL_BASE,
  FIREBALL_DMG,
  FIREBALL_GROWTH,
  FIREBALL_LIFE,
  FIREBALL_R,
  FIREBALL_SPEED,
  SKILL0_BASE,
  SKILL0_DMG,
  SKILL0_GROWTH,
  SKILL0_RADIUS,
  SKILL1_BASE,
  SKILL1_DIST,
  SKILL1_GROWTH,
  SKILL1_HIT_R,
  SKILL1_DMG,
  SKILL_CD_FRAMES,
  SKILL_LOCK_FRAMES,
  SKILL3_CD_FRAMES,
  SKILL3_DMG,
  SKILL3_BASE,
  SKILL3_GROWTH,
  SKILL3_MARK_FRAMES,
  SKILL3_LOCK,
  SKILL3_STARTUP,
  SKILL3_TELE_LOCK,
  SKILL3_TELE_STARTUP,
  SKILL5_CHARGE_FRAMES,
  SKILL5_KB_REDUCE,
  SKILL5_PULSE_BASE,
  SKILL5_PULSE_GROWTH,
  SKILL5_PULSE_R,
  SKILL5_SHIELD_FRAMES,
  SKILL9_CD_FRAMES,
  VOID_GUARD_FRAMES,
  VOID_REFLECT,
  VOID_WHIFF_DMG,
  VOID_WHIFF_EXTRA_CD,
  ARC0_HEAL,
  ARC1_DASH_MUL,
  ARC2_FLAME_KB,
  ARC2_FLAME_LIFE,
  ARC2_FLAME_R,
  ARC2_FLAME_SPEED,
  ARC3_WING_FRAMES,
  ARC3_WING_VY,
  ARC4_DMG,
  ARC4_HITBOX,
  ARC4_STARTUP,
  ARC5_ARMOR_FRAMES,
  ARC5_KB_MUL,
  ARC5_REFLECT,
  ARCANA_CD_FRAMES,
  ARCANA_LOCK_FRAMES,
  DART_R as DART_RADIUS,
  SPC_ACTIVE,
  SPC_BASE,
  SPC_DMG,
  SPC_GROWTH,
  SPC_HITBOX,
  SPC_TOTAL,
  SPC_VX,
  SPC_VY,
  START_STOCKS,
  SWORD_ATK_ACTIVE,
  SWORD_ATK_HITBOX,
  SWORD_ATK_STARTUP,
  SWORD_ATK_TOTAL,
  SWORD_SPC_ACTIVE,
  SWORD_SPC_HITBOX,
  SWORD_SPC_TOTAL,
  SKILL10_GRAB_HITBOX,
  SKILL10_HOLD_FRAMES,
  SKILL10_LOCK,
  SKILL10_WHIFF_LOCK,
  SKILL10_THROW_VX,
  SKILL10_THROW_VY,
  SKILL10_THROW_HITSTUN,
  SKILL10_THROW_POWER,
  SKILL11_SELFDMG,
  PRIEST_KB_PER_PCT,
  SKILL12_FURY_FRAMES,
  SKILL12_CLAW_FIRST,
  SKILL12_CLAW_EVERY,
  SKILL12_CLAW_DMG,
  SKILL12_CLAW_BASE,
  SKILL12_CLAW_GROWTH,
  SKILL12_HITBOX,
  ONI_BUFF_FRAMES,
  ONI_DIVE_FRAMES,
  ONI_DIVE_SPEED,
  ONI_DIVE_DMG,
  ONI_DIVE_BASE,
  ONI_DIVE_GROWTH,
  ONI_DIVE_HITBOX,
  DREAM_SPEED,
  DREAM_R,
  DREAM_LIFE,
  DREAM_WEAK_FRAMES,
  DREAM_KB_MUL,
  ELEM_SWITCH_CD,
  ELEM_CD_FRAMES,
  ELEM_LOCK_FRAMES,
  ELEM_WIND_DIST,
  ELEM_THUNDER_R,
  ELEM_STUN_FRAMES,
  ELEM_WATER_DELAY,
  ELEM_WATER_R,
  ELEM_WATER_KB,
  ELEM_FIRE_SPEED,
  ELEM_FIRE_R,
  ELEM_FIRE_LIFE,
  ELEM_FIRE_KB,
  ELEM_FIRE_RECOIL,
  ELEM_EARTH_FRAMES,
  ELEM_EARTH_KB_MUL,
  SKILL16_DODGE_FRAMES,
  SKILL16_SLOW_FRAMES,
  SKILL16_FAIL_CD,
  SKILL16_DONE_CD,
  SKILL16_TELE_R,
  SKILL16_DELAY_FRAMES,
  SKILL16_DMG,
  SKILL16_FIZZLE_LOCK,
  SKILL16_STRIKE_LOCK,
  SKILL17_HITS,
  SKILL17_BONUS,
  SKILL18_PASSIVE,
  SKILL18_BOOST_ADD,
  SKILL18_BOOST_FRAMES,
  SKILL18_CD_FRAMES,
  SKILL19_CD_FRAMES,
  SKILL19_CHARGE_MAX,
  SKILL19_KB_MIN,
  SKILL19_KB_MAX,
  SKILL19_RANGE_MIN,
  SKILL19_RANGE_MAX,
  SKILL19_HIT_H,
  SKILL19_LOCK,
  SKILL19_BURST_FRAMES,
} from './constants';
import type { MapDef } from './constants';
import type { InputState } from '../net/protocol';
import { NEUTRAL_INPUT } from '../net/protocol';

export type FighterMode =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'attack'
  | 'special'
  | 'dash'
  | 'skill'
  | 'hurt';

export interface Fighter {
  id: 0 | 1;
  /** 选择的角色 id（0 赤焰 / 1 青叶 / 2 蓝铃 / 3 闪光 / 4 幻影 / 5 蝶），决定 Ctrl 技能 */
  char: number;
  /** 携带的秘术 id（0 回春 / 1 迅捷 / 2 烈炎弹 / 3 风翼 / 4 重击 / 5 霸体），Q 释放 */
  arcana: number;
  x: number;
  y: number; // 中心坐标
  vx: number;
  vy: number;
  face: 1 | -1;
  w: number;
  h: number;
  mode: FighterMode;
  modeT: number; // 当前招式已进行的帧数
  hitDone: boolean; // 本段攻击是否已经命中过（单次攻击只造成一次伤害）
  dmg: number; // 百分比伤害
  stocks: number;
  jumps: number; // 剩余空中跳跃次数
  coyote: number; // 土狼时间（离开平台后的宽限跳跃帧）
  jumpBuffer: number; // 跳跃输入缓冲
  dropT: number; // 穿平台下落窗口
  hitstun: number;
  invuln: number;
  onGround: boolean;
  onPlatform: boolean; // 脚下是否为单向平台（决定能否穿下）
  fastFalled: boolean;
  jumpCut: boolean;
  recoveryUsed: boolean; // 本次滞空是否已用过回场必杀
  dashCd: number; // 突进冷却剩余帧（独立计时，任何状态下都递减）
  dashT: number; // 突进生效剩余帧
  skillCd: number; // 角色技能冷却剩余帧（独立计时）
  skillKind: number; // 当前/最近一次释放的技能种类（角色 id）
  /** 本帧排队的技能指令（由 stepFighter 触发，Sim 结算后清 -1） */
  queuedSkill: number;
  skillPhase: number; // 多阶段技能状态：闪光 0投镖/1二段前摇/2瞬移出手；幻棱 0闪避/1瞬移/2空甩
  dartMark: -1 | 0 | 1; // 闪光飞镖标记的敌人 id
  markT: number; // 标记剩余帧（超时消失）
  markX: number; // 标记敌人的实时位置（瞬移落点，权威端每帧刷新）
  markY: number;
  dartActive: boolean; // 飞镖尚在飞行（期间不能再投）
  chargeT: number; // 蝶：粉蝶环绕（蓄力）剩余帧，结束时成盾
  shieldT: number; // 蝶：护盾剩余帧（期间受到的击退 -60%）
  blindT: number; // 噩梦诅咒：视野收窄剩余帧（挂在被诅咒者身上）
  neonT: number; // 霓虹超频：移速 +66% 剩余帧
  voidGuardT: number; // 虚无之盾：无敌招架剩余帧
  voidHit: boolean; // 本次招架是否成功挡下攻击（决定结束时是否空挡惩罚）
  arcCd: number; // 秘术冷却剩余帧（独立计时，1 迅捷被动恒为 0）
  arcMode: boolean; // 当前 mode==='skill' 是否由秘术 Q 触发（区别于 Ctrl 角色技能）
  arcKind: number; // 正在施放的秘术 id（-1 = 无）
  queuedArcana: number; // 本帧排队的秘术（由 stepFighter 触发，Sim 结算后清 -1）
  wingT: number; // 风翼：向上飞翔剩余帧（期间无重力、匀速上升）
  armorT: number; // 霸体剩余帧（期间受到的击退 -45% 并反震 5%）
  grappleT: number; // 斗士：擒抱持有剩余帧（>0 表示正抓着敌人）
  grappleId: -1 | 0 | 1; // 斗士：被抓住的敌人 id
  grabHit: boolean; // 斗士：本次擒抱是否抓中（决定收招长短）
  grabbedBy: -1 | 0 | 1; // 被斗士抓住的施法者 id（期间完全不能行动）
  clawNext: number; // 喵喵：狂爪下一段命中判定的 modeT 帧
  oniBuffT: number; // 鬼人：鬼燃强化窗口剩余帧
  oniDiveT: number; // 鬼人：突进斩进行剩余帧（期间无敌、无重力）
  oniHitDone: boolean; // 鬼人：本次突进斩是否已造成过伤害
  weakT: number; // 呓梦梦火弹：受到的击退 -20% 剩余帧
  stunT: number; // 元素使唤雷：眩晕剩余帧（不能行动，不被击飞）
  elem: number; // 元素使：当前元素系 0 风 / 1 雷 / 2 水 / 3 火 / 4 土
  elemCd: number[]; // 元素使：五系各自冷却剩余帧（仅当前系递减）
  elemSwitchCd: number; // 元素使：滚轮切换冷却剩余帧
  earthT: number; // 元素使御土：土盾剩余帧（受到的击退 ×0.75）
  aimX: number; // 元素使降水：本帧施放时的鼠标世界坐标
  aimY: number;
  phDodgeT: number; // 幻棱：闪避姿态剩余帧（期间受击触发成功）
  phSlowT: number; // 幻棱：特写慢动作剩余帧（期间无敌）
  phReady: boolean; // 幻棱：二段已解锁，待释放
  phTeleT: number; // 幻棱：二段瞬移后等待发动攻击的剩余帧
  phTgt: number; // 幻棱：二段锁定的目标（0/1，-1 空甩）
  srcHits: number; // 源：已成功命中的次数
  srcCharged: boolean; // 源：强化已就绪（下次攻击额外 80%）
  vampT: number; // 吸血鬼：主动增强剩余帧（被动恢复 +1%）
  manCharge: number; // 狂徒：本次蓄力已进行帧（松手即轰出）
  manBurstT: number; // 狂徒：轰拳爆光剩余帧
  respawn: number; // >0：等待复活的剩余帧
  dead: boolean;
}

/** 飞行物（火球 / 飞镖 / 烈炎弹 / 梦火弹 / 元素火弹 / 待爆水弹） */
export interface Projectile {
  n: number; // 权威端内唯一序号（渲染层去重/插值用）
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  owner: 0 | 1;
  r: number;
  /** 0 火球 / 1 飞镖（只标记）/ 2 烈炎弹（按击飞值击退）/ 3 梦火弹（易伤：受击退+20%）/ 4 元素火弹（35% 击退）/ 5 待爆水弹（定点延迟爆炸） */
  k: 0 | 1 | 2 | 3 | 4 | 5;
  /** k=5 水弹：爆炸中心定点坐标（静止待爆） */
  tx: number;
  ty: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SimEvent =
  | { type: 'hit'; by: 0 | 1; target: 0 | 1; dmg: number; power: number }
  | { type: 'blind'; by: 0 | 1; target: 0 | 1 }
  | { type: 'phantom'; by: 0 | 1 }
  | { type: 'waterburst'; x: number; y: number; r: number }
  | { type: 'ko'; id: 0 | 1 }
  | { type: 'end'; winner: 0 | 1 };

export function createFighter(
  id: 0 | 1,
  char = 0,
  map: MapDef = MAPS[0],
  arcana = 0,
): Fighter {
  // 出生点取地图指定 x，y 落在脚下地板表面
  const sx = map.spawns[id];
  const fl =
    map.floors.find((g) => sx > g.x && sx < g.x + g.w) ?? map.floors[0];
  return {
    id,
    char,
    arcana,
    x: sx,
    y: fl.y - FIGHTER_H / 2,
    vx: 0,
    vy: 0,
    face: id === 0 ? 1 : -1,
    w: FIGHTER_W,
    h: FIGHTER_H,
    mode: 'idle',
    modeT: 0,
    hitDone: false,
    dmg: 0,
    stocks: START_STOCKS,
    jumps: 1,
    coyote: 0,
    jumpBuffer: 0,
    dropT: 0,
    hitstun: 0,
    invuln: 0,
    onGround: true,
    onPlatform: false,
    fastFalled: false,
    jumpCut: false,
    recoveryUsed: false,
    dashCd: 0,
    dashT: 0,
    skillCd: 0,
    skillKind: 0,
    queuedSkill: -1,
    skillPhase: 0,
    dartMark: -1,
    markT: 0,
    markX: 0,
    markY: 0,
    dartActive: false,
    chargeT: 0,
    shieldT: 0,
    blindT: 0,
    neonT: 0,
    voidGuardT: 0,
    voidHit: false,
    arcCd: 0,
    arcMode: false,
    arcKind: -1,
    queuedArcana: -1,
    wingT: 0,
    armorT: 0,
    grappleT: 0,
    grappleId: -1,
    grabHit: false,
    grabbedBy: -1,
    clawNext: 0,
    oniBuffT: 0,
    oniDiveT: 0,
    oniHitDone: false,
    weakT: 0,
    stunT: 0,
    elem: 0,
    elemCd: [0, 0, 0, 0, 0],
    elemSwitchCd: 0,
    earthT: 0,
    aimX: 640,
    aimY: 360,
    phDodgeT: 0,
    phSlowT: 0,
    phReady: false,
    phTeleT: 0,
    phTgt: -1,
    srcHits: 0,
    srcCharged: false,
    vampT: 0,
    manCharge: 0,
    manBurstT: 0,
    respawn: 0,
    dead: false,
  };
}

function placeRespawn(f: Fighter) {
  f.x = 640;
  f.y = 240;
  f.vx = 0;
  f.vy = 0;
  f.mode = 'fall';
  f.modeT = 0;
  f.hitDone = false;
  f.hitstun = 0;
  f.jumps = 1;
  f.fastFalled = false;
  f.jumpCut = false;
  f.recoveryUsed = false;
  f.dashT = 0;
  f.dartMark = -1;
  f.markT = 0;
  f.dartActive = false;
  f.chargeT = 0;
  f.shieldT = 0;
  f.blindT = 0;
  f.neonT = 0;
  f.voidGuardT = 0;
  f.voidHit = false;
  f.skillPhase = 0;
  f.arcMode = false;
  f.arcKind = -1;
  f.queuedArcana = -1;
  f.wingT = 0;
  f.armorT = 0;
  f.grappleT = 0;
  f.grappleId = -1;
  f.grabHit = false;
  f.grabbedBy = -1;
  f.clawNext = 0;
  f.oniBuffT = 0;
  f.oniDiveT = 0;
  f.oniHitDone = false;
  f.weakT = 0;
  f.stunT = 0;
  f.earthT = 0;
  f.elemSwitchCd = 0;
  f.phDodgeT = 0;
  f.phSlowT = 0;
  f.phReady = false;
  f.phTeleT = 0;
  f.phTgt = -1;
  f.srcHits = 0;
  f.srcCharged = false;
  f.vampT = 0;
  f.manCharge = 0;
  f.manBurstT = 0;
  f.invuln = RESPAWN_INVULN;
}

function overlap(a: Box, b: Box): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h
  );
}

export function hurtBox(f: Fighter): Box {
  return { x: f.x, y: f.y, w: f.w, h: f.h };
}

/** 返回当前帧生效的攻击判定盒（未生效时为 null）；剑客（6）普攻/必杀均为大范围挥剑 */
export function attackBox(f: Fighter): Box | null {
  if (f.mode === 'attack') {
    const isSword = f.char === 6;
    const startup = isSword ? SWORD_ATK_STARTUP : ATK_STARTUP;
    const active = isSword ? SWORD_ATK_ACTIVE : ATK_ACTIVE;
    if (f.modeT >= startup && f.modeT < startup + active) {
      const hb = isSword ? SWORD_ATK_HITBOX : ATK_HITBOX;
      return {
        x: f.x + f.face * (f.w / 2 + hb.w / 2 - hb.fwd),
        y: f.y + hb.y,
        w: hb.w,
        h: hb.h,
      };
    }
  }
  if (f.mode === 'special') {
    const isSword = f.char === 6;
    const active = isSword ? SWORD_SPC_ACTIVE : SPC_ACTIVE;
    if (f.modeT < active) {
      const hb = isSword ? SWORD_SPC_HITBOX : SPC_HITBOX;
      return {
        x: f.x + f.face * (f.w / 2 + hb.w / 2 - hb.fwd),
        y: f.y + hb.y,
        w: hb.w,
        h: hb.h,
      };
    }
  }
  return null;
}

function canAct(f: Fighter): boolean {
  return (
    f.mode !== 'attack' &&
    f.mode !== 'special' &&
    f.mode !== 'skill' &&
    f.mode !== 'dash' &&
    f.hitstun === 0
  );
}

/** 重击秘术前摇期间无敌（不含闪烁，由表现层画金光区分） */
function isArcInvuln(f: Fighter): boolean {
  return (
    f.mode === 'skill' &&
    f.arcMode &&
    f.arcKind === 4 &&
    f.modeT < ARC4_STARTUP
  );
}

/** 本帧不可被命中/抓取：复活无敌、幻棱特写慢动作、鬼人突进斩、重击前摇 */
function isUntouchable(f: Fighter): boolean {
  return (
    f.dead ||
    f.respawn > 0 ||
    f.invuln > 0 ||
    f.phSlowT > 0 ||
    f.oniDiveT > 0 ||
    isArcInvuln(f)
  );
}

/** 面向方向的盒判定（攻击盒 / 抓取盒通用） */
function frontBox(f: Fighter, hb: { w: number; h: number; fwd: number; y: number }): Box {
  return {
    x: f.x + f.face * (f.w / 2 + hb.w / 2 - hb.fwd),
    y: f.y + hb.y,
    w: hb.w,
    h: hb.h,
  };
}

function startDash(f: Fighter, ix: number) {
  const dir = ix !== 0 ? (ix > 0 ? 1 : -1) : f.face;
  f.face = dir as 1 | -1;
  f.mode = 'dash';
  f.modeT = 0;
  f.dashT = DASH_FRAMES;
  f.dashCd = DASH_COOLDOWN_FRAMES;
  // 幻影突进距离 +10%；携带「迅捷」秘术再 +6.66%
  const dashMul =
    (f.char === 4 ? PHANTOM_DASH : 1) *
    (f.arcana === 1 ? ARC1_DASH_MUL : 1);
  f.vx = dir * DASH_SPEED * dashMul;
  f.vy = 0;
  // 空中突进不消耗跳跃次数，也不占用回场必杀
}

function startAttack(f: Fighter) {
  f.mode = 'attack';
  f.modeT = 0;
  f.hitDone = false;
  if (f.onGround) f.vx *= 0.6;
}

function startSpecial(f: Fighter, ix: number) {
  f.mode = 'special';
  f.modeT = 0;
  f.hitDone = false;
  f.recoveryUsed = true;
  f.onGround = false;
  f.onPlatform = false;
  f.vy = SPC_VY;
  f.vx = ix * SPC_VX;
  f.jumps = 0; // 用过回场后不能再二段跳
  f.fastFalled = false;
}

/** 角色专属技能（Ctrl）本帧是否可释放 */
function canUseSkill(f: Fighter): boolean {
  if (f.char === 4 || f.char === 6 || f.char === 17) return false; // 幻影 / 剑客 / 源：纯被动，Ctrl 无技能
  if (f.char === 16) return f.skillCd === 0; // 幻棱：失败/二段 CD 程序化
  if (f.char === 3) {
    // 闪光：有标记 → 瞬移追击；否则需冷却结束且飞镖不在飞行中
    return f.dartMark >= 0 || (f.skillCd === 0 && !f.dartActive);
  }
  if (f.char === 15) return f.elemCd[f.elem] === 0; // 元素使：仅看当前元素系 CD
  return f.skillCd === 0;
}

/** 鬼人：鬼燃强化中的攻击 → 突进斩（定速前冲、无重力、沿途无敌） */
function startOniDive(f: Fighter) {
  f.mode = 'dash';
  f.modeT = 0;
  f.oniDiveT = ONI_DIVE_FRAMES;
  f.oniHitDone = false;
  f.vx = f.face * ONI_DIVE_SPEED;
  f.vy = 0;
  f.onGround = false;
  f.onPlatform = false;
}

/** 角色专属技能（Ctrl）：位移类效果本地立即执行（客机可预测），伤害/飞行物在 Sim.resolveSkills 结算 */
function startSkill(f: Fighter, input: InputState) {
  const kind = f.char;
  const ix = input.ix;
  f.skillKind = kind;
  f.mode = 'skill';
  f.modeT = 0;
  f.hitDone = false;
  if (ix !== 0) f.face = ix > 0 ? 1 : -1;

  if (kind === 10) {
    // 斗士：擒抱出手，抓中与否由 Sim 判定（抓中定身 1 秒后丢出，抓空 26 帧收招）
    f.skillCd = SKILL_CD_FRAMES[kind];
    f.queuedSkill = 10;
    f.grabHit = false;
    if (f.onGround) f.vx *= 0.3;
  } else if (kind === 11) {
    // 祭司：血誓——立刻自残 10% 击飞值（被动增强全部击退）
    f.skillCd = SKILL_CD_FRAMES[kind];
    f.queuedSkill = -1;
    f.dmg = Math.min(MAX_DMG, f.dmg + SKILL11_SELFDMG);
    if (f.onGround) f.vx *= 0.4;
  } else if (kind === 12) {
    // 喵喵：狂爪 2.7 秒，期间全速自由移动但不可转向，多段爪击由 Sim 结算
    f.skillCd = SKILL_CD_FRAMES[kind];
    f.queuedSkill = -1;
    f.clawNext = SKILL12_CLAW_FIRST;
    f.vx = 0;
  } else if (kind === 13) {
    // 鬼人：鬼燃——3 秒内下次攻击变突进斩
    f.skillCd = SKILL_CD_FRAMES[kind];
    f.queuedSkill = -1;
    f.oniBuffT = ONI_BUFF_FRAMES;
    if (f.onGround) f.vx *= 0.4;
  } else if (kind === 14) {
    // 呓梦：梦火弹（粉紫，命中易伤 5 秒：受击退 +20%）
    f.skillCd = SKILL_CD_FRAMES[kind];
    f.queuedSkill = 14;
    if (f.onGround) f.vx *= 0.3;
  } else if (kind === 15) {
    // 元素使：按当前元素系生效，仅本系进入冷却
    const e = f.elem;
    f.elemCd[e] = ELEM_CD_FRAMES[e];
    f.queuedSkill = 15;
    if (e === 0) {
      // 逐风：向前位移约 0.75 个突进
      f.queuedSkill = -1;
      f.x += f.face * ELEM_WIND_DIST;
      f.vx = 0;
      f.vy = 0;
    } else if (e === 2) {
      // 降水：记住鼠标世界坐标，Sim 在该点生成 0.4 秒后爆炸的水弹
      f.aimX = input.mx;
      f.aimY = input.my;
      if (f.onGround) f.vx *= 0.3;
    } else if (e === 3) {
      // 燎火：火弹由 Sim 生成，自身向后反冲一小段
      f.vx = -f.face * ELEM_FIRE_RECOIL;
    } else if (e === 4) {
      // 御土：1.5 秒土盾，抵消 25% 击退
      f.queuedSkill = -1;
      f.earthT = ELEM_EARTH_FRAMES;
      if (f.onGround) f.vx *= 0.4;
    } else {
      // 唤雷：近身眩晕由 Sim 结算
      if (f.onGround) f.vx *= 0.3;
    }
  } else if (kind === 1) {
    // 青叶：立刻瞬移，落点贴身伤害由 Sim 判定
    f.skillCd = SKILL_CD_FRAMES[kind];
    f.queuedSkill = 1;
    f.x += f.face * SKILL1_DIST;
    f.vx = 0;
    f.vy = 0;
  } else if (kind === 3) {
    if (f.dartMark >= 0) {
      // 闪光二段：先 0.24 秒大动作前摇，前摇结束当帧才瞬移出手（在 castingSkill 分支排队）
      f.skillPhase = 1;
      f.queuedSkill = -1;
      f.vx = 0;
    } else {
      // 闪光一段：0.5 秒前摇（期间可自由移动、跳跃），前摇结束当帧排队生成飞镖；此时不进冷却
      f.skillPhase = 0;
      f.queuedSkill = -1;
    }
  } else if (kind === 5) {
    // 蝶：粉蝶环绕 1.5 秒（期间可自由行动），到时成盾；震退脉冲由 Sim 结算
    f.skillCd = SKILL_CD_FRAMES[kind];
    f.chargeT = SKILL5_CHARGE_FRAMES;
    f.shieldT = 0;
    f.queuedSkill = -1;
  } else if (kind === 8) {
    // 霓虹：进入超频，2 秒内移速 +50%（无对外结算）
    f.skillCd = SKILL_CD_FRAMES[kind];
    f.neonT = NEON_SPEED_FRAMES;
    f.queuedSkill = -1;
    if (f.onGround) f.vx *= 0.4;
  } else if (kind === 9) {
    // 虚无：架起 1 秒无敌招架（定身），反震/空挡惩罚在战斗结算与计时结束时处理
    f.skillCd = SKILL_CD_FRAMES[kind];
    f.voidGuardT = VOID_GUARD_FRAMES;
    f.voidHit = false;
    f.queuedSkill = -1;
    if (f.onGround) f.vx *= 0.3;
  } else if (kind === 16) {
    if (f.phReady) {
      // 幻棱二段：进入出手姿态，瞬移定位由 Sim.resolveSkills 判定（无目标则空甩）
      f.phReady = false;
      f.skillPhase = 1;
      f.phTeleT = 0;
      f.queuedSkill = 16;
      f.vx = 0;
    } else {
      // 幻棱一段：0.5 秒闪避姿态（期间受击触发成功）
      f.skillPhase = 0;
      f.phDodgeT = SKILL16_DODGE_FRAMES;
      f.queuedSkill = -1;
    }
  } else if (kind === 18) {
    // 吸血鬼主动：6 秒内被动恢复 +1%（共 4%）
    f.skillCd = SKILL18_CD_FRAMES;
    f.vampT = SKILL18_BOOST_FRAMES;
    f.queuedSkill = -1;
    if (f.onGround) f.vx *= 0.4;
  } else if (kind === 19) {
    // 狂徒：进入蓄力（manCharge 每帧 +1），松手或蓄满在 castingSkill 分支触发轰拳
    f.manCharge = 0;
    f.skillPhase = 0;
    f.queuedSkill = -1;
    f.vx = 0;
  } else {
    // 赤焰 / 蓝铃：原地聚气，击退/火球由 Sim 结算
    f.skillCd = SKILL_CD_FRAMES[kind];
    f.queuedSkill = kind;
    if (f.onGround) f.vx *= kind === 2 ? 0.3 : 0.4;
  }
}

/** 秘术（Q）本帧是否可释放：1 迅捷为纯被动，无 Q 效果 */
function canUseArcana(f: Fighter): boolean {
  return f.arcana !== 1 && f.arcCd === 0;
}

/** 秘术（Q）：本地立即生效的效果（客机可预测），烈炎弹/重击打由 Sim.resolveArcana 结算 */
function startArcana(f: Fighter, ix: number) {
  const k = f.arcana;
  f.arcMode = true;
  f.arcKind = k;
  f.mode = 'skill';
  f.modeT = 0;
  f.hitDone = false;
  f.queuedArcana = -1;
  if (ix !== 0) f.face = ix > 0 ? 1 : -1;
  f.arcCd = ARCANA_CD_FRAMES[k] ?? 0;

  if (k === 0) {
    // 回春：立刻恢复 25% 击飞值
    f.dmg = f.dmg * (1 - ARC0_HEAL);
    if (f.onGround) f.vx *= 0.4;
  } else if (k === 2) {
    // 烈炎弹：飞行物由 Sim 结算生成
    f.queuedArcana = 2;
    if (f.onGround) f.vx *= 0.3;
  } else if (k === 3) {
    // 风翼：1 秒匀速向上飞翔（无重力，可水平微调）
    f.wingT = ARC3_WING_FRAMES;
    f.vy = ARC3_WING_VY;
    f.vx = 0;
    f.jumps = 1;
  } else if (k === 4) {
    // 重击：0.5 秒前摇结束当帧排队，命中由 Sim 结算
    if (f.onGround) f.vx *= 0.4;
  } else if (k === 5) {
    // 霸体：2 秒减击退 + 反震
    f.armorT = ARC5_ARMOR_FRAMES;
    if (f.onGround) f.vx *= 0.4;
  }
}

/**
 * 推进单个角色一个物理帧。
 * 不包含双方攻击命中结算（resolveCombat），客机预测时同样复用本函数。
 */
export function stepFighter(f: Fighter, input: InputState, map: MapDef) {
  if (f.dead) return;

  // 突进/技能/秘术冷却独立递减（复活等待期间也照常走表，不与移动/落地逻辑耦合）
  if (f.dashCd > 0) f.dashCd -= 1;
  if (f.char === 15) {
    // 元素使：只有当前元素系的技能 CD 递减；切系冷却独立走表
    if (f.elemCd[f.elem] > 0) f.elemCd[f.elem] -= 1;
    if (f.elemSwitchCd > 0) f.elemSwitchCd -= 1;
  } else if (f.skillCd > 0) {
    f.skillCd -= 1;
  }
  if (f.arcCd > 0) f.arcCd -= 1;

  // 复活倒计时期间不参与世界
  if (f.respawn > 0) {
    f.respawn -= 1;
    if (f.respawn === 0) placeRespawn(f);
    return;
  }

  if (f.invuln > 0) f.invuln -= 1;
  if (f.grappleT > 0) f.grappleT -= 1; // 斗士：擒抱持有倒计时（投掷由 Sim 执行）
  if (f.oniBuffT > 0) f.oniBuffT -= 1; // 鬼人：鬼燃强化窗口
  if (f.weakT > 0) f.weakT -= 1; // 呓梦：易伤剩余帧
  if (f.stunT > 0) f.stunT -= 1; // 唤雷：眩晕剩余帧
  if (f.earthT > 0) f.earthT -= 1; // 御土：土盾剩余帧
  if (f.dropT > 0) f.dropT -= 1;
  if (f.markT > 0) {
    f.markT -= 1; // 闪光：飞镖标记窗口（权威端还会校准位置）
    if (f.markT === 0) f.dartMark = -1;
  }
  if (f.chargeT > 0) {
    f.chargeT -= 1; // 蝶：粉蝶环绕倒计时，到时化为护盾
    if (f.chargeT === 0) {
      f.shieldT = SKILL5_SHIELD_FRAMES;
      f.queuedSkill = 5; // 本帧由 Sim 结算成盾震退
    }
  }
  if (f.shieldT > 0) f.shieldT -= 1;
  if (f.blindT > 0) f.blindT -= 1; // 噩梦诅咒：视野收窄倒计时
  if (f.armorT > 0) f.armorT -= 1; // 霸体秘术：减击退倒计时（与施法动作解耦）
  if (f.neonT > 0) f.neonT -= 1; // 霓虹超频：加速倒计时
  if (f.voidGuardT > 0) {
    // 虚无之盾：无敌招架倒计时，自然结束且未挡下攻击 → 空挡惩罚
    f.voidGuardT -= 1;
    if (f.voidGuardT === 0 && !f.voidHit) {
      f.dmg = Math.min(MAX_DMG, f.dmg + VOID_WHIFF_DMG);
      f.skillCd = SKILL9_CD_FRAMES + VOID_WHIFF_EXTRA_CD;
    }
    if (f.voidGuardT === 0) f.voidHit = false;
  }

  // 幻棱：闪避窗口计时（自然结束的失败由 Sim.finalizeTimers 在战斗结算后处理）
  if (f.phDodgeT > 0) f.phDodgeT -= 1;
  // 幻棱：特写慢动作窗口（无敌），结束恢复行动（二段已解锁）
  if (f.phSlowT > 0) {
    f.phSlowT -= 1;
    if (f.phSlowT === 0) {
      f.mode = f.onGround ? 'idle' : 'fall';
      f.modeT = 0;
    }
  }
  if (f.vampT > 0) f.vampT -= 1; // 吸血鬼：主动增强窗口
  if (f.manBurstT > 0) f.manBurstT -= 1; // 狂徒：轰拳爆光

  // 被斗士擒抱中：完全不能行动，位置由 Sim 每帧强制拖到施法者身前
  if (f.grabbedBy >= 0) return;

  // 移速系数：幻影被动 +21%，噩梦被动 +3.33%；霓虹超频期间再 ×1.5
  const charMul =
    f.char === 4 ? PHANTOM_SPEED : f.char === 7 ? NIGHTMARE_SPEED : 1;
  const speedMul = (f.char === 8 && f.neonT > 0 ? NEON_SPEED_MUL : 1) * charMul;
  const maxRun = RUN_SPEED * speedMul;

  const castingSkill = f.mode === 'skill';

  if (f.hitstun > 0) {
    // 受击硬直：无法操作
    f.hitstun -= 1;
  } else if (f.stunT > 0) {
    // 唤雷眩晕：定身不能操作（保留重力/落地，不被击飞）
  } else if (f.mode === 'dash') {
    if (f.oniDiveT > 0) {
      // 鬼人突进斩：定速前冲、无重力、无敌；沿途伤害由 Sim 结算
      f.oniDiveT -= 1;
      f.vx = f.face * ONI_DIVE_SPEED;
      f.vy = 0;
      if (f.oniDiveT === 0) {
        // 突进斩结束：强化窗口消耗
        f.oniBuffT = 0;
        f.mode = f.onGround ? 'idle' : 'fall';
        f.modeT = 0;
      }
    } else {
      // 普通突进：水平定速、垂直归零、不吃重力（幻影突进距离 +10%，迅捷秘术 +45%）
      f.dashT -= 1;
      f.vx =
        f.face *
        DASH_SPEED *
        (f.char === 4 ? PHANTOM_DASH : 1) *
        (f.arcana === 1 ? ARC1_DASH_MUL : 1);
      f.vy = 0;
    }
  } else if (castingSkill) {
    f.modeT += 1;
    if (f.arcMode) {
      // 秘术施法：重击 0.5 秒前摇结束当帧排队；风翼持续向上飞
      if (f.arcKind === 4 && f.modeT === ARC4_STARTUP) {
        f.queuedArcana = 4;
      }
      if (f.wingT > 0) {
        f.wingT -= 1;
        f.vy = ARC3_WING_VY;
        const wingAccel = AIR_ACCEL * DT;
        f.vx = clamp(f.vx + input.ix * wingAccel, -maxRun, maxRun);
      } else if (!f.onGround) {
        const accel = AIR_ACCEL * 0.35 * DT;
        f.vx = clamp(f.vx + input.ix * accel, -maxRun, maxRun);
      }
    } else if (f.skillKind === 12) {
      // 喵喵狂爪：全速自由移动，但朝向锁定（爪击多段判定由 Sim 结算）
      if (f.onGround) {
        if (input.ix !== 0) {
          f.vx = moveToward(f.vx, input.ix * maxRun, GROUND_ACCEL * DT);
        } else {
          f.vx = moveToward(f.vx, 0, GROUND_FRICTION * DT);
        }
      } else {
        f.vx = moveToward(f.vx, input.ix * maxRun, AIR_ACCEL * DT);
        if (input.ix === 0) f.vx = moveToward(f.vx, 0, AIR_FRICTION * DT);
      }
    } else if (f.skillKind === 3) {
      if (f.skillPhase === 0) {
        // 投镖前摇：全速自由移动、可转向；可跳跃（跳走取消）
        if (input.jumpP) {
          if (f.onGround || f.coyote > 0) {
            f.vy = JUMP_V;
            f.jumps = 1;
          } else if (f.jumps > 0) {
            f.vy = DOUBLE_JUMP_V;
            f.jumps -= 1;
          }
          f.mode = 'jump';
          f.modeT = 0;
          f.onGround = false;
          f.onPlatform = false;
        } else {
          if (f.modeT === SKILL3_STARTUP) f.queuedSkill = 3;
          if (input.ix !== 0) f.face = input.ix > 0 ? 1 : -1;
          if (f.onGround) {
            if (input.ix !== 0) {
              f.vx = moveToward(f.vx, input.ix * maxRun, GROUND_ACCEL * DT);
            } else {
              f.vx = moveToward(f.vx, 0, GROUND_FRICTION * DT);
            }
          } else {
            f.vx = moveToward(f.vx, input.ix * maxRun, AIR_ACCEL * DT);
            if (input.ix === 0) f.vx = moveToward(f.vx, 0, AIR_FRICTION * DT);
          }
        }
      } else if (f.skillPhase === 1) {
        // 二段前摇（大动作、定身）：结束当帧瞬移到标记敌人身边
        if (f.modeT === SKILL3_TELE_STARTUP && f.dartMark >= 0) {
          const dir = (f.markX >= f.x ? 1 : -1) as 1 | -1;
          f.face = dir;
          f.x = f.markX - dir * (FIGHTER_W / 2 + 8);
          f.y = f.markY;
          f.vx = 0;
          f.vy = 0;
          f.skillPhase = 2;
          f.modeT = 0;
          f.queuedSkill = 3;
        } else if (!f.onGround) {
          const accel = AIR_ACCEL * 0.35 * DT;
          f.vx = clamp(f.vx + input.ix * accel, -maxRun, maxRun);
        }
      } else if (!f.onGround) {
        const accel = AIR_ACCEL * 0.35 * DT;
        f.vx = clamp(f.vx + input.ix * accel, -maxRun, maxRun);
      }
    } else if (f.skillKind === 16) {
      if (f.skillPhase === 3 && f.phTeleT > 0) {
        // 瞬移待斩：0.25 秒后发动（当帧排队，由 Sim 结算伤害）
        f.phTeleT -= 1;
        if (f.phTeleT === 0) f.queuedSkill = 16;
      }
      // 闪避姿态 / 慢动作 / 二段定位 / 空甩：定身，仅保留极少量空中微调
      if (!f.onGround) {
        const accel = AIR_ACCEL * 0.35 * DT;
        f.vx = clamp(f.vx + input.ix * accel, -maxRun, maxRun);
      }
    } else if (f.skillKind === 19) {
      if (f.skillPhase === 0) {
        // 蓄力：按住且未满 → 每帧 +1；松手或蓄满 3 秒 → 轰拳
        if (input.skH && f.manCharge < SKILL19_CHARGE_MAX) f.manCharge += 1;
        if (!input.skH || f.manCharge >= SKILL19_CHARGE_MAX) {
          f.skillPhase = 1;
          f.modeT = 0;
          f.queuedSkill = 19;
        }
        f.vx = 0;
      } else if (!f.onGround) {
        const accel = AIR_ACCEL * 0.35 * DT;
        f.vx = clamp(f.vx + input.ix * accel, -maxRun, maxRun);
      }
    } else {
      // 技能施法定身：仅保留极少量空中微调
      if (!f.onGround) {
        const accel = AIR_ACCEL * 0.35 * DT;
        f.vx = clamp(f.vx + input.ix * accel, -maxRun, maxRun);
      }
    }
  } else if (f.mode === 'attack' || f.mode === 'special') {
    // 招式进行中：可自由移动优化手感，但不转向、不可取消出其他动作
    f.modeT += 1;
    if (f.onGround) {
      if (input.ix !== 0) {
        f.vx = moveToward(f.vx, input.ix * maxRun, GROUND_ACCEL * DT);
      } else {
        f.vx = moveToward(f.vx, 0, GROUND_FRICTION * DT);
      }
    } else {
      f.vx = moveToward(f.vx, input.ix * maxRun, AIR_ACCEL * DT);
      if (input.ix === 0) f.vx = moveToward(f.vx, 0, AIR_FRICTION * DT);
    }
  } else {
    // --- 可操作状态 ---
    let lockedThisFrame = false;

    // 元素使：滚轮下滚切换元素系（风>雷>水>火>土>风），0.9 秒切换冷却
    if (f.char === 15 && input.whP && f.elemSwitchCd === 0) {
      f.elem = (f.elem + 1) % 5;
      f.elemSwitchCd = ELEM_SWITCH_CD;
    }

    if (input.ix !== 0) f.face = input.ix > 0 ? 1 : -1;

    if (input.jumpP) f.jumpBuffer = JUMP_BUFFER_FRAMES;
    else if (f.jumpBuffer > 0) f.jumpBuffer -= 1;

    // 下 + 跳跃：从单向平台穿下（优先级最高，避免误触发跳跃）
    if (input.down && input.jumpP && f.onGround && f.onPlatform) {
      f.dropT = DROP_THROUGH_FRAMES;
      f.onGround = false;
      f.onPlatform = false;
      f.jumpBuffer = 0;
      f.y += 3;
    } else if (input.skP && canUseSkill(f)) {
      startSkill(f, input);
      lockedThisFrame = true;
    } else if (input.qP && canUseArcana(f)) {
      startArcana(f, input.ix);
      lockedThisFrame = true;
    } else if (input.dshP && f.dashCd === 0) {
      startDash(f, input.ix);
      lockedThisFrame = true;
    } else if (input.atkP) {
      // 鬼人鬼燃强化中：攻击变为无敌突进斩
      if (f.char === 13 && f.oniBuffT > 0) {
        startOniDive(f);
      } else {
        startAttack(f);
      }
      lockedThisFrame = true;
    } else if (input.spcP && !f.recoveryUsed) {
      startSpecial(f, input.ix);
      lockedThisFrame = true;
    } else if (f.jumpBuffer > 0) {
      const canGroundJump = f.onGround || f.coyote > 0;
      if (canGroundJump) {
        f.vy = JUMP_V;
        f.onGround = false;
        f.onPlatform = false;
        f.coyote = 0;
        f.jumps = 1;
        f.jumpBuffer = 0;
        f.fastFalled = false;
        f.jumpCut = false;
        f.mode = 'jump';
      } else if (f.jumps > 0) {
        f.vy = DOUBLE_JUMP_V;
        f.jumps -= 1;
        f.jumpBuffer = 0;
        f.fastFalled = false;
        f.jumpCut = false;
        f.mode = 'jump';
      }
    }

    // 触发帧不再叠加常规移动与速降
    if (!lockedThisFrame) {
      // 水平移动
      if (f.onGround) {
        if (input.ix !== 0) {
          f.vx = moveToward(f.vx, input.ix * maxRun, GROUND_ACCEL * DT);
        } else {
          f.vx = moveToward(f.vx, 0, GROUND_FRICTION * DT);
        }
      } else {
        f.vx = moveToward(f.vx, input.ix * maxRun, AIR_ACCEL * DT);
        if (input.ix === 0) f.vx = moveToward(f.vx, 0, AIR_FRICTION * DT);
      }

      // 速降
      if (!f.onGround && input.down && f.vy > 0 && !f.fastFalled) {
        f.vy = Math.max(f.vy, FAST_FALL);
        f.fastFalled = true;
      }
    }

    // 可变跳高：提前松开键则截断上升速度
    if (!input.jumpH && f.vy < JUMP_CUT_VY && f.mode === 'jump' && !f.jumpCut) {
      f.vy = JUMP_CUT_VY;
      f.jumpCut = true;
    }
  }

  // 重力（突进与风翼飞翔中保持无重力）
  if (!f.onGround && f.mode !== 'dash' && f.wingT === 0) {
    f.vy = Math.min(f.vy + GRAVITY * DT, MAX_FALL);
  }

  // 位移与碰撞（X 方向无墙，可走出舞台边缘）
  const wasGround = f.onGround;
  f.x += f.vx * DT;

  const oldBottom = f.y + f.h / 2;
  f.y += f.vy * DT;
  const newBottom = f.y + f.h / 2;
  const newTop = f.y - f.h / 2;

  f.onGround = false;
  f.onPlatform = false;

  // 实心地板（可能多块）：上方落下着陆 / 下方跳起顶头
  for (const fl of map.floors) {
    const overlapX =
      f.x + f.w / 2 > fl.x && f.x - f.w / 2 < fl.x + fl.w;
    if (!overlapX) continue;
    if (f.vy >= 0 && oldBottom <= fl.y + 0.5 && newBottom >= fl.y) {
      f.y = fl.y - f.h / 2;
      f.vy = 0;
      f.onGround = true;
    } else if (f.vy < 0 && oldBottom - f.h >= fl.y - 0.5 && newTop < fl.y) {
      f.y = fl.y + f.h / 2;
      f.vy = 0;
    }
  }

  // 单向平台：下落、上一帧脚底在平台上方、且未处于穿台窗口时着陆
  if (!f.onGround && f.vy >= 0 && f.dropT === 0) {
    let landY = -1;
    for (const p of map.platforms) {
      const overlapX = f.x + f.w / 2 > p.x && f.x - f.w / 2 < p.x + p.w;
      if (!overlapX) continue;
      if (oldBottom <= p.y + 0.5 && newBottom >= p.y) {
        if (landY < 0 || p.y < landY) landY = p.y; // 取最高的平台
      }
    }
    if (landY >= 0) {
      f.y = landY - f.h / 2;
      f.vy = 0;
      f.onGround = true;
      f.onPlatform = true;
    }
  }

  // 落地 / 离地状态刷新
  if (f.onGround) {
    f.jumps = 1;
    f.coyote = COYOTE_FRAMES;
    f.fastFalled = false;
    f.recoveryUsed = false;
  } else if (wasGround) {
    f.coyote = COYOTE_FRAMES;
  } else if (f.coyote > 0) {
    f.coyote -= 1;
  }

  // 招式结束（剑客挥剑收招更慢）
  if (f.mode === 'attack' && f.modeT >= (f.char === 6 ? SWORD_ATK_TOTAL : ATK_TOTAL)) {
    f.mode = f.onGround ? 'idle' : 'fall';
    f.modeT = 0;
    f.hitDone = false;
  }
  if (f.mode === 'special' && f.modeT >= (f.char === 6 ? SWORD_SPC_TOTAL : SPC_TOTAL)) {
    f.mode = f.onGround ? 'idle' : 'fall';
    f.modeT = 0;
    f.hitDone = false;
  }
  if (f.mode === 'skill') {
    // 秘术 Q 按秘术自身定身帧；角色 Ctrl 技能按技能表（闪光瞬移追击更短）
    let lockFrames: number;
    if (f.arcMode) {
      lockFrames = ARCANA_LOCK_FRAMES[f.arcKind] ?? 0;
    } else if (f.skillKind === 3) {
      // 闪光：投镖 36 帧 / 二段前摇 14+12 帧 / 瞬移出手 12 帧
      if (f.skillPhase === 0) lockFrames = SKILL3_LOCK;
      else if (f.skillPhase === 1) lockFrames = SKILL3_TELE_STARTUP + SKILL3_TELE_LOCK;
      else lockFrames = SKILL3_TELE_LOCK;
    } else if (f.skillKind === 16) {
      // 幻棱：闪避姿态与慢动作由计时器退出；二段定位当帧由 resolveSkills 转阶段
      if (f.skillPhase === 0 || f.skillPhase === 1) lockFrames = Infinity;
      else if (f.skillPhase === 3) lockFrames = SKILL16_STRIKE_LOCK;
      else lockFrames = SKILL16_FIZZLE_LOCK;
    } else if (f.skillKind === 19) {
      // 狂徒：蓄力由松手/蓄满退出；轰拳后 22 帧收招
      lockFrames = f.skillPhase === 0 ? Infinity : SKILL19_LOCK;
    } else if (f.skillKind === 15) {
      lockFrames = ELEM_LOCK_FRAMES[f.elem] ?? 0; // 元素使按当前系
    } else if (f.skillKind === 10) {
      lockFrames = f.grabHit ? SKILL10_LOCK : SKILL10_WHIFF_LOCK; // 斗士：抓中 68 帧 / 抓空 26 帧
    } else {
      lockFrames = SKILL_LOCK_FRAMES[f.skillKind] ?? 0;
    }
    if (f.modeT >= lockFrames) {
      f.mode = f.onGround ? 'idle' : 'fall';
      f.modeT = 0;
      f.hitDone = false;
      if (f.arcMode) {
        f.arcMode = false;
        f.arcKind = -1;
        f.wingT = 0;
      } else if (f.skillKind === 3 || f.skillKind === 16 || f.skillKind === 19) {
        f.skillPhase = 0;
      } else if (f.skillKind === 10) {
        f.grabHit = false;
      }
    }
  }
  if (f.mode === 'dash' && f.oniDiveT === 0 && f.dashT <= 0) {
    f.mode = f.onGround ? 'idle' : 'fall';
    f.modeT = 0;
    f.vx *= DASH_END_MOMENTUM; // 保留少量突进余速
  }

  // 受击硬直结束
  if (f.mode === 'hurt' && f.hitstun === 0) {
    f.mode = f.onGround ? 'idle' : 'fall';
    f.modeT = 0;
  }

  // 常规动作状态刷新
  if (canAct(f) && f.respawn === 0) {
    if (f.onGround) f.mode = Math.abs(f.vx) > 12 ? 'run' : 'idle';
    else f.mode = f.vy < 0 ? 'jump' : 'fall';
  }
}

function moveToward(v: number, target: number, maxDelta: number): number {
  if (v < target) return Math.min(v + maxDelta, target);
  if (v > target) return Math.max(v - maxDelta, target);
  return v;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function applyHit(
  attacker: Fighter,
  target: Fighter,
  dmg: number,
  base: number,
  growth: number,
): number {
  // 源：强化就绪时，本次攻击伤害 +80% 并消耗
  let dmgApplied = dmg;
  if (attacker.char === 17 && attacker.srcCharged) {
    dmgApplied = dmg * (1 + SKILL17_BONUS);
    attacker.srcCharged = false;
  }
  target.dmg = Math.min(MAX_DMG, target.dmg + dmgApplied);
  let power = base + target.dmg * growth;
  // 蝶的护盾：伤害照常吃，击退力度（含硬直）减少 60%
  if (target.shieldT > 0) power *= SKILL5_KB_REDUCE;
  // 霸体秘术：击退 -45%，并把 5% 击退反震给攻击者
  const armored = target.armorT > 0;
  if (armored) power *= ARC5_KB_MUL;
  // 呓梦易伤：5 秒内受到的击退 +20%
  if (target.weakT > 0) power *= DREAM_KB_MUL;
  // 元素使土盾：1.5 秒内受到的击退 ×0.75
  if (target.earthT > 0) power *= ELEM_EARTH_KB_MUL;
  // 赤焰被动：造成的所有击飞力度 +4.44%
  if (attacker.char === 0) power *= BLAZE_KB_MUL;
  // 祭司被动：每损失 1% 击飞值，造成的击退 +0.5%
  if (attacker.char === 11) power *= 1 + attacker.dmg * PRIEST_KB_PER_PCT;
  const dir = target.x >= attacker.x ? 1 : -1;
  const angle = (52 * Math.PI) / 180;
  target.vx = dir * power * Math.cos(angle);
  target.vy = -power * Math.sin(angle);
  target.mode = 'hurt';
  target.modeT = 0;
  target.hitstun = Math.max(8, Math.ceil(power * HITSTUN_PER_POWER));
  target.onGround = false;
  target.onPlatform = false;
  target.jumps = 1; // 被击飞后保留一次空中跳跃用于回场
  target.fastFalled = false;
  // 受击打断风翼飞行 / 秘术施法姿势（霸体减伤不防打断，只减力度）
  if (target.arcMode || target.wingT > 0) {
    target.arcMode = false;
    target.arcKind = -1;
    target.wingT = 0;
  }
  attacker.face = dir as 1 | -1;
  if (armored && !attacker.dead) {
    // 反震：攻击者沿击退方向受到小幅冲量（不造成硬直）
    const rp = (power / ARC5_KB_MUL) * ARC5_REFLECT;
    const adir = attacker.x >= target.x ? 1 : -1;
    attacker.vx += adir * rp * Math.cos(angle);
    attacker.vy += -rp * Math.sin(angle);
  }

  // 源：成功命中计数，满 4 次为下次攻击充能
  if (attacker.char === 17) {
    attacker.srcHits += 1;
    if (attacker.srcHits >= SKILL17_HITS) {
      attacker.srcCharged = true;
      attacker.srcHits = 0;
    }
  }
  // 吸血鬼：命中后恢复自身当前击飞值（主动期间 3%+1%=4%）
  if (attacker.char === 18) {
    const frac =
      SKILL18_PASSIVE + (attacker.vampT > 0 ? SKILL18_BOOST_ADD : 0);
    attacker.dmg = attacker.dmg * (1 - frac);
  }
  return power;
}

/** 虚无之盾成功招架：吞下来袭，并把来袭击退力度的 90% 反震给攻击者（无伤害） */
function triggerVoidGuard(
  guarder: Fighter,
  atk: Fighter,
  base: number,
  growth: number,
  events: SimEvent[],
) {
  guarder.voidGuardT = 0;
  guarder.voidHit = true;
  // 提前收架
  if (guarder.mode === 'skill') {
    guarder.mode = guarder.onGround ? 'idle' : 'fall';
    guarder.modeT = 0;
  }
  if (isUntouchable(atk)) return;
  const incoming = base + guarder.dmg * growth; // 来袭击飞力度（按招架者击飞值计算）
  const power = incoming * VOID_REFLECT;
  const dir = atk.x >= guarder.x ? 1 : -1;
  const angle = (52 * Math.PI) / 180;
  atk.vx = dir * power * Math.cos(angle);
  atk.vy = -power * Math.sin(angle);
  atk.mode = 'hurt';
  atk.modeT = 0;
  atk.hitstun = Math.max(8, Math.ceil(power * HITSTUN_PER_POWER));
  atk.onGround = false;
  atk.onPlatform = false;
  atk.jumps = 1;
  atk.fastFalled = false;
  if (atk.arcMode || atk.wingT > 0) {
    atk.arcMode = false;
    atk.arcKind = -1;
    atk.wingT = 0;
  }
  events.push({ type: 'hit', by: guarder.id, target: atk.id, dmg: 0, power });
}

/** 幻棱是否处于闪避窗口（含窗口最后一帧：stepFighter 已把 phDodgeT 减到 0，同帧仍可触发成功） */
function isPhDodging(f: Fighter): boolean {
  return (
    f.mode === 'skill' &&
    !f.arcMode &&
    f.skillKind === 16 &&
    f.skillPhase === 0 &&
    f.phSlowT === 0
  );
}

/** 幻棱闪避成功：吞下来袭，进入 1 秒特写慢动作（无敌）并解锁二段 */
function triggerPhantomDodge(f: Fighter, events: SimEvent[]) {
  f.phDodgeT = 0;
  f.phSlowT = SKILL16_SLOW_FRAMES;
  f.phReady = true;
  events.push({ type: 'phantom', by: f.id });
}

/** 双方攻击判定结算（仅权威端调用） */
function resolveCombat(a: Fighter, b: Fighter, events: SimEvent[]) {
  const pairs: Array<[Fighter, Fighter]> = [
    [a, b],
    [b, a],
  ];
  for (const [atk, tgt] of pairs) {
    if (tgt.dead || atk.dead || tgt.respawn > 0 || atk.respawn > 0) continue;

    // 虚无之盾：招架期间无敌，攻击被吞且攻击者吃反震
    if (tgt.voidGuardT > 0) {
      if (!atk.hitDone) {
        const hbG = attackBox(atk);
        if (hbG && overlap(hbG, hurtBox(tgt))) {
          atk.hitDone = true;
          const gSpecial = atk.mode === 'special';
          triggerVoidGuard(
            tgt,
            atk,
            gSpecial ? SPC_BASE : ATK_BASE,
            gSpecial ? SPC_GROWTH : ATK_GROWTH,
            events,
          );
        }
      }
      continue;
    }

    // 幻棱闪避：窗口内攻击被吞，触发特写慢动作并解锁二段
    if (isPhDodging(tgt)) {
      if (!atk.hitDone) {
        const hbP = attackBox(atk);
        if (hbP && overlap(hbP, hurtBox(tgt))) {
          atk.hitDone = true;
          triggerPhantomDodge(tgt, events);
        }
      }
      continue;
    }

    if (atk.hitDone || isUntouchable(tgt) || tgt.grabbedBy >= 0) continue;
    const hb = attackBox(atk);
    if (!hb) continue;
    if (!overlap(hb, hurtBox(tgt))) continue;

    atk.hitDone = true;
    const isSpecial = atk.mode === 'special';
    const dmg = isSpecial ? SPC_DMG : ATK_DMG;
    const power = applyHit(
      atk,
      tgt,
      dmg,
      isSpecial ? SPC_BASE : ATK_BASE,
      isSpecial ? SPC_GROWTH : ATK_GROWTH,
    );
    events.push({ type: 'hit', by: atk.id, target: tgt.id, dmg, power });
  }
}

function checkBlast(f: Fighter): boolean {
  return (
    f.x < BLAST.left || f.x > BLAST.right || f.y < BLAST.top || f.y > BLAST.bottom
  );
}

function centerDist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class Sim {
  fighters: [Fighter, Fighter];
  projectiles: Projectile[] = [];
  private chars: [number, number];
  private arcanas: [number, number];
  /** 当前对战地图（reset 时可更换） */
  map: MapDef;
  private projSeq = 0;
  tick = 0;
  over = false;
  winner: 0 | 1 | null = null;
  events: SimEvent[] = [];

  constructor(
    chars: [number, number] = [0, 1],
    map: MapDef = MAPS[0],
    arcanas: [number, number] = [0, 0],
  ) {
    this.chars = chars;
    this.arcanas = arcanas;
    this.map = map;
    this.fighters = [
      createFighter(0, chars[0], map, arcanas[0]),
      createFighter(1, chars[1], map, arcanas[1]),
    ];
  }

  reset(map?: MapDef) {
    if (map) this.map = map;
    this.fighters = [
      createFighter(0, this.chars[0], this.map, this.arcanas[0]),
      createFighter(1, this.chars[1], this.map, this.arcanas[1]),
    ];
    this.projectiles = [];
    this.projSeq = 0;
    this.tick = 0;
    this.over = false;
    this.winner = null;
    this.events = [];
  }

  step(inputs: [InputState, InputState]) {
    this.events = [];
    if (this.over) return;

    stepFighter(this.fighters[0], inputs[0], this.map);
    stepFighter(this.fighters[1], inputs[1], this.map);
    this.resolveSkills(this.fighters[0], this.fighters[1]);
    this.resolveSkills(this.fighters[1], this.fighters[0]);
    this.maintainGrapples();
    this.resolveArcana(this.fighters[0], this.fighters[1]);
    this.resolveArcana(this.fighters[1], this.fighters[0]);
    this.stepProjectiles();
    this.updateMarks();
    resolveCombat(this.fighters[0], this.fighters[1], this.events);
    this.resolveClaws(this.fighters[0], this.fighters[1]);
    this.resolveClaws(this.fighters[1], this.fighters[0]);
    this.resolveOniDive(this.fighters[0], this.fighters[1]);
    this.resolveOniDive(this.fighters[1], this.fighters[0]);

    // 幻棱：闪避窗口自然结束且未挡下攻击 → 13.5 秒 CD，无事发生
    // （skillCd===0 排除二段斩击后的 phase0 收招姿态；phSlowT===0 排除成功路径）
    for (const f of this.fighters) {
      if (
        f.mode === 'skill' &&
        f.skillKind === 16 &&
        f.skillPhase === 0 &&
        f.phDodgeT === 0 &&
        f.phSlowT === 0 &&
        f.skillCd === 0
      ) {
        f.skillCd = SKILL16_FAIL_CD;
        f.mode = f.onGround ? 'idle' : 'fall';
        f.modeT = 0;
      }
    }

    for (const f of this.fighters) {
      if (f.dead || f.respawn > 0) continue;
      const other = this.fighters[f.id === 0 ? 1 : 0];
      if (checkBlast(f)) {
        // 斗士擒抱清理：离场者若是擒抱任意一方，先解除双方束缚，避免悬挂定身
        if (f.grappleId === other.id) {
          f.grappleId = -1;
          f.grappleT = 0;
          other.grabbedBy = -1;
        } else if (f.grabbedBy === other.id) {
          f.grabbedBy = -1;
          other.grappleId = -1;
          other.grappleT = 0;
        }
        f.stocks -= 1;
        this.events.push({ type: 'ko', id: f.id });
        if (f.stocks <= 0) {
          f.dead = true;
          f.stocks = 0;
          this.over = true;
          this.winner = (f.id === 0 ? 1 : 0) as 0 | 1;
          this.events.push({ type: 'end', winner: this.winner });
        } else {
          // 移出屏幕外等待复活
          f.respawn = RESPAWN_FRAMES;
          f.x = BLAST.left - 1000;
          f.y = BLAST.bottom + 1000;
          f.vx = 0;
          f.vy = 0;
        }
      }
    }

    this.tick += 1;
  }

  /** 结算角色技能的“对外效果”（位移已在 stepFighter 内本地完成） */
  private resolveSkills(caster: Fighter, target: Fighter) {
    const kind = caster.queuedSkill;
    if (kind < 0) return;
    caster.queuedSkill = -1;
    if (caster.dead || caster.respawn > 0) return;
    if (caster.grabbedBy >= 0) return; // 被擒抱中不能结算技能

    if (kind === 10) {
      // 斗士：抓取身前敌人（虚无招架中不可被抓），抓中则定身持有 1 秒
      if (
        !isUntouchable(target) &&
        target.grabbedBy < 0 &&
        target.voidGuardT === 0 &&
        overlap(frontBox(caster, SKILL10_GRAB_HITBOX), hurtBox(target))
      ) {
        caster.grabHit = true;
        caster.grappleT = SKILL10_HOLD_FRAMES;
        caster.grappleId = target.id;
        target.grabbedBy = caster.id;
        target.vx = 0;
        target.vy = 0;
        target.hitstun = 0;
      }
      return;
    }

    if (kind === 14) {
      // 呓梦：粉紫色梦火弹（命中易伤，无伤害）
      this.projectiles.push({
        n: this.projSeq++,
        x: caster.x + caster.face * (caster.w / 2 + DREAM_R),
        y: caster.y - 2,
        vx: caster.face * DREAM_SPEED,
        vy: 0,
        life: DREAM_LIFE,
        owner: caster.id,
        r: DREAM_R,
        k: 3,
        tx: 0,
        ty: 0,
      });
      return;
    }

    if (kind === 15) {
      const e = caster.elem;
      if (e === 1) {
        // 唤雷：眩晕近身敌人 0.5 秒（不增击飞值、不击飞）
        if (
          !isUntouchable(target) &&
          target.grabbedBy < 0 &&
          centerDist(caster, target) <= ELEM_THUNDER_R
        ) {
          target.stunT = ELEM_STUN_FRAMES;
          target.vx = 0;
          this.events.push({ type: 'hit', by: caster.id, target: target.id, dmg: 0, power: 0 });
        }
      } else if (e === 2) {
        // 降水：在鼠标世界坐标生成 0.4 秒后爆炸的静止水弹
        this.projectiles.push({
          n: this.projSeq++,
          x: caster.aimX,
          y: caster.aimY,
          vx: 0,
          vy: 0,
          life: ELEM_WATER_DELAY,
          owner: caster.id,
          r: ELEM_WATER_R,
          k: 5,
          tx: caster.aimX,
          ty: caster.aimY,
        });
      } else if (e === 3) {
        // 燎火：火弹直线飞行（命中 75% 击飞值击退，不增伤）
        this.projectiles.push({
          n: this.projSeq++,
          x: caster.x + caster.face * (caster.w / 2 + ELEM_FIRE_R),
          y: caster.y - 2,
          vx: caster.face * ELEM_FIRE_SPEED,
          vy: 0,
          life: ELEM_FIRE_LIFE,
          owner: caster.id,
          r: ELEM_FIRE_R,
          k: 4,
          tx: 0,
          ty: 0,
        });
      }
      // 逐风（位移）与御土（earthT）已在 startSkill 本地完成
      return;
    }

    if (kind === 3) {
      if (caster.skillPhase === 0) {
        // 一段前摇结束：投出飞镖（命中只标记，不造成伤害）
        caster.dartActive = true;
        this.projectiles.push({
          n: this.projSeq++,
          x: caster.x + caster.face * (caster.w / 2 + DART_RADIUS),
          y: caster.y - 4,
          vx: caster.face * DART_SPEED,
          vy: 0,
          life: DART_LIFE,
          owner: caster.id,
          r: DART_RADIUS,
          k: 1,
          tx: 0,
          ty: 0,
        });
        return;
      }
      // 二段：瞬移已在 stepFighter 前摇结束当帧完成（phase 2），本帧出手打击
      // 无论是否还能命中，标记都消耗并进入冷却
      const tid = caster.dartMark;
      caster.dartMark = -1;
      caster.markT = 0;
      caster.skillPhase = 0;
      caster.skillCd = SKILL3_CD_FRAMES;
      if (tid !== 0 && tid !== 1) return;
      const tgt = this.fighters[tid];
      if (isUntouchable(tgt)) return;
      const dmg = SKILL3_DMG;
      const power = applyHit(
        caster,
        tgt,
        dmg,
        SKILL3_BASE,
        SKILL3_GROWTH,
      );
      this.events.push({
        type: 'hit',
        by: caster.id,
        target: tgt.id,
        dmg,
        power,
      });
      return;
    }

    if (kind === 5) {
      // 蝶成盾瞬间：纯震退近身敌人（无伤害）
      if (!isUntouchable(target) &&
        centerDist(caster, target) <= SKILL5_PULSE_R) {
        const power = applyHit(
          caster,
          target,
          0,
          SKILL5_PULSE_BASE,
          SKILL5_PULSE_GROWTH,
        );
        this.events.push({
          type: 'hit',
          by: caster.id,
          target: target.id,
          dmg: 0,
          power,
        });
      }
      return;
    }

    if (kind === 16) {
      if (caster.skillPhase === 1) {
        // 二段启动：找 0.8 个突进（120px）内最近的敌人 → 瞬移到其身后；无目标则空甩
        let found: Fighter | null = null;
        let best = SKILL16_TELE_R * SKILL16_TELE_R;
        for (const o of this.fighters) {
          if (o.id === caster.id || o.dead || o.respawn > 0) continue;
          const d2 =
            (o.x - caster.x) * (o.x - caster.x) +
            (o.y - caster.y) * (o.y - caster.y);
          if (d2 <= best) {
            best = d2;
            found = o;
          }
        }
        if (found) {
          caster.phTgt = found.id;
          caster.face = -found.face as 1 | -1;
          caster.x = found.x - found.face * (caster.w / 2 + 8);
          caster.y = found.y;
          caster.vx = 0;
          caster.vy = 0;
          caster.skillPhase = 3;
          caster.phTeleT = SKILL16_DELAY_FRAMES;
        } else {
          caster.phTgt = -1;
          caster.skillPhase = 2;
          caster.modeT = 0;
        }
        return;
      }
      // 瞬移 0.25 秒后出手：造成敌人当前击飞值 85% 的伤害
      const tid = caster.phTgt;
      caster.phTgt = -1;
      caster.skillPhase = 0;
      caster.skillCd = SKILL16_DONE_CD;
      if (tid !== 0 && tid !== 1) return;
      const tgt = this.fighters[tid];
      if (tgt.dead || tgt.respawn > 0 || isUntouchable(tgt) || tgt.grabbedBy >= 0) return;
      const dmg = Math.round(tgt.dmg * SKILL16_DMG * 10) / 10;
      const power = applyHit(caster, tgt, dmg, 0, SKILL16_DMG);
      this.events.push({
        type: 'hit',
        by: caster.id,
        target: tgt.id,
        dmg,
        power,
      });
      return;
    }

    if (kind === 19) {
      // 蓄意轰拳：力度与范围按蓄力比例（80%→250% 击飞值；75→376px）
      const t = caster.manCharge / SKILL19_CHARGE_MAX;
      const frac = SKILL19_KB_MIN + (SKILL19_KB_MAX - SKILL19_KB_MIN) * t;
      const range = SKILL19_RANGE_MIN + (SKILL19_RANGE_MAX - SKILL19_RANGE_MIN) * t;
      caster.skillCd = SKILL19_CD_FRAMES;
      caster.manBurstT = SKILL19_BURST_FRAMES;
      caster.skillPhase = 0;
      caster.manCharge = 0;
      if (
        !isUntouchable(target) &&
        target.grabbedBy < 0 &&
        overlap(
          frontBox(caster, { w: range, h: SKILL19_HIT_H, fwd: 0, y: 0 }),
          hurtBox(target),
        )
      ) {
        const power = this.pureKnockback(caster, target, frac, caster.x);
        this.events.push({
          type: 'hit',
          by: caster.id,
          target: target.id,
          dmg: 0,
          power,
        });
      }
      return;
    }

    if (isUntouchable(target) || target.grabbedBy >= 0) return;

    if (kind === 7) {
      // 噩梦：诅咒对手，视野收窄 3 秒（无伤害无硬直，不打断对手）
      target.blindT = NIGHTMARE_BLIND_FRAMES;
      this.events.push({
        type: 'blind',
        by: caster.id,
        target: target.id,
      });
      return;
    }

    if (kind === 0) {
      // 赤焰：身边震波，强击退
      if (centerDist(caster, target) <= SKILL0_RADIUS) {
        const dmg = SKILL0_DMG;
        const power = applyHit(
          caster,
          target,
          dmg,
          SKILL0_BASE,
          SKILL0_GROWTH,
        );
        this.events.push({
          type: 'hit',
          by: caster.id,
          target: target.id,
          dmg,
          power,
        });
      }
    } else if (kind === 1) {
      // 青叶：瞬移落点贴身，一丢丢伤害与小击退
      if (centerDist(caster, target) <= SKILL1_HIT_R) {
        const dmg = SKILL1_DMG;
        const power = applyHit(
          caster,
          target,
          dmg,
          SKILL1_BASE,
          SKILL1_GROWTH,
        );
        this.events.push({
          type: 'hit',
          by: caster.id,
          target: target.id,
          dmg,
          power,
        });
      }
    } else if (kind === 2) {
      // 蓝铃：生成火球
      this.projectiles.push({
        n: this.projSeq++,
        x: caster.x + caster.face * (caster.w / 2 + FIREBALL_R),
        y: caster.y - 2,
        vx: caster.face * FIREBALL_SPEED,
        vy: 0,
        life: FIREBALL_LIFE,
        owner: caster.id,
        r: FIREBALL_R,
        k: 0,
        tx: 0,
        ty: 0,
      });
    }
  }

  /** 结算秘术的“对外效果”（位移/治疗已在 stepFighter 内本地完成，仅权威端调用） */
  private resolveArcana(caster: Fighter, target: Fighter) {
    const kind = caster.queuedArcana;
    if (kind < 0) return;
    caster.queuedArcana = -1;
    if (caster.dead || caster.respawn > 0) return;
    if (caster.grabbedBy >= 0) return;

    if (kind === 2) {
      // 烈炎弹：直线飞行，命中按敌人当前击飞值造成击退（不增击飞值）
      this.projectiles.push({
        n: this.projSeq++,
        x: caster.x + caster.face * (caster.w / 2 + ARC2_FLAME_R),
        y: caster.y - 2,
        vx: caster.face * ARC2_FLAME_SPEED,
        vy: 0,
        life: ARC2_FLAME_LIFE,
        owner: caster.id,
        r: ARC2_FLAME_R,
        k: 2,
        tx: 0,
        ty: 0,
      });
      return;
    }

    if (kind === 4) {
      // 重击：0.5 秒无敌前摇后判定前方大盒，造成敌人当前击飞值 100% 的伤害
      if (isUntouchable(target) || target.grabbedBy >= 0) return;
      const hbDef = ARC4_HITBOX;
      const box: Box = {
        x: caster.x + caster.face * (caster.w / 2 + hbDef.w / 2 - hbDef.fwd),
        y: caster.y + hbDef.y,
        w: hbDef.w,
        h: hbDef.h,
      };
      if (!overlap(box, hurtBox(target))) return;
      // 虚无招架可挡下重击：反震实际重击力度（growth 折算为 0.8*ATK_GROWTH）
      if (target.voidGuardT > 0) {
        triggerVoidGuard(
          target,
          caster,
          0,
          ATK_GROWTH * ARC4_DMG,
          this.events,
        );
        return;
      }
      const dmgAdd = target.dmg * ARC4_DMG;
      const power = applyHit(caster, target, dmgAdd, 0, ATK_GROWTH);
      this.events.push({
        type: 'hit',
        by: caster.id,
        target: target.id,
        dmg: dmgAdd,
        power,
      });
    }
  }

  /**
   * 纯击退命中（不增加击飞值）：烈炎弹 / 元素火弹 / 水爆共用。
   * frac 为敌人当前击飞值转化为击退力度的比例，返回实际力度（0 = 未生效）。
   */
  private pureKnockback(
    owner: Fighter,
    target: Fighter,
    frac: number,
    fromX: number,
  ): number {
    if (isUntouchable(target) || target.grabbedBy >= 0) return 0;
    let power = target.dmg * frac;
    if (target.shieldT > 0) power *= SKILL5_KB_REDUCE;
    const armored = target.armorT > 0;
    if (armored) power *= ARC5_KB_MUL;
    if (target.weakT > 0) power *= DREAM_KB_MUL; // 易伤：所有来源的击退都增幅
    if (target.earthT > 0) power *= ELEM_EARTH_KB_MUL;
    if (owner.char === 0) power *= BLAZE_KB_MUL;
    if (power <= 0) return 0;
    const dir = target.x >= fromX ? 1 : -1;
    const angle = (52 * Math.PI) / 180;
    target.vx = dir * power * Math.cos(angle);
    target.vy = -power * Math.sin(angle);
    target.mode = 'hurt';
    target.modeT = 0;
    target.hitstun = Math.max(8, Math.ceil(power * HITSTUN_PER_POWER));
    target.onGround = false;
    target.onPlatform = false;
    target.jumps = 1;
    target.fastFalled = false;
    if (target.arcMode || target.wingT > 0) {
      target.arcMode = false;
      target.arcKind = -1;
      target.wingT = 0;
    }
    owner.face = dir as 1 | -1;
    if (armored && !owner.dead) {
      const rp = (power / ARC5_KB_MUL) * ARC5_REFLECT;
      const adir = owner.x >= target.x ? 1 : -1;
      owner.vx += adir * rp * Math.cos(angle);
      owner.vy += -rp * Math.sin(angle);
    }
    return power;
  }

  private stepProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.k !== 5) p.x += p.vx * DT; // k5 水弹静止待爆
      p.life -= 1;

      const target = this.fighters[p.owner === 0 ? 1 : 0];
      const owner = this.fighters[p.owner];
      let consumed = false;

      // k5 水弹：定点 0.4 秒后范围爆炸（75% 击飞值纯击退，不增伤）
      if (p.k === 5) {
        if (p.life <= 0) {
          const inBlast =
            !target.dead &&
            target.respawn === 0 &&
            target.grabbedBy < 0 &&
            Math.abs(p.tx - target.x) < p.r + target.w / 2 &&
            Math.abs(p.ty - target.y) < p.r + target.h / 2;
          if (inBlast && target.voidGuardT > 0) {
            triggerVoidGuard(target, owner, 0, ELEM_WATER_KB, this.events);
          } else if (inBlast && isPhDodging(target)) {
            // 幻棱闪避水爆：吞爆触发成功
            triggerPhantomDodge(target, this.events);
          } else if (inBlast) {
            const power = this.pureKnockback(owner, target, ELEM_WATER_KB, p.tx);
            this.events.push({ type: 'hit', by: p.owner, target: target.id, dmg: 0, power });
          }
          this.events.push({ type: 'waterburst', x: p.tx, y: p.ty, r: p.r });
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      const hitTarget =
        !target.dead &&
        target.respawn === 0 &&
        Math.abs(p.x - target.x) < p.r + target.w / 2 &&
        Math.abs(p.y - target.y) < p.r + target.h / 2;
      if (hitTarget && target.voidGuardT > 0) {
        // 虚无之盾招架飞行物：火球/烈炎弹/元素火弹被弹反（反震），飞镖/梦火弹直接消解
        consumed = true;
        if (p.k === 0) {
          triggerVoidGuard(
            target,
            owner,
            FIREBALL_BASE,
            FIREBALL_GROWTH,
            this.events,
          );
        } else if (p.k === 2) {
          triggerVoidGuard(target, owner, 0, ARC2_FLAME_KB, this.events);
        } else if (p.k === 4) {
          triggerVoidGuard(target, owner, 0, ELEM_FIRE_KB, this.events);
        }
      } else if (hitTarget && isPhDodging(target)) {
        // 幻棱闪避：吞下来袭飞行物，触发成功（特写慢动作 + 解锁二段）
        triggerPhantomDodge(target, this.events);
        consumed = true;
      } else if (hitTarget && !isUntouchable(target) && target.grabbedBy < 0) {
        if (p.k === 1) {
          // 飞镖：只标记敌人，不造成伤害；二段瞬移由技能触发
          owner.dartMark = target.id;
          owner.markT = SKILL3_MARK_FRAMES;
          owner.markX = target.x;
          owner.markY = target.y;
          owner.dartActive = false;
        } else if (p.k === 2) {
          // 烈炎弹：不增加击飞值，击退力度 = 敌人当前击飞值 * 75%（0% 时无效果）
          const power = this.pureKnockback(owner, target, ARC2_FLAME_KB, owner.x);
          if (power > 0) {
            this.events.push({ type: 'hit', by: p.owner, target: target.id, dmg: 0, power });
          }
        } else if (p.k === 3) {
          // 梦火弹：5 秒内敌人受到的击退 +20%（无伤害无硬直）
          target.weakT = DREAM_WEAK_FRAMES;
          this.events.push({ type: 'hit', by: p.owner, target: target.id, dmg: 0, power: 0 });
        } else if (p.k === 4) {
          // 元素火弹：75% 击飞值纯击退
          const power = this.pureKnockback(owner, target, ELEM_FIRE_KB, owner.x);
          if (power > 0) {
            this.events.push({ type: 'hit', by: p.owner, target: target.id, dmg: 0, power });
          }
        } else {
          const dmg = FIREBALL_DMG;
          const power = applyHit(
            owner,
            target,
            dmg,
            FIREBALL_BASE,
            FIREBALL_GROWTH,
          );
          this.events.push({
            type: 'hit',
            by: p.owner,
            target: target.id,
            dmg,
            power,
          });
        }
        consumed = true;
      }

      if (
        consumed ||
        p.life <= 0 ||
        p.x < BLAST.left - 120 ||
        p.x > BLAST.right + 120 ||
        p.y > BLAST.bottom + 120
      ) {
        // 飞镖空甩（未命中就消失）：直接进入冷却
        if (p.k === 1) {
          owner.dartActive = false;
          if (!consumed) owner.skillCd = SKILL3_CD_FRAMES;
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  /** 斗士擒抱：每帧把敌人拖到身前，1 秒计时结束当帧向前丢出（固定距离） */
  private maintainGrapples() {
    for (const c of this.fighters) {
      const gid = c.grappleId;
      if (gid !== 0 && gid !== 1) continue;
      const t = this.fighters[gid];
      if (c.grappleT > 0) {
        // 持有：敌人定在施法者身前，无重力
        t.grabbedBy = c.id;
        t.x = c.x + c.face * 30;
        t.y = c.y;
        t.vx = 0;
        t.vy = 0;
        continue;
      }
      // 投出：固定力度（约一个突进距离），不增击飞值
      c.grappleId = -1;
      c.grabHit = true;
      t.grabbedBy = -1;
      t.vx = c.face * SKILL10_THROW_VX;
      t.vy = SKILL10_THROW_VY;
      t.mode = 'hurt';
      t.modeT = 0;
      t.hitstun = SKILL10_THROW_HITSTUN;
      t.onGround = false;
      t.onPlatform = false;
      t.jumps = 1;
      t.fastFalled = false;
      this.events.push({ type: 'hit', by: c.id, target: t.id, dmg: 0, power: SKILL10_THROW_POWER });
    }
  }

  /** 喵喵狂爪：挥爪期间按节奏在身前做多段判定（每段只伤一次，空挥不补判） */
  private resolveClaws(caster: Fighter, target: Fighter) {
    if (
      caster.mode !== 'skill' ||
      caster.arcMode ||
      caster.skillKind !== 12 ||
      caster.modeT > SKILL12_FURY_FRAMES
    ) {
      return;
    }
    while (caster.modeT >= caster.clawNext && caster.clawNext <= SKILL12_FURY_FRAMES) {
      if (
        !isUntouchable(target) &&
        target.grabbedBy < 0 &&
        target.voidGuardT === 0 &&
        overlap(frontBox(caster, SKILL12_HITBOX), hurtBox(target))
      ) {
        const dmg = SKILL12_CLAW_DMG;
        const power = applyHit(caster, target, dmg, SKILL12_CLAW_BASE, SKILL12_CLAW_GROWTH);
        this.events.push({ type: 'hit', by: caster.id, target: target.id, dmg, power });
      }
      caster.clawNext += SKILL12_CLAW_EVERY;
    }
  }

  /** 鬼人突进斩：突进期间宽盒沿途伤害（只伤一次），自身无敌已在 isUntouchable 生效 */
  private resolveOniDive(caster: Fighter, target: Fighter) {
    if (caster.oniDiveT <= 0 || caster.oniHitDone) return;
    if (
      !isUntouchable(target) &&
      target.grabbedBy < 0 &&
      target.voidGuardT === 0 &&
      overlap(frontBox(caster, ONI_DIVE_HITBOX), hurtBox(target))
    ) {
      caster.oniHitDone = true;
      const dmg = ONI_DIVE_DMG;
      const power = applyHit(caster, target, dmg, ONI_DIVE_BASE, ONI_DIVE_GROWTH);
      this.events.push({ type: 'hit', by: caster.id, target: target.id, dmg, power });
    }
  }

  /** 刷新闪光飞镖标记的实时位置（瞬移落点），目标死亡/复活则清除标记 */
  private updateMarks() {
    for (const c of this.fighters) {
      const m = c.dartMark;
      if (m !== 0 && m !== 1) continue;
      const t = this.fighters[m];
      if (t.dead || t.respawn > 0) {
        c.dartMark = -1;
        c.markT = 0;
      } else {
        c.markX = t.x;
        c.markY = t.y;
      }
    }
  }
}

/**
 * 人机 AI：纯函数，根据双方状态生成一帧输入（权威端以 60fps 驱动）。
 * 策略：回场优先；地面逼近、距离合适就突进/攻击；远程角色与秘术在各自距离窗口使用。
 */
export function botThink(
  self: Fighter,
  foe: Fighter,
  map: MapDef,
  tick: number,
): InputState {
  const inp: InputState = { ...NEUTRAL_INPUT };
  if (self.dead || self.respawn > 0) return inp;
  // 被擒抱 / 被眩晕：完全不能操作
  if (self.grabbedBy >= 0 || self.stunT > 0) return inp;

  const dx = foe.x - self.x;
  const dy = foe.y - self.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const dir = dx >= 0 ? 1 : -1;

  // 主地板范围（用于判断是否冲出舞台）
  let left = Infinity;
  let right = -Infinity;
  for (const fl of map.floors) {
    left = Math.min(left, fl.x);
    right = Math.max(right, fl.x + fl.w);
  }

  // --- 1. 回场优先：冲出边缘 / 落在舞台下方 ---
  const offSide = self.x < left + 70 || self.x > right - 70;
  const belowStage = !self.onGround && self.y > 560;
  if (offSide || belowStage || (!self.onGround && (self.x < 40 || self.x > 1240))) {
    inp.ix = self.x < (left + right) / 2 ? 1 : -1;
    if (!self.onGround) {
      if (self.jumps > 0 && self.vy > -120 && tick % 5 === 0) inp.jumpP = true;
      if (!self.recoveryUsed && self.vy > 0 && tick % 7 === 0) inp.spcP = true;
      // 风翼秘术救急
      if (self.arcana === 3 && self.arcCd === 0 && self.y > 460) inp.qP = true;
      // 元素使：切到逐风回场
      if (self.char === 15) {
        if (self.elem !== 0 && self.elemSwitchCd === 0) inp.whP = true;
        else if (self.elem === 0 && self.elemCd[0] === 0) inp.skP = true;
      }
    }
    inp.jumpH = inp.jumpP;
    return inp;
  }

  if (!canAct(self)) {
    inp.jumpH = false;
    return inp;
  }

  // --- 2. 逼近 / 接战 ---
  if (adx > 60) inp.ix = dir;
  if (self.onGround) {
    // 敌人在高处：跳上去
    if (dy < -80 && tick % 55 === 3) inp.jumpP = true;
    // 中远距离：周期性突进逼近
    else if (adx > 280 && self.dashCd === 0 && tick % 80 === 9) {
      inp.dshP = true;
    }
  } else {
    // 空中贴近：需要时二段跳/回场
    if (dy < -120 && self.jumps > 0 && tick % 30 === 5) inp.jumpP = true;
  }

  // --- 3. 近身输出 ---
  if (ady < 56) {
    if (adx < 80 && tick % 24 === 7) inp.atkP = true;
    // 重击秘术：贴身、冷却好、不在前摇
    if (self.arcana === 4 && self.arcCd === 0 && adx < 96 && tick % 70 === 13) {
      inp.qP = true;
    }
    // 霸体秘术：敌人逼近时开启
    if (self.arcana === 5 && self.arcCd === 0 && adx < 150 && tick % 130 === 17) {
      inp.qP = true;
    }
    // 近距角色技能（赤焰震波/青叶瞬移/噩梦诅咒/虚无招架/霓虹加速/吸血鬼血渴等；
    // 元素使在 4b 单独处理；幻棱、狂徒各自有专门逻辑）
    if (
      self.char !== 15 &&
      self.char !== 16 &&
      self.char !== 19 &&
      adx < 150 &&
      canUseSkill(self) &&
      tick % 95 === 23
    ) {
      inp.skP = true;
    }
    // 幻棱：看到敌人出招/突进立刻闪避；二段就绪且敌人在 0.8 个突进内则瞬移背刺
    if (self.char === 16 && adx < 130 && ady < 60) {
      if (self.phReady) {
        if (canUseSkill(self) && adx < SKILL16_TELE_R) inp.skP = true;
      } else if (
        canUseSkill(self) &&
        (foe.mode === 'attack' || foe.mode === 'special' || foe.mode === 'dash')
      ) {
        inp.skP = true;
      }
    }
    // 狂徒：贴近就蓄力轰拳（按住 skH；蓄力时长由下一块控制）
    if (self.char === 19 && adx < 130 && ady < 80 && canUseSkill(self)) {
      if (self.mode !== 'skill' && tick % 130 === 29) {
        inp.skP = true;
        inp.skH = true;
      }
    }
    if (
      self.char === 19 &&
      self.mode === 'skill' &&
      self.skillKind === 19 &&
      self.skillPhase === 0
    ) {
      const targetCharge = 90 + ((tick * 7) % 90);
      if (self.manCharge < targetCharge) inp.skH = true;
      // 到目标帧 skH 留 false → 本帧轰出
    }
    // 虚无：看到敌人出招立刻招架
    if (
      self.char === 9 &&
      self.skillCd === 0 &&
      adx < 110 &&
      (foe.mode === 'attack' || foe.mode === 'special')
    ) {
      inp.skP = true;
    }
  }

  // --- 4. 中距离远程手段（高度差不大时） ---
  if (ady < 44 && adx > 200 && adx < 600) {
    // 蓝铃火球
    if (self.char === 2 && self.skillCd === 0 && tick % 140 === 31) {
      inp.skP = true;
    }
    // 呓梦梦火弹
    if (self.char === 14 && self.skillCd === 0 && tick % 150 === 37) {
      inp.skP = true;
    }
    // 烈炎弹秘术
    if (self.arcana === 2 && self.arcCd === 0 && tick % 160 === 41) {
      inp.qP = true;
    }
  }

  // --- 4b. 元素使：按距离切系并释放（滚轮下滚循环，0.9 秒一切） ---
  if (self.char === 15) {
    // 近身雷 / 稍远土盾 / 中距火弹 / 远距降水（瞄准敌人坐标）
    let want = -1;
    if (adx < 120 && ady < 80 && tick % 110 === 5) want = 1;
    else if (adx < 220 && ady < 60 && tick % 200 === 9) want = 4;
    else if (adx >= 200 && adx < 480 && ady < 44 && tick % 130 === 13) want = 3;
    else if (adx >= 300 && adx < 620 && ady < 120 && tick % 170 === 21) want = 2;
    if (want >= 0) {
      if (self.elem !== want) {
        if (self.elemSwitchCd === 0) inp.whP = true;
      } else if (self.elemCd[want] === 0) {
        inp.skP = true;
        inp.mx = foe.x;
        inp.my = foe.y;
      }
    }
  }

  // --- 5. 秘术自利：回春在击飞值较高且安全时使用 ---
  if (
    self.arcana === 0 &&
    self.arcCd === 0 &&
    self.dmg > 55 &&
    (adx > 140 || self.onGround) &&
    tick % 90 === 1
  ) {
    inp.qP = true;
  }

  inp.jumpH = inp.jumpP;
  return inp;
}

export { NEUTRAL_INPUT };
