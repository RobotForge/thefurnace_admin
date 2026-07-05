'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { FlaskConical } from 'lucide-react';

function StatusBadge({ status }) {
  const cfg = status === 'active'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : status === 'paused'
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${cfg}`}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {status || 'unknown'}
    </span>
  );
}

function formatRelative(ts) {
  if (!ts) return '—';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LeadDiscoveryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [toast, setToast]       = useState(null);
  const [injecting, setInjecting] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    httpsCallable(functions, 'adminListAgentSessions')()
      .then(r => setSessions(r.data?.sessions || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handlePause = async (uid, experimentId) => {
    try {
      await httpsCallable(functions, 'adminPauseSession')({ uid, experimentId });
      setSessions(prev => prev.map(s =>
        s.uid === uid && s.experimentId === experimentId ? { ...s, status: 'paused' } : s
      ));
      showToast('Session paused');
    } catch (e) { showToast(e.message || 'Failed', 'error'); }
  };

  const handleResume = async (uid, experimentId) => {
    try {
      await httpsCallable(functions, 'adminResumeSession')({ uid, experimentId });
      setSessions(prev => prev.map(s =>
        s.uid === uid && s.experimentId === experimentId ? { ...s, status: 'active' } : s
      ));
      showToast('Session resumed');
    } catch (e) { showToast(e.message || 'Failed', 'error'); }
  };

  const handleStop = async (uid, experimentId) => {
    try {
      await httpsCallable(functions, 'adminStopSession')({ uid, experimentId });
      setSessions(prev => prev.map(s =>
        s.uid === uid && s.experimentId === experimentId ? { ...s, status: 'stopped' } : s
      ));
      showToast('Session stopped permanently');
    } catch (e) { showToast(e.message || 'Failed', 'error'); }
  };

  const handleInject = async (uid, experimentId) => {
    const key = `${uid}-${experimentId}`;
    setInjecting(key);
    try {
      const r = await httpsCallable(functions, 'adminTestInjectLeads')({ uid, experimentId, count: 3 });
      setSessions(prev => prev.map(s =>
        s.uid === uid && s.experimentId === experimentId
          ? { ...s, leadsDiscovered: (s.leadsDiscovered || 0) + (r.data?.injected || 0) }
          : s
      ));
      showToast(`${r.data?.injected || 0} test leads injected`);
    } catch (e) { showToast(e.message || 'Injection failed', 'error'); }
    finally { setInjecting(null); }
  };

  const handleForceCycle = async () => {
    try {
      const r = await httpsCallable(functions, 'adminTriggerExecutionCycle')({});
      showToast(`Cycle done — ${r.data?.summary?.sessionsProcessed ?? 0} sessions processed`);
    } catch (e) { showToast(e.message || 'Cycle failed', 'error'); }
  };

  const activeCount = sessions.filter(s => s.status === 'active').length;
  const totalLeads  = sessions.reduce((acc, s) => acc + (s.leadsDiscovered || 0), 0);

  return (
    <div className="p-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
          toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Lead Discovery</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-emerald-400 font-bold">{activeCount} active</span>
            <span className="text-xs text-gray-500">{totalLeads.toLocaleString()} leads discovered</span>
          </div>
        </div>
        <button
          onClick={handleForceCycle}
          className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold rounded-lg hover:bg-orange-500/20 transition-colors"
        >
          Force Cycle
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-4">{error}</div>}

      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No agent sessions found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {['Founder', 'Experiment', 'Status', 'Platform', 'Leads', 'Enriched', 'Last Scan', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const key = `${s.uid}-${s.experimentId}`;
                return (
                  <tr key={`${key}-${i}`} className="border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono">{s.uid?.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-gray-300 max-w-[140px] truncate">{s.experimentName || `${s.experimentId?.slice(0, 8)}…`}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-gray-400">{s.config?.platform || '—'}</td>
                    <td className="px-4 py-3 font-bold text-violet-400">{s.leadsDiscovered ?? 0}</td>
                    <td className="px-4 py-3 text-gray-400">{s.leadsEnriched ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500">{formatRelative(s.lastRunAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {s.status === 'active' && (
                          <button onClick={() => handlePause(s.uid, s.experimentId)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
                            Pause
                          </button>
                        )}
                        {s.status === 'paused' && (
                          <button onClick={() => handleResume(s.uid, s.experimentId)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                            Resume
                          </button>
                        )}
                        {s.status !== 'stopped' && (
                          <button onClick={() => handleStop(s.uid, s.experimentId)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
                            Stop
                          </button>
                        )}
                        <button onClick={() => handleInject(s.uid, s.experimentId)} disabled={injecting === key}
                          title="Inject 3 test leads"
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                          {injecting === key ? '…' : <FlaskConical size={11} />}
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
    </div>
  );
}
