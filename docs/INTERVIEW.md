# Interview prep (Oct 19-23)

Practise answering these out loud in under a minute each. Be honest that this is your first game, and lean on what you know: shipping under deadlines, tooling, and integrating AI into pipelines.

## Design

**Walk me through the puzzle chain and why it's in that order.**
Mara reads the logbook: it introduces the story, gives the first item, and points downstairs, which teaches swapping. Tobin finds the drawer code on the wall: information crosses rooms before any items do. Mara opens the drawer and sends the key down: this teaches the dumbwaiter, prompted by a tip at the moment it's needed. Tobin opens the locker and finds the fuse. The two page halves have to end up in the same hands, which is the first time the player decides what to send. Tobin opens the valves: the big visual payoff, it powers the lamp, and it reveals the hidden plank. The fuse goes up, the lamp lights, the balcony opens. The evidence under the plank is optional, so the ending is earned by curiosity rather than handed out.

**How did you teach the mechanics without a tutorial screen?**
Three one-time tips, each shown at the moment it's needed: look, swap (after the first clue points to the other room), and send (only after the player has swapped, so the two never collide). There's a hint button that pulses after 60 seconds without progress, and every clue is copied into a notebook.

**Why two endings?**
Replay value, and it rewards exploring. The locked "truth" option on the balcony tells players something was missed without spoiling what.

## Engineering

**Why Phaser over Unity or Unreal?**
The constraints: 2D, a browser build (more plays and votes), 10 days, and no time to learn an editor. I chose the tool for the job. I'd be glad to learn Unity or Unreal for the role.

**How is the code structured?**
Scenes handle presentation only. All content (rooms, hotspots, items, puzzle handlers, text) lives in `src/data`. Handlers talk to an `api` object from `Interact.js`, never to Phaser, so the whole chain runs headlessly in `tools/test-chain.mjs`. Game state is a small event emitter with no engine dependency.

**What was hard?**
[Fill in: art alignment, hotspot tuning, a specific bug.]

**How did you test it?**
A headless test of both endings and the edge cases, a browser playthrough script that uses real mouse and keyboard events (`tools/playthrough.browser.js`), and [N] human playtests.

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
