'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Users, FlaskConical, Search, Zap, ShieldAlert, ShieldCheck } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color = 'text-[#3B82F6]' }) {
  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[#1A1A1A] ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-[11px] text-gray-500">{label}</p>
      </div>
    </div>
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

export default function OverviewPage() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [globalStop, setGlobalStop]           = useState(null); // { stopped, reason, stoppedAt, stoppedBy } | null
  const [globalStopLoading, setGlobalStopLoading] = useState(true);
  const [globalStopError, setGlobalStopError] = useState(null);
  const [toggling, setToggling]               = useState(false);
  const [reason, setReason]                   = useState('');
  const [toast, setToast]                     = useState(null);

  const [sessions, setSessions]           = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [pausingAll, setPausingAll]       = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchGlobalStop = () =>
    httpsCallable(functions, 'adminGetGlobalStop')()
      .then(r => { setGlobalStop(r.data?.control || null); setGlobalStopError(null); })
      .catch(e => setGlobalStopError(e.message));

  useEffect(() => {
    httpsCallable(functions, 'adminGetPlatformStats')()
      .then(r => setStats(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    fetchGlobalStop().finally(() => setGlobalStopLoading(false));

    httpsCallable(functions, 'adminListAgentSessions')()
      .then(r => setSessions(r.data?.sessions || []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, []);

  const handleToggleGlobalStop = async () => {
    const isStopped = !!globalStop?.stopped;

    const confirmed = window.confirm(
      isStopped
        ? 'Resume all experiments platform-wide? Lead sourcing, enrollment, and outreach sending will restart for every user.'
        : 'Stop ALL experiments platform-wide? This halts lead sourcing, enrollment, and outreach sending for every user, immediately, until someone explicitly resumes it. This is the most destructive action in the admin app. Continue?'
    );
    if (!confirmed) return;

    setToggling(true);
    try {
      await httpsCallable(functions, 'adminSetGlobalStop')({
        stopped: !isStopped,
        ...(!isStopped && reason.trim() ? { reason: reason.trim() } : {}),
      });
      await fetchGlobalStop();
      setReason('');
      showToast(isStopped ? 'All experiments resumed' : 'All experiments stopped');
    } catch (e) {
      showToast(e.message || 'Failed', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handlePauseAllSessions = async () => {
    const targets = sessions.filter(s => s.status === 'active');
    if (targets.length === 0) {
      showToast('No active sessions to pause');
      return;
    }
    const confirmed = window.confirm(
      `Pause all ${targets.length} currently active session${targets.length === 1 ? '' : 's'}? This only affects sessions running right now — experiments started afterward are unaffected.`
    );
    if (!confirmed) return;

    setPausingAll(true);
    try {
      const results = await Promise.allSettled(
        targets.map(s => httpsCallable(functions, 'adminPauseSession')({ uid: s.uid, experimentId: s.experimentId }))
      );
      const pausedKeys = new Set(
        targets
          .filter((_, i) => results[i].status === 'fulfilled')
          .map(s => `${s.uid}-${s.experimentId}`)
      );
      const failedCount = results.filter(r => r.status === 'rejected').length;

      setSessions(prev => prev.map(s =>
        pausedKeys.has(`${s.uid}-${s.experimentId}`) ? { ...s, status: 'paused' } : s
      ));

      if (failedCount === 0) {
        showToast(`${pausedKeys.size} session${pausedKeys.size === 1 ? '' : 's'} paused`);
      } else {
        showToast(`${pausedKeys.size} paused, ${failedCount} failed`, 'error');
      }
    } finally {
      setPausingAll(false);
    }
  };

  const isStopped = !!globalStop?.stopped;
  const activeSessionCount = sessions.filter(s => s.status === 'active').length;

  return (
    <div className="p-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
          toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>{toast.msg}</div>
      )}

      <div className="mb-8">
        <h1 className="text-lg font-bold text-white">Overview</h1>
        <p className="text-xs text-gray-500 mt-1">Platform-wide stats</p>
      </div>

      {/* ── Global kill switch ── */}
      {!globalStopLoading && (
        <div className={`mb-6 rounded-2xl border p-5 ${
          isStopped ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/20'
        }`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isStopped
                  ? <ShieldAlert size={16} className="text-red-400 flex-shrink-0" />
                  : <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />}
                <span className={`text-sm font-bold ${isStopped ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isStopped ? 'All experiments are STOPPED' : 'Experiments running normally'}
                </span>
              </div>
              {isStopped && (
                <p className="text-[11px] text-gray-500 mt-1.5">
                  {globalStop.reason ? `"${globalStop.reason}"` : 'No reason given'}
                  {globalStop.stoppedBy ? ` · by ${globalStop.stoppedBy}` : ''}
                  {globalStop.stoppedAt ? ` · ${formatRelative(globalStop.stoppedAt)}` : ''}
                </p>
              )}
              {globalStopError && (
                <p className="text-[11px] text-red-400 mt-1.5">{globalStopError}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isStopped && (
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="bg-[#1A1A1A] border border-[#222] rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-red-500/40 w-44"
                />
              )}
              <button onClick={handleToggleGlobalStop} disabled={toggling}
                className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors disabled:opacity-50 ${
                  isStopped
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                }`}>
                {toggling ? '…' : isStopped ? 'Resume All Experiments' : 'Stop All Experiments'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk pause (current sessions only) ── */}
      <div className="mb-6 rounded-2xl border border-[#1E1E1E] bg-[#111] p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-300">Pause All Active Sessions</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            Snapshot action — pauses every session running right now ({sessionsLoading ? '…' : activeSessionCount} active). Experiments started afterward are unaffected; use the switch above to block those too.
          </p>
        </div>
        <button onClick={handlePauseAllSessions} disabled={pausingAll || sessionsLoading || activeSessionCount === 0}
          className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
          {pausingAll ? 'Pausing…' : 'Pause All Active Sessions'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-6">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users"       value={stats?.totalUsers}       icon={Users}       color="text-[#3B82F6]" />
          <StatCard label="Experiments"       value={stats?.totalExperiments} icon={FlaskConical} color="text-violet-400" />
          <StatCard label="Leads"             value={stats?.totalLeads}       icon={Search}      color="text-emerald-400" />
          <StatCard label="Active Sessions"   value={stats?.activeSessions}   icon={Zap}         color="text-amber-400" />
        </div>
      )}
    </div>
  );
}
