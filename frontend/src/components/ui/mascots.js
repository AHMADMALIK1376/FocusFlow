// The FocusFlow mascots. Images live in public/mascots/<id>.png (transparent cut-outs).
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

export const mascotSrc = (id) => (MASCOTS.some((m) => m.id === id) ? `/mascots/${id}.png` : null);
export const mascotName = (id) => MASCOTS.find((m) => m.id === id)?.name || '';
