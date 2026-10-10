// Case board: every meaningful clue becomes a card the player can pin on a suspect.
// `icon` is a texture key (item art) when one exists; otherwise `glyph` is drawn on the card.
// `text` fits on the card; `detail` is shown when the card is hovered or selected.

export const COLUMNS = [
  { id: 'crane', name: 'Crane', color: 0x7d8a93 },
  { id: 'mara', name: 'Mara', color: 0xb5413a },
  { id: 'tobin', name: 'Tobin', color: 0xd9a441 },
  { id: 'triangle', name: 'The Triangle', color: 0x2f6f86 },
];

export const CARDS = {
  fall: { title: 'A fall', text: 'Found on the rocks below.', glyph: '↓', detail: 'Elias Venn was found on the rocks at the foot of the tower three nights ago. Harbourmaster Crane called it a fall.' },
  flash_names: { title: 'Flash-code names', text: '−·−· is C. Crane.', glyph: '−·', detail: 'Elias wrote names in Morse in his log. "−·−·\'s men on the rocks again." C: Crane.' },
  thursday: { title: 'Tell −− everything', text: 'M, on Thursday.', glyph: '−−', detail: '"Tell −− everything Thursday." Two dashes is M. Thursday is the night he died.' },
  prints: { title: 'Boot prints', text: 'One set never came down.', glyph: '⁞', detail: 'Two sets of boot prints on the cellar stairs, one smaller. One set never comes back down. Both leads are slight.' },
  glove: { title: 'Harbourmaster\'s glove', text: 'Too big for anyone here.', glyph: 'H', detail: 'An oversized oilskin glove stamped HARBOURMASTER, in the cellar supply crate.' },
  letter: { title: 'Mara\'s letter', text: '"God help you. — M."', icon: 'letter', detail: '"Thursday. If it\'s true, God help you. — M." In Elias\'s drawer, in Mara\'s hand.' },
  envelope: { title: 'Envelope "T."', text: 'A month\'s wages, and more.', icon: 'envelope', detail: 'Banknotes in a brown envelope marked "T.", in the cellar locker. Elias handed Tobin envelopes like it on rough nights.' },
  diary_1140: { title: 'Thurs 11:40', text: '"gen. checked." Tobin\'s hand.', icon: 'diary', detail: 'Tobin\'s engine diary, in his own hand: "Thurs 11:40 gen. checked." The night Elias died.' },
  torn_page: { title: 'Torn page', text: '"Low nights — E\'s orders"', glyph: '¶', detail: 'Tobin tore the "Low nights — E\'s orders" page out of his diary to make a gasket. Nobody can check it now.' },
  soot_wipe: { title: 'Wiped soot', text: 'Something scratched, gone.', glyph: '≈', detail: 'Mara wiped the lens with her scarf. Something scratched in the soot on the rim came away with it.' },
  wreck: { title: 'The Marigold', text: 'Still on the reef.', glyph: '⚓\uFE0E', detail: 'At low tide the Marigold\'s broken hull shows on the reef. Mara\'s brother Danny was a deckhand on her.' },
  photo: { title: 'The photograph', text: 'Crane watched her sink.', icon: 'photo', detail: 'Harbourmaster Crane on the dock, watching the Marigold go down.' },
  ledger: { title: 'The ledger', text: 'Nine ships. T and M inside.', icon: 'ledger', detail: 'Insurance payouts for every ship "lost to the Triangle". "T. — low nights — £40." "M. — no signal logged, Marigold."' },
  rheostat_low: { title: 'Worn LOW mark', text: 'Turned there often.', icon: 'rheostat', detail: 'The rheostat sat on a scratched LOW mark, worn bright as if someone turned it there often.' },
  wool: { title: 'Red wool', text: 'On the rail he fell from.', glyph: '∿', detail: 'A tuft of red wool snagged on a rivet of the balcony rail, where Elias went over.' },
  two_boats: { title: 'Two boats', text: 'Traced in the salt.', glyph: 'ϟ', detail: 'Lightning lit up words traced in the salt on the lamp-room window: TWO BOATS THURS.' },
  projection: { title: 'IF I FALL IT WAS −', text: 'One bar. Then a clean streak.', glyph: '−', detail: 'Elias\'s last words, scratched in the lens soot: IF I FALL IT WAS, one long bar, then a clean streak the width of a scarf. T is one dash. M is two.' },
  // Unlocked by what the player chose to say through the speaking tube.
  alibi_tobin_aunt: { title: '"At my aunt\'s"', text: 'Tobin: in town all night.', glyph: '?', detail: 'Tobin told Mara he was at his aunt\'s in town all of Thursday night.' },
  alibi_tobin_back: { title: 'Back at 11:40', text: 'Tobin: "I never went up."', glyph: '!', detail: 'Tobin admitted he came back on the late boat on Thursday to check the generator. He says he never went up.' },
  alibi_mara_never: { title: '"Never been here"', text: 'Mara: first time tonight.', glyph: '?', detail: 'Mara told Tobin she had never been out to the rock before tonight.' },
  alibi_mara_here: { title: 'Thursday visit', text: 'Mara: "He was alive."', glyph: '!', detail: 'Mara admitted she was on the rock on Thursday and argued with Elias on the balcony. She says he was alive when she left.' },
  low_orders: { title: 'E\'s orders', text: 'Tobin turned it low.', glyph: '¶', detail: 'Tobin admitted he turned the lamp low on rough nights himself, on Elias\'s orders. He says Elias called it resting the generator.' },
  crane_offer: { title: 'Crane\'s offer', text: 'Mara says she refused.', glyph: '£', detail: 'Mara says Crane offered her money to log "no signal" for the Marigold, and she said no.' },
  // The side areas and Captain Hale (GHOSTS in story.js). Visions are what he showed, not proof.
  captain: { title: 'Captain Hale', text: 'Master of the Marigold.', glyph: '†', detail: 'A drowned man in a captain\'s coat, seen on the rock tonight. He named himself Hale, of the Marigold. He talks in riddles and never names anyone.' },
  vision_dim: { title: 'A careful hand', text: 'The lamp turned low.', glyph: '◐', detail: 'The captain showed it: three years ago, a hand on the rheostat turning the lamp low and orange. He said it was a hand that loved the tower.' },
  vision_marigold: { title: 'Danny singing', text: 'Then the reef.', glyph: '⚓\uFE0E', detail: 'The captain showed it: the Marigold rounding the reef in the dark, a deckhand called Danny Quell singing on the foredeck.' },
  vision_stairs: { title: 'Boots on the stairs', text: 'Up, more up, one down.', glyph: '⁞', detail: 'The captain showed it: Thursday, boots climbing the stairs, then other boots. A raised voice at the rail. Then one pair going down, quickly. No faces.' },
  marigold_last: { title: 'The Marigold\'s last minutes', text: 'Lit, dimmed, lit too late.', glyph: '≈', detail: 'The captain showed how he died: steering by Gull Rock Light until a hand that knew the lamp turned it down; the reef; and the light coming back to full when nobody could be saved. He never showed whose hand.' },
  vision_crane: { title: 'Paid in full', text: 'A pen in the harbour office.', glyph: '£', detail: 'The captain showed it: the morning after the Marigold, a pen in the harbour office writing "Marigold. Reef. Paid in full."' },
  tally: { title: 'Nine marks', text: 'Two of them fresh.', glyph: 'IX', detail: 'Nine tally marks scratched into the lamp-room window frame out on the gallery. The last two are bright and new.' },
  cut_rope: { title: 'Cut rope', text: 'Two rings. One boat.', glyph: '⌇', detail: 'Two mooring rings below the gallery. Mara\'s boat is tied to one; on the other, a rope end cut clean with a knife.' },
  stay_in_town: { title: '"Not Thursday"', text: '"Stay in town. — E."', glyph: '✉', detail: 'A note folded behind the lantern in the wheel chamber: "T. — not Thursday. Stay in town. — E." Elias wanted Tobin away that night.' },
  slate: { title: 'Wheel slowed', text: 'Nine dates on a slate.', glyph: '▤', detail: 'Elias\'s slate on the wheel-chamber bench: "wheel slowed" against nine dates. Every one is the night a ship was lost.' },
};

