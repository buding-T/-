import Phaser from 'phaser';
import { CHARACTERS } from '../game/characters';
import { ARCANAS, COLORS, MAPS, VIEW_H, VIEW_W } from '../game/constants';
import { NetPeer, type PeerRole } from '../net/peer';

// 房间场景：建立 P2P，房主展示房间号并负责开局
interface RoomData {
  role: PeerRole;
  code?: string;
}

export class RoomScene extends Phaser.Scene {
  private role!: PeerRole;
  private peer: NetPeer | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private codeText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private charText!: Phaser.GameObjects.Text;
  private myChar = 0;
  private myArcana = 0;
  private oppChar: number | null = null;
  private oppArcana: number | null = null;
  private ready = false;

  constructor() {
    super('room');
  }

  init(data: RoomData) {
    this.role = data.role;
    this.ready = false;
    this.oppChar = null;
    this.oppArcana = null;
    this.myChar = this.normalizeChar(this.registry.get('char'));
    this.myArcana = this.normalizeArcana(this.registry.get('arcana'));
  }

  private normalizeChar(v: unknown): number {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n < CHARACTERS.length ? n : 0;
  }

  private normalizeArcana(v: unknown): number {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n < ARCANAS.length ? n : 0;
  }

  create() {
    this.drawBackground();

    this.add
      .text(VIEW_W / 2, 130, this.role === 'host' ? '你的房间' : '加入房间', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#9aa3d4',
      })
      .setOrigin(0.5);

    this.codeText = this.add
      .text(VIEW_W / 2, 250, this.role === 'host' ? '····' : (this.scene.settings.data as RoomData).code ?? '····', {
        fontFamily: 'Consolas, monospace',
        fontSize: '120px',
        fontStyle: 'bold',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    this.charText = this.add
      .text(VIEW_W / 2, 340, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#9aa3d4',
      })
      .setOrigin(0.5);
    this.refreshCharText();

    this.statusText = this.add
      .text(VIEW_W / 2, 400, '正在连接信令服务器…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(VIEW_W / 2, 480, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#7ee0a3',
      })
      .setOrigin(0.5);

    this.add
      .text(VIEW_W / 2, VIEW_H - 60, 'Esc 返回菜单（会断开连接）', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#7078a8',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', this.backToMenu);

    const peer = new NetPeer(
      this.role,
      {
        roomcode: (code) => this.codeText.setText(code),
        status: (text) => this.statusText.setText(text),
        ready: () => {
          this.ready = true;
          this.statusText.setText('P2P 连接已建立');
          this.hintText.setText(
            this.role === 'host'
              ? '对手已加入 —— 按 空格 开始对战（随机地图）'
              : '已连接，等待房主开始…',
          );
          // 告诉对手自己选的角色与秘术
          peer.sendControl({
            t: 'hello',
            char: this.myChar,
            arcana: this.myArcana,
          });
        },
        control: (msg) => {
          if (msg.t === 'hello') {
            this.oppChar = this.normalizeChar(msg.char);
            this.oppArcana = this.normalizeArcana(msg.arcana);
            this.registry.set('oppChar', this.oppChar);
            this.registry.set('oppArcana', this.oppArcana);
            this.refreshCharText();
          } else if (msg.t === 'start' && this.ready) {
            // 双端使用同一张随机地图（由房主选定）
            this.registry.set('map', msg.map);
            this.enterBattle();
          }
        },
        peerleft: () => {
          this.statusText.setText('对手已断开连接');
          this.hintText.setText('按 Esc 返回菜单');
        },
        error: (message) => {
          this.statusText.setText(`错误：${message}`);
          this.hintText.setText('按 Esc 返回菜单');
        },
      },
      (this.scene.settings.data as RoomData).code ?? '',
    );
    this.peer = peer;
    peer.start().catch((err: Error) => {
      this.statusText.setText(err.message);
      this.hintText.setText('按 Esc 返回菜单');
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.role === 'host' && this.ready && peer.isOpen) {
        const map = Phaser.Math.Between(0, MAPS.length - 1);
        this.registry.set('map', map);
        peer.sendControl({ t: 'start', map });
        this.enterBattle();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.backToMenu);
    });
  }

  private refreshCharText() {
    const mine = CHARACTERS[this.myChar]?.name ?? '？';
    const opp =
      this.oppChar === null ? '等待确认…' : CHARACTERS[this.oppChar].name;
    const mineArc = ARCANAS[this.myArcana]?.name ?? '？';
    const oppArc =
      this.oppArcana === null ? '…' : (ARCANAS[this.oppArcana]?.name ?? '？');
    this.charText?.setText(
      `你：${mine} · ${mineArc}　|　对手：${opp} · ${oppArc}`,
    );
  }

  private enterBattle() {
    if (!this.peer) return;
    // 通过 registry 传递连接对象，避免场景数据序列化
    this.registry.set('peer', this.peer);
    this.registry.set('char', this.myChar);
    this.registry.set('arcana', this.myArcana);
    if (this.oppChar !== null) this.registry.set('oppChar', this.oppChar);
    if (this.oppArcana !== null) this.registry.set('oppArcana', this.oppArcana);
    this.peer = null; // 所有权移交，返回菜单时由战斗场景负责关闭
    this.scene.start('battle', { role: this.role });
  }

  private backToMenu = () => {
    this.peer?.close();
    this.peer = null;
    this.scene.start('menu');
  };

  private drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x141830, 0x141830, 0x0a0c18, 0x0a0c18, 1);
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(COLORS.p0, 0.05);
    g.fillCircle(300, 300, 180);
    g.fillStyle(COLORS.p1, 0.05);
    g.fillCircle(1000, 420, 220);
  }
}
