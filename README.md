# Two Rooms, One Tide

**Two people. Two rooms. One rising tide.**

A short point-and-click mystery for the DreamLayer Game Jam, set on a lighthouse at the edge of the Bermuda Triangle in 1928. Keeper Elias Venn is dead at the foot of Gull Rock Light, nine ships have gone down on the reef in three years, and the *Halcyon* is due tonight. Mara, a disgraced coastguard signals officer, is locked in the lamp room. Tobin, Elias's apprentice, is locked in the cellar with the tide coming in. You play both, swapping with **Tab**. They talk through a speaking tube and pass things up and down the hatch, and between them they work out that the Triangle is a man with a pen: Harbourmaster Crane, who wrecks ships for the insurance.

Three hands-on puzzles carry the tower work: a lens dial (wipe the soot, set the anchor under the well), five valve wheels set from a mirrored projection, and a Morse shutter to signal the cutter. Along the way each of them quietly destroys a little evidence for a good reason, and a last line of soot on the lens leaves you wondering which of them was on the balcony with Elias. The ending is left open.

- About 15-20 minutes on a first play. Two signal endings (CRANE or SOS), shaped by what each character hid and how high the tide got, then an open final scene whose last line depends on who you are playing.
- A tide clock rises from 0 to 6 as you play and with wrong valve settings. It changes the window, the cellar and the dialogue, but you can never lose.
- Runs in the browser at 1280x720 and scales to fit any screen.
- Art made with [DreamLayer](https://dreamlayer.io). Built with Phaser 3, plain ES modules, no build step.

## Controls

| Input | Action |
| --- | --- |
| Click | Look at, take, or use things |
| Click an item, then a hotspot | Use the item there |
| Click the hatch | Talk through the speaking tube (glows when there's something to say) |
| Click an item, then the hatch | Send it to the other room |
| Tab, or the top-right button | Switch character |
| H | Hint (press again on the same step for a stronger hint; the button pulses after 60 seconds without progress) |
| N | Notebook (clues are copied here automatically) |
| M | Mute |
| Right-click or Esc | Drop the selected item, close dialogs |
| A/D or arrows, 1-5, `.` `-` Space | Keyboard controls inside the lens, valve and shutter puzzles |

## Run it locally

```bash
npm install      # only needed for the DreamLayer CLI and tests
npm run serve    # python3 -m http.server 8000
# open http://localhost:8000
```

You need a local server: opening `index.html` directly blocks image loading. On localhost, press **D** to open the layout tool. It shows every hotspot, lets you drag to measure a new rectangle (the result is copied to the clipboard), and shift-click places the character.

## How it's built

```
index.html               loads Phaser + src/main.js
src/main.js              game config and scene list
src/config.js            resolution, fonts, colours, hint delay, tide pacing
src/scenes/              Boot (assets + placeholders), Title, Game, UI (modals, talks, mini-puzzles), Ending
src/systems/State.js     flags, per-character inventories, hatch arrivals, tide clock (no Phaser)
src/systems/Interact.js  the api puzzle handlers use; keeps game logic apart from presentation
src/systems/Hints.js     escalating hint lookup and the "stuck" timer
src/systems/Sfx.js       plays real audio files, or synthesizes stand-ins with WebAudio
src/systems/Placeholders.js  canvas-drawn stand-ins for any missing image
src/data/                rooms + hotspots, items + combinations, puzzle handlers, story text
tools/                   DreamLayer batch pipeline, headless tests, packaging, submission strips
```

Design rules:

- **Data-driven.** Every hotspot, item, puzzle step, hint and line of text lives in `src/data/`. The scenes contain no puzzle knowledge.
- **Logic is headless.** Puzzle handlers only talk to an `api` object, never to Phaser. `npm test` plays the whole chain in Node for both signal endings and both final lines, and covers the edge cases: a wrong answer in each mini-puzzle, the tide clock advancing without a fail state, the tampering and concealment flags, hint escalation and wrong items. Mini-puzzle answers are checked in `src/data/puzzles.js`, so the UI only collects input.
- **Always playable.** Any missing image gets a generated placeholder and any missing sound gets a synthesized one, so the game ran end to end before any art existed.

## Art pipeline (DreamLayer)

Every image is listed in `tools/assets.json` with its prompt, its one reference image, and the operation used (`generate`, `edit` or `cutout`). `tools/generate.mjs` runs that list through the DreamLayer CLI, skips images that already exist, archives the old version on `--force`, and appends every job to `docs/prompt-log.csv`.

```bash
export DREAMLAYER_API_KEY=dlr_live_...   # never commit this
npm run assets:balance
npm run assets:test         # day-1 consistency test: lamp room before/after + Mara, about 6 credits
npm run assets:rooms        # then characters, items, ui
node tools/generate.mjs --only lamp_after --force    # redo one image
```

- **Rooms** are edit-chains. One base image is generated, then edited with "same room, same camera, same furniture... now flooded".
- **Overlays over new art.** The tide water line, the dim lamp, the glass-plate projection and the soot writing are all drawn in Phaser on top of the painted rooms, so story states cost no credits.
- **Characters** are one approved reference each. Every pose is an edit of that reference, followed by `cutout` (background removal). The sprites are layered over the rooms in Phaser, so a character is never painted into a room. This works around DreamLayer's one-reference-per-call limit, and the characters never pick up the wrong room's lighting.

## Ship it

```bash
npm run build:itch     # runs the tests, builds dist/ and two-rooms-one-tide.zip
```

Upload the zip to itch.io as an HTML project, set the viewport to 1280x720, and tick "This file will be played in the browser". The build includes `assets/manifest.json`, so the game never requests files that don't exist.

## Credits

- Design, code and writing: Sameer Sistla
- Art: generated with DreamLayer, cleaned up by hand (see `docs/SUBMISSION.md`)
- Audio: see `assets/audio/CREDITS.md`
- Engine: [Phaser 3](https://phaser.io) (MIT)
