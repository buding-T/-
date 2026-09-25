// 全局常量：渲染尺寸 / 舞台 / 物理参数 / 战斗数值
export const VIEW_W = 1280;
export const VIEW_H = 720;

// 固定物理帧（格斗游戏使用确定性固定步长）
export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;
export const DT_MS = 1000 / TICK_HZ;

// 单向平台 / 实心地板共用的矩形定义
export interface PlatformDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

// 多张对战地图：开局由房主随机选定并同步给客机
export interface MapDef {
  name: string;
  /** 背景渐变主色（营造不同氛围） */
  bg: number;
  /** 视觉主题（地板/远景风格）：classic/void/sky/pillar/lava/ice */
  theme?: string;
  /** 实心地板（可从下方撞到头顶） */
  floors: PlatformDef[];
  /** 单向平台（可从下方穿过，按住下+跳可下落） */
  platforms: PlatformDef[];
  /** 双方出生点 x 坐标（y 自动取脚下地板表面） */
  spawns: [number, number];
}

export const MAPS: MapDef[] = [
  {
    name: '经典竞技场',
    theme: 'classic',
    bg: 0x171b36,
    floors: [{ x: 180, y: 620, w: 920, h: 200 }],
    platforms: [
      { x: 290, y: 470, w: 270, h: 14 },
      { x: 720, y: 470, w: 270, h: 14 },
      { x: 505, y: 330, w: 270, h: 14 },
    ],
    spawns: [560, 720],
  },
  {
    name: '浮空孤岛',
    theme: 'void',
    bg: 0x1b1a30,
    floors: [{ x: 390, y: 620, w: 500, h: 200 }],
    platforms: [],
    spawns: [560, 720],
  },
  {
    name: '天空群岛',
    theme: 'sky',
    bg: 0x142a3c,
    floors: [{ x: 460, y: 620, w: 360, h: 200 }],
    platforms: [
      { x: 120, y: 500, w: 190, h: 14 },
      { x: 970, y: 500, w: 190, h: 14 },
      { x: 545, y: 430, w: 190, h: 14 },
    ],
    spawns: [540, 740],
  },
  {
    name: '双柱擂台',
    theme: 'pillar',
    bg: 0x2a1a2e,
    floors: [
      { x: 110, y: 620, w: 340, h: 200 },
      { x: 830, y: 620, w: 340, h: 200 },
    ],
    platforms: [
      { x: 520, y: 540, w: 240, h: 14 },
      { x: 545, y: 390, w: 190, h: 14 },
    ],
    spawns: [230, 950],
  },
  {
    name: '熔岩深渊',
    theme: 'lava',
    bg: 0x2a1320,
    floors: [
      { x: 40, y: 650, w: 230, h: 170 },
      { x: 440, y: 620, w: 400, h: 200 },
      { x: 1010, y: 650, w: 230, h: 170 },
    ],
    platforms: [
      { x: 250, y: 472, w: 180, h: 14 },
      { x: 850, y: 472, w: 180, h: 14 },
      { x: 550, y: 360, w: 180, h: 14 },
    ],
    spawns: [560, 1120],
  },
  {
    name: '霜月祭坛',
    theme: 'ice',
    bg: 0x101f38,
    floors: [{ x: 240, y: 620, w: 800, h: 200 }],
    platforms: [
      { x: 150, y: 475, w: 200, h: 14 },
      { x: 930, y: 475, w: 200, h: 14 },
      { x: 540, y: 350, w: 200, h: 14 },
    ],
    spawns: [480, 800],
  },
];

// 飞出场外的爆炸线
export const BLAST = { left: -140, right: 1420, top: -300, bottom: 900 };

// 角色
export const FIGHTER_W = 40;
export const FIGHTER_H = 68;
export const START_STOCKS = 5;
/** 击飞能量上限：击退值以能量条显示，最高 100% */
export const MAX_DMG = 100;
export const RESPAWN_FRAMES = 70;
export const RESPAWN_INVULN = 120;

