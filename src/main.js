import { WIDTH, HEIGHT } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import CutsceneScene from './scenes/CutsceneScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import RaidScene from './scenes/RaidScene.js';
import EndingScene from './scenes/EndingScene.js';
import { state } from './systems/State.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#070b10',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Scene order is also draw order: UI renders above Game.
  scene: [BootScene, TitleScene, CutsceneScene, GameScene, UIScene, RaidScene, EndingScene],
});

if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__game = game;
  window.__state = state;
}
