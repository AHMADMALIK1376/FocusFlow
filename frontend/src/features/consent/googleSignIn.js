// Google's sign-in script is loaded only after the student allowed it (see consent.js).
// Until then no request goes to Google and Google sets no cookies.
const SRC = 'https://accounts.google.com/gsi/client';
let pending = null;

export function loadGoogleScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google && window.google.accounts) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { pending = null; s.remove(); reject(new Error('Google sign-in could not be loaded')); };
    document.head.appendChild(s);
  });
  return pending;
}