// 移动 / 跳跃
export const GRAVITY = 2300;
export const MAX_FALL = 950;
export const FAST_FALL = 1500;
export const RUN_SPEED = 330;
export const GROUND_ACCEL = 3200;
export const GROUND_FRICTION = 3000;
export const AIR_ACCEL = 1800;
export const AIR_FRICTION = 350;
export const JUMP_V = -790;
export const DOUBLE_JUMP_V = -700;
export const JUMP_CUT_VY = -260; // 提前松开跳跃键时，上升速度截断到此值
export const COYOTE_FRAMES = 6;
export const JUMP_BUFFER_FRAMES = 6;
export const DROP_THROUGH_FRAMES = 8;

// 普通攻击（帧）
export const ATK_STARTUP = 4;
export const ATK_ACTIVE = 5;
export const ATK_TOTAL = 20;
export const ATK_DMG = 6;
export const ATK_BASE = 250; // 0% 时的击飞力度
export const ATK_GROWTH = 9; // 目标每 1% 伤害增加的力度
export const ATK_HITBOX = { w: 56, h: 42, fwd: 24, y: -6 };

// 剑客（6）：被动——普攻与必杀都改为挥剑，判定范围更大，但出招/收招更慢
// 攻击距离在原版基础上 +15%（w/fwd 同步放大约 1.15 倍）
export const SWORD_ATK_STARTUP = 7; // 普通 4 帧
export const SWORD_ATK_ACTIVE = 6; // 普通 5 帧
export const SWORD_ATK_TOTAL = 34; // 普通 20 帧
export const SWORD_ATK_HITBOX = { w: 101, h: 56, fwd: 37, y: -10 };
export const SWORD_SPC_ACTIVE = 10; // 必杀上挑有效帧（普通 8 帧）
export const SWORD_SPC_TOTAL = 34; // 普通 26 帧
export const SWORD_SPC_HITBOX = { w: 92, h: 78, fwd: 25, y: -32 };

// 噩梦（7）：诅咒——施法后对手视野收窄 3 秒；被动移速 +3.33%
export const SKILL7_CD_FRAMES = 720; // 12 秒
export const SKILL7_LOCK = 22;
export const NIGHTMARE_BLIND_FRAMES = 180; // 视野收窄 3 秒
export const NIGHTMARE_SPEED = 1.0333;

// 突进（Shift）：地面/空中通用，位移期间无重力
export const DASH_SPEED = 820;
export const DASH_FRAMES = 11; // 突进持续 0.18 秒
export const DASH_COOLDOWN_FRAMES = 48; // 冷却 0.8 秒
export const DASH_END_MOMENTUM = 0.45; // 结束后保留的水平速度比例

// 角色专属技能（Ctrl）——按角色 id 取数组对应项
// 赤焰（0）：震波，身边范围强击退，冷却 8 秒；被动：造成的所有击退 +4.44%
export const SKILL0_CD_FRAMES = 480;
export const SKILL0_LOCK = 16; // 施法硬直帧
export const SKILL0_RADIUS = 132;
export const SKILL0_DMG = 5;
export const SKILL0_BASE = 300;
export const SKILL0_GROWTH = 9;
export const BLAZE_KB_MUL = 1.0444; // 赤焰被动：击飞力度倍率
// 青叶（1）：瞬移小段，落点贴身造成轻微伤害，冷却 2 秒
export const SKILL1_CD_FRAMES = 120;
export const SKILL1_LOCK = 8;
export const SKILL1_DIST = 132;
export const SKILL1_HIT_R = 48;
export const SKILL1_DMG = 2;
export const SKILL1_BASE = 150;
export const SKILL1_GROWTH = 6;
// 蓝铃（2）：火球直线飞行，命中造成伤害与击飞，冷却 2.25 秒
export const SKILL2_CD_FRAMES = 135;
export const SKILL2_LOCK = 12;
export const FIREBALL_SPEED = 560;
export const FIREBALL_R = 16;
export const FIREBALL_LIFE = 130;
export const FIREBALL_DMG = 9;
export const FIREBALL_BASE = 230;
export const FIREBALL_GROWTH = 8;

