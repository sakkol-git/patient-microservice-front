// When loaded on HTTPS (e.g. Vercel), use relative paths to route through
// Vercel rewrites, preventing browser Mixed Content (HTTPS -> HTTP) and CORS blocks.
const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const PATIENT_API = isHttps ? '' : (import.meta.env.VITE_PATIENT_API || '');
const AUDIT_API   = isHttps ? '' : (import.meta.env.VITE_AUDIT_API   || '');

const handleResponse = async (res) => {
  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson && errJson.message) errorMsg = errJson.message;
      else if (errJson && errJson.error) errorMsg = errJson.error;
    } catch {
      // fallback to statusText
    }
    throw new Error(errorMsg || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

export const api = {
  patients: {
    list: () => fetch(`${PATIENT_API}/patients`).then(handleResponse),
    get: (id) => fetch(`${PATIENT_API}/patients/${id}`).then(handleResponse),
    create: (body) => fetch(`${PATIENT_API}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleResponse),
    update: (id, body) => fetch(`${PATIENT_API}/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleResponse),
    delete: (id) => fetch(`${PATIENT_API}/patients/${id}`, {
      method: 'DELETE',
    }).then(handleResponse),
  },
  audit: {
    list: () => fetch(`${AUDIT_API}/logs`).then(handleResponse),
  },
};

