const PATIENT_API = import.meta.env.VITE_PATIENT_API ?? 'http://localhost:8081';
const AUDIT_API   = import.meta.env.VITE_AUDIT_API   ?? 'http://localhost:8082';

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
