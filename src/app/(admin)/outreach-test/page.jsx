'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import {
  Play, ExternalLink, CheckCircle, XCircle,
  Search, Crosshair, ChevronDown, ChevronRight, AlertCircle, Map,
} from 'lucide-react';


const inputCls = 'w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/50';

// ─── SocialCrawl Search Test (Tab 1) ──────────────────────────────────────────

function getColumns(items) {
  if (!items?.length) return [];
  const s = items[0];
  const cols = [];
  const add = (k, v) => { if (v != null) cols.push(k); };
  add('platform',     s.platform);
  add('username',     s.author?.username);
  add('display_name', s.author?.display_name);
  add('verified',     s.author?.verified);
  add('followers',    s.author?.followers);
  add('text',         s.text);
  add('url',          s.url);
  add('profile_url',  s.author?.profile_url ?? s.author?.url);
  add('likes',        s.engagement?.likes);
  add('comments',     s.engagement?.comments);
  add('shares',       s.engagement?.shares);
  add('views',        s.engagement?.views);
  add('published_at', s.published_at);
  add('id',           s.id);
  return cols;
}
function getCell(item, col) {
  switch (col) {
    case 'platform':     return item.platform ?? '';
    case 'username':     return item.author?.username ?? '';
    case 'display_name': return item.author?.display_name ?? '';
    case 'verified':     return item.author?.verified ? '✓' : '';
    case 'followers':    return item.author?.followers ?? '';
    case 'text':         return item.content?.text ?? item.text ?? '';
    case 'url':          return item.url ?? '';
    case 'profile_url':  return item.author?.profile_url ?? item.author?.url ?? '';
    case 'likes':        return item.engagement?.likes ?? '';
    case 'comments':     return item.engagement?.comments ?? '';
    case 'shares':       return item.engagement?.shares ?? '';
    case 'views':        return item.engagement?.views ?? '';
    case 'published_at': return item.published_at ?? '';
    case 'id':           return item.id ?? '';
    default:             return '';
  }
}
const LINK_COLS = new Set(['url', 'profile_url']);
const WIDE_COLS = new Set(['text']);
const COL_LABEL = {
  platform: 'Platform', username: 'Username', display_name: 'Name',
  verified: 'Ver.', followers: 'Followers', text: 'Content',
  url: 'Post URL', profile_url: 'Profile', likes: 'Likes',
  comments: 'Comments', shares: 'Shares', views: 'Views',
  published_at: 'Posted', id: 'ID',
};

function CellValue({ col, val }) {
  const str = String(val ?? '');
  if (!str) return <span className="text-gray-700">—</span>;
  if (LINK_COLS.has(col)) {
    return (
      <a href={str} target="_blank" rel="noopener noreferrer"
        className="text-[#3B82F6] hover:underline flex items-center gap-1 min-w-0">
        <ExternalLink size={10} className="flex-shrink-0" />
        <span className="truncate max-w-[140px] block">{str}</span>
      </a>
    );
  }
  if (WIDE_COLS.has(col)) {
    return <span className="block max-w-[280px] text-[10px] text-gray-300 leading-relaxed whitespace-pre-wrap break-words">{str}</span>;
  }
  return <span className="text-[10px] text-gray-400 whitespace-nowrap">{str}</span>;
}

