import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { ENDINGS, FINAL_CARD, TAGLINE } from '../data/text.js';
import { state } from '../systems/State.js';

// The last frames: a black card, then the title over the night lighthouse. The truth/cover
// cards play earlier, inside the game (UIScene.endingCard), so the final scene can follow.
export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create({ id }) {
    const ending = ENDINGS[id] ?? ENDINGS.final;
    const seconds = Math.round((Date.now() - state.startedAt) / 1000);
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

    const card = this.add
      .text(WIDTH / 2, HEIGHT / 2, FINAL_CARD, { fontFamily: FONT, fontSize: '36px', fontStyle: 'italic', color: COLORS.paperCss })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.chain({
      targets: card,
      tweens: [
        { alpha: 1, duration: 1400, delay: 600 },
        { alpha: 0, duration: 1000, delay: 2200 },
      ],
      onComplete: () => this.showTitle(ending, time),
    });
  }

  showTitle(ending, time) {
    const bg = this.add.image(0, 0, ending.image).setOrigin(0).setDisplaySize(WIDTH, HEIGHT).setAlpha(0);
    const shade = this.add.graphics().setAlpha(0);
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.8, 0, 0.8, 0);
    shade.fillRect(0, 0, WIDTH * 0.7, HEIGHT);

    const title = this.add
      .text(80, 110, ending.title, { fontFamily: FONT, fontSize: '64px', color: COLORS.paperCss, fontStyle: 'bold' })
      .setShadow(0, 4, '#000', 12, true, true);
    const tagline = this.add.text(84, title.y + title.height + 12, TAGLINE, { fontFamily: FONT, fontSize: '24px', color: COLORS.amberCss, fontStyle: 'italic' });
    const stats = this.add.text(84, tagline.y + 70, `Finished in ${time}  ·  Hints used: ${state.hintsUsed}  ·  Tide ${state.tideBand ?? state.tide}/6`, {
      fontFamily: FONT,
      fontSize: '18px',
      color: COLORS.mutedCss,
    });
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

    this.tweens.add({ targets: [bg, shade], alpha: 1, duration: 1800 });
    [title, tagline, stats, again].forEach((obj, i) => {
      obj.setAlpha(0);
      this.tweens.add({ targets: obj, alpha: 1, duration: 900, delay: 1200 + i * 450 });
    });
  }
}