// 闪光（3）：丢出飞镖，命中后再次按 Ctrl 瞬移到敌人身边追击；8 秒冷却
export const SKILL3_CD_FRAMES = 480;
export const SKILL3_STARTUP = 30; // 0.5 秒前摇
export const SKILL3_LOCK = 36; // 投掷施法总硬直（前摇 + 短暂收招）
export const SKILL3_TELE_LOCK = 12; // 瞬移追击硬直
export const SKILL3_TELE_STARTUP = 14; // 二段前摇 0.24 秒（动作幅度较大），结束才瞬移出手
export const DART_SPEED = 760;
export const DART_R = 10;
export const DART_LIFE = 80; // 飞镖存活约 1.33 秒
export const SKILL3_MARK_FRAMES = 210; // 命中后 3.5 秒内可瞬移追击
export const SKILL3_DMG = 11;
export const SKILL3_BASE = 190;
export const SKILL3_GROWTH = 7;

// 幻影（4）：纯被动
export const PHANTOM_SPEED = 1.21; // 移速 +21%
export const PHANTOM_DASH = 1.1; // 突进距离 +10%（同持续时间下速度 *1.1）

// 蝶（5）：粉蝶环绕 1.5 秒后化为护盾，减 45% 击退并震退近身敌人；12.5 秒冷却
export const SKILL5_CD_FRAMES = 750;
export const SKILL5_LOCK = 10;
export const SKILL5_CHARGE_FRAMES = 90; // 蝴蝶环绕 1.5 秒
export const SKILL5_SHIELD_FRAMES = 240; // 护盾持续 4 秒
export const SKILL5_KB_REDUCE = 0.55; // 护盾期间受到的击退力度乘以此值（减少 45%）
export const SKILL5_PULSE_R = 100; // 成盾瞬间的震退半径
export const SKILL5_PULSE_BASE = 150; // 纯击退，无伤害
export const SKILL5_PULSE_GROWTH = 4;

// 霓虹（8）：超频——2 秒内移动速度 +66%，冷却 7.5 秒
export const SKILL8_CD_FRAMES = 450;
export const SKILL8_LOCK = 16;
export const NEON_SPEED_FRAMES = 120; // 加速持续 2 秒
export const NEON_SPEED_MUL = 1.66;

// 虚无（9）：虚无之盾——1.3 秒无敌招架：受击则把来袭击退的 50% 反震给对手；
// 期间未受击（空挡）则自身击飞值 +8%，且冷却增加 2 秒。基础冷却 10 秒。
export const SKILL9_CD_FRAMES = 600;
export const SKILL9_LOCK = 78; // 招架姿势定身 1.3 秒（与无敌同长）
export const VOID_GUARD_FRAMES = 78;
export const VOID_REFLECT = 0.9; // 反震来袭击退的比例
export const VOID_WHIFF_DMG = 8; // 空挡自损击飞值
export const VOID_WHIFF_EXTRA_CD = 120; // 空挡冷却额外 +2 秒

// 斗士（10）：擒抱——抓住身前敌人，定身 1 秒后向前丢出约一个突进距离；冷却 11 秒
export const SKILL10_CD_FRAMES = 660;
export const SKILL10_WHIFF_LOCK = 26; // 抓空时的短硬直
export const SKILL10_GRAB_HITBOX = { w: 56, h: 60, fwd: 24, y: -2 };
export const SKILL10_HOLD_FRAMES = 60; // 擒抱持续 1 秒
export const SKILL10_LOCK = SKILL10_HOLD_FRAMES + 8; // 抓住时的总锁定（投出当帧由 Sim 提前解除）
export const SKILL10_THROW_VX = 440;
export const SKILL10_THROW_VY = -260;
export const SKILL10_THROW_HITSTUN = 16;
export const SKILL10_THROW_POWER = 360; // 仅用于震屏力度

// 祭司（11）：血誓——自残 10% 击飞值；被动：每损失 1% 击飞值，造成的击退 +0.5%
export const SKILL11_CD_FRAMES = 90; // 1.5 秒
export const SKILL11_LOCK = 16;
export const SKILL11_SELFDMG = 10;
export const PRIEST_KB_PER_PCT = 0.005;

