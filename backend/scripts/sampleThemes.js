// Three sample colour themes for trying emails without a database: the normal look,
// a bold one and a dark one. Built from the app's ready-made palettes.
const { PALETTES } = require('../services/theme/palettes');

const fromPalette = (id) => {
  const p = PALETTES.find((x) => x.id === id);
  return { v: 1, background: p.background, brand: p.brand, accent: p.accent, text: p.text, presetId: p.id };
};

module.exports = { default: null, bold: fromPalette('electric-blue'), dark: fromPalette('midnight') };
