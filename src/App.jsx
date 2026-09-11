import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

/* ─── tiny reusable hook ─────────────────────────────────────── */
function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const run = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: null }));
    fn().then(data => setState({ data, loading: false, error: null }))
        .catch(err  => setState({ data: null, loading: false, error: err.message }));
  }, deps);                        // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(run, [run]);
  return { ...state, refresh: run };
}

/* ─── Patients panel ─────────────────────────────────────────── */
function Patients() {
  const { data: patients, loading, error, refresh } = useAsync(api.patients.list);
  const [form, setForm] = useState({ name: '', diagnosis: '' });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try   { await api.patients.create(form); setForm({ name: '', diagnosis: '' }); refresh(); }
    catch (err) { alert(err.message); }
    finally { setBusy(false); }
  }

  return (
    <section>
      <h2>Patients</h2>

      <form onSubmit={submit} className="card row">
        <input
          required placeholder="Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <input
          required placeholder="Diagnosis"
          value={form.diagnosis}
          onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
        />
        <button disabled={busy}>{busy ? '…' : 'Add Patient'}</button>
      </form>

      {loading && <p className="muted">Loading…</p>}
      {error   && <p className="err">⚠ {error}</p>}

      {patients && (
        patients.length === 0
          ? <p className="muted">No patients yet.</p>
          : <table>
              <thead><tr><th>ID</th><th>Name</th><th>Diagnosis</th></tr></thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id}>
                    <td className="mono">{p.id}</td>
                    <td>{p.name}</td>
                    <td>{p.diagnosis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
      )}
    </section>
  );
}

/* ─── Audit Logs panel ───────────────────────────────────────── */
function AuditLogs() {
  const { data: logs, loading, error, refresh } = useAsync(api.audit.list);

  return (
    <section>
      <h2>
        Audit Logs
        <button className="sm" onClick={refresh}>↻ Refresh</button>
      </h2>

      {loading && <p className="muted">Loading…</p>}
      {error   && <p className="err">⚠ {error}</p>}

      {logs && (
        logs.length === 0
          ? <p className="muted">No audit logs yet.</p>
          : <table>
              <thead><tr><th>ID</th><th>Action</th><th>Timestamp</th></tr></thead>
              <tbody>
                {[...logs].reverse().map(l => (
                  <tr key={l.id}>
                    <td className="mono">{l.id}</td>
                    <td>{l.action}</td>
                    <td className="mono">{l.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
      )}
    </section>
  );
}

/* ─── Root App ───────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState('patients');
  return (
    <>
      <header>
        <span className="logo">🏥 MedLogix</span>
        <nav>
          <button className={tab === 'patients' ? 'active' : ''} onClick={() => setTab('patients')}>Patients</button>
          <button className={tab === 'audit'    ? 'active' : ''} onClick={() => setTab('audit')}>Audit Logs</button>
        </nav>
      </header>

      <main>
        {tab === 'patients' ? <Patients /> : <AuditLogs />}
      </main>
    </>
  );
}