// 喵喵（12）：狂爪——向前连挥 2.7 秒，期间可自由移动但不可转向；冷却 9.7 秒
export const SKILL12_CD_FRAMES = 582;
export const SKILL12_FURY_FRAMES = 162;
export const SKILL12_CLAW_FIRST = 6; // 首段在第 6 帧
export const SKILL12_CLAW_EVERY = 22; // 其后每 22 帧一段（6/28/50/72/94/116/138/160，共 8 段）
export const SKILL12_CLAW_DMG = 4;
export const SKILL12_CLAW_BASE = 150;
export const SKILL12_CLAW_GROWTH = 6;
export const SKILL12_HITBOX = { w: 52, h: 46, fwd: 20, y: -8 };

// 鬼人（13）：鬼燃——3 秒内下次攻击变为突进斩（约 1.2 个突进距离），沿途造成伤害且无敌；冷却 11 秒
export const SKILL13_CD_FRAMES = 660;
export const SKILL13_LOCK = 16;
export const ONI_BUFF_FRAMES = 180; // 强化窗口 3 秒
export const ONI_DIVE_FRAMES = 11;
export const ONI_DIVE_SPEED = DASH_SPEED * 1.2; // 984：11 帧位移约 180px
export const ONI_DIVE_DMG = 10;
export const ONI_DIVE_BASE = 260;
export const ONI_DIVE_GROWTH = 8;
export const ONI_DIVE_HITBOX = { w: 78, h: 56, fwd: 10, y: -6 };

// 呓梦（14）：梦火弹——粉紫色火弹，命中后 5 秒内敌人受到的击退 -20%；冷却 7 秒
export const SKILL14_CD_FRAMES = 420;
export const SKILL14_LOCK = 12;
export const DREAM_SPEED = 560;
export const DREAM_R = 16;
export const DREAM_LIFE = 130;
export const DREAM_WEAK_FRAMES = 300;
export const DREAM_KB_MUL = 1.2; // 梦火弹命中：5 秒内目标受到的击退 +20%

// 元素使（15）：滚轮下滚按 风>雷>水>火>土 循环切换（切换冷却 0.9 秒），仅当前系技能走 CD
export const ELEM_SWITCH_CD = 54; // 0.9 秒
// 逐风 3 秒 / 唤雷 6 秒 / 降水 6 秒 / 燎火 5 秒 / 御土 6.5 秒
export const ELEM_CD_FRAMES = [180, 360, 360, 300, 390];
export const ELEM_LOCK_FRAMES = [10, 18, 16, 14, 16];
export const ELEM_NAMES = ['逐风', '唤雷', '降水', '燎火', '御土'];
export const ELEM_COLORS = [0xeaf2ff, 0x3d5afe, 0x56c8ff, 0xff5a2e, 0xc89a4e];
export const ELEM_WIND_DIST = 112; // 约 0.75 个突进
export const ELEM_THUNDER_R = 112;
export const ELEM_STUN_FRAMES = 30; // 眩晕 0.5 秒
export const ELEM_WATER_DELAY = 24; // 水弹 0.4 秒后爆炸
export const ELEM_WATER_R = 66;
export const ELEM_WATER_KB = 0.75; // 爆炸造成敌人当前击飞值 75% 的击退
export const ELEM_FIRE_SPEED = 560;
export const ELEM_FIRE_R = 15;
export const ELEM_FIRE_LIFE = 130;
export const ELEM_FIRE_KB = 0.75; // 火弹造成敌人当前击飞值 75% 的击退
export const ELEM_FIRE_RECOIL = 430; // 放火时向后反冲
export const ELEM_EARTH_FRAMES = 90; // 土盾持续 1.5 秒
export const ELEM_EARTH_KB_MUL = 0.75; // 土盾抵消 25% 击退

// 幻棱（16）：超低空横掠闪避 0.4 秒——期间受击则闪避成功：
// 吞下来袭，进入特写慢动作（实际约 1 秒，期间无敌），并解锁二段；
// 二段：瞬移到约 0.8 个突进范围内敌人身后，0.1 秒后瞬斩造成敌人当前击飞值 85% 的伤害。
// 闪避落空进入 13.5 秒 CD；二段出手后进入 9.5 秒 CD。
export const SKILL16_DODGE_FRAMES = 24; // 0.4 秒闪避窗口
export const SKILL16_SLOW_FRAMES = 27; // 特写慢动作（0.45 倍速下实际约 1 秒）
export const SKILL16_FAIL_CD = 810; // 13.5 秒
export const SKILL16_DONE_CD = 570; // 9.5 秒
export const SKILL16_TELE_R = 120; // 0.8 个突进距离（≈150px）
export const SKILL16_DELAY_FRAMES = 6; // 瞬移后 0.1 秒瞬斩
export const SKILL16_DMG = 0.85; // 造成敌人当前击飞值 85% 的伤害
export const SKILL16_FIZZLE_LOCK = 8; // 二段无目标时的短动作
export const SKILL16_STRIKE_LOCK = 12; // 二段瞬斩后的小后摇

