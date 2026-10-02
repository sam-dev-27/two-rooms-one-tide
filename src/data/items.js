export const ITEMS = {
  key: { name: 'Brass key', desc: 'Heavy, stamped CELLAR LOCKER.', color: '#c9a04a' },
  fuse: { name: 'Lamp fuse', desc: 'Ceramic and copper, wrapped in oilcloth.', color: '#b86b3c' },
  page_a: { name: 'Torn page (top)', desc: 'Elias\'s handwriting. A valve order, cut off halfway.', color: '#d8c79a' },
  page_b: { name: 'Torn page (bottom)', desc: 'The rest of a page. Water-stained.', color: '#c4b283' },
  valve_order: { name: 'Valve order', desc: 'Red, green, red, blue. For the cellar valves.', color: '#e7d7a8' },
  photo: { name: 'Photograph', desc: 'Harbourmaster Crane, watching the Marigold sink.', color: '#7d8a93' },
  ledger: { name: 'Ledger', desc: 'Insurance payouts for ships that "sank in storms".', color: '#6b3f2a' },
};

// When one character holds every part, the parts are replaced by the result.
export const COMBINATIONS = [
  {
    parts: ['page_a', 'page_b'],
    result: 'valve_order',
    flag: 'pages_joined',
    text: 'The two halves fit together: a valve order in Elias\'s hand. Red, green, red, blue.',
  },
];
