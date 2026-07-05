'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Play, ExternalLink, CheckCircle, XCircle } from 'lucide-react';


const inputCls = 'w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/50';

// Derive columns dynamically from the first item in the result set.
function getColumns(items) {
  if (!items || items.length === 0) return [];
  const sample = items[0];
  const cols = [];

  const addCol = (key, src) => { if (src !== undefined && src !== null) cols.push(key); };

  addCol('platform',     sample.platform);
  addCol('username',     sample.author?.username);
  addCol('display_name', sample.author?.display_name);
  addCol('verified',     sample.author?.verified);
  addCol('followers',    sample.author?.followers);
  addCol('text',         sample.text);
  addCol('url',          sample.url);
  addCol('profile_url',  sample.author?.profile_url ?? sample.author?.url);
  addCol('likes',        sample.engagement?.likes);
  addCol('comments',     sample.engagement?.comments);
  addCol('shares',       sample.engagement?.shares);
  addCol('views',        sample.engagement?.views);
  addCol('published_at', sample.published_at);
  addCol('id',           sample.id);

  return cols;
}

function getCell(item, col) {
  switch (col) {
    case 'platform':     return item.platform ?? '';
    case 'username':     return item.author?.username ?? '';
    case 'display_name': return item.author?.display_name ?? '';
    case 'verified':     return item.author?.verified ? '✓' : '';
    case 'followers':    return item.author?.followers ?? '';
    case 'text':         return item.text ?? '';
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

const COL_LABEL = {
  platform: 'Platform', username: 'Username', display_name: 'Name',
  verified: 'Ver.', followers: 'Followers', text: 'Content',
  url: 'Post URL', profile_url: 'Profile', likes: 'Likes',
  comments: 'Comments', shares: 'Shares', views: 'Views',
  published_at: 'Posted', id: 'ID',
};

function ResultTable({ items }) {
  if (!items || items.length === 0) {
    return <p className="px-5 py-8 text-xs text-gray-600 text-center">No results returned</p>;
  }
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

export default function OutreachTestPage() {
  const [problem,  setProblem]  = useState('');
  const [running,  setRunning]  = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRun = async () => {
    if (!problem.trim()) { setError('Problem description is required'); return; }
    setError(null);
    setRunning(true);
    setResult(null);
    try {
      const r = await httpsCallable(functions, 'adminRunOutreachTest', { timeout: 60000 })({ problem });
      setResult(r.data?.result);
      const count   = r.data?.result?.data?.items?.length ?? 0;
      const credits = r.data?.result?.credits_used ?? '?';
      showToast(`${count} result${count !== 1 ? 's' : ''} · ${credits} credit${credits !== 1 ? 's' : ''} used`);
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
    <div className="p-8 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
          toast.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>{toast.msg}</div>
      )}

      <div>
        <h1 className="text-lg font-bold text-white">SocialCrawl Search Test</h1>
        <p className="text-xs text-gray-500 mt-1">
          Natural language search across all platforms — same input as Tavily
        </p>
      </div>

      {/* Input */}
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
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50"
          >
            <Play size={13} />
            {running ? 'Searching…' : 'Search'}
          </button>
          {running && <p className="text-[10px] text-amber-400 animate-pulse">Calling SocialCrawl…</p>}
        </div>
      </div>

      {/* Meta strip */}
      {result && (
        <div className="flex items-center gap-5 px-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            {result.success
              ? <CheckCircle size={12} className="text-emerald-400" />
              : <XCircle    size={12} className="text-red-400" />}
            <span className="text-[10px] text-gray-400">{result.success ? 'success' : 'error'}</span>
          </div>
          <span className="text-[10px] text-gray-500">{items.length} result{items.length !== 1 ? 's' : ''}</span>
          {creditsUsed != null && <span className="text-[10px] text-gray-500">{creditsUsed} credit{creditsUsed !== 1 ? 's' : ''} used</span>}
          {creditsLeft != null && <span className="text-[10px] text-gray-500">{creditsLeft} remaining</span>}
          {cached      != null && <span className="text-[10px] text-gray-500">{cached ? 'cached ✓' : 'live'}</span>}
          {requestId             && <span className="text-[10px] text-gray-700 font-mono">{requestId}</span>}
        </div>
      )}

      {/* Results table */}
      {result && (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1E1E1E]">
            <p className="text-xs font-bold text-white">Results — full schema</p>
            <p className="text-[10px] text-gray-500 mt-0.5">"{problem}"</p>
          </div>
          <ResultTable items={items} />
        </div>
      )}

      {/* Raw JSON */}
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
