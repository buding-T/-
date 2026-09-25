import Phaser from 'phaser';
import { buildCharacterArt } from '../game/characters';

// 启动场景：在进入菜单前生成全部角色像素纹理/动画
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    buildCharacterArt(this);
    this.scene.start('menu');
  }
}
