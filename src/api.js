// When loaded on HTTPS (e.g. Vercel), use relative paths to route through
// Vercel rewrites, preventing browser Mixed Content (HTTPS -> HTTP) and CORS blocks.
const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const PATIENT_API = isHttps ? '' : (import.meta.env.VITE_PATIENT_API || '');
const AUDIT_API   = isHttps ? '' : (import.meta.env.VITE_AUDIT_API   || '');

const json = (res) => { if (!res.ok) throw new Error(res.statusText); return res.json(); };

export const api = {
  patients: {
    list:   ()      => fetch(`${PATIENT_API}/patients`).then(json),
    get:    (id)    => fetch(`${PATIENT_API}/patients/${id}`).then(json),
    create: (body)  => fetch(`${PATIENT_API}/patients`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }).then(json),
  },
  audit: {
    list: () => fetch(`${AUDIT_API}/logs`).then(json),
  },
};