// 源（17）：纯被动——成功命中敌人 4 次后，下次攻击额外造成 80% 伤害
export const SKILL17_HITS = 4;
export const SKILL17_BONUS = 0.8;

// 吸血鬼（18）：被动——每次成功命中恢复自身当前击飞值的 3%；
// 主动：6 秒内被动恢复 +1%（共 4%），冷却 20 秒
export const SKILL18_PASSIVE = 0.03;
export const SKILL18_BOOST_ADD = 0.01;
export const SKILL18_BOOST_FRAMES = 360; // 6 秒
export const SKILL18_CD_FRAMES = 1200; // 20 秒
export const SKILL18_LOCK = 14;

// 狂徒（19）：蓄意轰拳——可长按蓄力最多 3 秒，松手/蓄满即轰出；
// 击退力度按蓄力在敌人当前击飞值的 80%~250%，范围在 0.5~2.5 个突进距离；CD 17 秒
export const SKILL19_CD_FRAMES = 1020; // 17 秒
export const SKILL19_CHARGE_MAX = 180; // 3 秒
export const SKILL19_KB_MIN = 0.8;
export const SKILL19_KB_MAX = 2.5;
export const SKILL19_RANGE_MIN = 75; // 0.5 个突进（≈150px）
export const SKILL19_RANGE_MAX = 376; // 2.5 个突进
export const SKILL19_HIT_H = 96;
export const SKILL19_LOCK = 22;
export const SKILL19_BURST_FRAMES = 12; // 轰拳爆光持续帧

export const SKILL_CD_FRAMES = [
  SKILL0_CD_FRAMES,
  SKILL1_CD_FRAMES,
  SKILL2_CD_FRAMES,
  SKILL3_CD_FRAMES,
  0, // 幻影：被动无冷却
  SKILL5_CD_FRAMES,
  0, // 剑客：被动无技能
  SKILL7_CD_FRAMES,
  SKILL8_CD_FRAMES,
  SKILL9_CD_FRAMES,
  SKILL10_CD_FRAMES,
  SKILL11_CD_FRAMES,
  SKILL12_CD_FRAMES,
  SKILL13_CD_FRAMES,
  SKILL14_CD_FRAMES,
  0, // 元素使：五系各自独立 CD（ELEM_CD_FRAMES）
  0, // 幻棱：失败/二段 CD 由技能流程程序化设置
  0, // 源：纯被动
  SKILL18_CD_FRAMES,
  SKILL19_CD_FRAMES,
];
export const SKILL_LOCK_FRAMES = [
  SKILL0_LOCK,
  SKILL1_LOCK,
  SKILL2_LOCK,
  SKILL3_LOCK,
  0,
  SKILL5_LOCK,
  0,
  SKILL7_LOCK,
  SKILL8_LOCK,
  SKILL9_LOCK,
  SKILL10_WHIFF_LOCK,
  SKILL11_LOCK,
  SKILL12_FURY_FRAMES,
  SKILL13_LOCK,
  SKILL14_LOCK,
  0, // 元素使：按当前系取 ELEM_LOCK_FRAMES
  0, // 幻棱：闪避/慢动作/二段锁定程序化
  0, // 源：纯被动
  SKILL18_LOCK,
  0, // 狂徒：蓄力/轰拳锁定程序化
];

