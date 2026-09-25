// 网络协议定义：
// - 信令（WebSocket，可靠）：建房间 / 加入 / 交换 WebRTC SDP 与 ICE
// - 对战（RTCDataChannel game，不可靠无序）：输入与快照，允许丢帧
// - 对战（RTCDataChannel ctl，可靠有序）：开局 / 重开等控制消息
import type { Fighter, Projectile } from '../game/sim';

// ---------------------------------------------------------------------------
// 信令消息（浏览器 <-> Node 信令服务器）
// ---------------------------------------------------------------------------
export type SignalClientMessage =
  | { t: 'create' }
  | { t: 'join'; code: string }
  | { t: 'signal'; payload: RTCSessionDescriptionInit | RTCIceCandidateInit };

export type SignalServerMessage =
  | { t: 'created'; code: string }
  | { t: 'joined'; code: string }
  | { t: 'guest-joined' }
  | { t: 'guest-left' }
  | { t: 'host-left' }
  | { t: 'signal'; payload: RTCSessionDescriptionInit | RTCIceCandidateInit }
  | { t: 'error'; message: string };

// ---------------------------------------------------------------------------
// 对战输入（每个物理帧采样一次）
// ---------------------------------------------------------------------------
export interface InputState {
  /** 水平意图：-1 左 / 0 / 1 右 */
  ix: number;
  /** 下方向（按住）：速降 / 穿平台 */
  down: boolean;
  /** 跳跃键按住（用于可变跳高） */
  jumpH: boolean;
  /** 跳跃键本帧按下（边沿触发） */
  jumpP: boolean;
  /** 攻击键本帧按下 */
  atkP: boolean;
  /** 必杀键本帧按下 */
  spcP: boolean;
  /** 突进键（Shift）本帧按下 */
  dshP: boolean;
  /** 角色专属技能键（Ctrl）本帧按下 */
  skP: boolean;
  /** 角色专属技能键（Ctrl）本帧按住（狂徒蓄力用） */
  skH: boolean;
  /** 秘术键（Q）本帧按下 */
  qP: boolean;
  /** 鼠标在世界坐标中的位置（元素使「降水」落点瞄准用） */
  mx: number;
  my: number;
  /** 鼠标滚轮下滚本帧边沿（元素使切换元素系） */
  whP: boolean;
}

export const NEUTRAL_INPUT: InputState = {
  ix: 0,
  down: false,
  jumpH: false,
  jumpP: false,
  atkP: false,
  spcP: false,
  dshP: false,
  skP: false,
  skH: false,
  qP: false,
  mx: 640,
  my: 360,
  whP: false,
};

// ---------------------------------------------------------------------------
// P2P 对战消息
// ---------------------------------------------------------------------------
export interface InputMessage {
  t: 'input';
  seq: number;
  in: InputState;
}

export interface SnapshotMessage {
  t: 'snap';
  /** 房主权威帧号 */
  tick: number;
  /** 房主已处理到的房客输入序号（用于客户端预测对账） */
  ack: number;
  f: [Fighter, Fighter];
  /** 权威端飞行物（火球等） */
  p: Projectile[];
}

export interface HelloMessage {
  t: 'hello';
  /** 自己选定的角色 id */
  char: number;
  /** 自己携带的秘术 id */
  arcana: number;
}

export type ControlMessage =
  | { t: 'start'; /** 房主随机选定的地图序号 */ map: number }
  | { t: 'reset'; map: number }
  | HelloMessage;

export type GameMessage = InputMessage | SnapshotMessage | ControlMessage;
