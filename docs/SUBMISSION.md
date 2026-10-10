# Submission draft

Lead with the game and the mechanic. The pipeline comes second. Replace every [bracket] before submitting.

---

## Two Rooms, One Tide

**Two people. Two rooms. One rising tide.**

1928, the edge of the Bermuda Triangle. Sailors say ships just vanish out here: nine on the reef at Gull Rock in three years. Tonight the old keeper, Elias Venn, lies dead at the foot of his own lighthouse, and the *Halcyon* is due on the reef by morning.

Mara, a coastguard signals officer dismissed over the wreck that killed her brother, is locked in the lamp room. Tobin, Elias's apprentice, is locked in the cellar with the tide coming in. You play both, swapping between them. They talk through a speaking tube and pass things up and down a hatch, and neither room can be solved alone. Wipe the soot off the great lens and turn it until it throws a pattern of light onto Tobin's wall. Read that pattern the right way round to set the valve wheels and flood the tide wheel. Bring the lamp up to full power and tap a name to the coastguard cutter in Morse.

The Triangle turns out to be a man with a pen. But every useful thing you did that night also wiped away a little evidence, and the last line of soot on the lens doesn't name Crane.

- Play in your browser: [itch.io link]
- About 15-20 minutes. Two signal endings, a tide clock that changes the world but never kills you, and an open final scene whose last line depends on who you are playing.
- A case board: pin each clue under Crane, Mara, Tobin or the Triangle. Whoever you blame chooses the ending's last line.
- You speak for both of them. Lie, deflect or come clean through the speaking tube, and the trust between them changes what they offer and how the night ends.
- Two-hands moments: Tobin holds the rheostat at full power against the clock while you switch to Mara to latch the lamp, and lightning shows a message on the window for a few seconds.
- The tower answers back. One room hears what happened in the other, used-up objects get fresh remarks, and the storm grows with the tide.
- Step outside the two rooms: Mara onto the storm-lashed gallery where Elias fell, Tobin down through a trapdoor in the cellar floor to the tide-wheel chamber.
- Captain Hale, drowned master of the *Marigold*, keeps appearing to them. Sometimes he points; four times he leaves them with a dreamlike vision, the last of them his own death on the *Marigold*'s bridge. He never names the killer.
- A finale raid: once the signal goes out, Crane's wreckers row in to put out the light. Sweep the lamp beam over climbers on the gallery as Mara, time shoves against waders in the cellar as Tobin, and Tab between the two fronts until the cutter arrives. You can't lose, and how it went changes a line of the ending (or skip the fight).
- Five chapter cards, and a story log that keeps every line and every choice, with the roads not taken greyed out.
- Easy to pick up: walk Mara and Tobin around their rooms, read the clues in painted close-ups, follow the objective line in the top bar, and hold Space to see everything you can click.
- Made by: Sameer Sistla (design, code, writing)
- Source: [GitHub link]

### How DreamLayer was used

The two main rooms, both characters, every close-up, the cutscenes and the endings came from DreamLayer, and its edit-chains are built into how the game works. Each room is **one generation plus edits** ("same room, same camera, same furniture... now flooded", "...now at low tide with the wreck showing"), so every state lines up exactly, and the game crossfades between them as the night goes on. The endings are edits of the title image, so the same tower and rock carry through to the last frame. So is the short opening cutscene (a sinking ship, the keeper at the foot of the tower, Mara and Tobin rowing out, a barred door), played as slow pans with typed captions, along with two mid-story beats: the lamp blazing over the wreck, and Crane led along his quay. The logbook, letter, chalk, ledger and boot prints each have a painted close-up with blank pages, and the game writes the clue text onto them, so the words stay exact and editable. Story states that would have needed more art (the rising water line, the dim lamp, the light projected onto the cellar wall, the soot writing) are drawn in Phaser over the paintings instead. Each character is **one approved reference**. Every pose (idle, act, two walk frames, crouch, talk) and the talk-panel portrait is an edit of that reference, then a `cutout` (background removal), and the sprites are layered over the rooms in Phaser instead of being painted in, which keeps them identical in both rooms. A small script ran the whole asset list through the DreamLayer CLI and logged every prompt and result. [What you cleaned up by hand: for example, "I repainted the hatch edge in the flooded cellar and redrew the UI frames by hand."]

**Art from another tool.** Some late art was made with a different AI image tool, not DreamLayer: the gallery and the tide-wheel chamber (each a generation plus one "same scene, now lit / now flooded" edit), Captain Hale's two poses, his four vision stills, and the store-page key art and cover. Every prompt, reference image and attempt count is listed in `docs/other-ai-art.csv`.

The late additions are DreamLayer again: the cellar floor trapdoor (closed, lifted, and in the flooded cellar) as three edits of the existing cellar paintings so the furniture stays put; Captain Hale's four death-vision stills as edits of the *Marigold* vision and the title; and the wreckers as one generated reference, two pose edits (climbing, staggering) and `cutout`, plus a boats still edited from the title image.

[Edit-chain strip: docs/shots/edit-chain-lamp.png]

[Reference to in-game strip: docs/shots/reference-mara.png]

### Numbers

- 45 DreamLayer jobs (14 generations, 17 edits, 14 cutouts): 40 kept, 5 rejected. 44 of 100 credits used.
- Biggest problems: the low-tide room edit came back square and turned the window into an open arch, until a prompt insisting on "same wide 16:9 framing... same arched window with its dark mullions" fixed it. Two cutouts were recut by hand: one lost its paper along with the white background, and one kept a painted drop shadow.

### Screenshots

[3-5 screenshots and the 30-second GIF]
