export const ITEMS = {
  key: { name: 'Brass key', desc: 'Heavy, stamped CELLAR LOCKER.', color: '#c9a04a' },
  fuse: { name: 'Lamp fuse', desc: 'Ceramic and copper, wrapped in oilcloth.', color: '#b86b3c' },
  letter: { name: 'Your letter', desc: '"Thursday. If it\'s true, God help you. — M." In your own hand.', color: '#d8c79a' },
  envelope: { name: 'Envelope "T."', desc: 'A brown pay envelope with a T on it. Banknotes inside.', color: '#a8865a' },
  diary: {
    name: 'Engine diary',
    desc: 'Tobin\'s tower diary. The last entry, in his hand: "Thurs 11:40 gen. checked." A page near the back is headed "Low nights — E\'s orders".',
    color: '#7a6a4e',
  },
  diary_torn: { name: 'Engine diary', desc: 'One page torn out for a gasket. "Thurs 11:40 gen. checked." is still there.', color: '#7a6a4e' },
  photo: { name: 'Photograph', desc: 'Harbourmaster Crane on the dock, watching the Marigold sink.', color: '#7d8a93' },
  ledger: { name: 'Ledger', desc: 'Payouts for every ship the papers blamed on the Triangle. "T. — low nights — £40." "M. — no signal logged, Marigold."', color: '#6b3f2a' },
};

export const START_ITEMS = { mara: [], tobin: ['diary'] };

// When one character holds every part, the parts are replaced by the result. None in this story.
export const COMBINATIONS = [];