// Lines the controlled character says when a card is first pinned to a column. Never a verdict.
export const REACTIONS = [
  { card: 'fall', column: 'triangle', mara: 'Sailors say the Triangle takes people. It doesn\'t push them.', tobin: 'He knew every rivet of that rail. He didn\'t just... fall.' },
  { card: 'fall', column: 'crane', mara: 'Crane called it a fall very quickly.', tobin: 'Crane said "a fall" before anyone had even rowed out.' },
  { card: 'glove', column: 'crane', mara: 'Nobody on this rock has hands that big. Copy.', tobin: 'Harbour stamp. Nobody else wears that.' },
  { card: 'prints', column: 'triangle', mara: 'Ghosts don\'t wear boots.', tobin: 'The sea doesn\'t leave footprints. Not on the stairs.' },
  { card: 'letter', column: 'mara', mara: 'I wrote it angry. Angry isn\'t guilty.', tobin: '"God help you." That\'s not a thank-you note.' },
  { card: 'envelope', column: 'tobin', mara: 'Crane pays people. Somebody paid Tobin.', tobin: 'Wages. It was wages. ...Wasn\'t it?' },
  { card: 'envelope', column: 'crane', mara: 'Crane\'s money finds its way into a lot of pockets.', tobin: 'If that was Crane\'s money, I don\'t want it.' },
  { card: 'torn_page', column: 'tobin', mara: 'Convenient page to lose.', tobin: 'I needed a gasket. I needed it.' },
  { card: 'soot_wipe', column: 'mara', mara: 'I cleaned a lens. That\'s all I did.', tobin: 'He never let anyone touch that glass. She just wiped it.' },
  { card: 'wool', column: 'mara', mara: 'It\'s a common scarf. ...It\'s my scarf.', tobin: 'Red wool. She\'s wearing red wool.' },
  { card: 'diary_1140', column: 'tobin', mara: 'Eleven-forty. That\'s not "in town".', tobin: 'I checked the generator. That\'s all I wrote because that\'s all I did.' },
  { card: 'ledger', column: 'crane', mara: 'There\'s no Triangle. There\'s a man with a pen.', tobin: 'Nine ships. He wrote them down like a grocery list.' },
  { card: 'photo', column: 'crane', mara: 'He watched. He stood on the dock and watched Danny drown.', tobin: 'He\'s smiling. Look at him. He\'s nearly smiling.' },
  { card: 'two_boats', column: 'triangle', mara: 'The Triangle doesn\'t row.', tobin: 'Two boats. The sea only needs one.' },
  { card: 'two_boats', column: 'crane', mara: 'Crane\'s men came by boat. So did I.', tobin: 'Crane\'s men, rowing out. ...I came by boat too.' },
  { card: 'projection', column: 'tobin', mara: 'One dash is T. Unless the second one is on my scarf.', tobin: 'One dash. Shortest letter for the shortest... No.' },
  { card: 'projection', column: 'mara', mara: 'Two dashes would be M. There\'s only one left.', tobin: 'One bar left. But someone wiped the rest away.' },
  { card: 'projection', column: 'crane', mara: 'C is dash-dot-dash-dot. That isn\'t what\'s there.', tobin: 'Crane starts with a dash too. ...Doesn\'t it?' },
  { card: 'low_orders', column: 'tobin', mara: 'At least he told me himself.', tobin: 'I told her the truth. It still sounds bad out loud.' },
  { card: 'alibi_mara_never', column: 'mara', mara: 'I said a lot of things tonight.', tobin: 'Never been out here. She said that very smoothly.' },
  { card: 'alibi_tobin_aunt', column: 'tobin', mara: 'His aunt. I\'d like to meet his aunt.', tobin: 'Auntie would vouch for me. Mostly.' },
  { card: 'captain', column: 'triangle', mara: 'A drowned man on a lighthouse. The Triangle would love that.', tobin: 'If the sea sends its dead back, it\'s not to push keepers off rails.' },
  { card: 'vision_dim', column: 'tobin', mara: 'A hand that loved the tower. Tobin loves this tower.', tobin: 'I turned it low. Elias turned it lower. We both loved it.' },
  { card: 'vision_crane', column: 'crane', mara: 'Paid in full. Danny had a price, and Crane paid it.', tobin: 'He never set foot on the rock. He didn\'t have to.' },
  { card: 'marigold_last', column: 'crane', mara: 'Somebody turned it down for Crane, and turned it back up for the inquiry.', tobin: 'Back up to full afterwards. So the log would say the light was fine.' },
  { card: 'marigold_last', column: 'tobin', mara: 'A hand that knew the lamp. There aren\'t many on this rock.', tobin: 'I knew that lamp. I know how that sounds.' },
  { card: 'vision_stairs', column: 'mara', mara: 'Some of those boots were mine. I\'m not pretending otherwise.', tobin: 'She was up there. She said so. ...Didn\'t she?' },
  { card: 'stay_in_town', column: 'tobin', mara: 'Elias wanted him away. Away from what?', tobin: 'He told me to stay in town. I didn\'t listen.' },
  { card: 'cut_rope', column: 'crane', mara: 'Somebody left in a hurry and didn\'t untie.', tobin: 'Crane\'s men cut ropes. They don\'t have time for knots.' },
  { card: 'slate', column: 'crane', mara: 'Nine dates. Nine payouts. Somebody kept the books on both ends.', tobin: 'Gertie never slowed on her own. Not once.' },
];

