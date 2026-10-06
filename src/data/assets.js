// Every file the game will try to load. Anything missing gets a generated placeholder
// (images) or a synthesized sound (audio), so the game always runs.

export const ROOM_IMAGES = {
  lamp_before: 'assets/rooms/lamp_before.png',
  lamp_after: 'assets/rooms/lamp_after.png',
  lamp_lowtide: 'assets/rooms/lamp_lowtide.png',
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
  letter: 'assets/items/page_a.png',
  envelope: 'assets/items/envelope.png',
  diary: 'assets/items/diary.png',
  diary_torn: 'assets/items/diary.png',
  photo: 'assets/items/photo.png',
  ledger: 'assets/items/ledger.png',
};

// Cutout props drawn into rooms; trimmed like items.
export const PROP_IMAGES = {
  rheostat: 'assets/ui/rheostat.png',
};

export const UI_IMAGES = {
  title: 'assets/ui/title.png',
  ending_truth: 'assets/ui/ending_truth.png',
  ending_cover: 'assets/ui/ending_cover.png',
  ending_open: 'assets/ui/ending_open.png',
  lens_closeup: 'assets/ui/lens_closeup.png',
};

// Opening cutscene stills (the last shot reuses `title`).
export const CUTSCENE_IMAGES = {
  cut_storm: 'assets/cutscene/cut_storm.png',
  cut_fall: 'assets/cutscene/cut_fall.png',
  cut_rowboat: 'assets/cutscene/cut_rowboat.png',
  cut_barred: 'assets/cutscene/cut_barred.png',
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
