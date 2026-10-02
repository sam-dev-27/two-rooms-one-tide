# Submission draft

Lead with the game and the mechanic. The pipeline comes second. Replace every [bracket] before submitting.

---

## Two Rooms, One Tide

**Two people. Two rooms. One rising tide.**

The keeper of Gull Rock Light has vanished, and someone has barred the doors behind the two people who came looking for him. Mara is trapped in the lamp room and Tobin in the cellar. You play both, swapping between them. Neither can escape alone: each room holds the clues and items the other needs, and an old dumbwaiter is the only thing connecting them. Read a code in one room, use it in the other. Send a key down, send a fuse up. Flood the cellar to turn the generator, and see what floats up. What you find decides whether the truth reaches shore.

- Play in your browser: [itch.io link]
- About 8-10 minutes, two endings
- Made by: Sameer Sistla (design, code, writing)
- Source: [GitHub link]

### How DreamLayer was used

Every image in the game came from DreamLayer, and its edit-chains are built into how the game works. Each room is **one generation plus one edit** ("same room, same camera, same furniture... now flooded"), so the before and after states line up exactly, and the game crossfades between them when you change the room. Each character is **one approved reference**. Every pose is an edit of that reference, then a `cutout` (background removal), and the sprites are layered over the rooms in Phaser instead of being painted in, which keeps them identical in both rooms. A small script ran the whole asset list through the DreamLayer CLI and logged every prompt and result. [What you cleaned up by hand: for example, "I repainted the hatch edge in the flooded cellar and redrew the UI frames by hand."]

[Edit-chain strip: docs/shots/edit-chain-lamp.png]

[Reference to in-game strip: docs/shots/reference-mara.png]

### Numbers

- [N] images generated, [N] kept, [N] rejected. [N] of 100 credits used.
- Biggest problem: [for example, "the flooded edit moved the locker; adding 'do not move any furniture' fixed it on the second try"].

### Screenshots

[3-5 screenshots and the 30-second GIF]
