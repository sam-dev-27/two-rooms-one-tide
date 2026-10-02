# Postmortem: Two Rooms, One Tide

Half a page. Write it honestly: judgment matters more to reviewers than polish. Sections already filled in describe decisions made before the art existed; add the rest as it happens.

## The pitch in one line

Two characters in two rooms, connected only by a dumbwaiter, solving one mystery. Played solo by swapping between them.

## Decisions that held up

- **Concept chosen around the tool's strengths.** DreamLayer is weak at pixel art and layered sprites, and strong at consistent references and "same thing, changed" edits. Room states are edits of one base image; characters are one reference plus pose edits.
- **Solo swap instead of online co-op.** Voters mostly play alone, itch.io hosts static files only, and networking would have eaten 3-4 of the 10 days. Splitting the state per character keeps co-op possible later.
- **Phaser in the browser instead of Unity or Unreal.** It's a 2D point-and-click with a 10-day deadline, and browser builds get more plays. The packaged game is about 1.3 MB of code plus art.
- **Data-driven and headless-testable.** Puzzle logic only talks to an `api` object, so `npm test` plays both endings in Node in under a second. That caught ordering bugs before any art existed.
- **Placeholders from day one.** Missing images and sounds are generated at runtime, so the game was playable before the first credit was spent.

## What drifted, and how I fixed it

- [Room consistency results from the Oct 3 test]
- [Character consistency results]
- [Anything cleaned up by hand]

## What playtesters taught me

- [The biggest stuck point and the change it caused]
- [Time to finish: before and after the fixes]

## What I cut, and why

- [Anything from the cut list]
- Online co-op: cut on day 1, on purpose.

## What I'd do with more time

- Optional online co-op: sync the two inventories and the flags over WebRTC.
- A third room, with a third character on the lighthouse balcony.
- Short animated transitions for the flood and the lamp lighting, using DreamLayer edit-chains as keyframes.
