import Phaser from 'phaser';
import {
  CHARACTERS,
  animKey,
  sheetKey,
  type AnimState,
} from '../game/characters';
import { ARCANAS, COLORS, MAPS, VIEW_H, VIEW_W } from '../game/constants';

// 角色卡片：4 列 × 4 行（共 16 名角色）
const COLS = 4;
const CARD_W = 270;
const CARD_H = 116;
const CARD_XS = [196, 492, 788, 1084];
const CARD_YS = [162, 282, 402, 522];
const cardPos = (i: number) => ({
  cx: CARD_XS[i % COLS],
  cy: CARD_YS[Math.floor(i / COLS)],
});
const CHAR_KEY_STORAGE = 'pf-char';
const ARC_KEY_STORAGE = 'pf-arcana';

// 秘术卡片：6 张一排
const ARC_W = 184;
const ARC_H = 252;
const ARC_STEP = 200;
const ARC_X0 = 140;
const ARC_Y = 352;

type Pending = 'host' | 'join' | 'bot';
type Btn = {
  rect: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
};

// 主菜单：第一页选角色，第二页选秘术；可创建房间 / 加入 / 人机对战
export class MenuScene extends Phaser.Scene {
  private code = '';
  private joining = false; // 已经触发场景跳转
  private joinMode = false; // 正在输码
  private selected = 0;
  private arcana = 0;
  private page = 0; // 0 角色页 / 2 秘术页
  private pending: Pending = 'host';
  private codeText!: Phaser.GameObjects.Text;
  private joinTip!: Phaser.GameObjects.Text;
  private cardGfx: Phaser.GameObjects.Graphics[] = [];
  private cardSprs: Phaser.GameObjects.Sprite[] = [];
  private checkTexts: Phaser.GameObjects.Text[] = [];
  private page2Objs: Phaser.GameObjects.Components.Visible[] = [];
  private arcGfx: Phaser.GameObjects.Graphics[] = [];
  private arcChecks: Phaser.GameObjects.Text[] = [];
  private arcSummary!: Phaser.GameObjects.Text;
  private confirmBtns: Record<Pending, Btn> = {} as Record<Pending, Btn>;

  constructor() {
    super('menu');
  }

