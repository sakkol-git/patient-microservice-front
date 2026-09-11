import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './api';

/* ─── Avatar color generator ─────────────────────────────────── */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
];

function getAvatarStyle(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return { background: AVATAR_GRADIENTS[index] };
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (!parts.length || !parts[0]) return 'P';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getDiagnosisColor(diagnosis = '') {
  const d = diagnosis.toLowerCase();
  if (d.includes('healthy') || d.includes('normal')) return 'green';
  if (d.includes('recover') || d.includes('stable')) return 'purple';
  if (d.includes('hyper') || d.includes('diabet') || d.includes('chronic')) return 'amber';
  if (d.includes('acute') || d.includes('critical') || d.includes('emergency') || d.includes('severe')) return 'rose';
  return 'blue';
}

function formatTimestamp(idOrTimestamp) {
  if (!idOrTimestamp) return 'N/A';
  const num = Number(idOrTimestamp);
  if (!isNaN(num) && num > 1600000000000) {
    return new Date(num).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return String(idOrTimestamp);
}

const PRESET_DIAGNOSES = [
  'Healthy',
  'Routine Checkup',
  'Hypertension',
  'Post-op Recovery',
  'Asthma',
  'Type 2 Diabetes',
  'Observation',
];

/* ─── Toast System ───────────────────────────────────────────── */
function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <aside className="toast-container" aria-label="Notifications">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type || 'info'}`}>
          <div className="toast-icon">
            {t.type === 'success' && '✓'}
            {t.type === 'error' && '⚠'}
            {t.type === 'info' && 'ℹ'}
          </div>
          <div className="toast-content">
            <span className="toast-title">{t.title}</span>
            {t.message && <span className="toast-msg">{t.message}</span>}
          </div>
          <button className="toast-close" onClick={() => onDismiss(t.id)} title="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </aside>
  );
}

/* ─── Patients Panel ─────────────────────────────────────────── */
function Patients({ onPatientCountChange, showToast }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [deletePatient, setDeletePatient] = useState(null);
  const [detailPatient, setDetailPatient] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDiagnosis, setFormDiagnosis] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.patients.list();
      const list = Array.isArray(data) ? data : [];
      setPatients(list);
      onPatientCountChange(list.length);
    } catch (err) {
      setError(err.message || 'Failed to fetch patients');
      showToast('error', 'Connection Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [onPatientCountChange, showToast]);

  useEffect(() => {
    let active = true;
    api.patients.list()
      .then(data => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setPatients(list);
        onPatientCountChange(list.length);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        setError(err.message || 'Failed to fetch patients');
        showToast('error', 'Connection Error', err.message);
        setLoading(false);
      });
    return () => { active = false; };
  }, [onPatientCountChange, showToast]);

  // Open Add modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormDiagnosis('');
    setAddModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (patient) => {
    setEditPatient(patient);
    setFormName(patient.name || '');
    setFormDiagnosis(patient.diagnosis || '');
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formDiagnosis.trim()) return;

    setSaving(true);
    try {
      const newPatient = await api.patients.create({
        name: formName.trim(),
        diagnosis: formDiagnosis.trim(),
      });
      setPatients(prev => [newPatient, ...prev]);
      onPatientCountChange(patients.length + 1);
      setAddModalOpen(false);
      showToast('success', 'Patient Registered', `Added record for ${newPatient.name}`);
    } catch (err) {
      showToast('error', 'Failed to Add Patient', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Submit Update
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editPatient || !formName.trim() || !formDiagnosis.trim()) return;

    setSaving(true);
    const updatedPayload = {
      name: formName.trim(),
      diagnosis: formDiagnosis.trim(),
    };

    try {
      const result = await api.patients.update(editPatient.id, updatedPayload);
      const updatedItem = result || { ...editPatient, ...updatedPayload };
      setPatients(prev => prev.map(p => (p.id === editPatient.id ? updatedItem : p)));
      setEditPatient(null);
      showToast('success', 'Patient Updated', `Record updated for ${updatedItem.name}`);
    } catch (err) {
      // If backend cluster hasn't deployed PUT endpoint yet (HTTP 405 Method Not Allowed),
      // update state optimistically with helpful feedback
      if (err.message.includes('Method Not Allowed') || err.message.includes('405')) {
        const optimistic = { ...editPatient, ...updatedPayload };
        setPatients(prev => prev.map(p => (p.id === editPatient.id ? optimistic : p)));
        setEditPatient(null);
        showToast('info', 'Record Updated (Optimistic)', 'Saved in UI. (Backend update endpoint rolling out)');
      } else {
        showToast('error', 'Update Failed', err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deletePatient) return;
    setSaving(true);

    try {
      await api.patients.delete(deletePatient.id);
      setPatients(prev => prev.filter(p => p.id !== deletePatient.id));
      onPatientCountChange(Math.max(0, patients.length - 1));
      showToast('success', 'Patient Removed', `Deleted record for ${deletePatient.name}`);
      setDeletePatient(null);
    } catch (err) {
      if (err.message.includes('Method Not Allowed') || err.message.includes('405')) {
        setPatients(prev => prev.filter(p => p.id !== deletePatient.id));
        onPatientCountChange(Math.max(0, patients.length - 1));
        showToast('info', 'Record Removed (Optimistic)', 'Removed from UI. (Backend delete endpoint rolling out)');
        setDeletePatient(null);
      } else {
        showToast('error', 'Delete Failed', err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    showToast('info', 'Copied to Clipboard', `Patient ID ${id}`);
  };

  // Filter and search
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchSearch =
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.diagnosis && p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.id && String(p.id).toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (filterCategory === 'HEALTHY') {
        return p.diagnosis && p.diagnosis.toLowerCase().includes('healthy');
      }
      if (filterCategory === 'RECOVERED') {
        return p.diagnosis && p.diagnosis.toLowerCase().includes('recover');
      }
      if (filterCategory === 'ACTIVE') {
        const d = (p.diagnosis || '').toLowerCase();
        return !d.includes('healthy') && !d.includes('recover');
      }
      return true;
    });
  }, [patients, searchQuery, filterCategory]);

  // Metric stats
  const stats = useMemo(() => {
    const total = patients.length;
    const healthyCount = patients.filter(p => (p.diagnosis || '').toLowerCase().includes('healthy') || (p.diagnosis || '').toLowerCase().includes('recover')).length;
    const activeCount = total - healthyCount;
    const uniqueDiagnoses = new Set(patients.map(p => p.diagnosis)).size;
    return { total, healthyCount, activeCount, uniqueDiagnoses };
  }, [patients]);

  return (
    <section>
      {/* ─── Metric KPI Cards ────────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div className="stat-content">
            <span className="stat-label">Total Patients</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🩺</div>
          <div className="stat-content">
            <span className="stat-label">Healthy / Recovered</span>
            <span className="stat-value">{stats.healthyCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">⚡</div>
          <div className="stat-content">
            <span className="stat-label">Active Monitoring</span>
            <span className="stat-value">{stats.activeCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📋</div>
          <div className="stat-content">
            <span className="stat-label">Diagnoses Tracked</span>
            <span className="stat-value">{stats.uniqueDiagnoses}</span>
          </div>
        </div>
      </div>

      {/* ─── Toolbar ────────────────────────────────────────────── */}
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search by patient name, diagnosis, or ID…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className="toolbar-actions">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="form-input"
            style={{ width: 'auto', padding: '0.45rem 0.8rem' }}
          >
            <option value="ALL">All Categories</option>
            <option value="HEALTHY">Healthy Only</option>
            <option value="RECOVERED">Recovered Only</option>
            <option value="ACTIVE">Under Treatment</option>
          </select>

          <button className="btn-secondary" onClick={loadPatients} title="Refresh records" disabled={loading}>
            <span className={loading ? 'spinner' : ''} style={{ width: 14, height: 14 }}>
              {!loading && '↻'}
            </span>
            <span>Refresh</span>
          </button>

          <button className="btn-primary" onClick={handleOpenAdd}>
            <span>+</span>
            <span>New Patient</span>
          </button>
        </div>
      </div>

      {/* ─── Content Table / List ─────────────────────────────────── */}
      {loading && (
        <div className="loading-wrap">
          <div className="spinner"></div>
          <p>Connecting to MedLogix patient service…</p>
        </div>
      )}

      {error && !loading && (
        <div className="empty-state">
          <div className="empty-icon">⚠</div>
          <div className="empty-title">Unable to load patient records</div>
          <div className="empty-desc">{error}</div>
          <button className="btn-primary" onClick={loadPatients}>Try Again</button>
        </div>
      )}

      {!loading && !error && (
        <div className="table-card">
          {filteredPatients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <div className="empty-title">
                {searchQuery || filterCategory !== 'ALL' ? 'No matching patients found' : 'No patients registered yet'}
              </div>
              <div className="empty-desc">
                {searchQuery || filterCategory !== 'ALL'
                  ? 'Try clearing your search query or adjusting filter filters.'
                  : 'Start by registering your first patient to begin tracking records and audit logs.'}
              </div>
              {searchQuery || filterCategory !== 'ALL' ? (
                <button className="btn-secondary" onClick={() => { setSearchQuery(''); setFilterCategory('ALL'); }}>
                  Clear Filters
                </button>
              ) : (
                <button className="btn-primary" onClick={handleOpenAdd}>
                  + Register Patient
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Record ID</th>
                  <th>Diagnosis</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(p => {
                  const tagColor = getDiagnosisColor(p.diagnosis);
                  return (
                    <tr key={p.id} className="patient-row">
                      <td>
                        <div className="patient-info">
                          <div className="avatar" style={getAvatarStyle(p.name)}>
                            {getInitials(p.name)}
                          </div>
                          <div>
                            <div className="patient-name">{p.name}</div>
                            <div className="patient-meta">Registered {formatTimestamp(p.id)}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{ cursor: 'pointer' }}
                          title="Click to copy ID"
                          onClick={() => handleCopyId(p.id)}
                        >
                          #{p.id} 📋
                        </span>
                      </td>
                      <td>
                        <span className={`badge-tag ${tagColor}`}>
                          <span className="live-dot" style={{ background: 'currentColor' }}></span>
                          {p.diagnosis}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn-icon view"
                            title="View Patient Details"
                            onClick={() => setDetailPatient(p)}
                          >
                            👁
                          </button>
                          <button
                            className="btn-icon edit"
                            title="Edit Patient"
                            onClick={() => handleOpenEdit(p)}
                          >
                            ✎
                          </button>
                          <button
                            className="btn-icon delete"
                            title="Delete Patient"
                            onClick={() => setDeletePatient(p)}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Modal: Create Patient ──────────────────────────────── */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">Register New Patient</h3>
                <span className="modal-subtitle">Add a patient record to the microservice</span>
              </div>
              <button className="modal-close" onClick={() => setAddModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    required
                    autoFocus
                    className="form-input"
                    placeholder="e.g. Sarah Jenkins"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Diagnosis / Health Condition</label>
                  <input
                    required
                    className="form-input"
                    placeholder="e.g. Healthy, Hypertension, Asthma"
                    value={formDiagnosis}
                    onChange={e => setFormDiagnosis(e.target.value)}
                  />
                  <div className="preset-chips">
                    {PRESET_DIAGNOSES.map(preset => (
                      <button
                        type="button"
                        key={preset}
                        className="preset-chip"
                        onClick={() => setFormDiagnosis(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Registering…' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Edit Patient ────────────────────────────────── */}
      {editPatient && (
        <div className="modal-overlay" onClick={() => setEditPatient(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">Edit Patient Record</h3>
                <span className="modal-subtitle">Update information for ID #{editPatient.id}</span>
              </div>
              <button className="modal-close" onClick={() => setEditPatient(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    required
                    autoFocus
                    className="form-input"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Diagnosis</label>
                  <input
                    required
                    className="form-input"
                    value={formDiagnosis}
                    onChange={e => setFormDiagnosis(e.target.value)}
                  />
                  <div className="preset-chips">
                    {PRESET_DIAGNOSES.map(preset => (
                      <button
                        type="button"
                        key={preset}
                        className="preset-chip"
                        onClick={() => setFormDiagnosis(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditPatient(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Delete Confirmation ─────────────────────────── */}
      {deletePatient && (
        <div className="modal-overlay" onClick={() => setDeletePatient(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title" style={{ color: 'var(--rose)' }}>Confirm Deletion</h3>
                <span className="modal-subtitle">Permanent action</span>
              </div>
              <button className="modal-close" onClick={() => setDeletePatient(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Are you sure you want to delete patient{' '}
                <strong style={{ color: 'var(--text)' }}>{deletePatient.name}</strong>{' '}
                (<span className="mono">ID: #{deletePatient.id}</span>)?
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                This will trigger an audit log deletion event across the MedLogix microservices.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setDeletePatient(null)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={handleDeleteConfirm} disabled={saving}>
                {saving ? 'Deleting…' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Detail Inspection ───────────────────────────── */}
      {detailPatient && (
        <div className="modal-overlay" onClick={() => setDetailPatient(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">Patient Profile</h3>
                <span className="modal-subtitle">Detailed medical record</span>
              </div>
              <button className="modal-close" onClick={() => setDetailPatient(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <div className="avatar" style={{ ...getAvatarStyle(detailPatient.name), width: 54, height: 54, fontSize: '1.25rem' }}>
                  {getInitials(detailPatient.name)}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{detailPatient.name}</h4>
                  <span className={`badge-tag ${getDiagnosisColor(detailPatient.diagnosis)}`}>
                    {detailPatient.diagnosis}
                  </span>
                </div>
              </div>

              <div className="detail-box">
                <div className="detail-row">
                  <span className="detail-label">Record ID</span>
                  <span className="mono detail-val">#{detailPatient.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className="detail-val" style={{ textTransform: 'capitalize' }}>
                    {detailPatient.diagnosis}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Registration Date</span>
                  <span className="detail-val">{formatTimestamp(detailPatient.id)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Service Provider</span>
                  <span className="detail-val">MedLogix EKS Core</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const p = detailPatient;
                  setDetailPatient(null);
                  handleOpenEdit(p);
                }}
              >
                ✎ Edit Profile
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  const p = detailPatient;
                  setDetailPatient(null);
                  setDeletePatient(p);
                }}
              >
                ✕ Delete
              </button>
              <button type="button" className="btn-primary" onClick={() => setDetailPatient(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Audit Logs Panel ───────────────────────────────────────── */
function AuditLogs({ showToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.audit.list();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      showToast('error', 'Audit Service Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    api.audit.list()
      .then(data => {
        if (!active) return;
        setLogs(Array.isArray(data) ? data : []);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        setError(err.message);
        showToast('error', 'Audit Service Error', err.message);
        setLoading(false);
      });
    return () => { active = false; };
  }, [showToast]);

  const filteredLogs = useMemo(() => {
    return [...logs].reverse().filter(l => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.id && String(l.id).toLowerCase().includes(q)) ||
        (l.timestamp && String(l.timestamp).toLowerCase().includes(q))
      );
    });
  }, [logs, search]);

  const getActionBadgeColor = (action = '') => {
    const a = action.toLowerCase();
    if (a.includes('created') || a.includes('add')) return 'green';
    if (a.includes('updated') || a.includes('modify')) return 'blue';
    if (a.includes('deleted') || a.includes('remove')) return 'rose';
    return 'amber';
  };

  return (
    <section>
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search audit trail by action or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="clear-btn" onClick={() => setSearch('')}>✕</button>}
        </div>

        <div className="toolbar-actions">
          <button className="btn-secondary" onClick={loadLogs} disabled={loading}>
            <span className={loading ? 'spinner' : ''} style={{ width: 14, height: 14 }}>
              {!loading && '↻'}
            </span>
            <span>Refresh Audit Logs</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-wrap">
          <div className="spinner"></div>
          <p>Retrieving immutable audit records…</p>
        </div>
      )}

      {error && !loading && (
        <div className="empty-state">
          <div className="empty-icon">⚠</div>
          <div className="empty-title">Audit log service unavailable</div>
          <div className="empty-desc">{error}</div>
          <button className="btn-primary" onClick={loadLogs}>Retry Connection</button>
        </div>
      )}

      {!loading && !error && (
        <div className="table-card">
          {filteredLogs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <div className="empty-title">No audit events found</div>
              <div className="empty-desc">
                {search ? 'Try adjusting your search query.' : 'Operations on patients will be automatically logged here.'}
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Action Log</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(l => (
                  <tr key={l.id}>
                    <td className="mono">#{l.id}</td>
                    <td>
                      <span className={`badge-tag ${getActionBadgeColor(l.action)}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="mono">{l.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

/* ─── Root App ───────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState('patients');
  const [patientCount, setPatientCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <>
      <header>
        <div className="logo-wrap">
          <div className="logo-icon">🏥</div>
          <span className="logo-title">MedLogix</span>
          <span className="live-pill">
            <span className="live-dot"></span>
            Cloud Core
          </span>
        </div>

        <nav>
          <button
            className={tab === 'patients' ? 'active' : ''}
            onClick={() => setTab('patients')}
          >
            <span>Patients</span>
            {patientCount > 0 && <span className="count-badge">{patientCount}</span>}
          </button>
          <button
            className={tab === 'audit' ? 'active' : ''}
            onClick={() => setTab('audit')}
          >
            <span>Audit Trail</span>
          </button>
        </nav>
      </header>

      <main>
        {tab === 'patients' ? (
          <Patients
            onPatientCountChange={setPatientCount}
            showToast={showToast}
          />
        ) : (
          <AuditLogs showToast={showToast} />
        )}
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
