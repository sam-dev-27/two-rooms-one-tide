// Every file the game will try to load. Anything missing gets a generated placeholder
// (images) or a synthesized sound (audio), so the game always runs.

export const ROOM_IMAGES = {
  lamp_before: 'assets/rooms/lamp_before.png',
  lamp_after: 'assets/rooms/lamp_after.png',
  lamp_lowtide: 'assets/rooms/lamp_lowtide.png',
  cellar_before: 'assets/rooms/cellar_before.png',
  cellar_after: 'assets/rooms/cellar_after.png',
  // Side areas (made with another image tool; see docs/other-ai-art.csv).
  gallery: 'assets/rooms/gallery.png',
  gallery_lit: 'assets/rooms/gallery_lit.png',
  wheelroom: 'assets/rooms/wheelroom.png',
  wheelroom_flooded: 'assets/rooms/wheelroom_flooded.png',
};

// The cellar with its wooden floor hatch: closed, lifted, and lifted in the flooded room. If the
// closed one is missing the cellar falls back to cellar_before/after and an iron door drawn in code.
export const HATCH_IMAGES = {
  cellar_hatch: 'assets/rooms/cellar_hatch.png',
  cellar_hatch_open: 'assets/rooms/cellar_hatch_open.png',
  cellar_after_hatch: 'assets/rooms/cellar_after_hatch.png',
};

// Captain Hale on pure black, drawn with additive blending so the black disappears.
export const GHOST_IMAGES = {
  captain: 'assets/ghost/captain.png',
  captain_point: 'assets/ghost/captain_point.png',
};

// Flashback stills for the captain's visions; missing ones fall back to existing art (VISIONS in cutscenes.js).
export const VISION_IMAGES = {
  vision_dim: 'assets/visions/vision_dim.png',
  vision_marigold: 'assets/visions/vision_marigold.png',
  vision_stairs: 'assets/visions/vision_stairs.png',
  vision_crane: 'assets/visions/vision_crane.png',
  // How Captain Hale died: the Marigold's last minutes.
  hale_bridge: 'assets/cutscene/hale_bridge.png',
  hale_dark: 'assets/cutscene/hale_dark.png',
  hale_reef: 'assets/cutscene/hale_reef.png',
  hale_last: 'assets/cutscene/hale_last.png',
};

// The finale raid: Crane's wreckers as transparent cutouts (trimmed like the characters; a drawn
// stand-in if missing), and the still of their boats rowing in (falls back to cut_rowboat).
export const RAIDER_IMAGES = {
  wrecker: 'assets/characters/wrecker.png',
  wrecker_climb: 'assets/characters/wrecker_climb.png',
  wrecker_shove: 'assets/characters/wrecker_shove.png',
};
export const RAID_STILLS = {
  wreckers_boats: 'assets/cutscene/wreckers_boats.png',
};

export const CHARACTER_IMAGES = {
  mara: 'assets/characters/mara.png',
  mara_act: 'assets/characters/mara_act.png',
  tobin: 'assets/characters/tobin.png',
  tobin_act: 'assets/characters/tobin_act.png',
  // Side-on walk frames, crouch and talk poses; a missing pose falls back to the idle pose.
  mara_walk_a: 'assets/characters/mara_walk_a.png',
  mara_walk_b: 'assets/characters/mara_walk_b.png',
  mara_crouch: 'assets/characters/mara_crouch.png',
  mara_talk: 'assets/characters/mara_talk.png',
  tobin_walk_a: 'assets/characters/tobin_walk_a.png',
  tobin_walk_b: 'assets/characters/tobin_walk_b.png',
  tobin_crouch: 'assets/characters/tobin_crouch.png',
  tobin_talk: 'assets/characters/tobin_talk.png',
};

// Head-and-shoulders art for the talk panel. Missing ones are cropped from the idle pose instead.
export const PORTRAIT_IMAGES = {
  mara_portrait: 'assets/portraits/mara.png',
  mara_portrait_worried: 'assets/portraits/mara_worried.png',
  tobin_portrait: 'assets/portraits/tobin.png',
  tobin_portrait_worried: 'assets/portraits/tobin_worried.png',
};

// 16:9 close-ups with blank writing areas; the readable text is drawn over them (CLOSEUPS in text.js).
export const CLOSEUP_IMAGES = {
  closeup_logbook: 'assets/closeups/closeup_logbook.png',
  closeup_chalk: 'assets/closeups/closeup_chalk.png',
  closeup_ledger: 'assets/closeups/closeup_ledger.png',
  closeup_bootprints: 'assets/closeups/closeup_bootprints.png',
  closeup_letter: 'assets/closeups/closeup_letter.png',
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

// Cutscene stills: the opening (its last shot reuses `title`) and the mid-game beats.
export const CUTSCENE_IMAGES = {
  cut_storm: 'assets/cutscene/cut_storm.png',
  cut_fall: 'assets/cutscene/cut_fall.png',
  cut_rowboat: 'assets/cutscene/cut_rowboat.png',
  cut_barred: 'assets/cutscene/cut_barred.png',
  cut_lamplit: 'assets/cutscene/cut_lamplit.png',
  cut_arrest: 'assets/cutscene/cut_arrest.png',
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
