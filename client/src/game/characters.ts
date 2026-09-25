// 角色资源：纯代码绘制的像素小人 + Phaser 纹理/动画生成。
// 参照玩家提供的三张像素头像重制：
//   0 赤焰 —— 红发、绿衣斗士
//   1 青叶 —— 绿色兜帽、黄花脸（粉花发饰）、深色劲装
//   2 蓝铃 —— 蓝色兜帽、金发刘海、蓝袍术士
// 每个角色 15 帧：待机x2 / 奔跑x4 / 跳跃 / 下落 / 突进x2 / 攻击x3（前摇·生效·收招）/ 必杀 / 受击
import Phaser from 'phaser';
import {
  ATK_ACTIVE,
  ATK_STARTUP,
  ATK_TOTAL,
  DASH_FRAMES,
  SWORD_ATK_ACTIVE,
  SWORD_ATK_STARTUP,
  SWORD_ATK_TOTAL,
} from './constants';

export const FRAME_W = 18;
export const FRAME_H = 26;
export const CHAR_SCALE = 2.6; // 战斗中实际显示 46.8 x 67.6，贴近 40x68 判定盒

export interface CharacterDef {
  name: string;
  title: string;
  /** Ctrl 专属技能说明（角色卡上显示） */
  skillDesc: string;
  /** 卡片/主色 */
  color: number;
  pal: Palette;
  /** 头部风格：0 红发 / 1 绿兜 / 2 蓝兜 */
  head: 0 | 1 | 2;
  /** 剑客：绘制佩刀与挥剑动作 */
  sword?: boolean;
  /** 霓虹：青色护目镜替代眼睛 */
  visor?: boolean;
  /** 虚无：虚白双瞳（无面） */
  hollow?: boolean;
  /** 喵喵：头顶一对猫耳 */
  cat?: boolean;
  /** 鬼人：半人半白骨（半身骨骼像素） */
  bone?: boolean;
}

