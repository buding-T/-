import Phaser from 'phaser';
import {
  CHARACTERS,
  CHAR_SCALE,
  BLIND_KEY,
  DART_KEY,
  FIREBALL_KEY,
  ARC_FLAME_KEY,
  DREAM_KEY,
  ELEM_FIRE_KEY,
  WATER_KEY,
  FROST_KEY,
  STAR_KEY,
  FRAME_H,
  animKey,
  sheetKey,
  type AnimState,
} from '../game/characters';
import {
  COLORS,
  DASH_COOLDOWN_FRAMES,
  DT_MS,
  MAPS,
  MAX_DMG,
  REMOTE_INTERP_MS,
  SKILL0_LOCK,
  SKILL0_RADIUS,
  SKILL1_LOCK,
  SKILL3_STARTUP,
  SKILL3_TELE_LOCK,
  SKILL3_TELE_STARTUP,
  SKILL5_CHARGE_FRAMES,
  SKILL5_PULSE_R,
  SKILL5_SHIELD_FRAMES,
  SKILL7_LOCK,
  SKILL8_LOCK,
  SKILL_CD_FRAMES,
  SKILL10_WHIFF_LOCK,
  SKILL11_LOCK,
  SKILL12_HITBOX,
  SKILL12_FURY_FRAMES,
  SKILL13_LOCK,
  SKILL14_LOCK,
  SKILL16_FAIL_CD,
  SKILL16_DONE_CD,
  SKILL16_SLOW_FRAMES,
  SKILL16_DELAY_FRAMES,
  SKILL16_STRIKE_LOCK,
  SKILL19_CHARGE_MAX,
  SKILL19_BURST_FRAMES,
  SKILL19_RANGE_MAX,
  ELEM_CD_FRAMES,
  ELEM_COLORS,
  ELEM_NAMES,
  ELEM_LOCK_FRAMES,
  ELEM_SWITCH_CD,
  ELEM_WATER_R,
  ELEM_WATER_DELAY,
  SNAPSHOT_EVERY,
  START_STOCKS,
  VIEW_H,
  VIEW_W,
  VOID_GUARD_FRAMES,
  ARCANAS,
  ARCANA_CD_FRAMES,
  ARCANA_LOCK_FRAMES,
  ARC4_STARTUP,
  ARC5_ARMOR_FRAMES,
  type MapDef,
} from '../game/constants';
import { InputSampler } from '../game/input';
import {
  attackBox,
  botThink,
  createFighter,
  stepFighter,
  type Fighter,
  type FrostZone,
  type Projectile,
  Sim,
} from '../game/sim';
import type { NetPeer, PeerRole } from '../net/peer';
import {
  NEUTRAL_INPUT,
  type InputState,
  type SnapshotMessage,
} from '../net/protocol';

type Phase = 'count' | 'fight' | 'over';

interface RemoteEntry {
  snap: SnapshotMessage;
  t: number;
}

interface BattleData {
  role: PeerRole;
  /** 人机对战：本机权威直接驱动 AI，无 P2P 连接 */
  vsBot?: boolean;
}

const COUNTDOWN_MS = 3000;
const GO_MS = 700;
const BANNER_MS = 1100;

export class BattleScene extends Phaser.Scene {
  private role!: PeerRole;
  private myId!: 0 | 1;
  private vsBot = false;
  private peer: NetPeer | null = null;
  private sampler!: InputSampler;
  private arcanas: [number, number] = [0, 0];

  // 房主权威
  private sim!: Sim;
  // 客机
  private predicted!: Fighter;
  private remoteSeed!: Fighter;
  private remoteBuf: RemoteEntry[] = [];
  private history = new Map<number, InputState>();
  private seq = 0;
  private guestInput: InputState = { ...NEUTRAL_INPUT };
  private guestAck = 0;
  private lastGuestAt = 0;
  private static readonly GUEST_INPUT_TTL_MS = 90;
  private static readonly HISTORY_LIMIT = 600;

  private phase: Phase = 'count';
  private phaseT = 0;
  private acc = 0;
  private bannerT = 0;
  private lastStocks: [number, number] = [START_STOCKS, START_STOCKS];

  private gfx!: Phaser.GameObjects.Graphics;
  private gfxBack!: Phaser.GameObjects.Graphics;
  private chars: [number, number] = [0, 1];
  private spr!: [Phaser.GameObjects.Sprite, Phaser.GameObjects.Sprite];
  private ghosts!: [
    Phaser.GameObjects.Image[],
    Phaser.GameObjects.Image[],
  ];
  private curAnim: [string, string] = ['', ''];
  private curElem: [number, number] = [0, 0];
  private elemTexts!: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private map!: MapDef;
  private mapText!: Phaser.GameObjects.Text;
  private stageGfx!: Phaser.GameObjects.Graphics;
  private remoteProjectiles: Projectile[] = [];
  private remoteFrostZones: FrostZone[] = [];
  private projSprites = new Map<number, Phaser.GameObjects.Image>();
  /** 降水爆炸水波（权威事件驱动，存活 16 帧） */
  private waterBursts: Array<{ x: number; y: number; r: number; born: number }> = [];
  /** 噩梦诅咒：本机玩家视野收窄遮罩 */
  private blindMask?: Phaser.GameObjects.Image;
  private banner!: Phaser.GameObjects.Text;
  private result!: Phaser.GameObjects.Text;
  private dmgTexts!: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private nameTexts!: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private hint!: Phaser.GameObjects.Text;
  /** 幻棱特写慢动作：相机缩放（平滑逼近目标值） */
  private slowZoom = 1;

  constructor() {
    super('battle');
  }

  init(data: BattleData) {
    this.role = data.role;
    this.vsBot = data.vsBot === true;
    this.myId = this.role === 'host' ? 0 : 1;
    this.remoteSeed = createFighter((1 - this.myId) as 0 | 1);
    this.phase = 'count';
    this.phaseT = 0;
    this.acc = 0;
    this.bannerT = 0;
    this.guestInput = { ...NEUTRAL_INPUT };
    this.guestAck = 0;
    this.lastGuestAt = 0;
    this.remoteBuf = [];
    this.history.clear();
    this.seq = 0;
    this.lastStocks = [START_STOCKS, START_STOCKS];
  }

