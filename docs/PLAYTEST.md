# Playtest notes

Rules: one tester at a time. Say only "It's a point-and-click game, play until it ends." Don't explain anything, and don't help unless they've been stuck for 3 minutes, then note that you helped. Time them.

Ask afterwards:
1. What was the story about?
2. Who do you think killed Elias? Why? (We want the answers split between Mara, Tobin and Crane.)
3. When did you first understand you could switch characters, and that the hatch was for talking as well as sending?
4. Which puzzle was the most confusing: the lens dial, the mirrored valve order, or the Morse shutter?
5. Did you notice the tide gauge? Did it make you feel rushed?
6. Did you open the case board? Where did you put the cards, and did the last line of the ending feel like it was about you?
7. When you picked what Mara or Tobin said through the tube, did it feel like your choice mattered? Did you lie? Why?
8. The rheostat hold: was it clear that you had to switch to Mara while Tobin held it? Was 8 seconds too tight or too loose?
9. Did you see the writing on the window in the lightning?
10. Was anything boring or too easy?
11. Did you always know what to do next? Did the Objective line or the arrow help?
12. Who was the old sailor who kept appearing? Did he help, scare you, or get in the way? What did the visions tell you?
13. Did you go out onto the gallery and down into the wheel chamber? Did you know how to get back?
14. The raid at the end: was it clear what to do on each side? Too easy, too hard, or about right? Did you want to skip it?
15. Did you open the Log? What for?
16. Would you play another game like this?

Things to watch for:

- Whether they read the logbook's flash-code names.
- Whether they work out the mirrored order or need hint 2-3.
- How they use the Morse lever on a trackpad.
- What tide level they reach full power at (target 3-4).
- Whether they find the case board without being told (the toast and the "N new" count), and whether they drag or click-to-place.
- Whether they read the tube options or always press 1.
- How many tries the rheostat hold takes.
- Whether the idle mutters or repeat-click remarks surprise them, or start to annoy them.
- Whether they read the How to play card or click straight through it, and whether they ever reopen it (?).
- Whether they read the Objective line in the top bar, and whether it ever sends them the wrong way.
- Whether they find Hold Space on their own, from the tip, or not at all.
- Whether walking feels slow, especially across the lamp room. Do they click empty floor, or only hotspots?
- Whether they read the writing in the close-ups or click them away, and whether the lamp-lit and arrest beats feel like a reward or an interruption.
- Whether the italic in-world writing reads well on a laptop screen, especially the captain's lines over a bright background.
- Whether the amber glow on hover and Hold Space is visible enough without the arrow, particularly on the lit gallery and in the dark cellar. Does anyone miss the labels?
- Whether they find the floor trapdoor in the cellar and the gallery door without the arrow, whether they understand the first click only lifts the trapdoor, and whether they get lost in a side area when the objective says "back inside first".
- The raid: do they read the how-to card? Do they find the beam-then-click rhythm on the gallery and the green window on the ring? Do they notice the warning on the swap button and press Tab, or stay on one front? Which tier do they get first time (target: bruised)? Does anyone use "Skip the fight", and was it fun or a chore? Note any moment where clicks seemed ignored.
- Whether the raid's 75 seconds feels too long or too short, and whether the shouts and lightning are too much.
- How long they spend in the side areas, and whether the total time drifts past 20-25 minutes.
- Whether the captain or a vision ever interrupts something they were in the middle of, and whether they skip him (click/Esc) or wait.
- Whether the chapter cards feel like a breather or a stop; do they click through them straight away?
- Whether anyone reads the captain as the killer or as proof one of the leads did it (he must stay ambiguous).

---

## Tester 1, Oct 7 (rough)

- Name / background:
- Total time:
- Ending (CRANE or SOS; final line as Mara or Tobin):
- Tide at full power:
- Suspect named:
- Hints used:
- First swap at (mm:ss):
- Stuck points (where, how long):
- Misclicks or things they expected to be clickable:
- Quotes:
- Fix:

## Tester 2, Oct 7 (rough)

- Name / background:
- Total time:
- Ending (CRANE or SOS; final line as Mara or Tobin):
- Tide at full power:
- Suspect named:
- Hints used:
- First swap at:
- Stuck points:
- Misclicks:
- Quotes:
- Fix:

## Tester 3, Oct 9 (final)

- Name / background:
- Total time:
- Ending (CRANE or SOS; final line as Mara or Tobin):
- Tide at full power:
- Suspect named:
- Hints used:
- First swap at:
- Stuck points:
- Misclicks:
- Quotes:
- Fix:

## Tester 4, Oct 9 (final)

- Name / background:
- Total time:
- Ending (CRANE or SOS; final line as Mara or Tobin):
- Tide at full power:
- Suspect named:
- Hints used:
- First swap at:
- Stuck points:
- Misclicks:
- Quotes:
- Fix:

## Tester 5, Oct 9 (final)

- Name / background:
- Total time:
- Ending (CRANE or SOS; final line as Mara or Tobin):
- Tide at full power:
- Suspect named:
- Hints used:
- First swap at:
- Stuck points:
- Misclicks:
- Quotes:
- Fix:

---

## Changes made from playtests

| Issue | Seen by | Change |
| --- | --- | --- |
| Clue writing in Georgia italic read as "UI", not as someone's hand | Feedback, Oct 10 | Tried bundled Caveat for in-world writing; reverted (see below) |
| Caveat looked off; preferred the earlier Georgia look | Feedback, Oct 10 | Back to Georgia: upright for UI and dialogue, italic for close-ups, notes, cards, soot and the captain; smaller HUD sizes and fewer UI italics kept |
| Hotspot box outlines looked like a debug overlay | Feedback, Oct 10 | Soft glow from the painting itself (hover, Hold Space, shimmer, arrow) with floating labels |
| Glow too bright / blocky, unlike the 3D version | Feedback, Oct 10 | Subtle warm amber ADD glow at low alpha, elliptical feathered falloff, slow pulse, small dark label tags; reveal slightly fainter than hover |
| Drawn iron door in the cellar looked pasted on | Feedback, Oct 10 | Painted floor trapdoor: lift it, then climb down; the flood leaves it open |
| Captain's story lacked his own moment | Feedback, Oct 10 | Fourth vision at full power: his death on the Marigold's bridge, with a board card |
| Ending felt abrupt after the signal | Feedback, Oct 10 | Finale raid on two fronts before the cutter arrives; tier changes one ending line, skippable |
| Crouch pose looked too big next to standing | Feedback, Oct 10 | Per-character crouch height, checked with idle/crouch screenshots |
| HUD text too large | Feedback, Oct 10 | Top bar, messages, toasts and talk text 10-20% smaller |
| No way to reread a line you clicked past | Feedback, Oct 10 | Log tab (L): every line and choice by chapter |
| Two rooms felt small; story wanted more presence | Feedback, Oct 10 | Gallery and tide-wheel chamber, Captain Hale with three visions, chapter cards I-V, an opening hook through the tube |
| | | |