interface Palette {
  skin: string;
  skinShade: string;
  /** 头发（赤焰）或刘海（蓝铃） */
  hair: string;
  hairDark: string;
  /** 兜帽色（青叶/蓝铃） */
  hood?: string;
  hoodDark?: string;
  cloth: string;
  clothDark: string;
  pants: string;
  boot: string;
  eye: string;
  accent: string;
  cape?: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    name: '赤焰',
    title: '红发绿衣 · 斗士',
    skillDesc: 'Ctrl 震波：击退身边敌人 · 8 秒冷却　被动：击退 +4.44%',
    color: 0xe0472e,
    head: 0,
    pal: {
      skin: '#f3c79b',
      skinShade: '#d9a074',
      hair: '#e0472e',
      hairDark: '#b22d1e',
      cloth: '#3fae5a',
      clothDark: '#2c8145',
      pants: '#3b4a78',
      boot: '#5a3b26',
      eye: '#1c2233',
      accent: '#ffd166',
    },
  },
  {
    name: '青叶',
    title: '绿兜花饰 · 影客',
    skillDesc: 'Ctrl 瞬移：突进一小段并贴身一击 · 2 秒冷却',
    color: 0x2fbf8f,
    head: 1,
    pal: {
      skin: '#ffd95e', // 图中偏黄的脸
      skinShade: '#e6b83c',
      hair: '#2fbf8f',
      hairDark: '#1f8f69',
      hood: '#2fbf8f',
      hoodDark: '#1f8f69',
      cloth: '#204740',
      clothDark: '#15302c',
      pants: '#26303a',
      boot: '#1d242e',
      eye: '#1c2233',
      accent: '#ff8fd8', // 头上粉花
      cape: '#2fbf8f',
    },
  },
  {
    name: '蓝铃',
    title: '蓝兜金发 · 术士',
    skillDesc: 'Ctrl 火球：飞弹命中伤害击飞 · 2.25 秒冷却',
    color: 0x3f63d6,
    head: 2,
    pal: {
      skin: '#f5cba6',
      skinShade: '#dca57e',
      hair: '#f2d24b', // 金发刘海
      hairDark: '#c9a02f',
      hood: '#3f63d6',
      hoodDark: '#2c47a0',
      cloth: '#3454b4',
      clothDark: '#273f8c',
      pants: '#2c2f52',
      boot: '#20223c',
      eye: '#1c2233',
      accent: '#9fc0ff',
    },
  },
  {
    name: '闪光',
    title: '金发白衫 · 忍',
    skillDesc: 'Ctrl 飞镖：命中后再按瞬移到身边追击 · 8 秒冷却',
    color: 0xffe14d,
    head: 0,
    pal: {
      skin: '#f3c79b',
      skinShade: '#d9a074',
      hair: '#ffe14d',
      hairDark: '#d9a92f',
      cloth: '#e8e4d8',
      clothDark: '#b9b3a0',
      pants: '#454b66',
      boot: '#3a2f22',
      eye: '#1c2233',
      accent: '#fff7c4',
    },
  },
  {
    name: '幻影',
    title: '紫兜魅影 · 客',
    skillDesc: '被动：移动速度 +21%，突进距离 +10%',
    color: 0x8a5cf6,
    head: 1,
    pal: {
      skin: '#e7d4ff',
      skinShade: '#c4a8e6',
      hair: '#8a5cf6',
      hairDark: '#5f34b8',
      hood: '#8a5cf6',
      hoodDark: '#5f34b8',
      cloth: '#312a52',
      clothDark: '#221d3c',
      pants: '#1c1830',
      boot: '#120f20',
      eye: '#1c2233',
      accent: '#b79bff', // 兜帽顶紫晶（复用花饰像素）
      cape: '#8a5cf6',
    },
  },
  {
    name: '蝶',
    title: '粉兜灵裳 · 蝶',
    skillDesc: 'Ctrl 粉蝶环绕 1.5 秒后成盾：减 45% 击退并震退近身敌人 · 12.5 秒冷却',
    color: 0xff7ad9,
    head: 2,
    pal: {
      skin: '#fbd2e8',
      skinShade: '#e0a6c8',
      hair: '#f6e6ff', // 淡紫刘海
      hairDark: '#c9a8e0',
      hood: '#ff7ad9',
      hoodDark: '#c94aa8',
      cloth: '#ffe9f8',
      clothDark: '#e0b9d6',
      pants: '#7a4a78',
      boot: '#4d2f4c',
      eye: '#1c2233',
      accent: '#ff9ee6',
    },
  },
  {
    name: '剑客',
    title: '灰发长刀 · 剑豪',
    skillDesc: '被动：普攻与必杀都是大范围挥剑，出手较慢',
    color: 0x9fb2d8,
    head: 0,
    sword: true,
    pal: {
      skin: '#f0c498',
      skinShade: '#d49c70',
      hair: '#b9c6dd', // 钢灰发
      hairDark: '#8593ab',
      cloth: '#3d4d80', // 深蓝道服
      clothDark: '#2b365e',
      pants: '#2a2f45',
      boot: '#1d1a22',
      eye: '#1c2233',
      accent: '#e8eef7', // 刀光色
    },
  },
  {
    name: '噩梦',
    title: '紫影梦魇 · 咒',
    skillDesc: 'Ctrl 诅咒：对手视野收窄 3 秒 · 12 秒冷却　被动：移速 +3.33%',
    color: 0x8a4dff,
    head: 1,
    pal: {
      skin: '#b79bd8',
      skinShade: '#9273b8',
      hair: '#5b2a9e',
      hairDark: '#3a1868',
      hood: '#3a1868',
      hoodDark: '#240e44',
      cloth: '#241538',
      clothDark: '#170c26',
      pants: '#140b22',
      boot: '#0c0614',
      eye: '#ff4d6d', // 咒眼赤红
      accent: '#ff4d6d', // 兜帽顶红眼（复用花饰像素）
      cape: '#3a1868',
    },
  },
  {
    name: '霓虹',
    title: '洋红疾电 · 超频',
    skillDesc: 'Ctrl 超频：2 秒内移速 +66% · 7.5 秒冷却',
    color: 0xff3df0,
    head: 0,
    visor: true,
    pal: {
      skin: '#f3c79b',
      skinShade: '#d9a074',
      hair: '#ff3df0', // 霓虹洋红尖发
      hairDark: '#b81fb4',
      cloth: '#232033', // 暗色夹克
      clothDark: '#14111f',
      pants: '#2c2550',
      boot: '#140f22',
      eye: '#1c2233',
      accent: '#35f0ff', // 青色霓虹（目镜/光边）
    },
  },
  {
    name: '虚无',
    title: '虚白无面 · 寂',
    skillDesc: 'Ctrl 虚盾：1.3 秒无敌，受击反震 90% 击退；空挡自损 8% · 10 秒冷却',
    color: 0xb9b6ff,
    head: 1,
    hollow: true,
    pal: {
      skin: '#d9d6f5', // 苍白无面
      skinShade: '#a9a4d8',
      hair: '#cfc9ff',
      hairDark: '#7d76b8',
      hood: '#2b2350', // 深邃虚紫兜帽
      hoodDark: '#17112e',
      cloth: '#221d3d',
      clothDark: '#14102a',
      pants: '#120e26',
      boot: '#0a0716',
      eye: '#e6e9ff', // 虚白双瞳
      accent: '#c9ccff',
      cape: '#2b2350',
    },
  },
  {
    name: '斗士',
    title: '铁甲巨汉 · 擒',
    skillDesc: 'Ctrl 擒抱：抓住身前敌人，1 秒后丢出约一个突进距离 · 11 秒冷却',
    color: 0xd08a3e,
    head: 0,
    pal: {
      skin: '#e8b083',
      skinShade: '#c78a58',
      hair: '#6b4a2b', // 棕褐短发
      hairDark: '#4a331c',
      cloth: '#8a8f9e', // 铁甲灰
      clothDark: '#5c6172',
      pants: '#4a3c2e',
      boot: '#2e2218',
      eye: '#1c2233',
      accent: '#f2c14e', // 金色腰带扣
    },
  },
  {
    name: '祭司',
    title: '金纹白袍 · 誓',
    skillDesc: 'Ctrl 血誓：自残 10% 击飞值 · 被动：每损失 1% 击飞值，击退 +0.5% · 1.5 秒冷却',
    color: 0xf2e8c8,
    head: 2,
    pal: {
      skin: '#f3cfa8',
      skinShade: '#d9a87c',
      hair: '#e9e3d2', // 银白刘海
      hairDark: '#b3ad9c',
      hood: '#efe7cf', // 米白兜帽
      hoodDark: '#c9bfa2',
      cloth: '#f6f1e2', // 白袍
      clothDark: '#cfc5a8',
      pants: '#8a8268',
      boot: '#5c553f',
      eye: '#4a2f5e', // 深紫眼
      accent: '#e8b93e', // 金纹
    },
  },
  {
    name: '喵喵',
    title: '猫耳萌爪 · 狂',
    skillDesc: 'Ctrl 狂爪：2.7 秒连续挥爪，期间可移动但不可转向 · 9.7 秒冷却',
    color: 0xff9ed2,
    head: 0,
    cat: true,
    pal: {
      skin: '#ffd9ec', // 粉嫩猫脸
      skinShade: '#efa0c4',
      hair: '#ff7fc4', // 粉发
      hairDark: '#d8509b',
      cloth: '#7a5cff', // 紫外套
      clothDark: '#543cc8',
      pants: '#3c2f78',
      boot: '#2a1f54',
      eye: '#2a1c33',
      accent: '#ffe14d', // 铃铛/爪光
    },
  },
  {
    name: '鬼人',
    title: '半骨紫焰 · 斩',
    skillDesc: 'Ctrl 鬼燃：3 秒内下次攻击变无敌突进斩（约 1.2 个突进距离），沿途伤人 · 11 秒冷却',
    color: 0xb44dff,
    head: 0,
    bone: true,
    pal: {
      skin: '#d8a888',
      skinShade: '#b07c5c',
      hair: '#2b2b33', // 墨黑发
      hairDark: '#17171d',
      cloth: '#5a2a55', // 暗紫破衣
      clothDark: '#3a1838',
      pants: '#241430',
      boot: '#160a1c',
      eye: '#d44dff', // 鬼紫眼
      accent: '#c44dff', // 紫焰色（特效中使用）
    },
  },
  {
    name: '呓梦',
    title: '粉紫梦火 · 魇',
    skillDesc: 'Ctrl 梦火弹：命中后 5 秒内敌人受到的击退 +20% · 7 秒冷却',
    color: 0xc77dff,
    head: 2,
    pal: {
      skin: '#f6cfe8',
      skinShade: '#d89cc8',
      hair: '#b266ff', // 紫刘海
      hairDark: '#7d3cc8',
      hood: '#9a4dd8', // 梦紫兜帽
      hoodDark: '#6e2da6',
      cloth: '#6e3aa8',
      clothDark: '#4e257e',
      pants: '#3a2358',
      boot: '#241438',
      eye: '#ffd966', // 梦黄眼
      accent: '#ff8ad8', // 粉紫光
    },
  },
  {
    name: '元素使',
    title: '五系轮转 · 元',
    skillDesc: '滚轮下滚切换风>雷>水>火>土（0.9 秒），各系独立 CD；Ctrl 释放当前系技能',
    color: 0xeaf2ff,
    head: 2,
    pal: {
      skin: '#f3cfa8',
      skinShade: '#d9a87c',
      hair: '#eaf2ff', // 入场风系：白发白兜
      hairDark: '#b8c6de',
      hood: '#eaf2ff',
      hoodDark: '#b8c6de',
      cloth: '#dfe8f8',
      clothDark: '#b9c6e0',
      pants: '#4a5a78',
      boot: '#2e3a52',
      eye: '#1c2233',
      accent: '#9fd8ff',
    },
  },
  {
    name: '幻棱',
    title: '折光幻身 · 棱',
    skillDesc:
      'Ctrl 闪避：0.5 秒内受击触发 1 秒特写慢动作（期间无敌）并解锁二段瞬移背刺（85% 击飞值伤害）；闪避失败 13.5 秒 CD，二段后 9.5 秒 CD',
    color: 0x7de0ff,
    head: 0,
    pal: {
      skin: '#f3dcc8',
      skinShade: '#dab59c',
      hair: '#8f7bff', // 棱镜紫
      hairDark: '#5f4fd0',
      cloth: '#2e3a6e',
      clothDark: '#1e2750',
      pants: '#26314a',
      boot: '#171d30',
      eye: '#1c2233',
      accent: '#7de0ff', // 折光青
    },
  },
  {
    name: '源',
    title: '连刃溯源 · 源',
    skillDesc: '被动：连续成功命中 4 次后，下次攻击额外造成 80% 伤害',
    color: 0xf2555c,
    head: 0,
    pal: {
      skin: '#f0c498',
      skinShade: '#d49c70',
      hair: '#f2555c', // 朱红
      hairDark: '#c0303a',
      cloth: '#f2eee2', // 白衫
      clothDark: '#c2bcac',
      pants: '#3a3f55',
      boot: '#241f2e',
      eye: '#1c2233',
      accent: '#ffd166',
    },
  },
  {
    name: '吸血鬼',
    title: '猩红夜翼 · 吸血',
    skillDesc:
      '被动：每次成功命中恢复自身 3% 击飞值；Ctrl 血渴：6 秒内恢复增至 4% · 20 秒冷却',
    color: 0xb81e3e,
    head: 1,
    pal: {
      skin: '#e8c8d0',
      skinShade: '#c79ba8',
      hair: '#2b1430',
      hairDark: '#160a1c',
      hood: '#4a1030', // 深红兜帽
      hoodDark: '#2c091c',
      cloth: '#5c1430',
      clothDark: '#3c0c1f',
      pants: '#1f1026',
      boot: '#10070f',
      eye: '#ff4d6d',
      accent: '#ff4d6d',
      cape: '#4a1030',
    },
  },
  {
    name: '狂徒',
    title: '铁甲重拳 · 狂徒',
    skillDesc:
      'Ctrl 蓄意轰拳：可长按蓄力（最多 3 秒），击退力度 80%→250% 敌人击飞值，范围 0.5→2.5 个突进 · 17 秒冷却',
    color: 0xd9832e,
    head: 0,
    pal: {
      skin: '#e8b083',
      skinShade: '#c78a58',
      hair: '#6b4a2b',
      hairDark: '#4a331c',
      cloth: '#9a7234', // 黄铜铁甲
      clothDark: '#6f5022',
      pants: '#4a3c2e',
      boot: '#2e2218',
      eye: '#1c2233',
      accent: '#ffd166',
    },
  },
];

