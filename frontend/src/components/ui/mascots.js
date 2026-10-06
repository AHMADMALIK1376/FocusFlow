// The FocusFlow mascots, from https://github.com/nilbuild/page-mascot (MIT).
// Each one is three files in public/mascots/:
//   <id>.webp             small preview, for the picker and the navbar
//   <id>-directions.webp  3x3 sheet of head directions (follows the cursor)
//   <id>-reactions.webp   3x3 sheet of expressions (shown when poked)
export const MASCOTS = [
  { id: 'cap', name: 'Cap' },
  { id: 'beard', name: 'Chill Dev' },
  { id: 'sloth', name: 'Sloth' },
  { id: 'radio', name: 'Radio Bot' },
  { id: 'rocket', name: 'Rocket Bot' },
  { id: 'goggle', name: 'Goggle Bot' },
  { id: 'toaster', name: 'Toaster Bot' },
  { id: 'antenna', name: 'Antenna Bot' },
  { id: 'box', name: 'Box Bot' },
  { id: 'violet', name: 'Violet Bot' },
];

const known = (id) => MASCOTS.some((m) => m.id === id);

export const mascotSrc = (id) => (known(id) ? `/mascots/${id}.webp` : null);
export const mascotSheets = (id) =>
  known(id) ? { directions: `/mascots/${id}-directions.webp`, reactions: `/mascots/${id}-reactions.webp` } : null;
export const mascotName = (id) => MASCOTS.find((m) => m.id === id)?.name || '';