  create() {
    this.peer = (this.registry.get('peer') as NetPeer | undefined) ?? null;

    // 解析双方角色（菜单选择经 registry 传递，对手选择由房间内 hello 同步）
    const normalize = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 && n < CHARACTERS.length
        ? n
        : fallback;
    };
    const normalizeArc = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 && n < ARCANAS.length
        ? n
        : fallback;
    };
    const myChar = normalize(this.registry.get('char'), this.myId === 0 ? 0 : 1);
    const oppChar = normalize(
      this.registry.get('oppChar'),
      this.myId === 0 ? 1 : 0,
    );
    this.chars =
      this.myId === 0 ? [myChar, oppChar] : [oppChar, myChar];
    const myArc = normalizeArc(this.registry.get('arcana'), 0);
    const oppArc = normalizeArc(this.registry.get('oppArcana'), 0);
    this.arcanas =
      this.myId === 0 ? [myArc, oppArc] : [oppArc, myArc];
    this.curAnim = ['', ''];
    this.curElem = [0, 0];
    this.map = this.getMap();

    this.sim = new Sim(this.chars, this.map, this.arcanas);

    this.predicted = createFighter(
      this.myId,
      this.chars[this.myId],
      this.map,
      this.arcanas[this.myId],
    );
    this.remoteSeed = createFighter(
      (1 - this.myId) as 0 | 1,
      this.chars[(1 - this.myId) as 0 | 1],
      this.map,
      this.arcanas[(1 - this.myId) as 0 | 1],
    );
    this.remoteProjectiles = [];
    this.remoteFrostZones = [];
    for (const s of this.projSprites.values()) s.destroy();
    this.projSprites.clear();
    this.waterBursts = [];

    this.drawStage();
    this.gfxBack = this.add.graphics().setDepth(8);
    this.gfx = this.add.graphics().setDepth(12);

    // 地图名（顶部居中）
    this.mapText = this.add
      .text(VIEW_W / 2, 18, `地图 · ${this.map.name}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#7078a8',
      })
      .setOrigin(0.5)
      .setDepth(20);

    // 角色精灵 + 突进残影
    this.ghosts = [[], []];
    this.spr = [0, 1].map((id) => {
      const s = this.add
        .sprite(0, 0, sheetKey(this.chars[id as 0 | 1]), 0)
        .setOrigin(0.5, 24 / FRAME_H)
        .setScale(CHAR_SCALE)
        .setDepth(10)
        .setVisible(false);
      for (let i = 0; i < 3; i++) {
        const ghost = this.add
          .image(0, 0, sheetKey(this.chars[id as 0 | 1]), 0)
          .setOrigin(0.5, 24 / FRAME_H)
          .setScale(CHAR_SCALE)
          .setDepth(9)
          .setAlpha(0)
          .setVisible(false);
        this.ghosts[id as 0 | 1].push(ghost);
      }
      return s;
    }) as [Phaser.GameObjects.Sprite, Phaser.GameObjects.Sprite];

    const teamLabel = ['蓝方', '红方'];
    this.nameTexts = [
      this.add.text(40, 24, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#8fc4ff',
      }),
      this.add
        .text(VIEW_W - 40, 24, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#ff9d9d',
        })
        .setOrigin(1, 0),
    ];
    this.nameTexts.forEach((t, id) =>
      t.setText(
        `${teamLabel[id]} ${CHARACTERS[this.chars[id]].name}〔${ARCANAS[this.arcanas[id]].name}〕`,
      ),
    );
    this.nameTexts[this.myId].setText(
      this.nameTexts[this.myId].text + '（你）',
    );
    if (this.vsBot) {
      this.nameTexts[1 - this.myId].setText(
        this.nameTexts[1 - this.myId].text + '（AI）',
      );
    }

    this.dmgTexts = [
      this.add.text(40, 46, '0%', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#4da6ff',
      }),
      this.add
        .text(VIEW_W - 40, 46, '0%', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ff5d5d',
        })
        .setOrigin(1, 0),
    ];
    // 能量槽下方的机制标注：击飞能量越高被打飞得越远，上限 100%
    this.add.text(40, 98, '击飞能量', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#8a93c8',
    });
    this.add
      .text(VIEW_W - 40, 98, '击飞能量', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#8a93c8',
      })
      .setOrigin(1, 0);

    // 元素使：头顶当前元素系名称（drawOverhead 中按帧定位/变色）
    this.elemTexts = [0, 1].map(() =>
      this.add
        .text(0, 0, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#eaf2ff',
        })
        .setOrigin(0.5)
        .setStroke('#141830', 3)
        .setDepth(13)
        .setVisible(false),
    ) as [Phaser.GameObjects.Text, Phaser.GameObjects.Text];

    this.banner = this.add
      .text(VIEW_W / 2, 260, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.result = this.add
      .text(VIEW_W / 2, 200, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5);

    this.hint = this.add
      .text(
        VIEW_W / 2,
        VIEW_H - 28,
        'A/D 移动　W/空格 跳跃（二段跳）　S 速降/穿台　左键 攻击　右键 回场必杀　Shift 突进　Ctrl 角色技能（元素使滚轮下滚切系）　Q 秘术　F 全屏　Esc 离开',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '17px',
          color: '#7078a8',
        },
      )
      .setOrigin(0.5);

    this.sampler = new InputSampler(this.input.keyboard!);

    // 人机模式无 P2P 连接；联机模式才注册网络回调
    this.peer?.setEvents({
      input: (msg) => {
        if (this.role !== 'host') return;
        this.guestInput = msg.in;
        this.guestAck = msg.seq;
        this.lastGuestAt = performance.now();
      },
      snapshot: (msg) => this.onSnapshot(msg),
      control: (msg) => {
        if (msg.t === 'reset') {
          // 房主重开时随机了新地图，本端跟随
          this.registry.set('map', msg.map);
          this.doReset(false);
        }
      },
      peerleft: () => {
        this.banner.setText('对手已断开').setColor('#ff8a8a');
      },
    });

    this.input.keyboard?.on('keydown-ESC', this.leave);
    this.input.keyboard?.on('keydown-R', () => {
      if (this.phase === 'over') {
        // 重开即新地图：房主随机并同步给客机（人机模式本地直接重开）
        const map = Phaser.Math.Between(0, MAPS.length - 1);
        this.registry.set('map', map);
        this.peer?.sendControl({ t: 'reset', map });
        this.doReset(true);
      }
    });
    // F 全屏：全屏模式下锁定系统快捷键（解决 Ctrl+W/D/S 等冲突，Chrome 支持）
    this.input.keyboard?.on('keydown-F', () => {
      const kb = (
        navigator as unknown as {
          keyboard?: { lock?: () => Promise<void>; unlock?: () => void };
        }
      ).keyboard;
      if (this.scale.isFullscreen) {
        kb?.unlock?.();
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
        // 等 fullscreenchange 后再锁，lock() 要求已处于全屏
        const onEnter = () => {
          kb?.lock?.().catch(() => {});
          this.scale.off('enterfullscreen', onEnter);
        };
        this.scale.on('enterfullscreen', onEnter);
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sampler.destroy();
      this.input.keyboard?.off('keydown-ESC', this.leave);
    });
  }

  private leave = () => {
    this.peer?.close();
    this.peer = null;
    this.registry.remove('peer');
    this.registry.remove('vsBot');
    this.scene.start('menu');
  };

  private doReset(local: boolean) {
    if (this.phase === 'count') return;
    this.map = this.getMap();
    this.sim.reset(this.map);
    this.predicted = createFighter(
      this.myId,
      this.chars[this.myId],
      this.map,
      this.arcanas[this.myId],
    );
    this.remoteSeed = createFighter(
      (1 - this.myId) as 0 | 1,
      this.chars[(1 - this.myId) as 0 | 1],
      this.map,
      this.arcanas[(1 - this.myId) as 0 | 1],
    );
    this.mapText.setText(`地图 · ${this.map.name}`);
    this.redrawStage();
    this.remoteBuf = [];
    this.remoteProjectiles = [];
    this.remoteFrostZones = [];
    for (const s of this.projSprites.values()) s.destroy();
    this.projSprites.clear();
    this.waterBursts = [];
    this.history.clear();
    this.seq = 0;
    this.guestInput = { ...NEUTRAL_INPUT };
    this.lastGuestAt = 0;
    this.lastStocks = [START_STOCKS, START_STOCKS];
    this.phase = 'count';
    this.phaseT = 0;
    this.acc = 0;
    this.result.setText('');
    this.banner.setColor('#ffffff');
    if (local) this.banner.setText('');
  }

  // ---------------------------------------------------------------------
  // 网络消息
  // ---------------------------------------------------------------------
  private onSnapshot(msg: SnapshotMessage) {
    if (this.role !== 'guest') return;
    if (this.phase === 'over') return;

    this.remoteProjectiles = msg.p ?? [];
    this.remoteFrostZones = msg.z ?? [];

    // 远端插值缓冲
    this.remoteBuf.push({ snap: msg, t: performance.now() });
    if (this.remoteBuf.length > 30) this.remoteBuf.shift();

    // 检测生命数变化 / 终局（用于本地表现）
    for (const id of [0, 1] as const) {
      const st = msg.f[id];
      if (st.stocks < this.lastStocks[id]) {
        this.showBanner('KO!');
        this.cameras.main.shake(250, 0.01);
      }
      if (st.dead) {
        const winner = (id === 0 ? 1 : 0) as 0 | 1;
        this.endGame(winner);
      }
      this.lastStocks[id] = st.stocks;
    }

    // 权威状态校正 + 重放未确认输入（客户端预测对账）
    Object.assign(this.predicted, msg.f[this.myId]);
    for (let s = msg.ack + 1; s <= this.seq; s++) {
      const inp = this.history.get(s);
      if (inp) stepFighter(this.predicted, inp, this.sim.map);
    }
    for (const key of [...this.history.keys()]) {
      if (key <= msg.ack) this.history.delete(key);
    }

    // 受到攻击时轻微震动
    const myDmg = msg.f[this.myId].dmg;
    if (myDmg > (this.lastMyDmg ?? 0)) this.cameras.main.shake(120, 0.006);
    this.lastMyDmg = myDmg;
  }

  private lastMyDmg = 0;

  // ---------------------------------------------------------------------
  // 固定步长
  // ---------------------------------------------------------------------
  private hostTick() {
    const ptr = this.input.activePointer;
    const local = this.sampler.sample(ptr.worldX, ptr.worldY);
    let guest: InputState;
    if (this.vsBot) {
      // 人机：AI 驱动蓝方对手（id=1），权威状态即 sim 当前状态
      guest = botThink(
        this.sim.fighters[1],
        this.sim.fighters[0],
        this.sim.map,
        this.sim.tick,
      );
    } else {
      // 客机输入过期（标签页切到后台被节流 / 丢包）时按无输入处理，避免“卡键”
      const guestFresh =
        this.lastGuestAt > 0 &&
        performance.now() - this.lastGuestAt < BattleScene.GUEST_INPUT_TTL_MS;
      guest = guestFresh ? this.guestInput : NEUTRAL_INPUT;
    }
    this.sim.step([local, guest]);

    if (this.peer && this.sim.tick % SNAPSHOT_EVERY === 0) {
      this.peer.sendGame({
        t: 'snap',
        tick: this.sim.tick,
        ack: this.guestAck,
        f: this.sim.fighters,
        p: this.sim.projectiles,
        z: this.sim.frostZones,
      });
    }

    for (const ev of this.sim.events) {
      if (ev.type === 'ko') {
        this.showBanner('KO!');
        this.cameras.main.shake(300, 0.012);
      } else if (ev.type === 'hit' && ev.target === this.myId) {
        this.cameras.main.shake(120, 0.006);
      } else if (ev.type === 'waterburst') {
        this.waterBursts.push({ x: ev.x, y: ev.y, r: ev.r, born: this.sim.tick });
      } else if (ev.type === 'end') {
        this.endGame(ev.winner);
      }
    }
  }

  private guestTick() {
    const ptr = this.input.activePointer;
    const inp = this.sampler.sample(ptr.worldX, ptr.worldY);
    this.seq += 1;
    this.history.set(this.seq, inp);
    // 安全上限：快照确认前缓存的输入历史不超过 10 秒量
    if (this.history.size > BattleScene.HISTORY_LIMIT) {
      const oldest = this.history.keys().next().value as number;
      this.history.delete(oldest);
    }
    this.peer?.sendGame({ t: 'input', seq: this.seq, in: inp });
    stepFighter(this.predicted, inp, this.sim.map);
  }

  private endGame(winner: 0 | 1) {
    if (this.phase === 'over') return;
    this.phase = 'over';
    const label = `${winner === 0 ? '蓝方' : '红方'} ${CHARACTERS[this.chars[winner]].name}`;
    const resultText = winner === this.myId
      ? '你赢了 🎉'
      : this.vsBot
        ? 'AI 获胜'
        : '你输了';
    this.result.setText(`${label} 胜利！\n${resultText}`);
    this.hint.setText('R 再战一局　　Esc 返回菜单');
  }

  private showBanner(text: string) {
    this.banner.setText(text);
    this.bannerT = BANNER_MS;
  }

  // ---------------------------------------------------------------------
  // 主循环
  // ---------------------------------------------------------------------
  update(_time: number, deltaMs: number) {
    const delta = Math.min(deltaMs, 100);
    this.phaseT += delta;
    if (this.bannerT > 0) {
      this.bannerT -= delta;
      if (this.bannerT <= 0 && this.phase === 'fight') this.banner.setText('');
    }

    if (this.phase === 'count') {
      const left = COUNTDOWN_MS - this.phaseT;
      if (left > 0) {
        this.banner.setText(String(Math.ceil(left / 1000)));
      } else {
        this.phase = 'fight';
        this.phaseT = 0;
        this.showBanner('FIGHT!');
        this.bannerT = GO_MS;
      }
      this.render();
      return;
    }

    if (this.phase === 'fight') {
      // 幻棱闪避成功：任一方处于特写窗口时，权威步进按 0.45 倍速（表现层慢动作）
      const slow = this.sim.fighters.some((f) => f.phSlowT > 0);
      this.acc += delta * (slow ? 0.45 : 1);
      while (this.acc >= DT_MS) {
        this.acc -= DT_MS;
        if (this.role === 'host') this.hostTick();
        else this.guestTick();
      }
    }

    this.render();
  }

  // ---------------------------------------------------------------------
  // 渲染
  // ---------------------------------------------------------------------
  private drawStage() {
    this.stageGfx = this.add.graphics();
    this.redrawStage();
  }

  /** 按当前地图重绘舞台（重开换图时调用） */
  private redrawStage() {
    const g = this.stageGfx;
    g.clear();
    g.fillGradientStyle(this.map.bg, this.map.bg, 0x070a16, 0x070a16, 1);
    g.fillRect(0, 0, VIEW_W, VIEW_H);

    // 确定性伪随机（同一地图远景稳定，不随帧闪烁）
    const rnd = (n: number) => {
      const x = Math.sin(n * 127.1 + this.map.name.length * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    // 星空（所有主题通用）
    for (let i = 0; i < 64; i++) {
      const sx = Math.floor(rnd(i) * VIEW_W);
      const sy = Math.floor(rnd(i + 100) * 560);
      const a = 0.12 + rnd(i + 200) * 0.4;
      g.fillStyle(0xdfe8ff, a);
      g.fillCircle(sx, sy, i % 7 === 0 ? 1.6 : 1);
    }

    const theme = this.map.theme ?? 'classic';

    // ---------- 远景装饰 ----------
    if (theme === 'classic') {
      // 中央辉光 + 两侧巨柱
      g.fillStyle(0xffffff, 0.03);
      g.fillCircle(640, 300, 260);
      for (const cx of [110, 1170]) {
        g.fillStyle(0xffffff, 0.04);
        g.fillRect(cx, 180, 56, 460);
        g.fillStyle(0xffffff, 0.07);
        g.fillRect(cx - 8, 180, 72, 12);
      }
    } else if (theme === 'void') {
      // 紫色星云 + 远处孤岛剪影
      for (const [cx, cy, r, a] of [
        [260, 200, 150, 0.05],
        [980, 150, 190, 0.06],
        [700, 380, 130, 0.04],
      ] as const) {
        g.fillStyle(0x8a5cf6, a);
        g.fillCircle(cx, cy, r);
      }
      g.fillStyle(0x0c0a18, 0.55);
      g.fillEllipse(640, 300, 300, 60);
      g.fillTriangle(520, 300, 760, 300, 660, 420);
    } else if (theme === 'sky') {
      // 三座远景浮空岛 + 云带
      const islands: Array<[number, number, number, number]> = [
        [210, 240, 150, 26],
        [1040, 300, 200, 32],
        [640, 150, 120, 20],
      ];
      for (const [ix, iy, iw, ih] of islands) {
        g.fillStyle(0x6fe0e8, 0.08);
        g.fillEllipse(ix, iy, iw, ih);
        g.fillTriangle(ix - iw / 2.4, iy, ix + iw / 2.4, iy, ix, iy + ih * 2.4);
      }
      g.fillStyle(0xbfeeff, 0.05);
      for (let i = 0; i < 5; i++) {
        g.fillEllipse(120 + i * 260, 120 + (i % 2) * 60, 220, 34);
      }
    } else if (theme === 'pillar') {
      // 悬挂战旗 + 灯笼
      for (const cx of [170, 1110]) {
        g.fillStyle(0x5a1f33, 0.5);
        g.fillRect(cx - 18, 0, 36, 190);
        g.fillStyle(0x8a3550, 0.7);
        g.fillRect(cx - 26, 60, 52, 10);
      }
      for (const [lx, ly] of [
        [330, 250],
        [950, 250],
      ] as const) {
        g.fillStyle(0xff9d5d, 0.12);
        g.fillCircle(lx, ly, 34);
        g.fillStyle(0xffb072, 0.5);
        g.fillCircle(lx, ly, 10);
      }
    } else if (theme === 'lava') {
      // 底部岩浆辉光 + 余烬 + 顶部钟乳石
      g.fillStyle(0xff5a1e, 0.1);
      g.fillRect(0, 640, VIEW_W, 80);
      g.fillStyle(0xff5a1e, 0.05);
      g.fillRect(0, 700, VIEW_W, 20);
      for (let i = 0; i < 26; i++) {
        g.fillStyle(i % 3 === 0 ? 0xffd166 : 0xff7a2e, 0.5 + rnd(i) * 0.4);
        g.fillCircle(40 + rnd(i + 9) * 1200, 560 + rnd(i) * 140, 1 + rnd(i + 2) * 1.6);
      }
      g.fillStyle(0x180a10, 0.9);
      for (let i = 0; i < 9; i++) {
        const sx2 = 40 + i * 150 + rnd(i) * 60;
        g.fillTriangle(sx2 - 26, 0, sx2 + 26, 0, sx2, 50 + rnd(i + 3) * 70);
      }
    } else if (theme === 'ice') {
      // 极光带 + 霜月
      g.fillStyle(0x5fe6c8, 0.05);
      g.fillEllipse(560, 170, 760, 90);
      g.fillStyle(0x6aa8ff, 0.05);
      g.fillEllipse(760, 230, 700, 70);
      g.fillStyle(0xbfe8ff, 0.1);
      g.fillCircle(1030, 130, 70);
      g.fillStyle(0xeaf6ff, 0.85);
      g.fillCircle(1030, 130, 46);
      g.fillStyle(this.map.bg, 0.7);
      g.fillCircle(1014, 118, 10);
      g.fillCircle(1046, 142, 7);
      for (let i = 0; i < 40; i++) {
        g.fillStyle(0xffffff, 0.25 + rnd(i + 50) * 0.4);
        const sx2 = rnd(i + 5) * VIEW_W;
        const sy2 = rnd(i + 15) * VIEW_H;
        g.fillRect(sx2, sy2, 1.5, 1.5);
      }
    }

    // ---------- 主题色板 ----------
    const PAL: Record<
      string,
      { body: number; dark: number; cap: number; seam: number }
    > = {
      classic: { body: 0x3a3f5c, dark: 0x272b42, cap: 0x8b94d4, seam: 0x000000 },
      void: { body: 0x332f4e, dark: 0x221f3a, cap: 0x9a86e8, seam: 0x000000 },
      sky: { body: 0x2e4a5e, dark: 0x1d3242, cap: 0x7fd4e8, seam: 0x000000 },
      pillar: { body: 0x4a2f3e, dark: 0x301e2a, cap: 0xd47aa8, seam: 0x000000 },
      lava: { body: 0x3a2026, dark: 0x231216, cap: 0xff8a3c, seam: 0x1a0a0c },
      ice: { body: 0x2c4260, dark: 0x1b2a42, cap: 0xbfe8ff, seam: 0x10203a },
    };
    const pal = PAL[theme] ?? PAL.classic;

    // ---------- 实心地板 ----------
    for (const fl of this.map.floors) {
      g.fillStyle(pal.body, 1);
      g.fillRect(fl.x, fl.y, fl.w, fl.h);
      // 两侧压暗 + 底部渐暗
      g.fillStyle(0x000000, 0.22);
      g.fillRect(fl.x, fl.y, 5, fl.h);
      g.fillRect(fl.x + fl.w - 5, fl.y, 5, fl.h);
      g.fillStyle(pal.dark, 0.55);
      g.fillRect(fl.x, fl.y + 60, fl.w, fl.h - 60);
      g.fillStyle(0x000000, 0.18);
      g.fillRect(fl.x, fl.y + Math.min(120, fl.h - 10), fl.w, fl.h - 120);
      // 砖缝
      g.lineStyle(1, pal.seam, 0.16);
      for (let yy = fl.y + 28; yy < fl.y + fl.h; yy += 28) {
        g.lineBetween(fl.x, yy, fl.x + fl.w, yy);
      }
      for (let xx = fl.x + 48; xx < fl.x + fl.w; xx += 56) {
        g.lineBetween(xx, fl.y + 6, xx, fl.y + Math.min(fl.h, 80));
      }
      // 主题细节：岩浆裂纹 / 冰霜高光
      if (theme === 'lava') {
        g.fillStyle(0xff5a1e, 0.22);
        g.fillRect(fl.x, fl.y + 6, fl.w, 10);
        g.fillStyle(0xffa04d, 0.8);
        for (let i = 0; i < fl.w / 70; i++) {
          const cx = fl.x + 30 + rnd(i + fl.x) * (fl.w - 60);
          g.fillRect(cx, fl.y + 26 + rnd(i + 3) * 40, 22, 2);
          g.fillRect(cx + 12, fl.y + 26 + rnd(i + 3) * 40, 8, 2);
        }
      } else if (theme === 'ice') {
        g.fillStyle(0xffffff, 0.18);
        for (let i = 0; i < fl.w / 90; i++) {
          g.fillTriangle(
            fl.x + 40 + rnd(i + fl.x) * (fl.w - 80),
            fl.y + 34,
            fl.x + 60 + rnd(i + 2) * (fl.w - 80),
            fl.y + 34,
            fl.x + 50 + rnd(i + 4) * (fl.w - 80),
            fl.y + 60,
          );
        }
      }
      // 顶面亮帽
      g.fillStyle(pal.cap, 0.95);
      g.fillRect(fl.x, fl.y, fl.w, 6);
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(fl.x, fl.y, fl.w, 2);
    }

    // ---------- 单向平台（金属横梁） ----------
    for (const p of this.map.platforms) {
      g.fillStyle(pal.dark, 1);
      g.fillRoundedRect(p.x - 2, p.y + 2, p.w + 4, p.h + 4, 5);
      g.fillStyle(pal.body, 1);
      g.fillRoundedRect(p.x, p.y, p.w, p.h, 5);
      g.fillStyle(0x000000, 0.28);
      g.fillRect(p.x, p.y, 5, p.h);
      g.fillRect(p.x + p.w - 5, p.y, 5, p.h);
      g.fillStyle(pal.cap, 0.95);
      g.fillRect(p.x + 5, p.y, p.w - 10, 4);
      g.fillStyle(0xffffff, 0.25);
      g.fillRect(p.x + 5, p.y, p.w - 10, 1.5);
      // 端部悬挂支架
      g.fillStyle(pal.dark, 0.9);
      g.fillTriangle(p.x + 4, p.y + p.h, p.x + 18, p.y + p.h, p.x + 11, p.y + p.h + 9);
      g.fillTriangle(
        p.x + p.w - 4,
        p.y + p.h,
        p.x + p.w - 18,
        p.y + p.h,
        p.x + p.w - 11,
        p.y + p.h + 9,
      );
    }
  }

  /** 从 registry 读取地图序号（越界/缺省回退经典图） */
  private getMap(): MapDef {
    const n = Number(this.registry.get('map'));
    return Number.isInteger(n) && n >= 0 && n < MAPS.length
      ? MAPS[n]
      : MAPS[0];
  }

  private getRemoteRender(): Fighter | null {
    if (this.remoteBuf.length === 0) return null;
    const remoteId = (1 - this.myId) as 0 | 1;
    const now = performance.now();
    const renderT = now - REMOTE_INTERP_MS;

    let b = this.remoteBuf.findIndex((e) => e.t >= renderT);
    if (b === -1) {
      // 比最新快照还新：直接取最新（不做外推）
      return { ...this.remoteBuf[this.remoteBuf.length - 1].snap.f[remoteId] };
    }
    if (b === 0) return { ...this.remoteBuf[0].snap.f[remoteId] };

    const a = this.remoteBuf[b - 1];
    const bx = this.remoteBuf[b];
    const alpha = Phaser.Math.Clamp((renderT - a.t) / (bx.t - a.t), 0, 1);
    const fa = a.snap.f[remoteId];
    const fb = { ...bx.snap.f[remoteId] };
    fb.x = Phaser.Math.Linear(fa.x, fb.x, alpha);
    fb.y = Phaser.Math.Linear(fa.y, fb.y, alpha);
    fb.vx = Phaser.Math.Linear(fa.vx, fb.vx, alpha);
    fb.vy = Phaser.Math.Linear(fa.vy, fb.vy, alpha);
    return fb;
  }

  private render() {
    const g = this.gfx;
    g.clear();
    this.gfxBack.clear();

    const f0: Fighter =
      this.role === 'host'
        ? this.sim.fighters[0]
        : this.myId === 0
          ? this.predicted
          : (this.getRemoteRender() ?? this.remoteSeed);
    const f1: Fighter =
      this.role === 'host'
        ? this.sim.fighters[1]
        : this.myId === 1
          ? this.predicted
          : (this.getRemoteRender() ?? this.remoteSeed);

    this.drawShadow(f0);
    this.drawShadow(f1);
    this.updateFighterVisual(0, f0);
    this.updateFighterVisual(1, f1);
    this.drawSkillFx(g, 0, f0);
    this.drawSkillFx(g, 1, f1);
    this.drawOverhead(g, 0, f0, f1);
    this.drawOverhead(g, 1, f1, f0);
    this.renderProjectiles(
      this.role === 'host'
        ? this.sim.projectiles
        : this.remoteProjectiles,
    );

    // 噩梦诅咒：本机玩家被诅咒时，以自己为中心收窄视野
    const mine = this.myId === 0 ? f0 : f1;
    const blinded = mine.blindT > 0 && !mine.dead && mine.respawn === 0;
    if (blinded) {
      if (!this.blindMask) {
        this.blindMask = this.add
          .image(0, 0, BLIND_KEY)
          .setDepth(36);
      }
      this.blindMask.setVisible(true).setPosition(mine.x, mine.y);
    } else if (this.blindMask) {
      this.blindMask.setVisible(false);
    }

    // 元素使降水：本机鼠标落点预览圈（仅切到水系且存活时）
    if (
      this.chars[this.myId] === 15 &&
      mine.elem === 2 &&
      !mine.dead &&
      mine.respawn === 0 &&
      this.phase === 'fight'
    ) {
      const ptr = this.input.activePointer;
      const ready = mine.elemCd[2] === 0;
      const wx = ptr.worldX;
      const wy = ptr.worldY;
      g.lineStyle(2, 0x7fd8ff, ready ? 0.85 : 0.28);
      g.strokeCircle(wx, wy, ELEM_WATER_R);
      g.lineStyle(1, 0xbfeeff, ready ? 0.9 : 0.4);
      g.strokeCircle(wx, wy, 6 + 2 * Math.sin(performance.now() / 120));
      g.lineBetween(wx - 12, wy, wx - 5, wy);
      g.lineBetween(wx + 5, wy, wx + 12, wy);
      g.lineBetween(wx, wy - 12, wx, wy - 5);
      g.lineBetween(wx, wy + 5, wx, wy + 12);
    }

    // HUD：击飞能量槽与生命点
    this.updateHud(f0, f1);

    // 幻棱特写：窗口期间相机推近并锁定闪避者，结束平滑拉回
    const slowF = f0.phSlowT > 0 ? f0 : f1.phSlowT > 0 ? f1 : null;
    const cam = this.cameras.main;
    const targetZoom = slowF ? 1.5 : 1;
    this.slowZoom += (targetZoom - this.slowZoom) * 0.14;
    cam.setZoom(this.slowZoom);
    if (slowF) cam.centerOn(slowF.x, slowF.y);
    else cam.centerOn(VIEW_W / 2, VIEW_H / 2);
  }

  private stateAnim(id: 0 | 1, f: Fighter): AnimState {
    switch (f.mode) {
      case 'hurt':
        return 'hurt';
      case 'attack':
        return 'attack';
      case 'special':
        return 'special';
      case 'skill':
        // 秘术施法：重击复用出拳，其余秘术复用聚气姿势
        if (f.arcMode) return f.arcKind === 4 ? 'attack' : 'special';
        // 喵喵狂爪复用出拳姿势
        if (this.chars[id] === 12) return 'attack';
        // 元素使逐风复用突进姿势
        if (this.chars[id] === 15 && f.elem === 0) return 'dash';
        // 幻棱闪避：专属飘逸侧滑姿势（低身、双臂后掠）
        if (this.chars[id] === 16 && f.skillPhase === 0) return 'dodge';
        // 青叶瞬移、闪光二段追击复用突进姿势；其余复用聚气姿势
        return this.chars[id] === 1 ||
          (this.chars[id] === 3 && f.skillPhase === 1)
          ? 'dash'
          : 'special';
      case 'dash':
        return 'dash';
      case 'jump':
        return 'jump';
      case 'fall':
        return 'fall';
      case 'run':
        return 'run';
      default:
        return 'idle';
    }
  }

  private updateFighterVisual(id: 0 | 1, f: Fighter) {
    const spr = this.spr[id];

    if (f.dead || f.respawn > 0) {
      spr.setVisible(false);
      for (const gh of this.ghosts[id]) gh.setVisible(false);
      this.curAnim[id] = '';
      return;
    }

    spr.setVisible(true);
    const feetY = f.y + f.h / 2 + 1;
    spr.setPosition(f.x, feetY);
    spr.setFlipX(f.face < 0);
    // 复活无敌期间半透明闪烁（突进斩/重击前摇的无敌不闪烁，由专属特效表现）
    spr.setAlpha(
      f.invuln > 0 && Math.floor(f.invuln / 5) % 2 === 0 ? 0.35 : 1,
    );

    // 元素使：切换元素系时更换整套配色 spritesheet（主精灵与残影同步）
    const elem = this.chars[id] === 15 ? f.elem : 0;
    if (elem !== this.curElem[id]) {
      const texKey = sheetKey(this.chars[id], elem);
      spr.setTexture(texKey);
      for (const gh of this.ghosts[id]) gh.setTexture(texKey);
      this.curElem[id] = elem;
      this.curAnim[id] = ''; // 贴图切换后强制重播当前动作
    }

    // 只在模拟状态切换边沿重播动作，避免动画被每帧重置
    const key = animKey(this.chars[id], this.stateAnim(id, f), elem);
    if (this.curAnim[id] !== key) {
      this.curAnim[id] = key;
      spr.play(key);
    }

    // 突进/瞬移/闪避残影：同帧像素小人 + 身后渐隐
    const ghostOn =
      f.mode === 'dash' ||
      (f.mode === 'skill' &&
        (this.chars[id] === 1 ||
          this.chars[id] === 16 ||
          (this.chars[id] === 3 && f.skillPhase === 1)));
    const ghosts = this.ghosts[id];
    // 鬼人突进斩残影染紫
    const oniDive = this.chars[id] === 13 && f.oniDiveT > 0;
    if (ghostOn) {
      const frame = spr.frame.name;
      ghosts.forEach((gh, i) => {
        gh.setVisible(true);
        gh.setFrame(frame);
        gh.setFlipX(f.face < 0);
        gh.setPosition(f.x - f.face * (i + 1) * 14, feetY);
        gh.setAlpha(0.24 / (i + 1));
        gh.setTint(oniDive ? 0xb44dff : 0xffffff);
      });
    } else {
      for (const gh of ghosts) gh.setVisible(false);
    }

    // 幻棱闪避：超低空横掠期间身体大幅前倾并轻微摆动；其余状态角度归零
    if (
      this.chars[id] === 16 &&
      f.mode === 'skill' &&
      f.skillPhase === 0 &&
      f.phDodgeT > 0
    ) {
      spr.setRotation(
        f.face * (0.2 + Math.sin((f.modeT + 1) * 0.55) * 0.06),
      );
    } else {
      spr.setRotation(0);
    }
  }

  /** 技能施法特效：赤焰震波环、青叶/闪光瞬移光团、飞镖聚光、蝶环绕粉蝶与护盾 */
  private drawSkillFx(g: Phaser.GameObjects.Graphics, id: 0 | 1, f: Fighter) {
    if (f.dead || f.respawn > 0) return;
    const ch = this.chars[id];
    const now = performance.now();

    // 蝶：蓄力期粉蝶环绕，成盾后粉色护罩（与施法动作解耦，任何状态都显示）
    if (ch === 5) {
      if (f.chargeT > 0) {
        const t = 1 - f.chargeT / SKILL5_CHARGE_FRAMES;
        const radius = 30 + 5 * Math.sin(now / 120);
        for (let i = 0; i < 3; i++) {
          const a = now / 260 + (i * Math.PI * 2) / 3;
          const bx = f.x + Math.cos(a) * radius;
          const by = f.y - 6 + Math.sin(a) * radius * 0.62;
          g.fillStyle(0xff9ee6, 0.95);
          g.fillTriangle(bx, by - 3.5, bx - 4.5, by + 1, bx, by + 1);
          g.fillTriangle(bx, by - 3.5, bx + 4.5, by + 1, bx, by + 1);
          g.fillStyle(0xffffff, 0.55);
          g.fillRect(bx - 1, by - 1, 2, 2);
        }
        g.lineStyle(2, COLORS.spirit, 0.2 + 0.4 * t);
        g.strokeCircle(f.x, f.y - 4, 24 + 10 * t);
      }
      if (f.shieldT > 0) {
        // 成盾瞬间的扩散震退环
        const pop = SKILL5_SHIELD_FRAMES - f.shieldT;
        if (pop < 12) {
          const pt = pop / 12;
          g.lineStyle(4, COLORS.spirit, 0.6 * (1 - pt));
          g.strokeCircle(f.x, f.y - 2, 20 + SKILL5_PULSE_R * pt);
        }
        const blink = f.shieldT < 40 && Math.floor(f.shieldT / 5) % 2 === 0;
        const pulse = 1 + 0.03 * Math.sin(now / 150);
        g.fillStyle(COLORS.spirit, blink ? 0.04 : 0.1);
        g.fillCircle(f.x, f.y - 2, 38 * pulse);
        g.lineStyle(3, COLORS.spirit, blink ? 0.25 : 0.75);
        g.strokeCircle(f.x, f.y - 2, 38 * pulse);
      }
    }

    // 霓虹（8）：超频期间的霓虹拖影光环（与施法动作解耦，任何状态都显示）
    if (ch === 8 && f.neonT > 0) {
      const pulse = 1 + 0.12 * Math.sin(now / 70);
      g.fillStyle(0x35f0ff, 0.1);
      g.fillEllipse(f.x, f.y - 2, 34 * pulse, 52 * pulse);
      g.lineStyle(2, 0x35f0ff, 0.7);
      g.strokeEllipse(f.x, f.y - 2, 30 * pulse, 48 * pulse);
      // 跑动时身后的双色速度线
      const dir = f.vx >= 0 ? -1 : 1;
      for (let i = 0; i < 3; i++) {
        const off = 8 + i * 8 + ((now / 16) % 8);
        const ly = f.y - 12 + i * 11;
        g.lineStyle(2, i % 2 ? 0xff3df0 : 0x35f0ff, 0.75 - i * 0.18);
        g.lineBetween(f.x + dir * (14 + off), ly, f.x + dir * (22 + off), ly);
      }
    }

    // 虚无（9）：招架期间的虚白护盾（与施法动作解耦）
    if (ch === 9 && f.voidGuardT > 0) {
      const t = f.voidGuardT / VOID_GUARD_FRAMES;
      const blink = f.voidGuardT < 12 && Math.floor(f.voidGuardT / 4) % 2 === 0;
      const pulse = 1 + 0.05 * Math.sin(now / 90);
      g.fillStyle(0xb9b6ff, blink ? 0.05 : 0.12);
      g.fillCircle(f.x, f.y - 2, 34 * pulse);
      g.lineStyle(3, blink ? 0x6f6ab8 : 0xe9e8ff, 0.9);
      g.strokeCircle(f.x, f.y - 2, 34 * pulse);
      g.lineStyle(1, 0xffffff, 0.5 * t + 0.2);
      g.strokeCircle(f.x, f.y - 2, 40 * pulse);
    }

    // 秘术·霸体（5）：紫色身环，持续 2 秒期间任何状态都显示
    if (f.armorT > 0) {
      const pulse = 1 + 0.08 * Math.sin(now / 80);
      g.fillStyle(0xb58bff, 0.12);
      g.fillEllipse(f.x, f.y - 2, 38 * pulse, 56 * pulse);
      g.lineStyle(3, 0xd9c2ff, 0.85);
      g.strokeEllipse(f.x, f.y - 2, 34 * pulse, 52 * pulse);
      if (f.armorT > ARC5_ARMOR_FRAMES - 10) {
        // 开启瞬间的扩散环
        const pt = 1 - (f.armorT - (ARC5_ARMOR_FRAMES - 10)) / 10;
        g.lineStyle(4, 0xb58bff, 0.7 * (1 - pt));
        g.strokeCircle(f.x, f.y - 2, 18 + 34 * pt);
      }
    }

    // 鬼人（13）：鬼燃强化期间白骨侧紫焰升腾；突进斩时紫色速度线 + 全身紫焰
    if (ch === 13 && f.oniBuffT > 0 && f.oniDiveT === 0) {
      for (let i = 0; i < 3; i++) {
        const wob = Math.sin(now / 60 + i * 2.1) * 4;
        const rise = (now / 12 + i * 9) % 20;
        const fx = f.x + (i - 1) * 9 + wob;
        const fy = f.y - 14 - rise;
        g.fillStyle(0xc44dff, 0.6 - i * 0.12 - rise / 60);
        g.fillCircle(fx, fy, 4.2 - i * 0.5);
        g.fillStyle(0xf0d8ff, 0.75 - i * 0.12 - rise / 80);
        g.fillCircle(fx, fy + 1, 1.7);
      }
      g.lineStyle(1, 0xc44dff, 0.35 + 0.15 * Math.sin(now / 90));
      g.strokeEllipse(f.x, f.y - 2, 32, 52);
    }
    if (ch === 13 && f.oniDiveT > 0) {
      const dir = -f.face;
      for (let i = 0; i < 4; i++) {
        const off = 6 + i * 10 + ((now / 10) % 10);
        g.lineStyle(3 - (i >> 1), 0xc44dff, 0.8 - i * 0.15);
        g.lineBetween(
          f.x + dir * off,
          f.y - 18 + i * 11,
          f.x + dir * (off + 18),
          f.y - 18 + i * 11,
        );
      }
      g.fillStyle(0xc44dff, 0.16);
      g.fillEllipse(f.x, f.y - 2, 48, 60);
    }

    // 元素使（15）：御土土盾（黄褐色椭圆岩罩）
    if (ch === 15 && f.earthT > 0) {
      const blink = f.earthT < 16 && Math.floor(f.earthT / 4) % 2 === 0;
      const pulse = 1 + 0.03 * Math.sin(now / 90);
      g.fillStyle(0xc89a4e, blink ? 0.1 : 0.22);
      g.fillEllipse(f.x, f.y - 2, 48 * pulse, 62 * pulse);
      g.lineStyle(3, 0xe8c27a, blink ? 0.45 : 0.9);
      g.strokeEllipse(f.x, f.y - 2, 48 * pulse, 62 * pulse);
      g.lineStyle(2, 0x8a5f2a, 0.7);
      g.strokeEllipse(f.x, f.y - 2, 35 * pulse, 48 * pulse);
    }

    // 元素使：切系瞬间当前系色扩散环
    if (ch === 15 && f.elemSwitchCd > 0) {
      const since = ELEM_SWITCH_CD - f.elemSwitchCd;
      if (since < 10) {
        const pt = since / 10;
        g.lineStyle(3, ELEM_COLORS[f.elem], 0.7 * (1 - pt));
        g.strokeCircle(f.x, f.y - 2, 16 + 30 * pt);
      }
    }

    // 被斗士擒抱：束缚光环
    if (f.grabbedBy >= 0) {
      const a = 0.5 + 0.3 * Math.sin(now / 90);
      g.lineStyle(2, 0xd08a3e, a);
      g.strokeCircle(f.x, f.y - 2, 28);
      g.lineStyle(1, 0xf2c14e, a);
      g.strokeCircle(f.x, f.y - 2, 22);
    }

    // 唤雷眩晕：身体周围麻痹电花
    if (f.stunT > 0) {
      for (let i = 0; i < 3; i++) {
        const a = now / 80 + (i * Math.PI * 2) / 3;
        const sx = f.x + Math.cos(a) * 22;
        const sy = f.y - 8 + Math.sin(a) * 20;
        g.fillStyle(0xffe14d, 0.9);
        g.fillRect(sx - 1, sy - 3, 2, 6);
        g.fillRect(sx - 3, sy - 1, 6, 2);
      }
    }

    // 幻棱（16）：闪避青光、特写棱光、二段待斩斩光
    if (ch === 16) {
      if (f.phDodgeT > 0) {
        // 超低空横掠：身后巨大白色弧刃残影（参考动作），三层渐远
        for (let i = 0; i < 3; i++) {
          const r = 44 - i * 8;
          g.lineStyle(5 - i, i === 0 ? 0xffffff : 0x7de0ff, 0.55 - i * 0.13);
          g.beginPath();
          g.arc(
            f.x - f.face * (4 + i * 3),
            f.y + 6,
            r,
            f.face > 0 ? Math.PI * 0.55 : -Math.PI * 0.45,
            f.face > 0 ? Math.PI * 1.45 : Math.PI * 0.45,
            false,
          );
          g.strokePath();
        }
        // 贴地青蓝旋光
        g.fillStyle(0x7de0ff, 0.16);
        g.fillEllipse(f.x, f.y + 20, 46, 12);
        g.lineStyle(2, 0xbfefff, 0.8);
        g.strokeEllipse(f.x, f.y + 20, 42, 10);
      }
      if (f.phSlowT > 0) {
        const t = f.phSlowT / SKILL16_SLOW_FRAMES;
        g.lineStyle(2, 0x7de0ff, 0.5 * t + 0.2);
        g.strokeCircle(f.x, f.y - 2, 36 + 4 * Math.sin(now / 80));
        g.lineStyle(2, 0x8f7bff, 0.5 * t + 0.2);
        g.strokeCircle(f.x, f.y - 2, 44 + 4 * Math.cos(now / 110));
        g.fillStyle(0xffffff, 0.5 * t + 0.2);
        g.fillCircle(f.x, f.y - 2, 3);
      }
      if (f.phTeleT > 0) {
        // 瞬移后 0.1 秒瞬斩蓄光（快速拉满）
        const t = 1 - f.phTeleT / SKILL16_DELAY_FRAMES;
        g.fillStyle(0xffffff, 0.22 + 0.42 * t);
        g.fillEllipse(f.x + f.face * 6, f.y - 2, 18 + 12 * t, 40);
        g.fillStyle(0x7de0ff, 0.2 + 0.3 * t);
        g.fillEllipse(f.x + f.face * 4, f.y - 2, 12 + 8 * t, 34);
      }
    }

    // 吸血鬼（18）：血渴 6 秒猩红脉动
    if (ch === 18 && f.vampT > 0) {
      const pulse = 1 + 0.1 * Math.sin(now / 80);
      g.fillStyle(0xff4d6d, 0.12);
      g.fillEllipse(f.x, f.y - 2, 36 * pulse, 54 * pulse);
      g.lineStyle(2, 0xff4d6d, 0.8);
      g.strokeEllipse(f.x, f.y - 2, 32 * pulse, 50 * pulse);
    }

    // 狂徒（19）：蓄力橙光渐盛；轰拳 12 帧前向爆光
    if (ch === 19) {
      if (f.manCharge > 0) {
        const t = f.manCharge / SKILL19_CHARGE_MAX;
        g.fillStyle(0xff8a3c, 0.08 + 0.14 * t);
        g.fillEllipse(f.x, f.y - 2, 30 + 26 * t, 52);
        g.lineStyle(2, 0xffb13c, 0.4 + 0.5 * t);
        g.strokeEllipse(f.x, f.y - 2, 26 + 22 * t, 48);
        g.fillStyle(0xffe1a0, 0.5 + 0.4 * t);
        g.fillCircle(f.x + f.face * 10, f.y - 6, 2 + 3 * t);
      }
      if (f.manBurstT > 0) {
        const t = 1 - f.manBurstT / SKILL19_BURST_FRAMES;
        const r = 14 + SKILL19_RANGE_MAX * 0.7 * t;
        g.fillStyle(0xffb13c, 0.5 * (1 - t));
        g.fillEllipse(f.x + f.face * (r / 2 - 6), f.y - 2, r, 72 * (1 - t * 0.4));
        g.fillStyle(0xffffff, 0.7 * (1 - t));
        g.fillEllipse(f.x + f.face * (r / 2 - 6), f.y - 2, r * 0.5, 40 * (1 - t * 0.4));
      }
    }

    // 雷光瞬闪：冲刺帧身后三道疾光
    if (f.lungeT > 0) {
      for (let i = 0; i < 3; i++) {
        g.lineStyle(3 - i, i === 0 ? 0xffffff : 0x6fa8ff, 0.8 - i * 0.2);
        g.lineBetween(
          f.x - f.face * (8 + i * 9), f.y - 2 + (i - 1) * 8,
          f.x - f.face * (22 + i * 9), f.y - 2 + (i - 1) * 8,
        );
      }
    }
    // 焚血狂战：猩红焰环脉动（玻璃大炮增益提示）
    if (f.berserkT > 0) {
      const c = 1 + 0.08 * Math.sin(now / 60);
      g.fillStyle(0xff6e5e, 0.1);
      g.fillEllipse(f.x, f.y - 2, 34 * c, 54 * c);
      g.lineStyle(2, 0xff8a3c, 0.6 + 0.2 * Math.sin(now / 90));
      g.strokeEllipse(f.x, f.y - 2, 32 * c, 52 * c);
    }
    // 冰封领域地面（id===0 全量绘制一次；冰面+冰刺，临消失淡出）
    if (id === 0) {
      const zones = this.role === 'host' ? this.sim.frostZones : this.remoteFrostZones;
      for (const z of zones) {
        const fade = z.t < 30 ? z.t / 30 : 1;
        g.fillStyle(0x8fe3ff, 0.14 * fade);
        g.fillEllipse(z.x, z.y + 26, z.w, 16);
        g.lineStyle(2, 0xbfefff, 0.7 * fade);
        g.strokeEllipse(z.x, z.y + 26, z.w, 16);
        for (let s = -2; s <= 2; s++) {
          g.fillStyle(0xffffff, 0.5 * fade);
          g.fillTriangle(
            z.x + (s * z.w) / 5 - 2, z.y + 26,
            z.x + (s * z.w) / 5, z.y + 17,
            z.x + (s * z.w) / 5 + 2, z.y + 26,
          );
        }
      }
    }

    if (f.mode !== 'skill') return;

    // 秘术施法特效分流（与角色技能互斥）
    if (f.arcMode) {
      this.drawArcanaFx(g, f, now);
      return;
    }

    if (ch === 0) {
      const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL0_LOCK, 0, 1);
      const r = 20 + SKILL0_RADIUS * t;
      g.lineStyle(5, 0xff8a3c, 0.55 * (1 - t));
      g.strokeCircle(f.x, f.y, r);
      g.lineStyle(2, 0xffe1a0, 0.5 * (1 - t));
      g.strokeCircle(f.x, f.y, r * 0.72);
    } else if (ch === 1) {
      const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL1_LOCK, 0, 1);
      g.fillStyle(0x9af2d6, 0.4 * (1 - t));
      g.fillCircle(f.x, f.y, 14 + 22 * t);
    } else if (ch === 3) {
      if (f.skillPhase === 0) {
        // 投镖前摇：面前聚起黄色光点
        const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL3_STARTUP, 0, 1);
        g.fillStyle(COLORS.dart, 0.85);
        g.fillCircle(f.x + f.face * 16, f.y - 6, 3 + 5 * t);
        g.fillStyle(0xffffff, 0.85);
        g.fillCircle(f.x + f.face * 16, f.y - 6, 1.5 + 2 * t);
      } else if (f.skillPhase === 1) {
        // 二段大动作前摇：缩身聚光，越聚越亮
        const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL3_TELE_STARTUP, 0, 1);
        g.fillStyle(COLORS.dart, 0.3 + 0.5 * t);
        g.fillCircle(f.x + f.face * (6 + 5 * t), f.y - 6, 2 + 4 * t);
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(f.x + f.face * (6 + 5 * t), f.y - 6, 1 + 1.6 * t);
      } else {
        // 瞬移出手：黄色爆开光团
        const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL3_TELE_LOCK, 0, 1);
        g.fillStyle(COLORS.dart, 0.5 * (1 - t));
        g.fillCircle(f.x, f.y, 12 + 26 * t);
      }
    } else if (ch === 16) {
      if (f.skillPhase === 4) {
        // 瞬斩收招：横向蓝白快刃光贯穿敌人后快速淡出（小后摇 12 帧）
        const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL16_STRIKE_LOCK, 0, 1);
        g.lineStyle(5, 0xffffff, 0.85 * (1 - t));
        g.lineBetween(f.x - f.face * 6, f.y - 2, f.x + f.face * 58, f.y - 2);
        g.lineStyle(2, 0x7de0ff, 0.8 * (1 - t));
        g.lineBetween(f.x - f.face * 4, f.y + 6, f.x + f.face * 52, f.y + 6);
        g.lineStyle(2, 0x8f7bff, 0.6 * (1 - t));
        g.lineBetween(f.x - f.face * 4, f.y - 10, f.x + f.face * 46, f.y - 10);
      }
    } else if (ch === 7) {
      // 噩梦：扩散紫环 + 头顶闭合的咒眼
      const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL7_LOCK, 0, 1);
      g.lineStyle(4, COLORS.nightmare, 0.8 * (1 - t));
      g.strokeCircle(f.x, f.y - 4, 16 + 64 * t);
      g.lineStyle(1, 0xff4d6d, 0.9 * (1 - t * 0.6));
      g.strokeCircle(f.x, f.y - 4, 22 + 40 * t);
      const eyeY = f.y - 26;
      g.fillStyle(0x1a0826, 0.95);
      g.fillEllipse(f.x, eyeY, 14, 8);
      g.fillStyle(0xff4d6d, 0.95);
      g.fillEllipse(f.x, eyeY, 5, 6);
    } else if (ch === 8) {
      // 霓虹：超频启动的青/洋红扩散双环
      const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL8_LOCK, 0, 1);
      g.lineStyle(4, 0x35f0ff, 0.8 * (1 - t));
      g.strokeCircle(f.x, f.y - 2, 16 + 44 * t);
      g.lineStyle(2, 0xff3df0, 0.6 * (1 - t));
      g.strokeCircle(f.x, f.y - 2, 10 + 30 * t);
    } else if (ch === 10) {
      // 斗士擒抱：抓住后身前金色钳环 + 投前聚光；抓空时抓捕弧
      if (f.grappleT > 0) {
        const gx = f.x + f.face * 30;
        const pulse = 1 + 0.1 * Math.sin(now / 70);
        g.lineStyle(3, 0xf2c14e, 0.9);
        g.strokeCircle(gx, f.y - 2, 20 * pulse);
        g.lineStyle(2, 0xd08a3e, 0.6);
        g.strokeCircle(gx, f.y - 2, 27 * pulse);
        if (f.grappleT < 12) {
          const pt = 1 - f.grappleT / 12;
          g.fillStyle(0xffe9a0, 0.32 * pt);
          g.fillCircle(gx, f.y - 2, 30);
          g.lineStyle(4, 0xffd76a, 0.8 * pt);
          g.strokeCircle(gx, f.y - 2, 18 + 14 * pt);
        }
      } else {
        const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL10_WHIFF_LOCK, 0, 1);
        g.lineStyle(4, 0xf2c14e, 0.7 * (1 - t));
        g.strokeCircle(f.x + f.face * 22, f.y - 4, 14 + 18 * t);
      }
    } else if (ch === 11) {
      // 祭司血誓：暗红誓环 + 上升血珠
      const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL11_LOCK, 0, 1);
      g.lineStyle(3, 0xd83a5a, 0.7 * (1 - t));
      g.strokeCircle(f.x, f.y - 2, 16 + 22 * t);
      g.lineStyle(1, 0xff9daf, 0.6 * (1 - t));
      g.strokeCircle(f.x, f.y - 2, 10 + 12 * t);
      for (let i = 0; i < 4; i++) {
        const rise = (now / 10 + i * 9) % 30;
        g.fillStyle(0xff6a86, 0.85 * (1 - rise / 30));
        g.fillCircle(
          f.x - 12 + i * 8 + Math.sin(now / 100 + i) * 2,
          f.y - 2 - rise,
          2.2,
        );
      }
    } else if (ch === 12) {
      // 喵喵狂爪：身前粉色爪弧，每个出爪节拍高亮 + 爪痕线
      const hb = SKILL12_HITBOX;
      const cx = f.x + f.face * (f.w / 2 + hb.w / 2 - hb.fwd);
      const cy = f.y + hb.y;
      if (f.modeT >= 6 && f.modeT <= SKILL12_FURY_FRAMES) {
        const since = (f.modeT - 6) % 22;
        const bright = since < 6 ? 1 : 0.32;
        const wob = Math.sin(now / 40) * 3;
        for (let i = 0; i < 3; i++) {
          g.lineStyle(3 - (i >> 1), 0xff9ed2, (0.8 - i * 0.18) * bright);
          g.strokeEllipse(cx, cy + (i - 1) * 10 + wob, hb.w, hb.h * 0.75);
        }
        if (since < 6) {
          g.lineStyle(2, 0xfff0fa, 0.9 * bright);
          g.lineBetween(cx - f.face * 18, cy - 16, cx + f.face * 18, cy + 12);
          g.lineBetween(cx - f.face * 18, cy, cx + f.face * 18, cy + 16);
          g.lineBetween(cx - f.face * 18, cy + 12, cx + f.face * 16, cy + 22);
        }
      }
    } else if (ch === 13) {
      // 鬼人开启鬼燃：紫焰爆发双环
      const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL13_LOCK, 0, 1);
      g.lineStyle(5, 0xc44dff, 0.7 * (1 - t));
      g.strokeCircle(f.x, f.y - 2, 14 + 36 * t);
      g.lineStyle(2, 0xf0d8ff, 0.6 * (1 - t));
      g.strokeCircle(f.x, f.y - 2, 8 + 22 * t);
    } else if (ch === 14) {
      // 呓梦梦火弹：出手前粉紫聚火
      const t = Phaser.Math.Clamp((f.modeT + 1) / SKILL14_LOCK, 0, 1);
      const c = 1 + 0.25 * Math.sin(now / 45);
      g.fillStyle(0xc44dff, 0.5 * (1 - t * 0.3));
      g.fillCircle(f.x + f.face * 18, f.y - 8, (4 + 6 * t) * c);
      g.fillStyle(0xffa8ec, 0.9);
      g.fillCircle(f.x + f.face * 18, f.y - 8, (1.8 + 2.4 * t) * c);
    } else if (ch === 15) {
      // 元素使：按当前元素系播放施法表现
      const e = f.elem;
      const lock = ELEM_LOCK_FRAMES[e];
      const t = Phaser.Math.Clamp((f.modeT + 1) / lock, 0, 1);
      const col = ELEM_COLORS[e];
      if (e === 0) {
        // 逐风：身前白色风线
        for (let i = 0; i < 3; i++) {
          g.lineStyle(4 - i, 0xeaf2ff, (0.75 - i * 0.18) * (1 - t * 0.4));
          g.lineBetween(
            f.x + f.face * (4 + i * 6),
            f.y - 16 + i * 14,
            f.x + f.face * (30 + 34 * t + i * 6),
            f.y - 16 + i * 14,
          );
        }
      } else if (e === 1) {
        // 唤雷：深蓝电爆环 + 折线闪电
        g.lineStyle(5, col, 0.7 * (1 - t));
        g.strokeCircle(f.x, f.y - 2, 18 + 94 * t);
        g.lineStyle(2, 0xaebdff, 0.8 * (1 - t));
        g.strokeCircle(f.x, f.y - 2, 12 + 60 * t);
        for (let i = 0; i < 4; i++) {
          const base = (i / 4) * Math.PI * 2 + now / 50;
          const r0 = 20;
          const r1 = 30 + 70 * t;
          const pts = [
            { x: f.x + Math.cos(base) * r0, y: f.y - 2 + Math.sin(base) * r0 },
            {
              x: f.x + Math.cos(base + 0.15) * ((r0 + r1) / 2),
              y: f.y - 2 + Math.sin(base - 0.15) * ((r0 + r1) / 2),
            },
            { x: f.x + Math.cos(base) * r1, y: f.y - 2 + Math.sin(base) * r1 },
          ];
          g.lineStyle(2, 0xdfe6ff, 0.85 * (1 - t));
          g.strokePoints(pts, false);
        }
      } else if (e === 2) {
        // 降水：手前浅蓝水滴凝聚
        const c = 1 + 0.2 * Math.sin(now / 50);
        g.fillStyle(col, 0.7);
        g.fillCircle(f.x + f.face * 18, f.y - 10, (3 + 4 * t) * c);
        g.fillStyle(0xeafbff, 0.9);
        g.fillCircle(f.x + f.face * 18, f.y - 10, (1.4 + 1.6 * t) * c);
      } else if (e === 3) {
        // 燎火：手前红火聚弹
        const c = 1 + 0.2 * Math.sin(now / 45);
        g.fillStyle(0xff5a2e, 0.55);
        g.fillCircle(f.x + f.face * 18, f.y - 8, (3 + 5 * t) * c);
        g.fillStyle(0xffd08a, 0.9);
        g.fillCircle(f.x + f.face * 18, f.y - 8, (1.5 + 2.2 * t) * c);
      } else {
        // 御土：脚下岩起 + 身前土光
        g.fillStyle(col, 0.8 * (1 - t * 0.4));
        g.fillEllipse(f.x, f.y + f.h / 2 - 2, 30 + 42 * t, 12);
        g.lineStyle(3, 0xe8c27a, 0.85 * (1 - t));
        g.strokeEllipse(f.x, f.y - 2, 16 + 22 * t, 30 + 20 * t);
      }
    }
  }

  /** 秘术施法特效（f.mode==='skill' 且 f.arcMode 期间） */
  private drawArcanaFx(
    g: Phaser.GameObjects.Graphics,
    f: Fighter,
    now: number,
  ) {
    const lock = ARCANA_LOCK_FRAMES[f.arcKind] || 1;
    const t = Phaser.Math.Clamp((f.modeT + 1) / lock, 0, 1);
    switch (f.arcKind) {
      case 0: {
        // 回春：绿色上升十字与扩散光环
        g.lineStyle(4, 0x5fe08a, 0.8 * (1 - t));
        g.strokeCircle(f.x, f.y - 4, 18 + 30 * t);
        for (let i = 0; i < 3; i++) {
          const rise = (now / 10 + i * 12) % 36;
          g.fillStyle(0xa6ffce, 0.9 * (1 - rise / 36));
          g.fillRect(f.x - 5 + i * 5 - 5, f.y - 14 - rise, 2, 8);
          g.fillRect(f.x - 8 + i * 5 - 2, f.y - 11 - rise, 8, 2);
        }
        break;
      }
      case 2: {
        // 烈炎弹：出手前面前方聚起火球（出手后由飞行物本体呈现）
        if (f.modeT < 10) {
          const c = 1 + 0.25 * Math.sin(now / 45);
          g.fillStyle(0xff5a2e, 0.5);
          g.fillCircle(f.x + f.face * 18, f.y - 8, (4 + 6 * t) * c);
          g.fillStyle(0xffe1a0, 0.9);
          g.fillCircle(f.x + f.face * 18, f.y - 8, (2 + 2.5 * t) * c);
        } else {
          // 脱手火光
          g.fillStyle(0xff5a2e, 0.35 * (1 - t));
          g.fillCircle(f.x + f.face * 22, f.y - 8, 14 * (1 - t) + 4);
        }
        break;
      }
      case 3: {
        // 风翼：脚下上升风线与两侧风羽
        for (let i = 0; i < 4; i++) {
          const rise = (now / 8 + i * 16) % 64;
          const side = i % 2 === 0 ? -1 : 1;
          g.lineStyle(2, 0x9fe87a, 0.7 * (1 - rise / 64));
          g.lineBetween(
            f.x + side * (8 + (i >> 1) * 8),
            f.y + 18 - rise,
            f.x + side * (8 + (i >> 1) * 8),
            f.y + 10 - rise,
          );
        }
        g.fillStyle(0xe2ffc9, 0.75 + 0.2 * Math.sin(now / 60));
        g.fillTriangle(
          f.x - 12,
          f.y - 20,
          f.x - 26,
          f.y - 10,
          f.x - 12,
          f.y - 6,
        );
        g.fillTriangle(
          f.x + 12,
          f.y - 20,
          f.x + 26,
          f.y - 10,
          f.x + 12,
          f.y - 6,
        );
        break;
      }
      case 4: {
        // 重击：前摇 0.5 秒拳上蓄力（前摇期无敌：全身金边提示），出手瞬间橙色冲击
        if (f.modeT < ARC4_STARTUP) {
          const ct = f.modeT / ARC4_STARTUP;
          const c = 1 + 0.3 * Math.sin(now / 40);
          g.fillStyle(0xffb13c, 0.4 + 0.3 * ct);
          g.fillCircle(f.x + f.face * 16, f.y - 2, (5 + 9 * ct) * c);
          g.fillStyle(0xfff0c0, 0.9);
          g.fillCircle(f.x + f.face * 16, f.y - 2, (2 + 3 * ct) * c);
          // 无敌金环
          const pulse = 1 + 0.06 * Math.sin(now / 70);
          g.fillStyle(0xffd166, 0.08);
          g.fillEllipse(f.x, f.y - 2, 36 * pulse, 56 * pulse);
          g.lineStyle(2, 0xffe9a8, 0.75 + 0.2 * Math.sin(now / 50));
          g.strokeEllipse(f.x, f.y - 2, 36 * pulse, 56 * pulse);
        } else {
          const pt = Phaser.Math.Clamp((f.modeT - ARC4_STARTUP) / 8, 0, 1);
          g.lineStyle(6, 0xffb13c, 0.55 * (1 - pt));
          g.strokeCircle(f.x + f.face * 30, f.y - 4, 16 + 40 * pt);
        }
        break;
      }
      case 5:
        // 霸体开启时的紫色冲击（持续身环在上方无条件绘制）
        g.lineStyle(5, 0xb58bff, 0.7 * (1 - t));
        g.strokeEllipse(f.x, f.y - 2, 30 + 60 * t, 44 + 70 * t);
        break;
      case 6: {
        // 冰封领域：出手前前面方凝起冰球（出手后由飞行物本体呈现）
        if (f.modeT < 10) {
          const c = 1 + 0.2 * Math.sin(now / 45);
          g.fillStyle(0x8fe3ff, 0.45);
          g.fillCircle(f.x + f.face * 18, f.y - 6, (4 + 5 * t) * c);
          g.fillStyle(0xffffff, 0.9);
          g.fillCircle(f.x + f.face * 18, f.y - 6, (2 + 2 * t) * c);
          // 碎冰晶
          g.fillStyle(0xbfefff, 0.8);
          g.fillRect(f.x + f.face * 26, f.y - 12, 2, 2);
          g.fillRect(f.x + f.face * 22, f.y - 2, 2, 2);
        } else {
          g.fillStyle(0x8fe3ff, 0.3 * (1 - t));
          g.fillCircle(f.x + f.face * 22, f.y - 6, 12 * (1 - t) + 4);
        }
        break;
      }
      case 7: {
        // 雷光瞬闪：起手聚雷后全程前向疾光（持续身光在无条件区绘制）
        g.lineStyle(3, 0x6fa8ff, 0.85);
        g.lineBetween(
          f.x - f.face * 6, f.y - 2,
          f.x - f.face * 22, f.y - 2 + 3 * Math.sin(now / 25),
        );
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(f.x + f.face * 6, f.y - 2, 2.5 + 1.5 * Math.sin(now / 40));
        break;
      }
      case 8: {
        // 三连星：出手前三颗金星在身前依次亮起（出手后由飞行物呈现）
        if (f.modeT < 10) {
          for (let s = 0; s < 3; s++) {
            const on = f.modeT >= s * 2;
            g.fillStyle(on ? 0xffd978 : 0x6a5a30, on ? 0.95 : 0.5);
            g.fillCircle(f.x + f.face * (12 + s * 7), f.y - 4 + (s - 1) * 9, 2.4);
          }
        } else {
          g.fillStyle(0xffd978, 0.35 * (1 - t));
          g.fillCircle(f.x + f.face * 22, f.y - 4, 12 * (1 - t) + 3);
        }
        break;
      }
      case 9:
        // 焚血狂战：瞬间赤焰爆发（持续焰环在无条件区绘制）
        g.lineStyle(6, 0xff6e5e, 0.75 * (1 - t));
        g.strokeEllipse(f.x, f.y - 2, 26 + 52 * t, 40 + 60 * t);
        g.fillStyle(0xffc24d, 0.8 * (1 - t));
        g.fillCircle(f.x, f.y - 2, 4 + 6 * t);
        break;
      default:
        break;
    }
  }

  /** 飞行物渲染（权威数据；客机做位置插值平滑 30Hz 快照） */
  private renderProjectiles(list: Projectile[]) {
    const seen = new Set<number>();
    const now = performance.now();
    // 降水爆炸：扩散水波 + 白圈，16 帧内淡出
    this.waterBursts = this.waterBursts.filter((b) => this.sim.tick - b.born < 16);
    for (const b of this.waterBursts) {
      const t = (this.sim.tick - b.born) / 16;
      const rr = b.r * (0.6 + 0.9 * t);
      this.gfx.fillStyle(0x7fd8ff, 0.26 * (1 - t));
      this.gfx.fillCircle(b.x, b.y, rr);
      this.gfx.lineStyle(4, 0xbfeeff, 0.8 * (1 - t));
      this.gfx.strokeCircle(b.x, b.y, rr);
      this.gfx.lineStyle(2, 0xffffff, 0.55 * (1 - t));
      this.gfx.strokeCircle(b.x, b.y, b.r * (0.4 + 0.5 * t));
    }
    const pulse = 1.05 + 0.12 * Math.sin(now / 70);
    // 0 火球 / 1 飞镖 / 2 烈炎弹 / 3 梦火弹 / 4 元素火弹 / 5 待爆水弹 / 6 冰封球 / 8 星屑
    const texOf: Record<number, { key: string; size: number }> = {
      0: { key: FIREBALL_KEY, size: 26 },
      1: { key: DART_KEY, size: 20 },
      2: { key: ARC_FLAME_KEY, size: 30 },
      3: { key: DREAM_KEY, size: 30 },
      4: { key: ELEM_FIRE_KEY, size: 28 },
      5: { key: WATER_KEY, size: 34 },
      6: { key: FROST_KEY, size: 28 },
      8: { key: STAR_KEY, size: 18 },
    };
    for (const p of list) {
      seen.add(p.n);
      const info = texOf[p.k] ?? texOf[0];
      let s = this.projSprites.get(p.n);
      if (!s) {
        s = this.add
          .image(p.x, p.y, info.key)
          .setDepth(11)
          .setScale(pulse);
        this.projSprites.set(p.n, s);
      }
      // k5 水弹静止于爆炸点，不做插值拖尾
      if (this.role === 'host' || p.k === 5) {
        s.setPosition(p.k === 5 ? p.tx : p.x, p.k === 5 ? p.ty : p.y);
      } else {
        s.x += (p.x - s.x) * 0.4;
        s.y += (p.y - s.y) * 0.4;
      }
      const base = (p.r * 2) / info.size;
      // 水弹随爆炸临近轻微胀缩；其余火弹呼吸，飞镖保持定尺
      const waterPulse = p.k === 5 ? 1 + 0.12 * Math.sin(now / 55) : 1;
      s.setScale(p.k === 1 ? base : base * pulse * waterPulse)
        .setFlipX(p.k === 1 && p.vx < 0)
        .setAlpha(p.k === 5 && p.life <= 6 ? 0.35 + 0.5 * Math.sin(now / 30) : 1);

      // 待爆水弹：落点蓄力水环 + 临爆扩散圈
      if (p.k === 5) {
        const g = this.gfx;
        const charge = 1 - p.life / ELEM_WATER_DELAY;
        g.lineStyle(2, 0x7fd8ff, 0.35 + 0.4 * charge);
        g.strokeCircle(p.tx, p.ty, p.r * (0.3 + 0.7 * charge));
        g.lineStyle(1, 0xbfeeff, 0.5);
        g.strokeCircle(p.tx, p.ty, 8 + 6 * Math.sin(now / 90));
        if (p.life <= 6) {
          const bt = 1 - p.life / 6;
          g.lineStyle(4, 0xbfeeff, 0.75 * (1 - bt));
          g.strokeCircle(p.tx, p.ty, p.r * (0.5 + 0.5 * bt));
        }
      }
    }
    for (const [n, s] of this.projSprites) {
      if (!seen.has(n)) {
        s.destroy();
        this.projSprites.delete(n);
      }
    }
  }

  private drawShadow(f: Fighter) {
    if (f.dead || f.respawn > 0) return;
    const g = this.gfxBack;
    const groundY = this.groundBelow(f.x, f.y + f.h / 2);
    if (groundY !== null && f.y + f.h / 2 < groundY - 2) {
      const height = groundY - (f.y + f.h / 2);
      const alpha = Phaser.Math.Clamp(0.28 - height / 1400, 0.06, 0.28);
      const scale = Phaser.Math.Clamp(1 - height / 1200, 0.5, 1);
      g.fillStyle(0x000000, alpha);
      g.fillEllipse(f.x, groundY + 3, f.w * scale, 12 * scale);
    }
  }

  private drawOverhead(
    g: Phaser.GameObjects.Graphics,
    id: 0 | 1,
    f: Fighter,
    other: Fighter,
  ) {
    const elemText = this.elemTexts[id];
    if (f.dead || f.respawn > 0) {
      elemText.setVisible(false);
      return;
    }

    // 队伍色小三角（角色重复时区分双方）
    const teamColor = id === 0 ? COLORS.p0 : COLORS.p1;
    const tipY = f.y - f.h / 2 - 12;
    g.fillStyle(teamColor, 0.9);
    g.fillTriangle(f.x, tipY, f.x - 6, tipY - 9, f.x + 6, tipY - 9);

    // 被闪光飞镖标记：头顶黄色菱形（提示可被瞬移追击）
    if (other.dartMark === id) {
      const my = tipY - 16 + 2 * Math.sin(performance.now() / 150);
      g.fillStyle(COLORS.dart, 0.95);
      g.fillTriangle(f.x, my - 5, f.x + 5, my, f.x, my + 5);
      g.fillTriangle(f.x, my - 5, f.x - 5, my, f.x, my + 5);
    }

    // 突进冷却条（无条 = 突进可用）
    if (f.dashCd > 0) {
      const cdY = f.y - f.h / 2 - 26;
      g.fillStyle(0x000000, 0.45);
      g.fillRoundedRect(f.x - 20, cdY - 2, 40, 7, 3);
      const ratio = 1 - f.dashCd / DASH_COOLDOWN_FRAMES;
      g.fillStyle(COLORS.dash, 0.9);
      g.fillRoundedRect(f.x - 19, cdY - 1, 38 * ratio, 5, 2.5);
    }

    // 角色技能冷却条（橙色，无条 = 可用；幻影为被动不显示）
    // 元素使：按当前元素系显示该系独立 CD（系主题色）
    const cdY = f.y - f.h / 2 - 36;
    if (this.chars[id] === 15) {
      const total = ELEM_CD_FRAMES[f.elem];
      if (f.elemCd[f.elem] > 0) {
        g.fillStyle(0x000000, 0.45);
        g.fillRoundedRect(f.x - 20, cdY - 2, 40, 7, 3);
        const ratio = 1 - f.elemCd[f.elem] / total;
        g.fillStyle(ELEM_COLORS[f.elem], 0.95);
        g.fillRoundedRect(f.x - 19, cdY - 1, 38 * ratio, 5, 2.5);
      }
      // 头顶系名（深色描边保证浅色风系可读）
      const hex = ELEM_COLORS[f.elem].toString(16).padStart(6, '0');
      elemText.setVisible(true);
      elemText.setText(ELEM_NAMES[f.elem]);
      elemText.setColor(`#${hex}`);
      elemText.setPosition(f.x, f.y - f.h / 2 - 60);
    } else if (this.chars[id] === 16) {
      // 幻棱：CD 程序化（失败 13.5 秒 / 成功二段后 9.5 秒），按剩余量区分总长
      if (f.skillCd > 0) {
        const total = f.skillCd > SKILL16_DONE_CD ? SKILL16_FAIL_CD : SKILL16_DONE_CD;
        g.fillStyle(0x000000, 0.45);
        g.fillRoundedRect(f.x - 20, cdY - 2, 40, 7, 3);
        const ratio = 1 - f.skillCd / total;
        g.fillStyle(COLORS.skill, 0.95);
        g.fillRoundedRect(f.x - 19, cdY - 1, 38 * ratio, 5, 2.5);
      }
    } else {
      elemText.setVisible(false);
      const total = SKILL_CD_FRAMES[this.chars[id]];
      if (f.skillCd > 0 && total > 0) {
        g.fillStyle(0x000000, 0.45);
        g.fillRoundedRect(f.x - 20, cdY - 2, 40, 7, 3);
        const ratio = 1 - f.skillCd / total;
        g.fillStyle(COLORS.skill, 0.95);
        g.fillRoundedRect(f.x - 19, cdY - 1, 38 * ratio, 5, 2.5);
      }
    }

    // 秘术冷却条（秘术主题色，位于技能条上方；迅捷为纯被动不显示）
    const arcTotal = ARCANA_CD_FRAMES[f.arcana];
    if (f.arcCd > 0 && arcTotal > 0) {
      const cdY = f.y - f.h / 2 - 46;
      g.fillStyle(0x000000, 0.45);
      g.fillRoundedRect(f.x - 20, cdY - 2, 40, 6, 3);
      const ratio = 1 - f.arcCd / arcTotal;
      g.fillStyle(ARCANAS[f.arcana].color, 0.95);
      g.fillRoundedRect(f.x - 19, cdY - 1, 38 * ratio, 4, 2);
    }

    // 被噩梦诅咒：头顶紫色咒眼
    if (f.blindT > 0) {
      const by = tipY - 28;
      const blink = Math.floor(performance.now() / 160) % 2 === 0;
      g.fillStyle(0x1a0826, 0.9);
      g.fillEllipse(f.x, by, 11, 6);
      if (!blink) {
        g.fillStyle(COLORS.nightmare, 1);
        g.fillEllipse(f.x, by, 4, 4);
      }
    }

    // 状态图标行（与咒眼同行、错位排布；单一对手来源下互不冲突）
    const iconY = tipY - 28;
    // 梦火易伤：粉紫倒三角（受击退 +20%）
    if (f.weakT > 0) {
      const wy = iconY + 2 * Math.sin(performance.now() / 150);
      g.fillStyle(0xc77dff, 0.95);
      g.fillTriangle(f.x - 12, wy - 4, f.x - 17, wy + 4, f.x - 7, wy + 4);
      g.fillStyle(0xffffff, 0.7);
      g.fillTriangle(f.x - 12, wy - 1, f.x - 14, wy + 3, f.x - 10, wy + 3);
    }
    // 唤雷眩晕：黄色四角星
    if (f.stunT > 0) {
      const sy = iconY + 2 * Math.sin(performance.now() / 110);
      g.fillStyle(0xffe14d, 0.95);
      g.fillTriangle(f.x + 12, sy - 5, f.x + 15.5, sy, f.x + 12, sy + 5);
      g.fillTriangle(f.x + 12, sy - 5, f.x + 8.5, sy, f.x + 12, sy + 5);
      g.fillStyle(0xfffbe0, 0.8);
      g.fillRect(f.x + 11, sy - 1, 2, 2);
    }
    // 御土土盾：黄褐色小盾
    if (f.earthT > 0) {
      const blink = f.earthT < 16 && Math.floor(f.earthT / 4) % 2 === 0;
      g.fillStyle(blink ? 0x8a5f2a : 0xc89a4e, 0.95);
      g.fillRoundedRect(f.x - 5, iconY - 5, 10, 11, 3);
      g.fillStyle(0xe8c27a, 0.9);
      g.fillRoundedRect(f.x - 3, iconY - 3, 6, 7, 2);
    }

    // 生效中的攻击判定盒（调试可视化，也作为挥砍特效）
    const hb = attackBox(f);
    if (hb) {
      const isSpecial = f.mode === 'special';
      if (this.chars[id] === 6) {
        // 剑客：白色刀光弧（普攻横扫 / 必杀上挑），有效帧内快速淡去
        const prog = isSpecial
          ? Phaser.Math.Clamp(f.modeT / 10, 0, 1)
          : Phaser.Math.Clamp((f.modeT - 7) / 6, 0, 1);
        const alpha = 1 - prog;
        const radius = isSpecial ? 58 : 66;
        const cy = isSpecial ? f.y - 8 : f.y - 4;
        // 基准弧按朝右绘制，x 分量乘 f.face 镜像，避免刀光总显示在右侧
        const a0 = isSpecial ? -0.55 : -1.15;
        const a1 = isSpecial ? -2.6 : 0.55;
        const arcPts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= 16; i++) {
          const a = a0 + (a1 - a0) * (i / 16);
          arcPts.push({
            x: f.x + f.face * Math.cos(a) * radius,
            y: cy + Math.sin(a) * radius,
          });
        }
        g.lineStyle(12, COLORS.sword, 0.16 * alpha);
        g.strokePoints(arcPts, false);
        g.lineStyle(3, 0xffffff, 0.85 * alpha);
        g.strokePoints(arcPts, false);
      } else {
        g.fillStyle(isSpecial ? COLORS.spcHitbox : COLORS.hitbox, 0.35);
        g.fillRoundedRect(hb.x - hb.w / 2, hb.y - hb.h / 2, hb.w, hb.h, 10);
        g.lineStyle(2, isSpecial ? COLORS.spcHitbox : COLORS.hitbox, 0.9);
        g.strokeRoundedRect(hb.x - hb.w / 2, hb.y - hb.h / 2, hb.w, hb.h, 10);
      }
    }
  }

  /** 找到 x 处、y 以下最近的可站地面（仅用于阴影） */
  private groundBelow(x: number, y: number): number | null {
    let result: number | null = null;
    for (const fl of this.map.floors) {
      if (x > fl.x && x < fl.x + fl.w && fl.y >= y) {
        if (result === null || fl.y < result) result = fl.y;
      }
    }
    for (const p of this.map.platforms) {
      if (x > p.x && x < p.x + p.w && p.y >= y) {
        if (result === null || p.y < result) result = p.y;
      }
    }
    return result;
  }

  private updateHud(f0: Fighter, f1: Fighter) {
    const arr: [Fighter, Fighter] = [f0, f1];
    const g = this.gfx;
    const BAR_W = 250;
    const BAR_H = 16;
    const BAR_Y = 72;
    for (const id of [0, 1] as const) {
      const f = arr[id];
      const ratio = Phaser.Math.Clamp(f.dmg / MAX_DMG, 0, 1);
      const teamHex = id === 0 ? 0x4da6ff : 0xff5d5d;

      // 数字（保留小字号精确值，上限 100%）
      const text = this.dmgTexts[id];
      text.setText(`${Math.round(f.dmg)}%`);
      // 颜色：队伍色 → 黄（80%）→ 红（100%）
      let heat: Phaser.Types.Display.ColorObject;
      if (ratio < 0.8) {
        heat = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(teamHex),
          Phaser.Display.Color.ValueToColor(0xffe14d),
          100,
          Math.round((ratio / 0.8) * 100),
        );
      } else {
        heat = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0xffe14d),
          Phaser.Display.Color.ValueToColor(0xff3d3d),
          100,
          Math.round(((ratio - 0.8) / 0.2) * 100),
        );
      }
      const heatCss = `rgb(${Math.round(heat.r)},${Math.round(heat.g)},${Math.round(heat.b)})`;
      text.setColor(heatCss);

      // 击飞能量槽（上限 100%）
      const bx = id === 0 ? 40 : VIEW_W - 40 - BAR_W;
      g.fillStyle(0x0c1024, 0.8);
      g.fillRoundedRect(bx, BAR_Y, BAR_W, BAR_H, 8);
      g.lineStyle(1, teamHex, 0.75);
      g.strokeRoundedRect(bx, BAR_Y, BAR_W, BAR_H, 8);
      if (ratio > 0) {
        const fillW = Math.max((BAR_W - 4) * ratio, 4);
        g.fillStyle(
          Phaser.Display.Color.GetColor(heat.r, heat.g, heat.b),
          0.92,
        );
        g.fillRoundedRect(bx + 2, BAR_Y + 2, fillW, BAR_H - 4, 6);
        // 高光
        g.fillStyle(0xffffff, 0.22);
        g.fillRoundedRect(bx + 3, BAR_Y + 3, Math.max(fillW - 2, 2), 3, 2);
      }
      // 25/50/75 刻度
      for (const q of [0.25, 0.5, 0.75]) {
        const tx = bx + BAR_W * q;
        g.lineStyle(1, 0x000000, 0.45);
        g.lineBetween(tx, BAR_Y + 3, tx, BAR_Y + BAR_H - 3);
      }
      // 满能量：末端红色脉冲警示
      if (ratio >= 1) {
        const a = 0.4 + 0.3 * Math.sin(performance.now() / 90);
        g.lineStyle(2, 0xff5a4d, a);
        g.strokeRoundedRect(bx - 1, BAR_Y - 1, BAR_W + 2, BAR_H + 2, 9);
      }

      // 生命点圆点
      const pipY = 126;
      const baseX = id === 0 ? 42 : VIEW_W - 42;
      for (let i = 0; i < START_STOCKS; i++) {
        const px = id === 0 ? baseX + i * 26 : baseX - i * 26;
        g.fillStyle(
          i < f.stocks ? (id === 0 ? COLORS.p0 : COLORS.p1) : 0x44486a,
          1,
        );
        g.fillCircle(px, pipY, 10);
      }
    }
  }
}