function ResultTable({ items }) {
  if (!items?.length) return <p className="px-5 py-8 text-xs text-gray-600 text-center">No results returned</p>;
  const cols = getColumns(items);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#1E1E1E] bg-[#0D0D0D]">
            <th className="px-3 py-2.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">#</th>
            {cols.map(c => (
              <th key={c} className="px-3 py-2.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                {COL_LABEL[c] ?? c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#141414]">
          {items.map((item, i) => (
            <tr key={i} className="hover:bg-white/[0.015] transition-colors">
              <td className="px-3 py-2.5 text-[10px] text-gray-700 w-6">{i + 1}</td>
              {cols.map(col => (
                <td key={col} className="px-3 py-2.5 align-top">
                  <CellValue col={col} val={getCell(item, col)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SearchTestTab() {
  const [problem, setProblem] = useState('');
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRun = async () => {
    if (!problem.trim()) { setError('Problem description is required'); return; }
    setError(null); setRunning(true); setResult(null);
    try {
      const r = await httpsCallable(functions, 'adminRunOutreachTest', { timeout: 60000 })({ problem });
      setResult(r.data?.result);
      const count = r.data?.result?.data?.items?.length ?? 0;
      const cred  = r.data?.result?.credits_used ?? '?';
      showToast(`${count} result${count !== 1 ? 's' : ''} · ${cred} credit${cred !== 1 ? 's' : ''} used`);
    } catch (e) {
      setError(e.message);
      showToast(e.message || 'Request failed', 'error');
    } finally {
      setRunning(false);
    }
  };

  const items      = result?.data?.items ?? [];
  const creditsUsed  = result?.credits_used;
  const creditsLeft  = result?.credits_remaining;
  const requestId  = result?.request_id;
  const cached     = result?.cached;

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
          toast.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>{toast.msg}</div>
      )}

      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">
            Problem / Search Query
          </label>
          <textarea
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="e.g. cement price volatility for construction contractors"
            value={problem}
            onChange={e => setProblem(e.target.value)}
          />
          <p className="text-[10px] text-gray-700 mt-1">Sent as the query to SocialCrawl /search/everywhere</p>
        </div>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
        <div className="flex items-center gap-4">
          <button onClick={handleRun} disabled={running}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50">
            <Play size={13} />
            {running ? 'Searching…' : 'Search'}
          </button>
          {running && <p className="text-[10px] text-amber-400 animate-pulse">Calling SocialCrawl…</p>}
        </div>
      </div>

      {result && (
        <div className="flex items-center gap-5 px-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            {result.success ? <CheckCircle size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}
            <span className="text-[10px] text-gray-400">{result.success ? 'success' : 'error'}</span>
          </div>
          <span className="text-[10px] text-gray-500">{items.length} result{items.length !== 1 ? 's' : ''}</span>
          {creditsUsed != null && <span className="text-[10px] text-gray-500">{creditsUsed} credit{creditsUsed !== 1 ? 's' : ''} used</span>}
          {creditsLeft != null && <span className="text-[10px] text-gray-500">{creditsLeft} remaining</span>}
          {cached      != null && <span className="text-[10px] text-gray-500">{cached ? 'cached ✓' : 'live'}</span>}
          {requestId             && <span className="text-[10px] text-gray-700 font-mono">{requestId}</span>}
        </div>
      )}

      {result && (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1E1E1E]">
            <p className="text-xs font-bold text-white">Results — full schema</p>
            <p className="text-[10px] text-gray-500 mt-0.5">"{problem}"</p>
          </div>
          <ResultTable items={items} />
        </div>
      )}

      {result && (
        <details className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-2xl overflow-hidden">
          <summary className="px-5 py-3 text-[10px] font-bold text-gray-600 cursor-pointer hover:text-gray-400 uppercase tracking-wider">
            Raw JSON response
          </summary>
          <pre className="px-5 pb-5 text-[10px] text-gray-500 overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─── Buyer Discovery (Tab 2) ───────────────────────────────────────────────────

const TRACE_META = {
  trace_1:   { color: '#8B5CF6', badge: 'T1' },
  trace_2:   { color: '#EF4444', badge: 'T2' },
  trace_3:   { color: '#F59E0B', badge: 'T3' },
  trace_4:   { color: '#6B7280', badge: 'T4' },
  trace_5_6: { color: '#10B981', badge: 'T5/6' },
  trace_7:   { color: '#EC4899', badge: 'T7' },
  trace_8:   { color: '#3B82F6', badge: 'T8' },
};

const PLATFORM_COLORS = {
  instagram: '#E1306C', linkedin: '#0A66C2', linkedin_company: '#0A66C2',
  tiktok: '#000000', twitter: '#1DA1F2', reddit: '#FF4500',
  youtube: '#FF0000', facebook: '#1877F2', app_store: '#0071E3',
  play_store: '#34A853', forum: '#64748B',
};

function PlatformBadge({ platform }) {
  const color = PLATFORM_COLORS[platform?.toLowerCase()] || '#6B7280';
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
      style={{ background: `${color}22`, color }}>
      {platform?.replace('_', ' ') || '?'}
    </span>
  );
}

function TraceTag({ traceId }) {
  const meta = TRACE_META[traceId] || { color: '#6B7280', badge: traceId };
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
      style={{ background: `${meta.color}22`, color: meta.color }}>
      {meta.badge}
    </span>
  );
}

function TraceSection({ trace }) {
  const meta = TRACE_META[trace.trace_id] || { color: '#6B7280', badge: trace.trace_id };
  const profileCount = trace.profiles?.length ?? 0;
  const hasError     = !!trace.error;
  const isContent    = trace.trace_id === 'trace_4';

  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <div className="px-5 py-3.5 flex items-center gap-3 border-b border-[#1E1E1E]">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
          style={{ background: `${meta.color}20`, color: meta.color }}>
          {meta.badge}
        </span>
        <span className="text-xs font-bold text-white flex-1">{trace.label}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasError && <AlertCircle size={12} className="text-red-400" />}
          {isContent ? (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#1E1E1E] text-gray-500 uppercase tracking-wider">
              Content signal only
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: profileCount > 0 ? `${meta.color}18` : '#1E1E1E',
                color:      profileCount > 0 ? meta.color : '#4B5563',
              }}>
              {profileCount} profile{profileCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {hasError && (
        <p className="px-5 py-3 text-[10px] text-red-400 border-b border-[#1E1E1E]">
          Error: {trace.error}
        </p>
      )}

      {/* Trace 4 — content signals */}
      {isContent && (
        <div className="px-5 py-3">
          <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-2.5">{trace.note}</p>
          {(trace.content_signals || []).length === 0 && (
            <p className="text-[10px] text-gray-600">No content signals found</p>
          )}
          {(trace.content_signals || []).map((s, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-[#141414] last:border-0">
              <span className="text-[10px] text-gray-700 w-5 flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-300">{s.title}</p>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-[9px] text-[#3B82F6] hover:underline flex items-center gap-1 mt-0.5">
                    <ExternalLink size={8} />
                    <span className="truncate max-w-[320px] block">{s.url}</span>
                  </a>
                )}
              </div>
              {s.views != null && (
                <span className="text-[9px] text-gray-600 flex-shrink-0">{Number(s.views).toLocaleString()} views</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Profile table */}
      {!isContent && profileCount === 0 && !hasError && (
        <p className="px-5 py-4 text-[10px] text-gray-600">No profiles found for this trace</p>
      )}
      {!isContent && profileCount > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0D0D0D]">
                {['#', 'Platform', 'Handle', 'Name', 'Evidence', 'Source'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {(trace.profiles || []).map((p, i) => {
                const ev = p.evidence?.[0];
                return (
                  <tr key={p.id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="px-4 py-3 text-[10px] text-gray-700 w-6">{i + 1}</td>
                    <td className="px-4 py-3"><PlatformBadge platform={p.platform} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.profile_url ? (
                        <a href={p.profile_url} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-white hover:text-[#3B82F6] transition-colors flex items-center gap-1">
                          @{p.handle}
                          <ExternalLink size={9} className="text-gray-600" />
                        </a>
                      ) : (
                        <span className="text-[11px] font-semibold text-white">@{p.handle}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-gray-500 whitespace-nowrap max-w-[120px]">
                      <span className="truncate block">{p.display_name !== p.handle ? p.display_name : ''}</span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-gray-400 max-w-[280px]">
                      <p className="line-clamp-2 leading-relaxed">{ev?.text || ev?.source_label || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {ev?.source_url ? (
                        <a href={ev.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-[#3B82F6] hover:underline flex items-center gap-1 text-[9px] whitespace-nowrap">
                          <ExternalLink size={9} />
                          source
                        </a>
                      ) : <span className="text-gray-700">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stage0Card({ entities }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
      <div className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.015]"
        onClick={() => setOpen(o => !o)}>
        <div>
          <p className="text-xs font-semibold text-white">Stage 0 — Entity Resolution</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {entities.competitorHandles?.length ?? 0} competitors · {entities.complementaryApps?.length ?? 0} adjacent apps · {entities.competitorApps?.length ?? 0} competitor apps
          </p>
        </div>
        {open ? <ChevronDown size={12} className="text-gray-600" /> : <ChevronRight size={12} className="text-gray-600" />}
      </div>
      {open && (
        <div className="border-t border-[#1E1E1E] px-4 py-3 space-y-3">
          {entities.competitorHandles?.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Competitor handles (Instagram seed)</p>
              <div className="flex flex-wrap gap-1.5">
                {entities.competitorHandles.map((c, i) => (
                  <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-[10px] text-white hover:border-[#3B82F6]/50 transition-colors">
                    @{c.handle}
                    <ExternalLink size={8} className="text-gray-600" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {entities.complementaryApps?.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Adjacent apps</p>
              <div className="flex flex-wrap gap-1.5">
                {entities.complementaryApps.map((a, i) => (
                  <span key={i} className="px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-[10px] text-gray-300">
                    {a.name}{a.app_store_id ? ` (iOS: ${a.app_store_id})` : ''}{a.play_store_id ? ` (Play: ${a.play_store_id})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          {entities.competitorApps?.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Competitor apps</p>
              <div className="flex flex-wrap gap-1.5">
                {entities.competitorApps.map((a, i) => (
                  <span key={i} className="px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-[10px] text-gray-300">
                    {a.name}{a.app_store_id ? ` (iOS: ${a.app_store_id})` : ''}{a.play_store_id ? ` (Play: ${a.play_store_id})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!entities.competitorHandles?.length && !entities.complementaryApps?.length && (
            <p className="text-[10px] text-gray-600">No entities resolved</p>
          )}
        </div>
      )}
    </div>
  );
}

function AllProfilesTable({ profiles }) {
  if (!profiles?.length) return null;
  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1E1E1E]">
        <p className="text-xs font-bold text-white">All Profiles — Deduplicated</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{profiles.length} unique profile{profiles.length !== 1 ? 's' : ''} across all traces</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1E1E1E] bg-[#0D0D0D]">
              {['#','Platform','Handle','Display Name','Profile','Traces','Evidence'].map(h => (
                <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141414]">
            {profiles.map((p, i) => (
              <tr key={p.id} className="hover:bg-white/[0.015] transition-colors">
                <td className="px-3 py-2.5 text-[10px] text-gray-700 w-6">{i + 1}</td>
                <td className="px-3 py-2.5"><PlatformBadge platform={p.platform} /></td>
                <td className="px-3 py-2.5 text-[10px] text-white font-medium">@{p.handle}</td>
                <td className="px-3 py-2.5 text-[10px] text-gray-400">{p.display_name}</td>
                <td className="px-3 py-2.5">
                  {p.profile_url ? (
                    <a href={p.profile_url} target="_blank" rel="noopener noreferrer"
                      className="text-[#3B82F6] hover:underline flex items-center gap-1 text-[10px]">
                      <ExternalLink size={9} />
                      <span className="truncate max-w-[120px] block">{p.profile_url}</span>
                    </a>
                  ) : <span className="text-gray-700">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1 flex-wrap">
                    {p.trace_tags.map(t => <TraceTag key={t} traceId={t} />)}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[10px] text-gray-500 max-w-[220px]">
                  <span className="block line-clamp-2">{p.evidence[0]?.text || p.evidence[0]?.source_label || '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const LOADING_STAGES = [
  'Resolving entities (Tavily + Gemini)…',
  'Running 7 traces in parallel…',
  'Trace 1: Competitor post comments (Instagram)…',
  'Trace 2: Reddit + forum complaints…',
  'Trace 3: LinkedIn hiring signals…',
  'Trace 4: YouTube search signals…',
  'Trace 5/6: App store reviews…',
  'Trace 7: Bad competitor reviews…',
  'Trace 8: YouTube community comments…',
  'Deduplicating profiles…',
];

function BuyerDiscoveryTab() {
  const [form, setForm] = useState({
    problem: '', productCategory: '', icpDescription: '', knownCompetitors: '', geography: '',
  });
  const [running, setRunning] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRun = async () => {
    if (!form.problem.trim()) { setError('Problem description is required'); return; }
    setError(null); setRunning(true); setResult(null); setLoadingStage(0);

    // Cycle loading messages while waiting
    const cycle = setInterval(() => {
      setLoadingStage(s => (s + 1) % LOADING_STAGES.length);
    }, 3000);

    try {
      const r = await httpsCallable(functions, 'adminRunBuyerDiscovery', { timeout: 300000 })(form);
      const res = r.data?.result;
      setResult(res);
      const n = res?.total_unique_profiles ?? 0;
      showToast(`${n} unique profile${n !== 1 ? 's' : ''} found across all traces`);
    } catch (e) {
      setError(e.message);
      showToast(e.message || 'Request failed', 'error');
    } finally {
      clearInterval(cycle);
      setRunning(false);
    }
  };

  const field = (key, label, placeholder, type = 'text', required = false) => (
    <div>
      <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <input
          type="text"
          className={inputCls}
          placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
          toast.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>{toast.msg}</div>
      )}

      {/* Input form */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5 space-y-4">
        {field('problem', 'Problem Description', 'e.g. construction contractors struggle with cement price volatility', 'textarea', true)}
        <div className="grid grid-cols-2 gap-3">
          {field('productCategory', 'Product Category', 'e.g. SaaS, marketplace, hardware')}
          {field('icpDescription', 'ICP Description', 'e.g. construction contractors in Nigeria')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('knownCompetitors', 'Known Competitors (optional)', 'comma-separated names or handles')}
          {field('geography', 'Geography (optional)', 'e.g. Nigeria, West Africa')}
        </div>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
        <div className="flex items-center gap-4">
          <button onClick={handleRun} disabled={running}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50">
            <Crosshair size={13} />
            {running ? 'Running pipeline…' : 'Run Buyer Discovery'}
          </button>
          {running && (
            <p className="text-[10px] text-amber-400 animate-pulse">{LOADING_STAGES[loadingStage]}</p>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-5 px-1 flex-wrap">
            <span className="text-xs font-bold text-white">{result.total_unique_profiles} unique profiles</span>
            <span className="text-[10px] text-gray-500">{result.traces?.length ?? 0} traces run</span>
            <span className="text-[10px] text-gray-500">
              {result.traces?.filter(t => (t.profiles?.length ?? 0) > 0).length ?? 0} traces with results
            </span>
          </div>

          {/* Stage 0 */}
          <Stage0Card entities={result.stage0 || {}} />

          {/* Trace sections — one per trace, full width */}
          <div className="space-y-3">
            {(result.traces || []).map(trace => (
              <TraceSection key={trace.trace_id} trace={trace} />
            ))}
          </div>

          {/* Coverage gaps */}
          {result.coverage_gaps?.length > 0 && (
            <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-2xl px-4 py-3">
              <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Coverage gaps</p>
              <div className="flex flex-wrap gap-2">
                {result.coverage_gaps.map((g, i) => (
                  <span key={i} className="text-[10px] text-gray-600 flex items-center gap-1">
                    <AlertCircle size={9} className="text-amber-600" />
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <details className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-2xl overflow-hidden">
            <summary className="px-5 py-3 text-[10px] font-bold text-gray-600 cursor-pointer hover:text-gray-400 uppercase tracking-wider">
              Raw JSON response
            </summary>
            <pre className="px-5 pb-5 text-[10px] text-gray-500 overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}

// ─── Competitor Intel (Tab 3) ─────────────────────────────────────────────────

function HandleCell({ handle, color }) {
  if (!handle?.handle) return <td className="px-4 py-3 text-gray-700 text-[10px]">—</td>;
  return (
    <td className="px-4 py-3 whitespace-nowrap">
      <a href={handle.url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] font-medium hover:underline"
        style={{ color }}>
        @{handle.handle}
        <ExternalLink size={8} className="opacity-60" />
      </a>
    </td>
  );
}

const TYPE_META = {
  direct:   { color: '#EF4444', label: 'Direct' },
  adjacent: { color: '#F59E0B', label: 'Adjacent' },
};

function CompetitorIntelTab() {
  const [problem, setProblem] = useState('');
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRun = async () => {
    if (!problem.trim()) { setError('Problem description is required'); return; }
    setError(null); setRunning(true); setResult(null);
    try {
      const r = await httpsCallable(functions, 'adminFindCompetitors', { timeout: 120000 })({ problem });
      setResult(r.data);
      const n = r.data?.companies?.length ?? 0;
      showToast(`${n} compan${n !== 1 ? 'ies' : 'y'} found`);
    } catch (e) {
      setError(e.message);
      showToast(e.message || 'Request failed', 'error');
    } finally {
      setRunning(false);
    }
  };

  const direct   = result?.direct   ?? [];
  const adjacent = result?.adjacent ?? [];
  const sources  = result?.sources  ?? [];

  const CompanyTable = ({ companies, type }) => {
    if (!companies.length) return (
      <p className="px-5 py-4 text-[10px] text-gray-600">None found</p>
    );
    const meta = TYPE_META[type] || { color: '#6B7280', label: type };
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0D0D0D]">
              {['#', 'Name', 'Category', 'Description', 'Website', 'Instagram', 'LinkedIn', 'Twitter', 'TikTok'].map(h => (
                <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141414]">
            {companies.map((c, i) => (
              <tr key={i} className="hover:bg-white/[0.015] transition-colors">
                <td className="px-4 py-3 text-[10px] text-gray-700 w-6">{i + 1}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${meta.color}20`, color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-[11px] font-semibold text-white">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[10px] text-gray-500 whitespace-nowrap">{c.category || '—'}</td>
                <td className="px-4 py-3 text-[10px] text-gray-400 max-w-[320px]">
                  <span className="line-clamp-2">{c.description || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  {c.website ? (
                    <a href={`https://${c.website.replace(/^https?:\/\//, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[#3B82F6] hover:underline flex items-center gap-1 text-[10px] whitespace-nowrap">
                      <ExternalLink size={9} />
                      {c.website}
                    </a>
                  ) : <span className="text-gray-700">—</span>}
                </td>
                <HandleCell handle={c.handles?.instagram} color="#E1306C" />
                <HandleCell handle={c.handles?.linkedin}  color="#0A66C2" />
                <HandleCell handle={c.handles?.twitter}   color="#1DA1F2" />
                <HandleCell handle={c.handles?.tiktok}    color="#888888" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
          toast.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>{toast.msg}</div>
      )}

      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">
            Product / Problem Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="e.g. cement price volatility frustrates construction contractors who can't lock in quotes"
            value={problem}
            onChange={e => setProblem(e.target.value)}
          />
          <p className="text-[10px] text-gray-700 mt-1">
            Tavily searches for solutions + alternatives · Gemini extracts the company list
          </p>
        </div>

        {error && <p className="text-[10px] text-red-400">{error}</p>}

        <div className="flex items-center gap-4">
          <button onClick={handleRun} disabled={running}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50">
            <Map size={13} />
            {running ? 'Mapping market…' : 'Map Competitors'}
          </button>
          {running && (
            <p className="text-[10px] text-amber-400 animate-pulse">
              Loop 1: mapping competitors · Loop 2: finding social profiles…
            </p>
          )}
        </div>
      </div>

      {result && (
        <>
          {/* Summary */}
          <div className="flex items-center gap-5 px-1 flex-wrap">
            <span className="text-xs font-bold text-white">{result.companies?.length ?? 0} companies found</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold"
              style={{ background: '#EF444420', color: '#EF4444' }}>
              {direct.length} direct
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold"
              style={{ background: '#F59E0B20', color: '#F59E0B' }}>
              {adjacent.length} adjacent
            </span>
          </div>

          {/* Direct competitors */}
          <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1E1E1E] flex items-center gap-2">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: '#EF444420', color: '#EF4444' }}>Direct</span>
              <p className="text-xs font-bold text-white">Direct Competitors</p>
              <span className="text-[10px] text-gray-600 ml-auto">{direct.length} found</span>
            </div>
            <CompanyTable companies={direct} type="direct" />
          </div>

          {/* Adjacent products */}
          <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1E1E1E] flex items-center gap-2">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: '#F59E0B20', color: '#F59E0B' }}>Adjacent</span>
              <p className="text-xs font-bold text-white">Adjacent Products</p>
              <span className="text-[10px] text-gray-600 ml-auto">{adjacent.length} found</span>
            </div>
            <CompanyTable companies={adjacent} type="adjacent" />
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <details className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-2xl overflow-hidden">
              <summary className="px-5 py-3 text-[10px] font-bold text-gray-600 cursor-pointer hover:text-gray-400 uppercase tracking-wider">
                Tavily sources ({sources.length})
              </summary>
              <div className="px-5 pb-4 space-y-1.5">
                {sources.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-700 w-5">{i + 1}.</span>
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-[#3B82F6] hover:underline truncate flex items-center gap-1">
                      <ExternalLink size={9} />
                      {s.title || s.url}
                    </a>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page Shell ───────────────────────────────────────────────────────────────

export default function OutreachTestPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-white">Competitor Intelligence</h1>
        <p className="text-xs text-gray-500 mt-1">Map the competitive landscape from a problem description</p>
      </div>
      <CompetitorIntelTab />
    </div>
  );
}