/** 元素使五系形态配色（风白 / 雷深蓝 / 水浅蓝 / 火红 / 土黄褐） */
export const ELEM_PALS: Palette[] = [
  {
    skin: '#f3cfa8', skinShade: '#d9a87c',
    hair: '#eaf2ff', hairDark: '#b8c6de',
    hood: '#eaf2ff', hoodDark: '#b8c6de',
    cloth: '#dfe8f8', clothDark: '#b9c6e0',
    pants: '#4a5a78', boot: '#2e3a52', eye: '#2a4a78', accent: '#9fd8ff',
  },
  {
    skin: '#f3cfa8', skinShade: '#d9a87c',
    hair: '#3d5afe', hairDark: '#1a2fa0',
    hood: '#2030a8', hoodDark: '#121c68',
    cloth: '#1a2f8e', clothDark: '#101e5e',
    pants: '#10183a', boot: '#0a0f26', eye: '#ffe14d', accent: '#ffe14d',
  },
  {
    skin: '#f3cfa8', skinShade: '#d9a87c',
    hair: '#aee9ff', hairDark: '#5fb8e0',
    hood: '#7fd8ff', hoodDark: '#46b2e8',
    cloth: '#56c8ff', clothDark: '#2f9ed8',
    pants: '#234a78', boot: '#16304e', eye: '#0e4a6e', accent: '#eafbff',
  },
  {
    skin: '#f3cfa8', skinShade: '#d9a87c',
    hair: '#ff6a3d', hairDark: '#d83a14',
    hood: '#e83a2e', hoodDark: '#a82018',
    cloth: '#d83a2a', clothDark: '#a02018',
    pants: '#5a1c14', boot: '#381008', eye: '#ffe14d', accent: '#ffb13c',
  },
  {
    skin: '#e8c49a', skinShade: '#c99c6c',
    hair: '#c89a4e', hairDark: '#9a722e',
    hood: '#b5864a', hoodDark: '#87602f',
    cloth: '#a87842', clothDark: '#7d582c',
    pants: '#5c4226', boot: '#3c2a16', eye: '#3a2a14', accent: '#ffe1a8',
  },
];

