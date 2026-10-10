# Two Rooms, One Tide

**Two people. Two rooms. One rising tide.**

A short point-and-click mystery for the DreamLayer Game Jam, set on a lighthouse at the edge of the Bermuda Triangle in 1928. Keeper Elias Venn is dead at the foot of Gull Rock Light, nine ships have gone down on the reef in three years, and the *Halcyon* is due tonight. Mara, a disgraced coastguard signals officer, is locked in the lamp room. Tobin, Elias's apprentice, is locked in the cellar with the tide coming in. You play both, swapping with **Tab**. They talk through a speaking tube and pass things up and down the hatch, and between them they work out that the Triangle is a man with a pen: Harbourmaster Crane, who wrecks ships for the insurance.

Three hands-on puzzles carry the tower work: a lens dial (wipe the soot, set the anchor under the well), five valve wheels set from a mirrored projection, and a Morse shutter to signal the cutter. Along the way each of them quietly destroys a little evidence for a good reason, and a last line of soot on the lens leaves you wondering which of them was on the balcony with Elias. The ending is left open.

- About 15-20 minutes on a first play. Two signal endings (CRANE or SOS), shaped by what each character hid and how high the tide got, then an open final scene whose last line depends on who you are playing.
- A tide clock rises from 0 to 6 as you play and with wrong valve settings. It changes the window, the cellar and the dialogue, but you can never lose. As it rises, the lamps flicker more, the rain gets louder and the camera sways.
- **Case board.** Every clue becomes a card that you can drag (or click, then click) under Crane, Mara, Tobin or the Triangle. Some placements get a remark from whoever you're playing, though no remark ever confirms the killer. Whoever you blame picks the last line of the ending.
- **Speaking-tube choices.** At four moments you choose what your character admits through the tube: lie, deflect or come clean. Trust between Mara and Tobin decides who volunteers the ledger, whether the final line is warm or cold, and which alibi cards you get.
- **Two-hands moments.** Tobin can hold the worn rheostat at FULL for 8 seconds, with a countdown on the swap button, while you switch to Mara and latch the lamp. Lightning briefly shows writing on the lamp-room window for whoever is watching.
- **A world that answers back.** Work done in one room is heard in the other on the next swap. Clicking a used-up hotspot again gets a fresh remark, and each character mutters to themselves if you leave them alone too long.
- **Two more places.** Mara can step out of the lamp room onto the storm-lashed **gallery** (it blazes once the lamp is at full), and Tobin can lift the wooden trapdoor in the cellar floor and climb down to the **tide-wheel chamber** (it floods once the valves are set, and the flood leaves the trapdoor open). Each has its own clues, and Tab swaps from wherever you are. The speaking-tube hatch stays in the two main rooms.
- **Captain Hale.** The drowned master of the *Marigold* appears up to six times (one needs Mara to be watching when the lightning strikes), standing or pointing at something, and four of those appearances end in a dreamlike vision that adds cards to the case board. The last one, when the lamp reaches full, is his own death: four shots from the *Marigold*'s bridge as the light dims and the reef comes up. He never says who did it, and he never blocks you: click or Esc moves him on.
- **The raid.** After the signal goes out, Crane's wreckers row in to put the light out before the cutter arrives. Mara sweeps the lamp beam over climbers on the gallery rail and flashes them off; Tobin shoves waders back from the floor hatch with a timing ring. Tab swaps fronts while the other keeps going. You can't lose (an empty meter means a scuffle and a partial refill), and the result (clean, bruised or battered) changes one line of the ending. After one rough moment, or from the Esc menu, you can skip the fight.
- **Chapters and a story log.** Five chapter cards (I-V) mark the big turns, and the **Log** tab (L) of the case board keeps every line, the captain's words, the narration and every choice you made, with the alternatives greyed out.
- The interface and dialogue are upright Georgia; anything written by a hand in the world (the logbook, letters, chalk, soot, cards, the captain) is Georgia italic. Clickable things glow softly in warm amber on hover, under Hold Space and on a first visit, with a small dark label.
- Runs in the browser at 1280x720 and scales to fit any screen.
- Art made with [DreamLayer](https://dreamlayer.io), plus the side areas, the captain and his visions made with another AI tool (see `docs/other-ai-art.csv`). Built with Phaser 3, plain ES modules, no build step.

## Controls

| Input | Action |
| --- | --- |
| Click or Space (cutscenes) | Finish the caption, then go to the next one. Esc or the Skip button skips it |
| Click | Look at, take, or use things (the character walks over first) |
| Click empty floor, or hold A/D or the arrow keys | Walk |
| Hold Space or Shift | Show everything you can click in the room |
| ? or F1, or the ? button | How to play |
| Click an item, then a hotspot | Use the item there |
| Click the hatch | Talk through the speaking tube (glows when there's something to say) |
| Click an item, then the hatch | Send it to the other room |
| Tab, or the top-right button | Switch character |
| H | Hint (press again on the same step for a stronger hint; the button pulses after 60 seconds without progress) |
| C, or the Case button | Case board: drag a clue card onto a suspect, or click it then a column (1-4 also place it, 0 sends it back) |
| N | Notebook, the second tab of the case board (clues are copied here automatically) |
| L, or the Log button | Story log, the third tab: every line and choice, grouped by chapter (mouse wheel, arrows or PageUp/PageDown to scroll) |
| Click or Esc while the captain speaks | Move him on |
| Click, Esc, Enter or Space on a chapter card | Skip it |
| 1-3 during a talk | Pick what your character says through the tube |
| M | Mute |
| Right-click or Esc | Drop the selected item, close dialogs |
| A/D or arrows, 1-5, `.` `-` Space | Keyboard controls inside the lens, valve and shutter puzzles |
| Click, Enter or Esc | Close a close-up (logbook, letter, chalk, ledger, boot prints) |

The top bar always shows the active character's current objective.

## Run it locally

```bash
npm install      # only needed for the DreamLayer CLI and tests
npm run serve    # python3 -m http.server 8000
# open http://localhost:8000
```

You need a local server: opening `index.html` directly blocks image loading. On localhost, press **F2** to open the layout tool. It shows every hotspot and the walkable floor line, lets you drag to measure a new rectangle (the result is copied to the clipboard), and shift-click places the character and sets the floor line. Automation can set `window.__fastWalk = true` (it is on under WebDriver) so characters teleport instead of walking, and `window.__fastStory = true` (also on under WebDriver) so chapter cards and the captain flash past and his visions are skipped. `window.__fastRaid = true` (on under WebDriver) skips the finale raid; set it to `false` to fight it with synthetic input.

Full browser playthrough: `node tools/run3d.mjs --url http://localhost:8000/index.html --script /tools/playthrough.browser.js --opts '{"actor":"mara","story":true,"shots":true}' --shots /tmp/trot`. Add `"raid":"fight"` to play the raid with a simple bot instead of skipping it. `tools/shots.browser.js` jumps straight into story states for screenshots (`--opts '{"set":"glow"}'`, or `hatch`, `hale`, `raid`).

## The 3D version (experimental)

`3d.html` plays the same story in first person: you *are* Mara in the round lamp room and Tobin in the stone cellar, and Tab swaps between them. It is linked from the 2D title screen ("Play the 3D version"); the 2D game in `index.html` stays the main entry.

- Click the view to capture the mouse, then WASD/arrows to walk and the mouse to look. Click or **E** uses what the crosshair is on; **1-8** or the scroll wheel picks an item; **Space** labels everything in view; **Esc** lets go of the mouse and pauses. Where mouse capture is blocked (some iframes), drag to look and click to use.
- It reuses the 2D game's logic unchanged: `src/systems/State.js`, `Interact.js` (`createApi(state, view)`), `Hints.js`, `Sfx.js` and everything in `src/data/`. `src3d/game.js` implements the same `view` contract as `GameScene`, so every puzzle, hint, trust shift, beat and ending is shared.
- The rooms are built procedurally in Three.js (`src3d/rooms/`), vendored in `lib/three/` (r186, MIT) and loaded through an import map. Wall, floor and sea textures are DreamLayer edits of the 2D rooms (group `3d` in `tools/assets.json`), made seamless with `python3 tools/make-tileable.py`. Item icons, close-ups, portraits and cutscene stills are the 2D art, shown in HTML overlays (`src3d/ui/`).

```
3d.html                  import map + src3d/main.js
src3d/main.js            boot, input, title → opening → play → ending
src3d/game.js            the GameScene counterpart: view contract, swap, lightning, idle lines, endings
src3d/world.js           renderer, camera, crosshair picking, hotspot glows, atmosphere
src3d/controls.js        pointer lock / drag-to-look, WASD, collision
src3d/rooms/             procedural lamp room and cellar, one mesh per hotspot id
src3d/ui/                HTML/CSS HUD, modals, case board, cutscenes, title and ending screens
tools/run3d.mjs          headless Chrome driver (console errors, 404s, screenshots)
tools/playthrough3d.browser.js  full 3D playthrough through window.__game3d
```

Test it: `node tools/run3d.mjs --url http://localhost:8000/3d.html --script /tools/playthrough3d.browser.js --opts '{"actor":"mara"}' --shots /tmp/trot-3d`.

## How it's built

```
index.html               loads Phaser + src/main.js
src/main.js              game config and scene list
src/config.js            resolution, fonts, colours, hint delay, tide pacing
src/scenes/              Boot (assets + placeholders), Title, Cutscene (opening), Game, UI (modals, talks, mini-puzzles), Raid (finale fight), Ending
src/systems/Raid.js      the raid's rules: spawn schedule, beam, timing ring, meters, tiers (no Phaser)
src/data/raid.js         raid tuning and text
src/systems/State.js     flags, per-character inventories, hatch arrivals, tide clock (no Phaser)
src/systems/Interact.js  the api puzzle handlers use; keeps game logic apart from presentation
src/systems/Hints.js     escalating hint lookup and the "stuck" timer
src/systems/Sfx.js       plays real audio files, or synthesizes stand-ins with WebAudio
src/systems/Placeholders.js  canvas-drawn stand-ins for any missing image
src/data/                rooms + areas + hotspots, items + combinations, puzzle handlers, story text, case-board cards and epilogues
src/data/story.js        opening hook, chapter cards, Captain Hale's appearances
tools/                   DreamLayer batch pipeline, headless tests, packaging, submission strips
```

Design rules:

- **Data-driven.** Every hotspot, item, puzzle step, hint and line of text lives in `src/data/`. The scenes contain no puzzle knowledge.
- **Logic is headless.** Puzzle handlers only talk to an `api` object, never to Phaser. `npm test` plays the whole chain in Node for both signal endings, both final lines and every tube-choice branch, walking both side areas, and covers the captain (each appearance once, visions adding cards), chapters I-V in the log, choices logged with their alternatives, the 3D fallback without areas, the edge cases (the case board and its epilogues, trust, the rheostat hold timing out, lightning, repeat-click barks), plus: a wrong answer in each mini-puzzle, the tide clock advancing without a fail state, the tampering and concealment flags, hint escalation and wrong items, the floor hatch (lift, descend, return, flooded), Captain Hale's death vision (once, with its card), and the raid (deterministic schedule, beam and ring clicks, scuffle refills, tiers, skip, every ending after each tier). Mini-puzzle answers are checked in `src/data/puzzles.js`, so the UI only collects input.
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
- **Opening cutscene.** Four stills (`assets/cutscene/`) are edits of the title and cellar images; the fifth shot reuses the title. `CutsceneScene` adds the pan/zoom, letterbox, rain, vignette and typed captions from `src/data/cutscenes.js`.
- **Overlays over new art.** The tide water line, the dim lamp, the glass-plate projection and the soot writing are all drawn in Phaser on top of the painted rooms, so story states cost no credits.
- **Characters** are one approved reference each. Every pose is an edit of that reference, followed by `cutout` (background removal). The sprites are layered over the rooms in Phaser, so a character is never painted into a room. This works around DreamLayer's one-reference-per-call limit, and the characters never pick up the wrong room's lighting.

## Ship it

```bash
npm run build:itch     # runs the tests, builds dist/ and two-rooms-one-tide.zip
```

Upload the zip to itch.io as an HTML project, set the viewport to 1280x720, and tick "This file will be played in the browser". The build includes `assets/manifest.json`, so the game never requests files that don't exist.

## Credits

- Design, code and writing: Sameer Sistla
- Art: generated with DreamLayer, cleaned up by hand (see `docs/SUBMISSION.md`). The gallery, the tide-wheel chamber, Captain Hale, his four vision stills and the store-page key art were made with another AI tool; every prompt is in `docs/other-ai-art.csv`
- Audio: see `assets/audio/CREDITS.md`
- Engine: [Phaser 3](https://phaser.io) (MIT); 3D version: [three.js](https://threejs.org) (MIT, `lib/three/LICENSE`)
