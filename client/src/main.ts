import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from './game/constants';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { RoomScene } from './scenes/RoomScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0d0f1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [BootScene, MenuScene, RoomScene, BattleScene],
});

// 调试钩子（只读）：读取当前场景文字，便于自动化验证
(window as unknown as { __game?: unknown }).__game = game;