export type AnimState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'dash'
  | 'attack'
  | 'special'
  | 'hurt'
  | 'dodge';

/** 角色 spritesheet：元素使（15）按元素系生成 5 套配色，其余角色 elem 固定 0 */
export const sheetKey = (id: number, elem = 0) =>
  id === 15 ? `charsheet-15-${elem}` : `charsheet-${id}`;
export const animKey = (id: number, s: AnimState, elem = 0) =>
  id === 15 ? `c15-${elem}-${s}` : `c${id}-${s}`;
export const FIREBALL_KEY = 'fx-fireball';
export const DART_KEY = 'fx-dart';
export const BLIND_KEY = 'fx-blind';
export const ARC_FLAME_KEY = 'fx-arc-flame';
export const DREAM_KEY = 'fx-dream';
export const ELEM_FIRE_KEY = 'fx-elem-fire';
export const WATER_KEY = 'fx-water';
export const FROST_KEY = 'fx-frost';
export const STAR_KEY = 'fx-star';

// ---------------------------------------------------------------------------
// 帧布局（序号即 spritesheet 帧号）
// ---------------------------------------------------------------------------
const FRAMES = {
  idle: [0, 1],
  run: [2, 3, 4, 5],
  jump: 6,
  fall: 7,
  dash: [8, 9],
  attack: [10, 11, 12],
  special: 13,
  hurt: 14,
  dodge: 15,
} as const;
const FRAME_COUNT = 16;

interface Pose {
  lean: number; // 上半身水平倾斜位移
  bob: number; // 整体下沉（脚步接地）
  legF: number;
  legB: number;
  legFShort: number; // 前腿屈膝（缩短的像素）
  legBShort: number;
  armFx: number; // 前手臂垂直时的 x 偏移
  armBx: number;
  armUpF: boolean;
  armUpB: boolean;
  punch: number; // 前臂水平伸出长度（0 = 垂直）
  headLean: number;
  blink: boolean;
  mouth: boolean;
  speedLines: boolean;
  strikeFx: boolean;
  spark: boolean;
}

const NEUTRAL: Pose = {
  lean: 0,
  bob: 0,
  legF: 0,
  legB: 0,
  legFShort: 0,
  legBShort: 0,
  armFx: 0,
  armBx: 0,
  armUpF: false,
  armUpB: false,
  punch: 0,
  headLean: 0,
  blink: false,
  mouth: false,
  speedLines: false,
  strikeFx: false,
  spark: false,
};

function pose(over: Partial<Pose>): Pose {
  return { ...NEUTRAL, ...over };
}

