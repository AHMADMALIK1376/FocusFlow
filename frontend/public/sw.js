/* FocusFlow service worker — shows reminder pop-ups sent by the server and
   handles the answer buttons on questions ("Did you attend?", "Did you
   submit?"), even when the app is closed. It also keeps a small "You're
   offline" page for when the app can't load at all. Kept dependency-free on
   purpose. */

// The offline page and the logo it shows. Bump the name when they change.
const OFFLINE_CACHE = 'ff-offline-v1';
const OFFLINE_FILES = ['/offline.html', '/logo192.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(OFFLINE_CACHE).then((c) => c.addAll(OFFLINE_FILES)).catch(() => {}));
});
self.addEventListener('activate', (event) => event.waitUntil(
  caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ff-offline-') && k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
));

// Network first, always. Only when a page load (or the offline page's logo)
// fails completely does the cached offline page step in. API calls, scripts
// and everything else go straight to the network untouched.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname === '/logo192.png') {
    event.respondWith(fetch(req).catch(() => caches.match('/logo192.png')));
  }
});

// Reminders that should stay on screen until the student dismisses them.
const STICKY = ['class', 'attendance', 'submit', 'quiz', 'exam', 'routine', 'test'];

// Each kind has its own clay banner (public/notify/<kind>.png, made by
// scripts/make-notify-art.py) and its own vibration rhythm, so a buzz in the
// pocket already tells you what it is.
const BUZZ = {
  class: [200, 100, 200, 100, 500],                  // knock-knock … go
  exam: [400, 150, 400, 150, 400, 150, 800],         // urgent
  submit: [300, 120, 300, 120, 600],
  attendance: [150, 100, 150],                       // a quick question
  quiz: [150, 80, 150, 80, 300],
  routine: [120, 80, 120],                           // light nudge
  digest: [80, 60, 80, 60, 240],                     // morning chime
  report: [100],
  test: [200, 100, 200, 100, 500],
};
const BANNERS = Object.keys(BUZZ);
const BADGE = '/notify/badge.png'; // white mark — Android tints it for the status bar

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'FocusFlow', body: event.data && event.data.text() }; }

  const options = {
    body: data.body || '',
    icon: '/logo192.png',
    badge: BADGE,
    image: BANNERS.includes(data.kind) ? `/notify/${data.kind}.png` : undefined,
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    requireInteraction: STICKY.includes(data.kind),
    vibrate: BUZZ[data.kind] || [300, 150, 300, 150, 600],
    timestamp: Date.now(),
    data,
  };
  if (data.answer && data.answer.buttons && data.answer.buttons.length) {
    options.actions = data.answer.buttons.map((b) => ({ action: b.action, title: b.title }));
  }
  event.waitUntil(self.registration.showNotification(data.title || 'FocusFlow', options));
});

async function openApp(path) {
  const url = new URL(path || '/', self.location.origin).href;
  const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const w of wins) {
    if (new URL(w.url).origin === self.location.origin) {
      await w.focus();
      return w.navigate ? w.navigate(url) : null;
    }
  }
  return self.clients.openWindow(url);
}

const answerPage = (answer) => `${answer.answerUrl}?t=${encodeURIComponent(answer.token)}`;

self.addEventListener('notificationclick', (event) => {
  const n = event.notification;
  const data = n.data || {};
  n.close();
  const answer = data.answer;

  // Tapped one of the answer buttons → save it straight from the notification.
  if (answer && event.action && (answer.buttons || []).some((b) => b.action === event.action)) {
    event.waitUntil(
      fetch(answer.answerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: answer.token, a: event.action }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(String(r.status));
          const res = await r.json().catch(() => ({}));
          // Attendance answers get a report push from the server; confirm the rest here.
          if (data.kind !== 'attendance' && res.heading) {
            await self.registration.showNotification(res.heading, { body: res.detail || '', icon: '/logo192.png', badge: BADGE, vibrate: [80], tag: `${data.tag || 'answer'}:done` });
          }
        })
        .catch(() => self.registration.showNotification('Could not save your answer', {
          body: 'Tap to answer in the browser instead.',
          icon: '/logo192.png',
          badge: BADGE,
          data: { url: answerPage(answer), external: true },
        }))
    );
    return;
  }

  // Tapped the body of a question (or the quiz marks one) → open the answer page.
  if (answer) {
    event.waitUntil(self.clients.openWindow(answerPage(answer)));
    return;
  }
  if (data.external && data.url) {
    event.waitUntil(self.clients.openWindow(data.url));
    return;
  }
  event.waitUntil(openApp(data.url));
});