// ---------------------------------------------------------------------------
// 秘术（Q）：对局前在第二页选择，每人携带一种；1 迅捷为纯被动
// ---------------------------------------------------------------------------
// 0 回春：恢复 25% 击飞值，冷却 25 秒
export const ARC0_CD_FRAMES = 1500;
export const ARC0_LOCK = 16;
export const ARC0_HEAL = 0.25;
// 1 迅捷（被动）：突进速度 +45%（同持续时间下突进距离 +45%）
export const ARC1_DASH_MUL = 1.45;
// 2 烈炎弹：丢出火球，造成相当于敌人当前击飞值 75% 的击退（不增加击飞值），冷却 12.5 秒
export const ARC2_CD_FRAMES = 750;
export const ARC2_LOCK = 18;
export const ARC2_FLAME_SPEED = 540;
export const ARC2_FLAME_R = 15;
export const ARC2_FLAME_LIFE = 130;
export const ARC2_FLAME_KB = 0.75;
// 3 风翼：向上飞翔 1 秒，总距离约 1.25 个突进（≈188px），冷却 18 秒
export const ARC3_CD_FRAMES = 1080;
export const ARC3_WING_FRAMES = 60;
export const ARC3_WING_VY = -188;
// 4 重击：0.5 秒无敌前摇后向前重击，造成相当于敌人当前击飞值 100% 的伤害，冷却 20 秒
export const ARC4_CD_FRAMES = 1200;
export const ARC4_STARTUP = 30;
export const ARC4_TOTAL = 38;
export const ARC4_DMG = 1.0;
export const ARC4_HITBOX = { w: 74, h: 52, fwd: 28, y: -8 };
// 5 霸体：5 秒内受到的击退 -45%，并把 5% 击退反震给攻击者，冷却 26 秒
export const ARC5_CD_FRAMES = 1560;
export const ARC5_LOCK = 16;
export const ARC5_ARMOR_FRAMES = 300;
export const ARC5_KB_MUL = 0.55;
export const ARC5_REFLECT = 0.05;
// 6 冰封领域：投出冰球（命中 35% 击飞值小击退），落点展开 4 秒冰封领域，
// 域内敌人水平移速 -50%（跳起可越过），冷却 18 秒
export const ARC6_CD_FRAMES = 1080;
export const ARC6_LOCK = 18;
export const ARC6_ORB_SPEED = 430;
export const ARC6_ORB_R = 12;
export const ARC6_ORB_LIFE = 90;
export const ARC6_HIT_KB = 0.35;
export const ARC6_ZONE_W = 132;
export const ARC6_ZONE_FRAMES = 240;
export const ARC6_ZONE_DAMP = 0.82; // 每帧速度阻尼（稳态移速约 50%）
// 7 雷光瞬闪：0.13 秒无敌前掠约 230px，掠过敌人造成其当前击飞值 50% 的伤害，
// 随后 10 帧收招（可被惩罚），冷却 14 秒
export const ARC7_CD_FRAMES = 840;
export const ARC7_LOCK = 18;
export const ARC7_DASH_FRAMES = 8;
export const ARC7_DASH_SPEED = 1725; // 8 帧 ≈ 230px
export const ARC7_DMG = 0.5;
// 8 三连星：扇形射出 3 枚星屑，每枚 4 伤害、小击退，射程短，冷却 11 秒
export const ARC8_CD_FRAMES = 660;
export const ARC8_LOCK = 16;
export const ARC8_STAR_SPEED = 500;
export const ARC8_STAR_R = 7;
export const ARC8_STAR_LIFE = 70;
export const ARC8_SPREAD = 0.22;
export const ARC8_STAR_DMG = 4;
export const ARC8_STAR_BASE = 120;
export const ARC8_STAR_GROWTH = 4;
// 9 焚血狂战：6 秒内造成伤害 +30%，但受到的击退 +15%（玻璃大炮），冷却 20 秒
export const ARC9_CD_FRAMES = 1200;
export const ARC9_LOCK = 12;
export const ARC9_FRAMES = 360;
export const ARC9_DMG_MUL = 1.3;
export const ARC9_KB_MUL = 1.15;