// 15 个姿势（帧序号见 FRAMES）
const POSES: Pose[] = [
  // 0-1 待机
  pose({}),
  pose({ bob: 1, blink: true }),
  // 2-5 奔跑循环：前蹬 → 过腿 → 后蹬 → 过腿
  pose({ lean: 1, headLean: 1, bob: 1, legF: 2, legB: -2, armFx: -1, armBx: 1 }),
  pose({ legFShort: 3 }),
  pose({ lean: 1, headLean: 1, bob: 1, legF: -2, legB: 2, armFx: 1, armBx: -1 }),
  pose({ legBShort: 3 }),
  // 6 跳跃：收腿、前手上扬
  pose({ legF: 1, legB: -1, legFShort: 3, legBShort: 2, armUpF: true, armBx: -1 }),
  // 7 下落：分腿、后手抬起保持平衡
  pose({ legF: 2, legB: -2, legFShort: 1, armUpB: true, armFx: 1 }),
  // 8-9 突进：身体前倾、腿后拖、前手探出 + 速度线
  pose({
    lean: 2,
    headLean: 2,
    legF: -1,
    legB: -2,
    legBShort: 2,
    punch: 2,
    armBx: -2,
    speedLines: true,
  }),
  pose({
    lean: 1,
    headLean: 1,
    legF: 1,
    legB: -1,
    legFShort: 1,
    punch: 3,
    armBx: -1,
    speedLines: true,
  }),
  // 10-12 攻击：后缩 → 直拳（带冲击星）→ 回收
  pose({ lean: -1, headLean: -1, armFx: -2 }),
  pose({ lean: 1, headLean: 1, punch: 6, strikeFx: true }),
  pose({ punch: 3 }),
  // 13 必杀（上B）：双手上扬、身体微升 + 能量粒子
  pose({ bob: -1, armUpF: true, armUpB: true, spark: true }),
  // 14 受击：头后仰、手臂乱摆、张嘴
  pose({
    lean: -1,
    headLean: -2,
    legF: 1,
    legB: -2,
    legBShort: 2,
    armUpB: true,
    armFx: -2,
    mouth: true,
  }),
  // 15 幻棱闪避：超低空横掠——身体近乎水平、前腿笔直探出、
  // 后腿深折、单手向后掠近地面，身后拖大弧残影 + 速度线
  pose({
    lean: 3,
    headLean: 3,
    bob: 2,
    legF: 3,
    legB: -3,
    legBShort: 3,
    armFx: -1,
    armBx: -2,
    speedLines: true,
  }),
];

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  c: CharacterDef,
  frame: number,
) {
  const C = c.pal;
  const p = POSES[frame];
  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const L = p.lean;
  const B = p.bob;
  const HL = p.headLean;

  // ---------- 兜帽披风（青叶） ----------
  if (C.cape) {
    px(4 + L, 9 + B, 2, 8, C.hairDark);
    px(4 + L, 9 + B, 1, 8, C.cape);
  }

  // ---------- 剑客：背上的打刀（收刀姿态，斜背） ----------
  if (c.sword && p.punch === 0 && !p.armUpF) {
    for (let i = 0; i < 10; i++) {
      px(13 - i + L, 2 + i + B, 1, 1, i < 2 ? '#5a4632' : '#232838'); // 刀柄/鞘
      px(14 - i + L, 3 + i + B, 1, 1, '#39405c'); // 鞘的高光边
    }
  }

  // ---------- 后腿 / 后靴 ----------
  px(7 + p.legB, 16 + B, 2, 7 - p.legBShort - B, C.clothDark);
  px(6 + p.legB, 23, 3, 2, C.boot);

  // ---------- 后手臂 ----------
  if (p.armUpB) {
    px(6 + L, 6 + B, 2, 4, C.clothDark);
    px(6 + L, 5 + B, 2, 2, C.skin);
  } else {
    px(5 + p.armBx + L, 10 + B, 2, 4, C.clothDark);
    px(5 + p.armBx + L, 14 + B, 2, 2, C.skin);
  }

  // ---------- 躯干 ----------
  px(6 + L, 9 + B, 6, 7, C.cloth);
  px(11 + L, 9 + B, 1, 7, C.clothDark); // 右侧阴影
  if (c.bone) {
    // 鬼人：左半身白骨胸廓（半人半骨）
    px(6 + L, 9 + B, 3, 6, '#e8e4d4');
    px(6 + L, 9 + B, 1, 6, '#c4bfae'); // 骨缘阴影
    px(7 + L, 11 + B, 2, 1, '#8a8574'); // 肋骨纹
    px(7 + L, 13 + B, 2, 1, '#8a8574');
  }
  px(7 + L, 9 + B, 2, 1, C.skin); // 领口（脖子）
  px(6 + L, 15 + B, 6, 1, C.accent); // 腰带
  px(8 + L, 15 + B, 2, 1, '#ffffff'); // 带扣
  if (c.head === 2) px(9 + L, 10 + B, 1, 5, C.accent); // 蓝袍前襟光边
  if (c.visor) px(11 + L, 10 + B, 1, 5, C.accent); // 霓虹：夹克青色侧条
  if (c.hollow) px(8 + L, 11 + B, 2, 1, C.accent); // 虚无：胸口虚纹

  // ---------- 前腿 / 前靴 ----------
  px(9 + p.legF, 16 + B, 2, 7 - p.legFShort - B, C.pants);
  px(9 + p.legF, 23, 3, 2, C.boot);

  // ---------- 头 + 发型/兜帽 ----------
  if (c.head === 0) {
    // 脸
    px(6 + HL, 4 + B, 6, 5, C.skin);
    px(7 + HL, 8 + B, 4, 1, C.skinShade);
    if (c.bone) {
      // 鬼人：左半脸白骨（颅骨 + 黑眼洞 + 齿列）
      px(6 + HL, 4 + B, 2, 5, '#e8e4d4');
      px(6 + HL, 4 + B, 1, 5, '#c4bfae');
      px(7 + HL, 5 + B, 1, 2, '#171018'); // 骷髅眼洞
      px(7 + HL, 8 + B, 2, 1, '#8a8574'); // 齿列阴影
    }
    // 红色尖刺发
    px(9 + HL, 1 + B, 2, 2, C.hair);
    px(6 + HL, 2 + B, 7, 2, C.hair);
    px(6 + HL, 4 + B, 4, 1, C.hair); // 额前刘海，露出 x10 眼部
    px(5 + HL, 4 + B, 1, 2, C.hairDark); // 后刺
    px(12 + HL, 4 + B, 1, 3, C.hair); // 前脸刺（朝右）
    if (c.cat) {
      // 喵喵：两只三角猫耳（深色耳尖 + 粉色耳廓）
      px(5 + HL, 0 + B, 1, 2, C.hairDark);
      px(6 + HL, 0 + B, 1, 1, C.hair);
      px(6 + HL, 1 + B, 1, 1, '#ffb0d8');
      px(12 + HL, 0 + B, 1, 2, C.hairDark);
      px(11 + HL, 0 + B, 1, 1, C.hair);
      px(11 + HL, 1 + B, 1, 1, '#ffb0d8');
    }
  } else {
    // 兜帽外圈
    const hood = C.hood ?? C.hair;
    const hoodDark = C.hoodDark ?? C.hairDark;
    px(3 + HL, 4 + B, 1, 2, hoodDark); // 后尖
    px(4 + HL, 3 + B, 2, 6, hoodDark);
    px(5 + HL, 2 + B, 8, 2, hood);
    px(12 + HL, 3 + B, 2, 6, hoodDark);
    px(4 + HL, 3 + B, 1, 5, hood);

    if (c.head === 1) {
      // 黄色脸 + 粉花
      px(7 + HL, 4 + B, 5, 5, C.skin);
      px(8 + HL, 8 + B, 3, 1, C.skinShade);
      px(4 + HL, 1 + B, 1, 1, C.accent);
      px(6 + HL, 1 + B, 1, 1, C.accent);
      px(5 + HL, 0 + B, 1, 1, C.accent);
      px(5 + HL, 2 + B, 1, 1, C.accent);
      px(5 + HL, 1 + B, 1, 1, '#ffffff');
    } else {
      // 金发刘海 + 脸
      px(7 + HL, 4 + B, 5, 1, C.hair); // 刘海
      px(8 + HL, 3 + B, 1, 1, C.hair);
      px(12 + HL, 5 + B, 1, 3, C.hair); // 侧边发束
      px(7 + HL, 5 + B, 5, 4, C.skin);
      px(8 + HL, 8 + B, 3, 1, C.skinShade);
    }
  }

  // 眼睛 / 眨眼 / 嘴
  const eyeY = c.head === 2 ? 6 + B : 5 + B;
  const eyeX = 10 + HL;
  if (c.visor) {
    // 霓虹：青色护目镜
    px(8 + HL, eyeY, 4, 1, C.accent);
    px(9 + HL, eyeY + 1, 3, 1, '#13b8c9');
    px(11 + HL, eyeY, 1, 1, '#ffffff');
    if (p.mouth) px(9 + HL, 7 + B, 2, 2, '#7a2f2f'); // 张嘴
  } else if (c.hollow) {
    // 虚无：虚白双瞳
    if (!p.mouth) {
      px(9 + HL, eyeY, 1, 1, C.accent);
      px(11 + HL, eyeY, 1, 1, C.accent);
    } else {
      px(9 + HL, eyeY + 1, 1, 1, C.accent);
      px(11 + HL, eyeY + 1, 1, 1, C.accent);
      px(9 + HL, 7 + B, 2, 2, '#3a3560'); // 无光的嘴
    }
  } else if (p.mouth) {
    px(eyeX, eyeY, 1, 2, C.eye);
    px(9 + HL, 7 + B, 2, 2, '#7a2f2f'); // 张嘴
  } else if (p.blink) {
    px(eyeX, eyeY + 1, 1, 1, C.eye);
  } else {
    px(eyeX, eyeY, 1, 2, C.eye);
  }

  // ---------- 前手臂 ----------
  if (p.armUpF) {
    px(10 + L, 5 + B, 2, 5, c.bone ? '#e8e4d4' : C.cloth);
    px(10 + L, 4 + B, 2, 2, c.bone ? '#efeae0' : C.skin);
    if (c.bone) px(10 + L, 8 + B, 2, 1, '#8a8574');
    if (c.sword) {
      // 上挑：刀身竖直指天
      px(12 + L, -2 + B, 1, 7, '#e8eef7');
      px(13 + L, -2 + B, 1, 7, '#9fabc2');
      px(11 + L, 4 + B, 2, 1, '#5a4632'); // 护手
    }
    // 必杀能量粒子
    if (p.spark) {
      px(12 + L, 1 + B, 1, 1, '#ffffff');
      px(14 + L, 3 + B, 1, 1, C.accent);
      px(8 + L, 2 + B, 1, 1, C.accent);
    }
  } else if (p.punch > 0) {
    // 水平直拳（鬼人为白骨爪臂）
    px(11 + L, 11 + B, p.punch, 2, c.bone ? '#e8e4d4' : C.cloth);
    if (c.bone) px(11 + L, 12 + B, p.punch, 1, '#b8b3a4');
    const fx = 11 + L + p.punch - 1;
    px(fx, 10 + B, 3, 3, c.bone ? '#efeae0' : C.skin);
    if (c.sword) {
      // 剑客：自拳头向前伸出的长刀（超出帧部分由战斗层刀光特效补足）
      px(fx - 2, 9 + B, 2, 3, '#5a4632'); // 刀柄
      px(fx + 1, 9 + B, 2, 1, '#e8eef7');
      px(fx + 1, 10 + B, 2, 2, '#9fabc2');
    }
    if (p.strikeFx) {
      // 拳锋冲击星
      px(15 + L, 9 + B, 1, 1, '#ffffff');
      px(16 + L, 10 + B, 1, 1, C.accent);
      px(16 + L, 12 + B, 1, 1, C.accent);
      px(15 + L, 13 + B, 1, 1, '#ffffff');
      px(14 + L, 11 + B, 2, 1, '#ffffff');
    }
  } else {
    px(11 + p.armFx + L, 10 + B, 2, 4, c.bone ? '#e8e4d4' : C.cloth);
    px(11 + p.armFx + L, 14 + B, 2, 2, c.bone ? '#efeae0' : C.skin);
    if (c.bone) px(11 + p.armFx + L, 13 + B, 2, 1, '#8a8574');
  }

  // ---------- 突进速度线 ----------
  if (p.speedLines) {
    ctx.fillStyle = 'rgba(160,235,255,0.85)';
    ctx.fillRect(0, 8 + B, 3, 1);
    ctx.fillRect(1, 11 + B, 4, 1);
    ctx.fillRect(2, 14 + B, 3, 1);
  }
}

