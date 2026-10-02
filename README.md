# Two Rooms, One Tide

**Two people. Two rooms. One rising tide.**

A short point-and-click escape mystery for the DreamLayer Game Jam. The keeper of Gull Rock Light is missing, and the tide is rising. Mara is locked in the lamp room and Tobin in the cellar. You play both of them, swapping with **Tab**. Neither can escape alone: each room holds the clues and items the other needs, and an old dumbwaiter is the only way to pass things between them. What you uncover along the way decides how the night ends.

- About 8-10 minutes to play, with two endings.
- Runs in the browser at 1280x720 and scales to fit any screen.
- Art made with [DreamLayer](https://dreamlayer.io). Built with Phaser 3, plain ES modules, no build step.

## Controls

| Input | Action |
| --- | --- |
| Click | Look at, take, or use things |
| Click an item, then a hotspot | Use the item there |
| Click an item, then the dumbwaiter hatch | Send it to the other room |
| Tab, or the top-right button | Switch character |
| H | Hint (the button pulses after 60 seconds without progress) |
| N | Notebook (clues are copied here automatically) |
| M | Mute |
| Right-click or Esc | Drop the selected item, close dialogs |

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
src/config.js            resolution, fonts, colours, hint delay
src/scenes/              Boot (assets + placeholders), Title, Game, UI, Ending
src/systems/State.js     flags, per-character inventories, chute arrivals, combinations (no Phaser)
src/systems/Interact.js  the api puzzle handlers use; keeps game logic apart from presentation
src/systems/Hints.js     next-hint lookup and the "stuck" timer
src/systems/Sfx.js       plays real audio files, or synthesizes stand-ins with WebAudio
src/systems/Placeholders.js  canvas-drawn stand-ins for any missing image
src/data/                rooms + hotspots, items + combinations, puzzle handlers, story text
tools/                   DreamLayer batch pipeline, headless tests, packaging, submission strips
```

Design rules:

- **Data-driven.** Every hotspot, item, puzzle step, hint and line of text lives in `src/data/`. The scenes contain no puzzle knowledge.
- **Logic is headless.** Puzzle handlers only talk to an `api` object, never to Phaser. `npm test` plays the whole chain in Node, checks that both endings are reachable, and covers the edge cases (fitting the fuse before the power is on, wrong items, wrong codes).
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
