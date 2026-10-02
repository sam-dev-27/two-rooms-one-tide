# Jam runbook: Oct 3 to Oct 12

The code is done and the game plays end to end with placeholder art. What's left is the work only you can do: spending credits, judging art, watching people play, and submitting. Each day below lists exact steps. Tick them off as you go.

Deadline: submissions close **Oct 12**, and the time and timezone aren't stated. **Submit on Oct 11.**

---

## Oct 3: credits, key, consistency test (go/no-go)

- [ ] Claim the 100 free API credits with the form link in the jam doc.
- [ ] Create an API key at https://platform.dreamlayer.io (sidebar, API keys). It starts with `dlr_live_`. Never paste it into chat, code or git.
- [ ] In the project folder:
  ```bash
  export DREAMLAYER_API_KEY=dlr_live_...
  npm run assets:balance          # expect 100
  npm run assets:dry              # read the prompts and commands, which spends nothing
  ```
- [ ] Run the consistency test (6 jobs: lamp room base and edit, Mara reference, cutout, pose edit, cutout):
  ```bash
  npm run assets:test
  npm run assets:balance          # expect about 94; the CLI says 1 credit per finished image
  ```
  If the balance dropped by more than 6, stop and re-plan the budget before going further.
- [ ] Judge the results, then fill in the `verdict` column in `docs/prompt-log.csv` with "kept" or "rejected":
  - **Room:** open `assets/rooms/lamp_before.png` and `lamp_after.png` side by side. Did the desk, lamp, window, hatch and door stay in the same place? Small drift is fine; moved furniture is not.
  - **Character:** compare `tools/raw/mara_raw.png` with `mara_act_raw.png`. Same face, scarf, coat and lantern?
  - **Cutouts:** `assets/characters/mara.png` should have a clean transparent background.
- [ ] Decision:
  - **Pass:** continue with the plan.
  - **Room drifts:** edit the prompt in `tools/assets.json` (add "do not move any furniture", simplify the room description), then `node tools/generate.mjs --only lamp_after --force`. Two retries at most.
  - **Character drifts:** make the reference prompt more specific about the fixed parts (hair, scarf colour, the lantern) and regenerate.
- [ ] Look at the style. If it's not what you want, change the `style` line in `tools/assets.json` **now**, and never again after today.
- [ ] Run the game (`npm run serve`, open http://localhost:8000). The lamp room and Mara now use your art.

## Oct 4: rooms

- [ ] `npm run assets:rooms` (generates the cellar base and its flooded edit; the lamp room already exists)
- [ ] Check that `cellar_after.png` shows the floating plank. If not, redo it with `--only cellar_after --force` and a stronger prompt.
- [ ] `git add -A && git commit -m "Add room art"`

## Oct 5: characters, items, screens, community post

- [ ] `npm run assets:characters` (Tobin), then `npm run assets:items`, then `npm run assets:ui`
- [ ] Check every icon reads clearly at 54px (look at the inventory bar in-game).
- [ ] Post a progress update in the jam community tab: one screenshot of each room, one sentence on the mechanic ("two characters, two rooms, a dumbwaiter between them"). Early posts get early plays.
- [ ] Commit.

## Oct 6: buffer for regenerations

Use today for any art retries, using the credits held back for that. Keep the log honest: rejected images are interview material.

## Oct 7: fit the layout to the art, first rough playtest

- [ ] Run the game on localhost and press **D** for layout mode.
- [ ] For each hotspot, drag a rectangle over the object in your art. The `x, y, w, h` values are copied to the clipboard; paste them into `src/data/rooms.js`. Keep everything above y = 636, where the inventory bar starts.
- [ ] Shift-click where each character should stand, then paste the logged `char: { x, y, h }` into `rooms.js`. Adjust `h` until they look the right size.
- [ ] Check the plank hotspot matches the floating board in `cellar_after.png`.
- [ ] `npm test` must still pass.
- [ ] Rough playtest with 1-2 people who haven't seen the game. Use `docs/PLAYTEST.md`. **Don't help them.** Watch and write things down.

## Oct 8: audio and story pass

- [ ] Find CC0 sounds (see `assets/audio/CREDITS.md`) and save them with the exact file names listed there. Fill in the credits table.
- [ ] Re-read every line in `src/data/puzzles.js` and `src/data/text.js` against your art. If the art shows a blue door, the text shouldn't say red.
- [ ] Fix whatever the Oct 7 testers got stuck on. If they finished in under 5 minutes, add one puzzle. The easiest is a tide-chart code Mara reads and Tobin enters, copying the `drawer` handler and keypad pattern.

## Oct 9: final playtest

- [ ] 3 new people. Same rules: don't help them, and time them.
- [ ] Make the first 60 seconds flawless: they should click the logbook, get the "press Tab" tip and swap without asking you anything.
- [ ] Fix anything that blocked more than one person.
- [ ] No online co-op. That decision is final.

## Oct 10: deploy

- [ ] `npm run build:itch` (runs the tests, then builds `two-rooms-one-tide.zip`)
- [ ] On itch.io: Dashboard, Create new project.
  - Kind of project: **HTML**. Upload the zip and tick **This file will be played in the browser**.
  - Viewport: **1280 x 720**. Tick **Fullscreen button**. Leave "Mobile friendly" off unless you've tested it on a phone.
  - Visibility: public (or restricted until submission, if the jam allows it).
- [ ] Test the public link in a second browser and on your phone. Press Tab, send an item, and finish one ending.
- [ ] Push the repo to a public GitHub repository and put the link on the itch page.

## Oct 11: submission write-up, then submit

- [ ] Screenshots: 3-5 at 1280x720 (title, lamp room, flooded cellar, keypad or choice, an ending). Save the in-game shots of Mara and Tobin as `docs/shots/mara_ingame.png` and `tobin_ingame.png`.
- [ ] A 30-second GIF or clip: swap, send an item down, the cellar flooding.
- [ ] Open `http://localhost:8000/tools/strip.html` and download the edit-chain and reference strips.
- [ ] Finish `docs/SUBMISSION.md` and paste it into the jam form.
- [ ] **Submit today.**

## Oct 12: buffer only. Fix only critical bugs.

## Oct 13-18: interview prep

- [ ] Finish `docs/POSTMORTEM.md`.
- [ ] Go through `docs/INTERVIEW.md` out loud.

---

## Cut list, if you fall behind (in this order)

1. The cover-up ending (make the balcony always give the truth ending once the evidence is found)
2. The `_act` poses (just don't generate them; the idle pose is then used everywhere)
3. Any extra puzzles
4. Audio beyond the ambient loop and clicks (the synth fallback covers the rest)

Never cut the playtests or the early submission.
