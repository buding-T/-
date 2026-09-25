// 键盘输入采样：边沿信号（按下当帧为 true）由 keydown 事件记录，每个物理帧采样后清除
import Phaser from 'phaser';
import type { InputState } from '../net/protocol';

export class InputSampler {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keyW: Phaser.Input.Keyboard.Key;
  private keyJ: Phaser.Input.Keyboard.Key;
  private keyK: Phaser.Input.Keyboard.Key;
  private keyShift: Phaser.Input.Keyboard.Key;
  private keyCtrl: Phaser.Input.Keyboard.Key;
  private keyQ: Phaser.Input.Keyboard.Key;
  private ctrlHeld = false;
  private jumpQueued = false;
  private atkQueued = false;
  private spcQueued = false;
  private dashQueued = false;
  private skillQueued = false;
  private arcQueued = false;
  private wheelQueued = false;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.cursors = keyboard.createCursorKeys();
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyJ = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyK = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.keyShift = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keyCtrl = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
    this.keyQ = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('wheel', this.onWheel, { passive: false });
  }

  // 滚轮下滚：元素使切换元素系（边沿信号，采样后清除）
  private onWheel = (e: WheelEvent) => {
    if (e.deltaY > 0) {
      this.wheelQueued = true;
      e.preventDefault();
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // 拦截游戏用键的浏览器默认行为（Ctrl+D 收藏夹、Ctrl+S 保存、空格滚动等）
    switch (e.code) {
      case 'KeyA':
      case 'KeyD':
      case 'KeyS':
      case 'KeyW':
      case 'KeyJ':
      case 'KeyK':
      case 'Space':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'ControlLeft':
      case 'ControlRight':
        e.preventDefault();
        break;
      case 'KeyQ':
        e.preventDefault();
        break;
      default:
        return;
    }
    if (e.repeat) return;
    switch (e.code) {
      case 'Space':
      case 'KeyW':
      case 'ArrowUp':
        this.jumpQueued = true;
        break;
      case 'KeyJ':
        this.atkQueued = true;
        break;
      case 'KeyK':
        this.spcQueued = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.dashQueued = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.ctrlHeld = true;
        this.skillQueued = true;
        break;
      case 'KeyQ':
        this.arcQueued = true;
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
      this.ctrlHeld = false;
    }
  };

  // 鼠标：左键攻击、右键必杀（J/K 仍可用）
  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.atkQueued = true;
    else if (e.button === 2) this.spcQueued = true;
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  /**
   * @param mx 鼠标世界 x（元素使降水落点；相机不滚动时即指针 x）
   * @param my 鼠标世界 y
   */
  sample(mx = 640, my = 360): InputState {
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const down = this.cursors.down.isDown || this.keyS.isDown;
    const jumpHeld =
      this.cursors.up.isDown ||
      this.keyW.isDown ||
      (this.cursors.space?.isDown ?? false);

    const input: InputState = {
      ix: left === right ? 0 : left ? -1 : 1,
      down,
      jumpH: jumpHeld,
      jumpP: this.jumpQueued,
      atkP: this.atkQueued || Phaser.Input.Keyboard.JustDown(this.keyJ),
      spcP: this.spcQueued || Phaser.Input.Keyboard.JustDown(this.keyK),
      dshP: this.dashQueued || Phaser.Input.Keyboard.JustDown(this.keyShift),
      skP: this.skillQueued || Phaser.Input.Keyboard.JustDown(this.keyCtrl),
      skH: this.ctrlHeld || this.keyCtrl.isDown,
      qP: this.arcQueued || Phaser.Input.Keyboard.JustDown(this.keyQ),
      mx,
      my,
      whP: this.wheelQueued,
    };
    this.jumpQueued = false;
    this.atkQueued = false;
    this.spcQueued = false;
    this.dashQueued = false;
    this.skillQueued = false;
    this.arcQueued = false;
    this.wheelQueued = false;
    return input;
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('wheel', this.onWheel);
  }
}
