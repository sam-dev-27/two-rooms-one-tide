// Every file the game will try to load. Anything missing gets a generated placeholder
// (images) or a synthesized sound (audio), so the game always runs.

export const ROOM_IMAGES = {
  lamp_before: 'assets/rooms/lamp_before.png',
  lamp_after: 'assets/rooms/lamp_after.png',
  cellar_before: 'assets/rooms/cellar_before.png',
  cellar_after: 'assets/rooms/cellar_after.png',
};

export const CHARACTER_IMAGES = {
  mara: 'assets/characters/mara.png',
  mara_act: 'assets/characters/mara_act.png',
  tobin: 'assets/characters/tobin.png',
  tobin_act: 'assets/characters/tobin_act.png',
};

export const ITEM_IMAGES = {
  key: 'assets/items/key.png',
  fuse: 'assets/items/fuse.png',
  page_a: 'assets/items/page_a.png',
  page_b: 'assets/items/page_b.png',
  valve_order: 'assets/items/valve_order.png',
  photo: 'assets/items/photo.png',
  ledger: 'assets/items/ledger.png',
};

export const UI_IMAGES = {
  title: 'assets/ui/title.png',
  ending_truth: 'assets/ui/ending_truth.png',
  ending_cover: 'assets/ui/ending_cover.png',
};

export const AUDIO = {
  ambient: 'assets/audio/ambient.mp3',
  click: 'assets/audio/click.mp3',
  pickup: 'assets/audio/pickup.mp3',
  send: 'assets/audio/send.mp3',
  unlock: 'assets/audio/unlock.mp3',
  flood: 'assets/audio/flood.mp3',
  error: 'assets/audio/error.mp3',
  win: 'assets/audio/win.mp3',
  swap: 'assets/audio/swap.mp3',
};
