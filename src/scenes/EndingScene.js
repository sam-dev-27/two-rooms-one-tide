import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { ENDINGS } from '../data/text.js';
import { state } from '../systems/State.js';

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create({ id }) {
    const ending = ENDINGS[id] ?? ENDINGS.cover;
    const seconds = Math.round((Date.now() - state.startedAt) / 1000);
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

    this.add.image(0, 0, ending.image).setOrigin(0).setDisplaySize(WIDTH, HEIGHT);
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.85, 0, 0.85, 0);
    shade.fillRect(0, 0, WIDTH * 0.75, HEIGHT);

    const title = this.add.text(80, 110, ending.title, {
      fontFamily: FONT,
      fontSize: '48px',
      color: COLORS.paperCss,
      fontStyle: 'bold',
      wordWrap: { width: 660 },
    });
    const body = this.add.text(82, title.y + title.height + 28, ending.text, {
      fontFamily: FONT,
      fontSize: '21px',
      color: COLORS.paperCss,
      wordWrap: { width: 600 },
      lineSpacing: 6,
    });
    const stats = this.add.text(82, body.y + body.height + 28, `Finished in ${time}  ·  Hints used: ${state.hintsUsed}`, {
      fontFamily: FONT,
      fontSize: '18px',
      color: COLORS.mutedCss,
    });
    const parts = [title, body, stats];
    if (ending.footer) {
      parts.push(
        this.add.text(82, stats.y + 40, ending.footer, {
          fontFamily: FONT,
          fontSize: '19px',
          color: COLORS.amberCss,
          fontStyle: 'italic',
          wordWrap: { width: 600 },
        }),
      );
    }

    const again = this.add
      .text(82, HEIGHT - 90, 'Play again', {
        fontFamily: FONT,
        fontSize: '24px',
        color: COLORS.paperCss,
        backgroundColor: '#1c2a37',
        padding: { x: 18, y: 9 },
      })
      .setInteractive({ useHandCursor: true });
    again.on('pointerover', () => again.setBackgroundColor('#2c4052'));
    again.on('pointerout', () => again.setBackgroundColor('#1c2a37'));
    again.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
    });
    parts.push(again);

    parts.forEach((obj, i) => {
      obj.setAlpha(0);
      this.tweens.add({ targets: obj, alpha: 1, duration: 900, delay: 600 + i * 450 });
    });
    this.cameras.main.fadeIn(1200);
  }
}
