# Interview prep (Oct 19-23)

Practise answering these out loud in under a minute each. Be honest that this is your first game, and lean on what you know: shipping under deadlines, tooling, and integrating AI into pipelines.

## Design

**Walk me through the puzzle chain and why it's in that order.**
It's 20 steps, and every room needs the other at least three times. Mara's logbook teaches flash-code names in the first minute (C for Crane, M for "tell M everything Thursday"), and that habit pays off in the last frame. Tobin's chalk gives the drawer code and an anchor symbol: information crosses rooms before items do. The key goes down and the fuse comes up, which teaches the hatch. Then the tower work is three hands-on puzzles that each pass something across. Mara's lens dial throws a projection onto Tobin's wall. That projection is the valve order, but mirrored, because the logbook said "the well flips everything". The valves flood the tide wheel, which powers Mara's lamp. Tobin's rheostat brings it to full power, and Mara taps the name to the cutter in Morse. CRANE is only possible if Tobin sent the ledger up, so the better ending is earned by sharing evidence.

**What's the twist, and how did you keep it fair?**
Each character performs one "tampering" act the player has to do for a good reason: Mara wipes soot off the lens to read it, Tobin tears a diary page for a gasket, and his flood washes away boot prints. After the ending card, the final projection shows what the wipe removed: "IF I FALL IT WAS" and one dash. A dash is T; two would be M. Every suspicious moment has an innocent reading, so the ending stays open. The last line is spoken by whichever character you aren't controlling, which makes it land on you.

**How did you teach the mechanics without a tutorial screen?**
One-time tips at the moment they're needed: look, swap, send, the speaking tube, and the tide gauge. The hatch glows when there's a conversation waiting. Hints escalate: pressing H again on the same step goes from a nudge to the full answer, so nobody is stuck for good. Every clue is copied into a notebook.

**Why a tide clock with no fail state?**
It gives pressure and atmosphere (the window, the cellar water and Tobin's lines all change) without punishing slow readers in a story game. Wrong valve attempts raise it, so mistakes cost something you can see. Where the tide stood when the lamp reached full power is written into the ending.

**Why two signal endings and then an open ending?**
The CRANE/SOS split and the two concealment choices (hide or share Mara's letter and Tobin's envelope) reward exploring and change the ending text. The final scene is the same for everyone, because the ambiguity is the point.

## Engineering

**Why Phaser over Unity or Unreal?**
The constraints: 2D, a browser build (more plays and votes), 10 days, and no time to learn an editor. I chose the tool for the job. I'd be glad to learn Unity or Unreal for the role.

**How is the code structured?**
Scenes handle presentation only. All content (rooms, hotspots, items, puzzle handlers, text) lives in `src/data`. Handlers talk to an `api` object from `Interact.js`, never to Phaser, so the whole chain runs headlessly in `tools/test-chain.mjs`. Game state, including the tide clock, is a small event emitter with no engine dependency. The mini-puzzle modals in the UI scene only collect input; the answers are checked by callbacks in the data layer, which is how the tests can try wrong valve orders and wrong Morse symbols.

**What was hard?**
[Fill in: art alignment, hotspot tuning, a specific bug.]

**How did you test it?**
A headless test of both signal endings, both final lines and the edge cases, a browser playthrough script that uses real mouse and keyboard events (`tools/playthrough.browser.js`), and [N] human playtests.

## DreamLayer

**How did you keep the art consistent?**
One locked style line in every prompt. Rooms are edit-chains from one base image. Characters are one approved reference each, with poses as edits, then cutouts layered in-engine, which works around the one-reference-per-call limit.

**What went wrong with the tool, and how did you fix it?**
[Fill in from docs/prompt-log.csv: the rejected rows and what you changed.]

**What did you do by hand?**
[Fill in.]

## Questions to ask them

- What does a typical week look like for a game dev on the team?
- How do you use DreamLayer internally? What would you want the next version to do for game teams?
- What separated the jam entries you liked most?
