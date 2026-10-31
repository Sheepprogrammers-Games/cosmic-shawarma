const center = { x: 0.5, y: 0.5 };
const bottom = { x: 0.5, y: 1 };
const head = { x: 0.5, y: 0.75 };

function entries(files, width, height, anchor = center) {
  return files.map((file) => ({ file, width, height, anchor }));
}

export const ASSET_GROUPS = {
  backgrounds: [
    { file: 'bg_space.jpg', width: 2560, height: 1440, anchor: center },
    { file: 'bg_counter.png', width: 2560, height: 760, anchor: center },
    ...entries(['bg_shop_lv1.jpg', 'bg_shop_lv2.jpg', 'bg_shop_lv3.jpg', 'bg_shop_lv4.jpg'], 2560, 1440),
  ],
  food: [
    { file: 'food_dough.png', width: 256, height: 256, anchor: center },
    ...entries(['food_meat_column_raw.png', 'food_meat_column_best.png', 'food_meat_column_burnt.png'], 512, 896, bottom),
    ...entries(['food_meat_slice.png', 'food_tentacle.png', 'food_pepper.png'], 192, 192),
    { file: 'food_sauce_bottle.png', width: 256, height: 384, anchor: center },
    { file: 'food_sauce_splat.png', width: 256, height: 128, anchor: center },
    { file: 'food_syrup.png', width: 256, height: 384, anchor: { x: 0.5, y: 0 } },
    ...entries(['food_fries_raw.png', 'food_fries_done.png', 'food_fries_burnt.png'], 256, 256),
    ...entries(['food_wrap_open.png', 'food_wrap_packed.png'], 384, 256),
    { file: 'food_wrap_rolled.png', width: 384, height: 192, anchor: center },
    ...entries(['drink_cup_empty.png', 'drink_soda.png', 'drink_nova.png', 'drink_plasma.png'], 192, 288, bottom),
  ],
  machines: [
    ...entries(['mach_fryer.png', 'mach_drink.png', 'arm7_sleep.png', 'arm7_work.png'], 512, 640, bottom),
    ...entries(['mach_roller.png', 'mach_wrapper.png'], 512, 384, bottom),
    { file: 'mach_slicer.png', width: 384, height: 512, anchor: bottom },
  ],
  creatures: [
    ...entries(['bio_maw_closed.png', 'bio_maw_open.png', 'bio_maw_chew.png'], 384, 384, bottom),
    { file: 'bio_slug.png', width: 256, height: 256, anchor: bottom },
    { file: 'bio_jelly.png', width: 320, height: 448, anchor: { x: 0.5, y: 0 } },
    { file: 'bio_roach.png', width: 128, height: 128, anchor: center },
  ],
  bodies: entries(['body_humanoid.png', 'body_blob.png', 'body_large.png'], 384, 384, bottom),
  heads: [
    ...entries([
      'head_crystal_angry.png', 'head_crystal_neutral.png', 'head_crystal_happy.png',
      'head_plasma_angry.png', 'head_plasma_neutral.png', 'head_plasma_happy.png',
      'head_octopus_angry.png', 'head_octopus_neutral.png', 'head_octopus_happy.png',
      'head_swarm.png', 'head_slime.png', 'head_mycelian.png', 'head_chitin.png', 'head_astronaut.png',
      'head_scavenger.png', 'head_thief.png', 'head_critic.png',
      'head_inspector_a.png', 'head_inspector_b.png', 'head_inspector_c.png',
    ], 320, 320, head),
    { file: 'head_worm.png', width: 512, height: 512, anchor: head },
  ],
  props: [{ file: 'prop_notepad.png', width: 256, height: 256, anchor: center }],
  ui: [
    ...entries(['ui_bubble_order.png', 'ui_bubble_riddle.png'], 512, 320),
    ...entries(['ui_bar_patience_bg.png', 'ui_bar_patience_fill.png'], 256, 40),
    ...entries(['ui_bar_time_bg.png', 'ui_bar_time_fill.png'], 640, 40),
    { file: 'ui_panel.png', width: 640, height: 640, anchor: center },
    ...entries(['ui_btn_primary.png', 'ui_btn_secondary.png'], 320, 112),
    ...entries(['ui_slot_empty.png', 'ui_slot_out.png', 'ui_badge_star1.png', 'ui_badge_star2.png', 'ui_badge_star3.png'], 256, 256),
    { file: 'ui_headline.png', width: 2560, height: 1440, anchor: center },
    { file: 'ui_landscape_hint.png', width: 1024, height: 1024, anchor: center },
    { file: 'ui_icons.svg', width: 576, height: 96, anchor: center },
  ],
  effects: [
    ...entries(['fx_dot.png', 'fx_star.png'], 64, 64),
    ...entries(['fx_ring.png', 'fx_smoke.png'], 128, 128),
    { file: 'fx_streak.png', width: 128, height: 32, anchor: center },
    { file: 'fx_goo.png', width: 64, height: 64, anchor: center },
  ],
};

export const ASSET_SPECS = Object.values(ASSET_GROUPS).flat();
export const IMAGE_FILES = ASSET_SPECS.map(({ file }) => file);
export const IMAGE_MANIFEST = Object.fromEntries(IMAGE_FILES.map((file) => [
  file.replace(/\.(?:png|jpg|svg)$/, ''),
  `assets/images/${file}`,
]));