// ---------------------------------------------------------------------------
// Phaser 纹理 / 动画
// ---------------------------------------------------------------------------
export function buildCharacterArt(scene: Phaser.Scene) {
  for (let id = 0; id < CHARACTERS.length; id++) {
    // 元素使（15）按五系生成 5 套配色 spritesheet，其余角色 1 套
    const variants = id === 15 ? ELEM_PALS.length : 1;
    for (let elem = 0; elem < variants; elem++) {
      const base = CHARACTERS[id];
      const def: CharacterDef =
        id === 15 ? { ...base, pal: ELEM_PALS[elem] } : base;
      const key = sheetKey(id, elem);
      if (scene.textures.exists(key)) continue;

      const canvas = document.createElement('canvas');
      canvas.width = FRAME_W * FRAME_COUNT;
      canvas.height = FRAME_H;
      const ctx = canvas.getContext('2d')!;
      for (let f = 0; f < FRAME_COUNT; f++) {
        ctx.save();
        ctx.translate(f * FRAME_W, 0);
        drawCharacter(ctx, def, f);
        ctx.restore();
      }

      const tex = scene.textures.addCanvas(key, canvas);
      if (!tex) continue;
      for (let f = 0; f < FRAME_COUNT; f++) {
        tex.add(String(f), 0, f * FRAME_W, 0, FRAME_W, FRAME_H);
      }
      // 像素风：最近邻放大，不糊
      try {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      } catch {
        /* 老版本 Phaser 无 setFilter 时忽略 */
      }

      const num = (frames: number[]) =>
        scene.anims.generateFrameNumbers(key, { frames });
      const create = (
        state: AnimState,
        frames: Phaser.Types.Animations.AnimationFrame[],
        extra?: Partial<Phaser.Types.Animations.Animation>,
      ) =>
        scene.anims.create({
          key: animKey(id, state, elem),
          frames,
          ...extra,
        });

      create('idle', num([...FRAMES.idle]), {
        frameRate: 2.6,
        repeat: -1,
      });
      create('run', num([...FRAMES.run]), {
        frameRate: 12,
        repeat: -1,
      });
      create('jump', num([FRAMES.jump]), { frameRate: 1 });
      create('fall', num([FRAMES.fall]), { frameRate: 1 });
      // 突进两帧合计 DASH_FRAMES（11 帧）
      create(
        'dash',
        [
          { key, frame: FRAMES.dash[0], duration: Math.ceil(DASH_FRAMES / 2) },
          { key, frame: FRAMES.dash[1], duration: Math.floor(DASH_FRAMES / 2) },
        ],
        { frameRate: 60, repeat: -1 },
      );
      // 攻击三帧严格对齐模拟：前摇 / 生效 / 收招（剑客挥剑帧时更长）
      const aStart = id === 6 ? SWORD_ATK_STARTUP : ATK_STARTUP;
      const aActive = id === 6 ? SWORD_ATK_ACTIVE : ATK_ACTIVE;
      const aTotal = id === 6 ? SWORD_ATK_TOTAL : ATK_TOTAL;
      create(
        'attack',
        [
          { key, frame: FRAMES.attack[0], duration: aStart },
          { key, frame: FRAMES.attack[1], duration: aActive },
          {
            key,
            frame: FRAMES.attack[2],
            duration: aTotal - aStart - aActive,
          },
        ],
        { frameRate: 60, repeat: 0 },
      );
      create('special', num([FRAMES.special]), { frameRate: 1 });
      create('hurt', num([FRAMES.hurt]), { frameRate: 1 });
      // 幻棱飘逸闪避：单帧，摆动由表现层逐帧控制
      create('dodge', num([FRAMES.dodge]), { frameRate: 1 });
    }
  }

  // 火球贴图：径向渐变（白芯 → 黄 → 橙 → 透明）
  if (!scene.textures.exists(FIREBALL_KEY)) {
    const size = 26;
    const fc = document.createElement('canvas');
    fc.width = size;
    fc.height = size;
    const fctx = fc.getContext('2d')!;
    const grad = fctx.createRadialGradient(
      size / 2,
      size / 2,
      1,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,225,90,1)');
    grad.addColorStop(0.7, 'rgba(255,122,46,0.85)');
    grad.addColorStop(1, 'rgba(255,90,20,0)');
    fctx.fillStyle = grad;
    fctx.fillRect(0, 0, size, size);
    scene.textures.addCanvas(FIREBALL_KEY, fc);
  }

  // 飞镖贴图：黄色四角星 + 白芯，身后带短拖尾
  if (!scene.textures.exists(DART_KEY)) {
    const size = 20;
    const dc = document.createElement('canvas');
    dc.width = size;
    dc.height = size;
    const dctx = dc.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    // 拖尾（朝左，渲染时随速度翻转）
    dctx.fillStyle = 'rgba(255,225,77,0.45)';
    dctx.beginPath();
    dctx.moveTo(cx - 2, cy - 2);
    dctx.lineTo(0, cy);
    dctx.lineTo(cx - 2, cy + 2);
    dctx.closePath();
    dctx.fill();
    // 四角星
    dctx.fillStyle = '#ffd63c';
    dctx.beginPath();
    dctx.moveTo(cx, 1);
    dctx.lineTo(cx + 3.5, cy - 3.5);
    dctx.lineTo(size - 1, cy);
    dctx.lineTo(cx + 3.5, cy + 3.5);
    dctx.lineTo(cx, size - 1);
    dctx.lineTo(cx - 3.5, cy + 3.5);
    dctx.lineTo(1, cy);
    dctx.lineTo(cx - 3.5, cy - 3.5);
    dctx.closePath();
    dctx.fill();
    // 白芯
    dctx.fillStyle = '#fffbe0';
    dctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    scene.textures.addCanvas(DART_KEY, dc);
  }

  // 噩梦视野收窄遮罩：中心透明圆孔 → 暗紫近黑，贴图足够大可覆盖全屏
  if (!scene.textures.exists(BLIND_KEY)) {
    const size = 1600;
    const bc = document.createElement('canvas');
    bc.width = size;
    bc.height = size;
    const bctx = bc.getContext('2d')!;
    const half = size / 2;
    const grad = bctx.createRadialGradient(half, half, 1, half, half, half);
    grad.addColorStop(0, 'rgba(8,2,16,0)');
    grad.addColorStop(0.2, 'rgba(8,2,16,0)');
    grad.addColorStop(0.34, 'rgba(16,4,32,0.55)');
    grad.addColorStop(0.5, 'rgba(8,2,18,0.92)');
    grad.addColorStop(1, 'rgba(5,1,12,0.98)');
    bctx.fillStyle = grad;
    bctx.fillRect(0, 0, size, size);
    scene.textures.addCanvas(BLIND_KEY, bc);
  }

  // 烈炎弹贴图：白芯 → 金橙 → 烈红 → 暗红外缘（比蓝铃火球更红更烈）
  if (!scene.textures.exists(ARC_FLAME_KEY)) {
    const size = 30;
    const ac = document.createElement('canvas');
    ac.width = size;
    ac.height = size;
    const actx = ac.getContext('2d')!;
    const grad = actx.createRadialGradient(
      size / 2,
      size / 2,
      1,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, 'rgba(255,255,240,1)');
    grad.addColorStop(0.3, 'rgba(255,190,70,1)');
    grad.addColorStop(0.62, 'rgba(255,70,28,0.92)');
    grad.addColorStop(0.85, 'rgba(190,20,10,0.55)');
    grad.addColorStop(1, 'rgba(120,10,5,0)');
    actx.fillStyle = grad;
    actx.fillRect(0, 0, size, size);
    scene.textures.addCanvas(ARC_FLAME_KEY, ac);
  }

  // 梦火弹贴图：粉紫径向渐变（白芯 → 粉 → 紫 → 透明）
  if (!scene.textures.exists(DREAM_KEY)) {
    const size = 30;
    const dc = document.createElement('canvas');
    dc.width = size;
    dc.height = size;
    const dctx = dc.getContext('2d')!;
    const grad = dctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,150,235,1)');
    grad.addColorStop(0.62, 'rgba(190,80,255,0.92)');
    grad.addColorStop(0.85, 'rgba(120,30,200,0.5)');
    grad.addColorStop(1, 'rgba(80,10,140,0)');
    dctx.fillStyle = grad;
    dctx.fillRect(0, 0, size, size);
    scene.textures.addCanvas(DREAM_KEY, dc);
  }

  // 元素火弹贴图：红橙径向渐变（比火球更红、更紧实）
  if (!scene.textures.exists(ELEM_FIRE_KEY)) {
    const size = 28;
    const ec = document.createElement('canvas');
    ec.width = size;
    ec.height = size;
    const ectx = ec.getContext('2d')!;
    const grad = ectx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,250,220,1)');
    grad.addColorStop(0.35, 'rgba(255,150,60,1)');
    grad.addColorStop(0.7, 'rgba(240,60,30,0.9)');
    grad.addColorStop(1, 'rgba(150,20,10,0)');
    ectx.fillStyle = grad;
    ectx.fillRect(0, 0, size, size);
    scene.textures.addCanvas(ELEM_FIRE_KEY, ec);
  }

  // 水弹贴图：天蓝水滴（上尖下圆 + 白芯高光）
  if (!scene.textures.exists(WATER_KEY)) {
    const size = 34;
    const wc = document.createElement('canvas');
    wc.width = size;
    wc.height = size;
    const wctx = wc.getContext('2d')!;
    const cx = size / 2;
    const grad = wctx.createRadialGradient(cx, size * 0.58, 1, cx, size * 0.58, size * 0.42);
    grad.addColorStop(0, 'rgba(235,250,255,1)');
    grad.addColorStop(0.4, 'rgba(120,215,255,1)');
    grad.addColorStop(1, 'rgba(40,140,230,0)');
    wctx.fillStyle = grad;
    wctx.beginPath();
    wctx.moveTo(cx, 3);
    wctx.bezierCurveTo(cx + 11, 14, cx + 13, 24, cx, size - 3);
    wctx.bezierCurveTo(cx - 13, 24, cx - 11, 14, cx, 3);
    wctx.closePath();
    wctx.fill();
    scene.textures.addCanvas(WATER_KEY, wc);
  }

  // 冰封球贴图：白霜芯 → 冰青 → 透明，外缘带碎冰晶
  if (!scene.textures.exists(FROST_KEY)) {
    const size = 28;
    const rc = document.createElement('canvas');
    rc.width = size;
    rc.height = size;
    const rctx = rc.getContext('2d')!;
    const grad = rctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(180,240,255,0.95)');
    grad.addColorStop(0.72, 'rgba(90,190,255,0.6)');
    grad.addColorStop(1, 'rgba(60,140,220,0)');
    rctx.fillStyle = grad;
    rctx.fillRect(0, 0, size, size);
    // 碎冰晶高光
    rctx.fillStyle = 'rgba(255,255,255,0.9)';
    rctx.fillRect(7, 6, 2, 2);
    rctx.fillRect(19, 9, 2, 2);
    rctx.fillRect(9, 19, 2, 2);
    scene.textures.addCanvas(FROST_KEY, rc);
  }

  // 三连星星屑贴图：金黄小四角星 + 白芯 + 微光拖尾
  if (!scene.textures.exists(STAR_KEY)) {
    const size = 18;
    const sc = document.createElement('canvas');
    sc.width = size;
    sc.height = size;
    const sctx = sc.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    sctx.fillStyle = 'rgba(255,210,110,0.4)';
    sctx.beginPath();
    sctx.moveTo(cx - 2, cy - 2);
    sctx.lineTo(1, cy);
    sctx.lineTo(cx - 2, cy + 2);
    sctx.closePath();
    sctx.fill();
    sctx.fillStyle = '#ffd978';
    sctx.beginPath();
    sctx.moveTo(cx, 2);
    sctx.lineTo(cx + 3, cy - 3);
    sctx.lineTo(size - 2, cy);
    sctx.lineTo(cx + 3, cy + 3);
    sctx.lineTo(cx, size - 2);
    sctx.lineTo(cx - 3, cy + 3);
    sctx.lineTo(2, cy);
    sctx.lineTo(cx - 3, cy - 3);
    sctx.closePath();
    sctx.fill();
    sctx.fillStyle = '#fffbe0';
    sctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    scene.textures.addCanvas(STAR_KEY, sc);
  }
}
