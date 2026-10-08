import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { TITLE, TAGLINE } from '../data/text.js';
import { sfx } from '../systems/Sfx.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.starting = false;
    this.add.image(0, 0, 'title').setOrigin(0).setDisplaySize(WIDTH, HEIGHT);
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.65, 0.65, 0, 0);
    shade.fillRect(0, 0, WIDTH, HEIGHT * 0.55);
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.75, 0.75);
    shade.fillRect(0, HEIGHT - 230, WIDTH, 230);

    this.add
      .text(80, 110, TITLE, { fontFamily: FONT, fontSize: '72px', color: COLORS.paperCss, fontStyle: 'bold' })
      .setShadow(0, 4, '#000', 12, true, true);
    this.add.text(84, 200, TAGLINE, { fontFamily: FONT, fontSize: '26px', color: COLORS.amberCss, fontStyle: 'italic' });

    const missing = this.registry.get('missing');
    if (!missing.has('mara')) this.addCharacter('mara', WIDTH - 400, 420);
    if (!missing.has('tobin')) this.addCharacter('tobin', WIDTH - 210, 400);

    const prompt = this.add
      .text(84, HEIGHT - 150, 'Click to begin', { fontFamily: FONT, fontSize: '30px', color: COLORS.paperCss })
      .setShadow(0, 2, '#000', 8, true, true);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.add
      .text(84, HEIGHT - 100, 'A/D: walk    Space: show hotspots    Tab: switch    C: case board    H: hint    ?: help    M: sound', {
        fontFamily: FONT,
        fontSize: '18px',
        color: COLORS.paperCss,
      })
      .setShadow(0, 2, '#000', 6, true, true);
    this.add
      .text(84, HEIGHT - 24, 'Made for the DreamLayer Game Jam. Art generated with DreamLayer.', {
        fontFamily: FONT,
        fontSize: '14px',
        color: COLORS.mutedCss,
      })
      .setOrigin(0, 1);

    const link3d = this.add
      .text(WIDTH - 24, HEIGHT - 24, 'Play the 3D version (experimental) →', {
        fontFamily: FONT,
        fontSize: '17px',
        color: COLORS.amberCss,
        backgroundColor: 'rgba(7,11,16,0.6)',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true });
    link3d.on('pointerover', () => link3d.setColor(COLORS.paperCss));
    link3d.on('pointerout', () => link3d.setColor(COLORS.amberCss));
    link3d.on('pointerdown', (pointer, x, y, event) => {
      event.stopPropagation();
      this.starting = true;
      window.location.href = '3d.html';
    });

    this.input.once('pointerdown', () => this.begin());
    this.input.keyboard.once('keydown-ENTER', () => this.begin());
    this.input.keyboard.once('keydown-SPACE', () => this.begin());
    this.cameras.main.fadeIn(600);
  }

  addCharacter(key, x, height) {
    const img = this.add.image(x, HEIGHT + 20, key).setOrigin(0.5, 1).setAlpha(0);
    img.setScale(height / img.height);
    this.tweens.add({ targets: img, alpha: 1, y: HEIGHT - 10, duration: 900, ease: 'Cubic.Out', delay: 300 });
  }

  begin() {
    if (this.starting) return;
    this.starting = true;
    sfx.startAmbient();
    sfx.play('click');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Cutscene'));
  }
}