/** The reaction for pinning `card` on `column` as `actor`, or null. */
export function boardReaction(card, column, actor) {
  const r = REACTIONS.find((x) => x.card === card && x.column === column);
  return r ? { who: actor, text: r[actor], key: `${card}:${column}` } : null;
}

export const EPILOGUES = {
  open: 'You kept an open mind.',
  everyone: 'You suspected everyone.',
  crane: 'You blamed the man with the pen.',
  triangle: 'You blamed the sea.',
  mara: 'You pinned it on Mara.',
  tobin: 'You pinned it on Tobin.',
  maraNeverTobin: 'You never doubted Tobin.',
  tobinNeverMara: 'You never doubted Mara.',
};

/** Reads the board's weighting: one column holding most of the pinned cards decides the line. */
export function boardVerdict(board) {
  const counts = Object.fromEntries(COLUMNS.map((c) => [c.id, 0]));
  for (const { column } of Object.values(board)) if (column) counts[column]++;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 'open';
  const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const dominant = n >= 2 && n * 2 >= total && Object.entries(counts).every(([id, v]) => id === top || v < n);
  if (dominant) {
    if (top === 'tobin') return counts.mara === 0 ? 'tobinNeverMara' : 'tobin';
    if (top === 'mara') return counts.tobin === 0 ? 'maraNeverTobin' : 'mara';
    return top;
  }
  if (Object.values(counts).filter((v) => v > 0).length >= 3) return 'everyone';
  return 'open';
}

export const epilogueLine = (board) => EPILOGUES[boardVerdict(board)];