  create() {
    this.code = '';
    this.joining = false;
    this.joinMode = false;
    this.page = 0;
    const saved = Number(window.localStorage.getItem(CHAR_KEY_STORAGE));
    this.selected = Number.isInteger(saved) && saved >= 0 && saved < CHARACTERS.length
      ? saved
      : (this.registry.get('char') ?? 0);
    this.registry.set('char', this.selected);
    const savedArc = Number(window.localStorage.getItem(ARC_KEY_STORAGE));
    this.arcana =
      Number.isInteger(savedArc) && savedArc >= 0 && savedArc < ARCANAS.length
        ? savedArc
        : (this.registry.get('arcana') ?? 0);
    this.registry.set('arcana', this.arcana);

    this.drawBackground();

    this.add
      .text(VIEW_W / 2, 40, '平台格斗 · 联机原型', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(VIEW_W / 2, 72, 'Platform Fighter · WebRTC P2P', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#9aa3d4',
      })
      .setOrigin(0.5);

    this.add
      .text(VIEW_W / 2, 97, '选择你的角色（点击卡片，或按 1-9、方向键）', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    // 角色卡片（4 列 × 4 行）
    CHARACTERS.forEach((def, i) => {
      const { cx, cy } = cardPos(i);
      const g = this.add.graphics();
      this.cardGfx.push(g);

      // 卡片点击区
      this.add
        .zone(cx, cy, CARD_W, CARD_H)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.select(i));

      // 待机动画预览
      const spr = this.add
        .sprite(cx, cy - 30, sheetKey(i), 0)
        .setScale(1.7)
        .play(animKey(i, 'idle' as AnimState));
      this.cardSprs.push(spr);

      this.add
        .text(cx, cy + 4, def.name, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      this.add
        .text(cx, cy + 21, def.title, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          color: '#9aa3d4',
        })
        .setOrigin(0.5);

      this.add
        .text(cx, cy + 39, def.skillDesc, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '9px',
          color: '#ffb866',
          align: 'center',
          wordWrap: { width: CARD_W - 16 },
        })
        .setOrigin(0.5);

      // 数字角标仅 1-9 号角色显示（10 号以后无键盘直选）
      if (i < 9) {
        this.add
          .text(cx - CARD_W / 2 + 15, cy - CARD_H / 2 + 12, String(i + 1), {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#7a82b4',
          })
          .setOrigin(0.5);
      }

      const check = this.add
        .text(cx, cy + CARD_H / 2 - 9, '✓ 已选择', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#7ee0a3',
        })
        .setOrigin(0.5);
      this.checkTexts.push(check);

      // 选中时预览略放大
      spr.setScale(i === this.selected ? 1.95 : 1.7);
    });

    // 第一页按钮：创建房间 / 人机对战 / 加入房间（均先进第二页选秘术）
    // 三个按钮中心点 300/640/980，间距 40px，避免视觉重叠
    this.makeButton(300, 626, '创建房间', 0x2f7fff, () => this.openPage2('host'));
    this.makeButton(640, 626, '人机对战', 0x22aa66, () => this.openPage2('bot'));
    this.makeButton(980, 626, '加入房间', 0xff3355, () => this.openPage2('join'));

    this.add
      .text(
        VIEW_W / 2,
        692,
        'A/D 移动　W/空格 跳跃（二段跳）　S 速降/穿台　左键 攻击　右键 回场必杀　Shift 突进　Ctrl 角色技能（元素使滚轮下滚切系）　Q 秘术　飞出边界即 KO',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#7078a8',
        },
      )
      .setOrigin(0.5);

    this.refreshCards();
    this.buildPage2();

    window.addEventListener('keydown', this.onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupKeys);
  }

  /** 第二页：秘术选择（覆盖在第一页之上） */
  private buildPage2() {
    const objs = this.page2Objs;
    const add2 = <T extends Phaser.GameObjects.Components.Visible>(o: T): T => {
      objs.push(o);
      return o;
    };

    // 不透明面板 + 吞掉点击的全屏区
    const panel = add2(this.add.graphics());
    panel.fillStyle(0x0b0e1f, 0.985);
    panel.fillRect(0, 0, VIEW_W, VIEW_H);
    add2(
      this.add
        .zone(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H)
        .setInteractive(),
    );

    add2(
      this.add
        .text(VIEW_W / 2, 56, '选择携带的秘术', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '40px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5),
    );
    add2(
      this.add
        .text(VIEW_W / 2, 102, '对局中按 Q 使用（迅捷为被动，无需按键）　数字键 1-6 选择，Esc 返回', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '17px',
          color: '#9aa3d4',
        })
        .setOrigin(0.5),
    );
    this.arcSummary = add2(
      this.add
        .text(VIEW_W / 2, 136, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          color: '#ffd166',
        })
        .setOrigin(0.5),
    );

    ARCANAS.forEach((def, i) => {
      const cx = ARC_X0 + i * ARC_STEP;
      const cy = ARC_Y;
      const g = add2(this.add.graphics());
      this.arcGfx.push(g);

      add2(
        this.add
          .zone(cx, cy, ARC_W, ARC_H)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.selectArcana(i)),
      );

      add2(
        this.add
          .text(cx - ARC_W / 2 + 16, cy - ARC_H / 2 + 16, String(i + 1), {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#7a82b4',
          })
          .setOrigin(0.5),
      );
      add2(
        this.add
          .text(cx, cy - 72, def.name, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
          })
          .setOrigin(0.5),
      );
      add2(
        this.add
          .text(cx, cy - 44, def.title, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '13px',
            color: '#9aa3d4',
          })
          .setOrigin(0.5),
      );
      add2(
        this.add
          .text(cx, cy + 18, def.desc, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '13px',
            color: '#cdd4ff',
            align: 'center',
            wordWrap: { width: ARC_W - 22 },
          })
          .setOrigin(0.5),
      );
      const check = add2(
        this.add
          .text(cx, cy + ARC_H / 2 - 16, '✓ 已携带', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#7ee0a3',
          })
          .setOrigin(0.5),
      );
      this.arcChecks.push(check);
    });

    const by = 600;
    this.confirmBtns.host = this.makePage2Button(
      640,
      by,
      '创建房间',
      0x2f7fff,
      () => this.confirmHost(),
    );
    this.confirmBtns.bot = this.makePage2Button(
      640,
      by,
      '开始人机对战',
      0x22aa66,
      () => this.confirmBot(),
    );
    this.confirmBtns.join = this.makePage2Button(
      640,
      by,
      '加入房间',
      0xff3355,
      () => this.enterJoinMode(),
    );
    this.makePage2Button(150, by, '◀ 返回', 0x3a4070, () => this.backToPage1());

    this.codeText = add2(
      this.add
        .text(640, 664, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '26px',
          color: '#ffd166',
        })
        .setOrigin(0.5)
        .setVisible(false),
    );
    this.joinTip = add2(
      this.add
        .text(640, 696, '输入房主给的 4 位房间号（满 4 位自动进入，Backspace 删除/返回）', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#8a92c4',
        })
        .setOrigin(0.5)
        .setVisible(false),
    );

    objs.forEach((o) => o.setVisible(false));
  }

  private makePage2Button(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Btn {
    const w = label.length > 4 ? 300 : 200;
    const h = 72;
    const rect = this.add.graphics();
    const draw = (hover: boolean) => {
      rect.clear();
      rect.fillStyle(color, hover ? 1 : 0.88);
      rect.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    };
    draw(false);
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const zone = this.add
      .zone(x, y, w, h)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => draw(true))
      .on('pointerout', () => draw(false))
      .on('pointerdown', onClick);
    this.page2Objs.push(rect, text, zone);
    return { rect, text, zone };
  }

  private openPage2(p: Pending) {
    if (this.joining) return;
    this.pending = p;
    this.page = 2;
    this.joinMode = false;
    this.code = '';
    this.codeText.setVisible(false);
    this.joinTip.setVisible(false);
    this.arcSummary.setText(
      `你的角色：${CHARACTERS[this.selected].name}　|　秘术：${ARCANAS[this.arcana].name}`,
    );
    this.refreshArcCards();
    (['host', 'bot', 'join'] as Pending[]).forEach((k) => {
      const b = this.confirmBtns[k];
      const vis = k === p;
      b.rect.setVisible(vis);
      b.text.setVisible(vis);
      b.zone.input!.enabled = vis;
    });
    this.page2Objs.forEach((o) => {
      // 确认按钮按 pending 单独控制，其余第二页对象统一显示
      if (
        !(o === this.confirmBtns.host.rect ||
          o === this.confirmBtns.host.text ||
          o === this.confirmBtns.bot.rect ||
          o === this.confirmBtns.bot.text ||
          o === this.confirmBtns.join.rect ||
          o === this.confirmBtns.join.text)
      ) {
        o.setVisible(true);
      }
    });
  }

  private backToPage1() {
    if (this.joinMode) {
      // 输码中 Backspace 退出输码
      this.joinMode = false;
      this.code = '';
      this.codeText.setVisible(false);
      this.joinTip.setVisible(false);
      this.setConfirmVisible(true);
      return;
    }
    this.page = 0;
    this.page2Objs.forEach((o) => o.setVisible(false));
  }

  private setConfirmVisible(v: boolean) {
    const b = this.confirmBtns[this.pending];
    b.rect.setVisible(v);
    b.text.setVisible(v);
    b.zone.input!.enabled = v;
  }

  private enterJoinMode() {
    this.joinMode = true;
    this.code = '';
    this.codeText.setVisible(true).setText('房间号：_ _ _ _');
    this.joinTip.setVisible(true);
    this.setConfirmVisible(false);
  }

  private select(i: number) {
    if (this.joining || this.joinMode || this.page !== 0) return;
    if (i === this.selected) return;
    this.selected = i;
    this.registry.set('char', i);
    window.localStorage.setItem(CHAR_KEY_STORAGE, String(i));
    this.refreshCards();
  }

  private selectArcana(i: number) {
    if (this.joining || this.joinMode) return;
    if (i === this.arcana) return;
    this.arcana = i;
    this.registry.set('arcana', i);
    window.localStorage.setItem(ARC_KEY_STORAGE, String(i));
    this.arcSummary.setText(
      `你的角色：${CHARACTERS[this.selected].name}　|　秘术：${ARCANAS[i].name}`,
    );
    this.refreshArcCards();
  }

  private refreshCards() {
    CHARACTERS.forEach((def, i) => {
      const g = this.cardGfx[i];
      const { cx, cy } = cardPos(i);
      const sel = i === this.selected;
      g.clear();
      g.fillStyle(sel ? 0x20264a : 0x161a30, sel ? 1 : 0.9);
      g.fillRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 14);
      if (sel) {
        g.lineStyle(3, def.color, 1);
        g.strokeRoundedRect(
          cx - CARD_W / 2 + 2,
          cy - CARD_H / 2 + 2,
          CARD_W - 4,
          CARD_H - 4,
          12,
        );
      } else {
        g.lineStyle(1, 0x3a4070, 0.8);
        g.strokeRoundedRect(
          cx - CARD_W / 2,
          cy - CARD_H / 2,
          CARD_W,
          CARD_H,
          14,
        );
      }
      this.checkTexts[i].setVisible(sel);
      this.cardSprs[i].setScale(sel ? 1.95 : 1.7);
    });
  }

  private refreshArcCards() {
    ARCANAS.forEach((def, i) => {
      const g = this.arcGfx[i];
      if (!g) return;
      const cx = ARC_X0 + i * ARC_STEP;
      const cy = ARC_Y;
      const sel = i === this.arcana;
      g.clear();
      g.fillStyle(sel ? 0x241d44 : 0x161a30, sel ? 1 : 0.92);
      g.fillRoundedRect(cx - ARC_W / 2, cy - ARC_H / 2, ARC_W, ARC_H, 14);
      if (sel) {
        g.lineStyle(3, def.color, 1);
        g.strokeRoundedRect(
          cx - ARC_W / 2 + 2,
          cy - ARC_H / 2 + 2,
          ARC_W - 4,
          ARC_H - 4,
          12,
        );
      } else {
        g.lineStyle(1, 0x3a4070, 0.8);
        g.strokeRoundedRect(cx - ARC_W / 2, cy - ARC_H / 2, ARC_W, ARC_H, 14);
      }
      this.arcChecks[i].setVisible(sel);
    });
  }

  private drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x141830, 0x141830, 0x0a0c18, 0x0a0c18, 1);
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(COLORS.p0, 0.06);
    for (let i = 0; i < 12; i++) {
      g.fillCircle((i * 337) % VIEW_W, 120 + ((i * 193) % 480), 40 + (i % 3) * 24);
    }
    g.fillStyle(COLORS.p1, 0.05);
    for (let i = 0; i < 10; i++) {
      g.fillCircle((i * 461 + 120) % VIEW_W, 160 + ((i * 271) % 440), 30 + (i % 4) * 18);
    }
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ) {
    const w = 280;
    const h = 52;
    const rect = this.add.graphics();
    const draw = (hover: boolean) => {
      rect.clear();
      rect.fillStyle(color, hover ? 1 : 0.85);
      rect.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    };
    draw(false);
    this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.add
      .zone(x, y, w, h)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => draw(true))
      .on('pointerout', () => draw(false))
      .on('pointerdown', onClick);
  }

  private commit() {
    this.registry.set('char', this.selected);
    this.registry.set('arcana', this.arcana);
    window.localStorage.setItem(CHAR_KEY_STORAGE, String(this.selected));
    window.localStorage.setItem(ARC_KEY_STORAGE, String(this.arcana));
  }

  private confirmHost() {
    if (this.joining) return;
    this.commit();
    this.joining = true;
    this.cleanupKeys();
    this.scene.start('room', { role: 'host' });
  }

  private confirmBot() {
    if (this.joining) return;
    this.commit();
    // 人机对战：随机对手角色 / 秘术 / 地图，直接进战斗（本机权威，无 P2P）
    const oppChar = Phaser.Math.Between(0, CHARACTERS.length - 1);
    const oppArcana = Phaser.Math.Between(0, ARCANAS.length - 1);
    const map = Phaser.Math.Between(0, MAPS.length - 1);
    this.registry.set('oppChar', oppChar);
    this.registry.set('oppArcana', oppArcana);
    this.registry.set('map', map);
    this.registry.set('vsBot', true);
    this.joining = true;
    this.cleanupKeys();
    this.scene.start('battle', { role: 'host', vsBot: true });
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.joining) return;

    // ---------- 第二页：秘术选择 ----------
    if (this.page !== 0) {
      if (this.joinMode) {
        if (/^[a-z0-9]$/i.test(e.key) && this.code.length < 4) {
          this.code += e.key.toUpperCase();
          this.updateCodeText();
          if (this.code.length === 4) {
            this.joining = true;
            this.commit();
            this.cleanupKeys();
            this.scene.start('room', { role: 'guest', code: this.code });
          }
        } else if (e.key === 'Backspace') {
          if (this.code.length > 0) {
            this.code = this.code.slice(0, -1);
            this.updateCodeText();
          } else {
            this.backToPage1();
          }
        }
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= 6) this.selectArcana(num - 1);
      else if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Backspace') {
        if (e.key === 'Tab') e.preventDefault();
        this.backToPage1();
      } else if (e.key === 'Enter') {
        if (this.pending === 'host') this.confirmHost();
        else if (this.pending === 'bot') this.confirmBot();
        else this.enterJoinMode();
      }
      return;
    }

    // ---------- 第一页：角色选择 ----------
    if (!this.joinMode) {
      const num = Number(e.key);
      const rows = Math.ceil(CHARACTERS.length / COLS);
      if (num >= 1 && num <= 9) this.select(num - 1);
      else if (e.key === 'ArrowLeft')
        this.select((this.selected + CHARACTERS.length - 1) % CHARACTERS.length);
      else if (e.key === 'ArrowRight')
        this.select((this.selected + 1) % CHARACTERS.length);
      else if (e.key === 'ArrowUp')
        this.select(this.selected >= COLS ? this.selected - COLS : this.selected);
      else if (e.key === 'ArrowDown')
        this.select(
          this.selected < (rows - 1) * COLS ? this.selected + COLS : this.selected,
        );
      else if (e.key === 'Enter') this.openPage2('host');
      else if (e.key === 'Tab') {
        e.preventDefault();
        this.openPage2('host');
      }
      return;
    }
  };

  private updateCodeText() {
    const chars = (this.code + '____').slice(0, 4).split('').join(' ');
    this.codeText?.setText(`房间号：${chars}`);
  }

  private cleanupKeys = () => {
    window.removeEventListener('keydown', this.onKey);
  };
}
