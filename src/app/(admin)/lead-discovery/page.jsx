'use client';

import { useEffect, useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import {
  FlaskConical, X, ChevronRight, Users, Target, Zap,
  Globe, Mail, MapPin, Building2, Link, MessageSquare,
  Star, Clock, TrendingUp, RefreshCw, CheckCircle,
} from 'lucide-react';

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

function ScoreDot({ score }) {
  const color = score >= 70 ? 'bg-emerald-400' : score >= 40 ? 'bg-amber-400' : 'bg-gray-600';
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color} flex-shrink-0`} title={`ICP score: ${score}`} />
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

function SectionHeader({ icon: Icon, label, count, color = 'text-gray-400' }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1E1E1E] bg-[#0D0D0D] sticky top-0 z-10">
      <Icon size={13} className={color} />
      <span className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{label}</span>
      {count != null && (
        <span className="ml-auto text-[10px] text-gray-600 font-mono">{count}</span>
      )}
    </div>
  );
}

function DetailPane({ session: s, detail, loading, onClose, onPause, onResume, onStop }) {
  const [tab, setTab] = useState('icp');

  const cfg         = detail?.session?.config || s?.config || {};
  const competitors = cfg.competitors || [];
  const leads       = detail?.leads || [];
  const enriched    = leads.filter(l => l.enrichmentStatus === 'enriched');
  const scraped     = leads.filter(l => l.commentText);

  const tabs = [
    { id: 'icp',         label: 'ICP',         count: null },
    { id: 'competitors', label: 'Competitors',  count: competitors.length },
    { id: 'profiles',    label: 'Profiles',     count: leads.length },
    { id: 'enriched',    label: 'Enriched',     count: enriched.length },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F] border-l border-[#1E1E1E] w-[480px] flex-shrink-0">

      {/* Header */}
      <div className="flex items-start justify-between px-4 py-4 border-b border-[#1E1E1E] flex-shrink-0">
        <div className="min-w-0 flex-1 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={s.status} />
            {detail && (
              <span className="text-[10px] text-gray-600 font-mono">
                {detail.processedCount} deduped · {detail.pendingRuns} running
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-white truncate">{s.experimentName || `Exp ${s.experimentId}`}</p>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">{s.uid?.slice(0, 12)}…</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {s.status === 'active' && (
            <button onClick={() => onPause(s.uid, s.experimentId)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
              Pause
            </button>
          )}
          {s.status === 'paused' && (
            <button onClick={() => onResume(s.uid, s.experimentId)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
              Resume
            </button>
          )}
          {s.status !== 'stopped' && (
            <button onClick={() => onStop(s.uid, s.experimentId)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
              Stop
            </button>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-[#1E1E1E] border-b border-[#1E1E1E] flex-shrink-0">
        {[
          { label: 'Discovered', value: s.leadsDiscovered ?? 0, color: 'text-violet-400' },
          { label: 'Enriched',   value: s.leadsEnriched   ?? 0, color: 'text-blue-400'   },
          { label: 'Outreach',   value: s.outreachSent    ?? 0, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-4 py-3 text-center">
            <div className={`text-lg font-black ${color}`}>{value}</div>
            <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1E1E1E] flex-shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              tab === t.id
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-400'
            }`}>
            {t.label}{t.count != null ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-600 text-sm gap-2">
            <RefreshCw size={13} className="animate-spin" /> Loading…
          </div>
        ) : (

          /* ── ICP Tab ── */
          tab === 'icp' && (
            <div className="p-4 space-y-3">
              {[
                { icon: Target,    label: 'Role',             value: cfg.icpRole },
                { icon: Building2, label: 'Industry',         value: cfg.industry },
                { icon: Users,     label: 'Company Size',     value: cfg.companySize },
                { icon: MapPin,    label: 'Location',         value: cfg.location },
                { icon: Globe,     label: 'Platform',         value: cfg.platform },
                { icon: Mail,      label: 'Outreach Channel', value: cfg.outreachChannel },
                { icon: TrendingUp,label: 'Message Angle',    value: cfg.messageAngle },
                { icon: CheckCircle,label: 'Success Criteria',value: cfg.successCriteria },
              ].map(({ icon: Icon, label, value }) =>
                value ? (
                  <div key={label} className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] border border-[#222] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={12} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">{label}</div>
                      <div className="text-xs text-gray-200 leading-relaxed">{value}</div>
                    </div>
                  </div>
                ) : null
              )}
              {cfg.landingPageUrl && (
                <a href={cfg.landingPageUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 mt-2 text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                  <Link size={11} /> {cfg.landingPageUrl}
                </a>
              )}
            </div>
          )
        )}

        {!loading && tab === 'competitors' && (
          <div>
            {competitors.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-10">No competitors configured.</p>
            ) : (
              competitors.map((c, i) => (
                <div key={i} className="px-4 py-3 border-b border-[#1A1A1A] last:border-0">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-md bg-[#1A1A1A] border border-[#222] text-[9px] font-black text-gray-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-200 truncate">
                        {c.handle || c.name || c.url?.split('/').pop() || `Competitor ${i + 1}`}
                      </div>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noreferrer"
                          className="text-[10px] text-blue-500 hover:text-blue-400 truncate block mt-0.5 transition-colors">
                          {c.url}
                        </a>
                      )}
                      {c.platform && (
                        <span className="text-[9px] text-gray-600 mt-1 block">{c.platform}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === 'profiles' && (
          <div>
            {leads.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-10">No profiles scraped yet.</p>
            ) : (
              leads.map((lead, i) => (
                <div key={lead.id || i} className="px-4 py-3 border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-2.5">
                    <ScoreDot score={lead.icpMatchScore || 0} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-200 truncate">
                          {lead.name || 'Unknown'}
                        </span>
                        <span className="text-[9px] text-gray-600 ml-auto flex-shrink-0 font-mono">
                          {lead.icpMatchScore || 0}%
                        </span>
                      </div>
                      {(lead.position || lead.company) && (
                        <div className="text-[10px] text-gray-500 truncate mt-0.5">
                          {[lead.position, lead.company].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {lead.profileUrl && (
                        <a href={lead.profileUrl} target="_blank" rel="noreferrer"
                          className="text-[10px] text-blue-500 hover:text-blue-400 truncate block mt-0.5 transition-colors">
                          {lead.profileUrl}
                        </a>
                      )}
                      {lead.commentText && (
                        <div className="mt-1.5 pl-2 border-l border-[#2A2A2A]">
                          <div className="flex items-center gap-1 mb-0.5">
                            <MessageSquare size={9} className="text-gray-600" />
                            <span className="text-[9px] text-gray-600 uppercase tracking-widest">comment</span>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3">
                            {lead.commentText}
                          </p>
                        </div>
                      )}
                      {lead.sourceCompetitor && (
                        <div className="text-[9px] text-gray-700 mt-1 truncate">
                          via {lead.sourceCompetitor}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === 'enriched' && (
          <div>
            {enriched.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-10">No enriched leads yet.</p>
            ) : (
              enriched.map((lead, i) => (
                <div key={lead.id || i} className="px-4 py-3 border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle size={10} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-200 truncate">{lead.name || 'Unknown'}</span>
                        {lead.icpMatchScore > 0 && (
                          <span className="text-[9px] font-bold text-emerald-400 ml-auto flex-shrink-0">
                            {lead.icpMatchScore}%
                          </span>
                        )}
                      </div>
                      {(lead.position || lead.company) && (
                        <div className="text-[10px] text-gray-500 truncate mt-0.5">
                          {[lead.position, lead.company].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      <div className="mt-1.5 space-y-0.5">
                        {lead.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail size={9} className="text-gray-600 flex-shrink-0" />
                            <span className="text-[10px] text-blue-400 truncate">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-600">📞</span>
                            <span className="text-[10px] text-gray-400">{lead.phone}</span>
                          </div>
                        )}
                        {lead.locationRaw && (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={9} className="text-gray-600 flex-shrink-0" />
                            <span className="text-[10px] text-gray-500">{lead.locationRaw}</span>
                          </div>
                        )}
                      </div>
                      {lead.enrichmentSource && lead.enrichmentSource !== 'none' && (
                        <div className="text-[9px] text-gray-700 mt-1">
                          via {lead.enrichmentSource}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[#1E1E1E] flex-shrink-0">
        <div className="flex items-center gap-3 text-[9px] text-gray-700">
          <Clock size={9} />
          <span>Last scan {formatRelative(s.lastRunAt)}</span>
          <span className="ml-auto">Created {formatRelative(s.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function LeadDiscoveryPage() {
  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [toast,     setToast]     = useState(null);
  const [injecting, setInjecting] = useState(null);
  const [selected,  setSelected]  = useState(null);   // session object
  const [detail,    setDetail]    = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stoppingAll, setStoppingAll] = useState(false);
  const [pausingAll,  setPausingAll]  = useState(false);

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

  const openDetail = useCallback(async (s) => {
    setSelected(s);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await httpsCallable(functions, 'adminGetSessionDetail')({
        uid: s.uid, experimentId: s.experimentId,
      });
      setDetail(r.data);
    } catch (e) { showToast(e.message || 'Failed to load detail', 'error'); }
    finally { setDetailLoading(false); }
  }, []);

  const handlePause = async (uid, experimentId) => {
    try {
      await httpsCallable(functions, 'adminPauseSession')({ uid, experimentId });
      setSessions(prev => prev.map(s =>
        s.uid === uid && s.experimentId === experimentId ? { ...s, status: 'paused' } : s
      ));
      setSelected(prev => prev && prev.uid === uid && prev.experimentId === experimentId
        ? { ...prev, status: 'paused' } : prev);
      showToast('Session paused');
    } catch (e) { showToast(e.message || 'Failed', 'error'); }
  };

  const handleResume = async (uid, experimentId) => {
    try {
      await httpsCallable(functions, 'adminResumeSession')({ uid, experimentId });
      setSessions(prev => prev.map(s =>
        s.uid === uid && s.experimentId === experimentId ? { ...s, status: 'active' } : s
      ));
      setSelected(prev => prev && prev.uid === uid && prev.experimentId === experimentId
        ? { ...prev, status: 'active' } : prev);
      showToast('Session resumed');
    } catch (e) { showToast(e.message || 'Failed', 'error'); }
  };

  const handleStop = async (uid, experimentId) => {
    try {
      await httpsCallable(functions, 'adminStopSession')({ uid, experimentId });
      setSessions(prev => prev.map(s =>
        s.uid === uid && s.experimentId === experimentId ? { ...s, status: 'stopped' } : s
      ));
      setSelected(prev => prev && prev.uid === uid && prev.experimentId === experimentId
        ? { ...prev, status: 'stopped' } : prev);
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

  const handleStopAll = async () => {
    const targets = sessions.filter(s => s.status !== 'stopped');
    if (targets.length === 0) {
      showToast('No active or paused sessions to stop');
      return;
    }
    const confirmed = window.confirm(
      `Stop all ${targets.length} active/paused session${targets.length === 1 ? '' : 's'}? This cannot be undone.`
    );
    if (!confirmed) return;

    setStoppingAll(true);
    try {
      const results = await Promise.allSettled(
        targets.map(s => httpsCallable(functions, 'adminStopSession')({ uid: s.uid, experimentId: s.experimentId }))
      );
      const stoppedKeys = new Set(
        targets
          .filter((_, i) => results[i].status === 'fulfilled')
          .map(s => `${s.uid}-${s.experimentId}`)
      );
      const failedCount = results.filter(r => r.status === 'rejected').length;

      setSessions(prev => prev.map(s =>
        stoppedKeys.has(`${s.uid}-${s.experimentId}`) ? { ...s, status: 'stopped' } : s
      ));
      setSelected(prev => prev && stoppedKeys.has(`${prev.uid}-${prev.experimentId}`)
        ? { ...prev, status: 'stopped' } : prev);

      if (failedCount === 0) {
        showToast(`${stoppedKeys.size} session${stoppedKeys.size === 1 ? '' : 's'} stopped`);
      } else {
        showToast(`${stoppedKeys.size} stopped, ${failedCount} failed`, 'error');
      }
    } finally {
      setStoppingAll(false);
    }
  };

  const handlePauseAll = async () => {
    const targets = sessions.filter(s => s.status === 'active');
    if (targets.length === 0) {
      showToast('No active sessions to pause');
      return;
    }
    const confirmed = window.confirm(
      `Pause all ${targets.length} active session${targets.length === 1 ? '' : 's'}?`
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
      setSelected(prev => prev && pausedKeys.has(`${prev.uid}-${prev.experimentId}`)
        ? { ...prev, status: 'paused' } : prev);

      if (failedCount === 0) {
        showToast(`${pausedKeys.size} session${pausedKeys.size === 1 ? '' : 's'} paused`);
      } else {
        showToast(`${pausedKeys.size} paused, ${failedCount} failed`, 'error');
      }
    } finally {
      setPausingAll(false);
    }
  };

  const activeCount = sessions.filter(s => s.status === 'active').length;
  const stoppableCount = sessions.filter(s => s.status !== 'stopped').length;
  const totalLeads  = sessions.reduce((acc, s) => acc + (s.leadsDiscovered || 0), 0);

  return (
    <div className="flex h-screen overflow-hidden">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
          toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>{toast.msg}</div>
      )}

      {/* ── Table panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-[#1E1E1E] flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-white">Lead Discovery</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-emerald-400 font-bold">{activeCount} active</span>
              <span className="text-xs text-gray-500">{totalLeads.toLocaleString()} leads discovered</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePauseAll} disabled={pausingAll || activeCount === 0}
              className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {pausingAll ? 'Pausing…' : 'Pause All'}
            </button>
            <button onClick={handleStopAll} disabled={stoppingAll || stoppableCount === 0}
              className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {stoppingAll ? 'Stopping…' : 'Stop All'}
            </button>
            <button onClick={handleForceCycle}
              className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold rounded-lg hover:bg-orange-500/20 transition-colors">
              Force Cycle
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
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
                    const isSelected = selected?.uid === s.uid && selected?.experimentId === s.experimentId;
                    return (
                      <tr
                        key={`${key}-${i}`}
                        onClick={() => isSelected ? setSelected(null) : openDetail(s)}
                        className={`border-b border-[#1A1A1A] last:border-0 transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-500/5 border-l-2 border-l-blue-500/40' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-400 font-mono">{s.uid?.slice(0, 8)}…</td>
                        <td className="px-4 py-3 max-w-[120px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-300 truncate">{s.experimentName || `${s.experimentId?.slice(0, 8)}…`}</span>
                            {isSelected && <ChevronRight size={10} className="text-blue-400 flex-shrink-0" />}
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-gray-400">{s.config?.platform || '—'}</td>
                        <td className="px-4 py-3 font-bold text-violet-400">{s.leadsDiscovered ?? 0}</td>
                        <td className="px-4 py-3 text-gray-400">{s.leadsEnriched ?? 0}</td>
                        <td className="px-4 py-3 text-gray-500">{formatRelative(s.lastRunAt)}</td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
      </div>

      {/* ── Detail pane ── */}
      {selected && (
        <DetailPane
          session={selected}
          detail={detail}
          loading={detailLoading}
          onClose={() => { setSelected(null); setDetail(null); }}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />
      )}
    </div>
  );
}
