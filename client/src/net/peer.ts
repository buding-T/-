// WebRTC 点对点连接：
// - game 通道：不可靠、无序、0 重传（输入 / 快照，丢一帧无所谓）
// - ctl  通道：可靠、有序（开局 / 重开）
// 房主创建 DataChannel 并发起 offer；客机应答。
import { Signaling, defaultSignalUrl } from './signaling';
import type {
  ControlMessage,
  GameMessage,
  InputMessage,
  SignalServerMessage,
  SnapshotMessage,
} from './protocol';

export type PeerRole = 'host' | 'guest';

export interface PeerEvents {
  roomcode?: (code: string) => void;
  status?: (text: string) => void;
  ready?: () => void;
  input?: (msg: InputMessage) => void;
  snapshot?: (msg: SnapshotMessage) => void;
  control?: (msg: ControlMessage) => void;
  peerleft?: () => void;
  error?: (message: string) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3477' },
];

export class NetPeer {
  readonly role: PeerRole;
  readonly signal = new Signaling();
  private pc: RTCPeerConnection | null = null;
  private gameChan: RTCDataChannel | null = null;
  private ctlChan: RTCDataChannel | null = null;
  private events: PeerEvents;

  /** 场景切换后替换全部事件回调 */
  setEvents(events: PeerEvents) {
    this.events = events;
  }
  private readyFired = false;
  private earlyCandidates: RTCIceCandidateInit[] = [];
  code = '';

  constructor(role: PeerRole, events: PeerEvents, code = '') {
    this.role = role;
    this.events = events;
    this.code = code.toUpperCase();
  }

  async start(): Promise<void> {
    await this.signal.connect(defaultSignalUrl());
    const off = this.signal.on((msg) => this.onSignal(msg));
    this.cleanupFns.push(off);

    if (this.role === 'host') {
      this.events.status?.('正在创建房间…');
      this.signal.send({ t: 'create' });
    } else {
      this.events.status?.(`正在加入房间 ${this.code}…`);
      this.signal.send({ t: 'join', code: this.code });
    }
  }

  private cleanupFns: Array<() => void> = [];

  private onSignal(msg: SignalServerMessage) {
    switch (msg.t) {
      case 'created':
        this.code = msg.code;
        this.events.roomcode?.(msg.code);
        this.events.status?.('房间已创建，等待对手加入…');
        break;
      case 'joined':
        this.events.status?.('已加入房间，正在建立 P2P 连接…');
        break;
      case 'guest-joined':
        this.events.status?.('对手已加入，正在建立 P2P 连接…');
        void this.hostConnect();
        break;
      case 'signal':
        void this.relaySignal(msg.payload);
        break;
      case 'guest-left':
        this.events.peerleft?.();
        break;
      case 'host-left':
        this.events.peerleft?.();
        break;
      case 'error':
        this.events.error?.(msg.message);
        break;
    }
  }

  private createPc() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.signal.send({ t: 'signal', payload: ev.candidate.toJSON() });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.events.peerleft?.();
      }
    };
    return pc;
  }

  private bindChannel(ch: RTCDataChannel) {
    ch.binaryType = 'arraybuffer';
    if (ch.label === 'game') {
      this.gameChan = ch;
      ch.onmessage = (ev) => this.dispatch(ev.data);
    } else if (ch.label === 'ctl') {
      this.ctlChan = ch;
      ch.onmessage = (ev) => this.dispatch(ev.data);
    }
    ch.onopen = () => this.maybeReady();
    ch.onclose = () => this.events.peerleft?.();
  }

  private dispatch(data: unknown) {
    if (typeof data !== 'string') return;
    let msg: GameMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    switch (msg.t) {
      case 'input':
        this.events.input?.(msg);
        break;
      case 'snap':
        this.events.snapshot?.(msg);
        break;
      case 'start':
      case 'reset':
      case 'hello':
        this.events.control?.(msg);
        break;
    }
  }

  private maybeReady() {
    if (
      !this.readyFired &&
      this.gameChan?.readyState === 'open' &&
      this.ctlChan?.readyState === 'open'
    ) {
      this.readyFired = true;
      this.events.ready?.();
    }
  }

  private async hostConnect() {
    const pc = this.createPc();
    const game = pc.createDataChannel('game', {
      ordered: false,
      maxRetransmits: 0,
    });
    const ctl = pc.createDataChannel('ctl', { ordered: true });
    this.bindChannel(game);
    this.bindChannel(ctl);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signal.send({ t: 'signal', payload: offer });
  }

  private async relaySignal(
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ) {
    // 客机在收到首个 offer 时才创建连接
    if (!this.pc && this.role === 'guest' && 'type' in payload && payload.type === 'offer') {
      const pc = this.createPc();
      pc.ondatachannel = (ev) => this.bindChannel(ev.channel);
      await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
      for (const c of this.earlyCandidates.splice(0)) {
        try {
          await pc.addIceCandidate(c);
        } catch {
          // 忽略无效候选
        }
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.signal.send({ t: 'signal', payload: answer });
      return;
    }

    if (!this.pc) {
      // offer 到达前的候选先缓存
      if ('candidate' in payload) this.earlyCandidates.push(payload);
      return;
    }

    if ('type' in payload && (payload.type === 'answer' || payload.type === 'offer')) {
      await this.pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
      for (const c of this.earlyCandidates.splice(0)) {
        try {
          await this.pc.addIceCandidate(c);
        } catch {
          // 忽略无效候选
        }
      }
    } else if ('candidate' in payload) {
      try {
        await this.pc.addIceCandidate(payload as RTCIceCandidateInit);
      } catch {
        // 候选早于 remote description 等竞态：忽略
      }
    }
  }

  get isOpen(): boolean {
    return (
      this.gameChan?.readyState === 'open' && this.ctlChan?.readyState === 'open'
    );
  }

  sendGame(msg: InputMessage | SnapshotMessage) {
    if (this.gameChan?.readyState === 'open') {
      this.gameChan.send(JSON.stringify(msg));
    }
  }

  sendControl(msg: ControlMessage) {
    if (this.ctlChan?.readyState === 'open') {
      this.ctlChan.send(JSON.stringify(msg));
    }
  }

  close() {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    try {
      this.gameChan?.close();
      this.ctlChan?.close();
      this.pc?.close();
    } catch {
      // 忽略关闭异常
    }
    this.signal.close();
  }
}
