'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Play, ExternalLink, Users, Link2, ChevronDown, ChevronUp } from 'lucide-react';

const PLATFORM_COLORS = {
  Instagram: { dot: 'bg-pink-500',   text: 'text-pink-400',   badge: 'bg-pink-500/10 border-pink-500/20 text-pink-400'   },
  LinkedIn:  { dot: 'bg-blue-500',   text: 'text-blue-400',   badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400'   },
  TikTok:    { dot: 'bg-white',      text: 'text-white',      badge: 'bg-white/10 border-white/20 text-white'             },
  Facebook:  { dot: 'bg-indigo-500', text: 'text-indigo-400', badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' },
};

const inputCls = 'w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/50';

function PlatformCard({ entry }) {
  const [showPosts, setShowPosts] = useState(true);
  const colors     = PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.Instagram;
  const competitors = entry.competitors ?? [];
  const posts       = entry.posts       ?? [];

  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#1E1E1E] flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
        <span className="text-xs font-bold text-white flex-1">{entry.platform}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.badge}`}>
          {competitors.length} accounts · {posts.length} posts
        </span>
      </div>

      {/* Competitor accounts */}
      <div className="border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2 px-5 py-2.5">
          <Users size={10} className="text-gray-600" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Competitor Accounts</span>
          <span className="text-[10px] text-gray-700 ml-auto">{competitors.length}</span>
        </div>
        {competitors.length === 0 ? (
          <p className="px-5 pb-3.5 text-[10px] text-gray-700">None found</p>
        ) : (
          <div className="divide-y divide-[#181818]">
            {competitors.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.015] transition-colors">
                <span className="text-[10px] text-gray-700 w-4 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white">@{c.handle || '—'}</p>
                  <p className="text-[10px] text-gray-600 truncate">{c.url}</p>
                </div>
                {c.url && (
                  <a href={c.url} target="_blank" rel="noopener noreferrer"
                    className="text-gray-700 hover:text-[#3B82F6] transition-colors flex-shrink-0">
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Posts from those accounts */}
      <div>
        <button
          onClick={() => setShowPosts(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 w-full hover:bg-white/[0.015] transition-colors"
        >
          <Link2 size={10} className="text-gray-600" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex-1 text-left">
            Posts (last 30 days)
          </span>
          <span className="text-[10px] text-gray-700">{posts.length}</span>
          {showPosts ? <ChevronUp size={10} className="text-gray-700" /> : <ChevronDown size={10} className="text-gray-700" />}
        </button>
        {showPosts && (
          posts.length === 0 ? (
            <p className="px-5 pb-3.5 text-[10px] text-gray-700">
              {entry.platform === 'Instagram'
                ? 'Instagram posts are sparsely indexed — low Tavily coverage expected'
                : 'No posts found in the last 30 days'}
            </p>
          ) : (
            <div className="divide-y divide-[#181818]">
              {posts.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.015] transition-colors">
                  <span className="text-[10px] text-gray-700 w-4 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 truncate">{p.url}</p>
                    {p.competitorHandle && (
                      <p className="text-[9px] text-gray-700 mt-0.5">@{p.competitorHandle}</p>
                    )}
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    className="text-gray-700 hover:text-[#3B82F6] transition-colors flex-shrink-0">
                    <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function OutreachTestPage() {
  const [problem,  setProblem]  = useState('');
  const [location, setLocation] = useState('');
  const [running,  setRunning]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [toast,    setToast]    = useState(null);

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
      const r = await httpsCallable(functions, 'adminRunOutreachTest', { timeout: 120000 })({
        problem, location,
      });
      setResult(r.data);
      const totalAccounts = (r.data?.results ?? []).reduce((s, e) => s + (e.competitors?.length ?? 0), 0);
      const totalPosts    = (r.data?.results ?? []).reduce((s, e) => s + (e.posts?.length    ?? 0), 0);
      showToast(`${totalAccounts} accounts · ${totalPosts} posts across ${r.data?.results?.length ?? 0} platforms`);
    } catch (e) {
      setError(e.message);
      showToast(e.message || 'Search failed', 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
          toast.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>{toast.msg}</div>
      )}

      <div className="mb-6">
        <h1 className="text-lg font-bold text-white">Competitor + Post Search</h1>
        <p className="text-xs text-gray-500 mt-1">
          Two-step Tavily dry-run across all platforms — accounts then their posts (last 30 days)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* ── Input panel ─────────────────────────────────────── */}
        <div className="col-span-1">
          <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Tavily Search Input</p>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">
                Problem / Search Query
              </label>
              <textarea
                rows={4}
                className={`${inputCls} resize-none`}
                placeholder="e.g. cement price volatility for construction contractors"
                value={problem}
                onChange={e => setProblem(e.target.value)}
              />
              <p className="text-[10px] text-gray-600 mt-1">Sent to Tavily for all platforms</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Location</label>
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. Lagos, Nigeria"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            <div className="px-3 py-2.5 bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl">
              <p className="text-[10px] text-gray-600 mb-1.5 font-bold uppercase tracking-wider">Platforms</p>
              <div className="flex flex-wrap gap-1.5">
                {['Instagram', 'LinkedIn', 'TikTok', 'Facebook'].map(p => (
                  <span key={p} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PLATFORM_COLORS[p]?.badge || ''}`}>
                    {p}
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-gray-700 mt-1.5">Configured via SEARCH_PLATFORMS env var</p>
            </div>

            {error && <p className="text-[10px] text-red-400">{error}</p>}

            <button
              onClick={handleRun}
              disabled={running}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50"
            >
              <Play size={13} />
              {running ? 'Searching all platforms…' : 'Run Search'}
            </button>

            {running && (
              <p className="text-[10px] text-center text-amber-400 animate-pulse">
                Step 1 → accounts · Step 2 → posts…
              </p>
            )}
          </div>
        </div>

        {/* ── Results panel ────────────────────────────────────── */}
        <div className="col-span-2 space-y-4">
          {!result && !running && (
            <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-10 flex items-center justify-center min-h-[300px]">
              <p className="text-sm text-gray-600">Run a search to see results by platform</p>
            </div>
          )}

          {running && (
            <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-10 flex items-center justify-center min-h-[300px]">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-500 animate-pulse">Searching all platforms in parallel…</p>
                <p className="text-[10px] text-gray-700">Step 1: finding competitor accounts · Step 2: finding their posts</p>
              </div>
            </div>
          )}

          {result && (
            <>
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] text-gray-500">
                  {location || 'any location'} · <span className="text-gray-400">"{problem}"</span>
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                  done
                </span>
              </div>
              {(result.results ?? []).map(entry => (
                <PlatformCard key={entry.platform} entry={entry} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
