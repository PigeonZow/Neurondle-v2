// Design tokens — single theme: the classic accent roles (blue interactive,
// red lock-in, amber pin/search, green answer, magenta probe), each tuned to
// sit on the ink ground, carried by the sharp chart-legend chrome. The DOM
// reads these through CSS variables (globals.css → Tailwind); the PIXI canvas
// imports the numeric values below.

/** Hex strings, matching the CSS variables in globals.css. */
export const palette = {
  ink: '#070D18', // page + map ground
  chart: '#0D1526', // panel surfaces
  graticule: '#41527A', // hairlines, grid, borders (always used at low alpha)
  starlight: '#E9E6DA', // text — warm bone, not white
  accent: '#5E9BE0', // blue: interactive, score, data values
  accentDeep: '#3B6FC4', // blue: solid button fills
  alert: '#E25368', // red: lock-in, token highlights, search ring
  ember: '#EDB458', // amber: the pin reticle
  beacon: '#3EC6C9', // teal: search-filter match glow
  verdant: '#43C97B', // green: revealed answer
  nebula: '#D946EF', // magenta: probe glow (activation evidence)
} as const

/** PIXI-ready numbers for the canvas, plus canvas-only derivatives. */
export const mapColors = {
  ink: 0x070d18,
  graticule: 0x41527a,
  starlight: 0xe9e6da,
  ember: 0xedb458,
  beacon: 0x3ec6c9,
  alert: 0xe25368,
  verdant: 0x43c97b,
  nebula: 0xd946ef,
  nebulaBright: 0xe879f9, // hot core of the probe glow
  star: 0x9db2d6, // feature dots — pale steel, reads as a fine point field
} as const