/** 各秘术的施法定身帧（1 迅捷为被动，0） */
export const ARCANA_LOCK_FRAMES = [
  ARC0_LOCK,
  0,
  ARC2_LOCK,
  ARC3_WING_FRAMES,
  ARC4_TOTAL,
  ARC5_LOCK,
  ARC6_LOCK,
  ARC7_LOCK,
  ARC8_LOCK,
  ARC9_LOCK,
];
/** 各秘术冷却（1 迅捷为被动，0） */
export const ARCANA_CD_FRAMES = [
  ARC0_CD_FRAMES,
  0,
  ARC2_CD_FRAMES,
  ARC3_CD_FRAMES,
  ARC4_CD_FRAMES,
  ARC5_CD_FRAMES,
  ARC6_CD_FRAMES,
  ARC7_CD_FRAMES,
  ARC8_CD_FRAMES,
  ARC9_CD_FRAMES,
];

export interface ArcanaDef {
  name: string;
  /** 卡片副标题 */
  title: string;
  /** 详细说明 */
  desc: string;
  color: number;
}

export const ARCANAS: ArcanaDef[] = [
  {
    name: '回春',
    title: '主动 · Q',
    desc: '恢复自身 25% 击飞值 · 25 秒冷却',
    color: 0x5fe08a,
  },
  {
    name: '迅捷',
    title: '被动',
    desc: '突进速度 +45%（无需按键）',
    color: 0x66e6ff,
  },
  {
    name: '烈炎弹',
    title: '主动 · Q',
    desc: '丢出烈炎弹，造成敌人当前击飞值 75% 的击退，不增加击飞值 · 12.5 秒',
    color: 0xff5a2e,
  },
  {
    name: '风翼',
    title: '主动 · Q',
    desc: '向上飞翔 1 秒，距离约 1.25 个突进 · 18 秒冷却',
    color: 0x9fe87a,
  },
  {
    name: '重击',
    title: '主动 · Q',
    desc: '0.5 秒无敌前摇后重击前方，造成敌人当前击飞值 100% 的伤害 · 20 秒',
    color: 0xffb13c,
  },
  {
    name: '霸体',
    title: '主动 · Q',
    desc: '5 秒霸体：击退 -45%，并反震 5% 击退 · 26 秒冷却',
    color: 0xb58bff,
  },
  {
    name: '冰封领域',
    title: '主动 · Q',
    desc: '投出冰球，命中/落点展开 4 秒领域，域内移速 -18% · 18 秒',
    color: 0x8fe3ff,
  },
  {
    name: '雷光瞬闪',
    title: '主动 · Q',
    desc: '无敌前掠 230px，掠过敌人造成其击飞值 50% 伤害 · 14 秒',
    color: 0x6fa8ff,
  },
  {
    name: '三连星',
    title: '主动 · Q',
    desc: '扇形射出 3 枚星屑，每枚 4 伤害，射程约 570px · 11 秒',
    color: 0xffd978,
  },
  {
    name: '焚血狂战',
    title: '主动 · Q',
    desc: '6 秒增益：伤害 +30%，但受击退 +15%（玻璃大炮）· 20 秒',
    color: 0xff6e5e,
  },
];

// 回场必杀（上B）
export const SPC_TOTAL = 26;
export const SPC_ACTIVE = 8;
export const SPC_DMG = 9;
export const SPC_BASE = 200;
export const SPC_GROWTH = 6.5;
export const SPC_VY = -900;
export const SPC_VX = 240;
export const SPC_HITBOX = { w: 48, h: 58, fwd: 12, y: -24 };

// 击飞 -> 硬直帧数
export const HITSTUN_PER_POWER = 1 / 13;

// 网络
export const SNAPSHOT_EVERY = 2; // 房主每 2 帧发一次快照（30Hz）
export const REMOTE_INTERP_MS = 100; // 远端角色渲染延迟

export const COLORS = {
  p0: 0x4da6ff,
  p1: 0xff5d5d,
  floor: 0x3a3f5c,
  floorTop: 0x6b73a0,
  platform: 0x4a5078,
  platformTop: 0x8b94d4,
  hitbox: 0xffe14d,
  spcHitbox: 0x66ffd1,
  dash: 0x66e6ff,
  dashCd: 0x2a5f70,
  skill: 0xffa43c,
  fireball: 0xff7a2e,
  dart: 0xffe14d,
  spirit: 0xff7ad9,
  sword: 0xdfe7ff,
  nightmare: 0x8a4dff,
} as const;
