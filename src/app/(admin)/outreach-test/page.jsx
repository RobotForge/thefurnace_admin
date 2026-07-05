'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Play, ExternalLink, Users, Link2 } from 'lucide-react';

const PLATFORMS = ['Instagram', 'LinkedIn', 'TikTok', 'Facebook'];

const inputCls = 'w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/50';

function ResultSection({ icon: Icon, title, subtitle, items, renderItem, emptyMsg }) {
  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1E1E1E] flex items-center gap-2.5">
        <Icon size={12} className="text-gray-500" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-white">{title}</span>
          {subtitle && <span className="text-[10px] text-gray-500 ml-2">{subtitle}</span>}
        </div>
        <span className="text-[10px] font-bold text-gray-600">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-[11px] text-gray-600 text-center">{emptyMsg}</p>
      ) : (
        <div className="divide-y divide-[#1A1A1A]">
          {items.map((item, i) => renderItem(item, i))}
        </div>
      )}
    </div>
  );
}

export default function OutreachTestPage() {
  const [problem,  setProblem]  = useState('');
  const [platform, setPlatform] = useState('Instagram');
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
      const r = await httpsCallable(functions, 'adminRunOutreachTest', { timeout: 60000 })({
        problem, platform, location,
      });
      setResult(r.data);
      const cc = r.data?.competitors?.length ?? 0;
      const pc = r.data?.posts?.length ?? 0;
      showToast(`Found ${cc} competitor account${cc !== 1 ? 's' : ''} · ${pc} direct post${pc !== 1 ? 's' : ''}`);
    } catch (e) {
      setError(e.message);
      showToast(e.message || 'Search failed', 'error');
    } finally {
      setRunning(false);
    }
  };

  const competitors = result?.competitors ?? [];
  const posts       = result?.posts       ?? [];

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
        <h1 className="text-lg font-bold text-white">Competitor Search</h1>
        <p className="text-xs text-gray-500 mt-1">
          Dry-run — finds competitor accounts <span className="text-gray-600">+</span> direct posts in parallel via Tavily
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
              <p className="text-[10px] text-gray-600 mt-1">Sent directly to Tavily as the search query</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Platform</label>
              <select className={inputCls} value={platform} onChange={e => setPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
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

            {error && <p className="text-[10px] text-red-400">{error}</p>}

            <button
              onClick={handleRun}
              disabled={running}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50"
            >
              <Play size={13} />
              {running ? 'Searching…' : 'Run Search'}
            </button>

            {running && (
              <p className="text-[10px] text-center text-amber-400 animate-pulse">
                Running both searches in parallel…
              </p>
            )}
          </div>
        </div>

        {/* ── Results panel ────────────────────────────────────── */}
        <div className="col-span-2 space-y-4">
          {!result && !running && (
            <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-10 flex items-center justify-center min-h-[300px]">
              <p className="text-sm text-gray-600">Run a search to see results</p>
            </div>
          )}

          {running && (
            <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-10 flex items-center justify-center min-h-[300px]">
              <p className="text-sm text-gray-600 animate-pulse">Finding competitor accounts + direct posts…</p>
            </div>
          )}

          {result && (
            <>
              {/* Status bar */}
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] text-gray-500">
                  {platform} · {location || 'any location'} · <span className="text-gray-400">"{problem}"</span>
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                  done
                </span>
              </div>

              {/* Competitor accounts */}
              <ResultSection
                icon={Users}
                title="Competitor Accounts"
                subtitle="profile-based (existing flow)"
                items={competitors}
                emptyMsg="No competitor accounts found — try a different query or check TAVILY_API_KEY"
                renderItem={(c, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    <span className="text-[10px] font-bold text-gray-600 w-5 flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">@{c.handle || '—'}</p>
                      <p className="text-[10px] text-gray-500 truncate">{c.url}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">{c.platform || platform}</span>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer"
                        className="text-gray-600 hover:text-[#3B82F6] transition-colors flex-shrink-0">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}
              />

              {/* Direct posts */}
              <ResultSection
                icon={Link2}
                title="Direct Posts"
                subtitle="post URLs found via Tavily (new flow)"
                items={posts}
                emptyMsg={`No post URLs found — ${platform === 'Instagram' ? 'Instagram posts are sparsely indexed; try LinkedIn for better results' : 'try a more specific query'}`}
                renderItem={(p, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    <span className="text-[10px] font-bold text-gray-600 w-5 flex-shrink-0">{i + 1}</span>
                    <p className="flex-1 text-[10px] text-gray-400 truncate min-w-0">{p.url}</p>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">{p.platform || platform}</span>
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="text-gray-600 hover:text-[#3B82F6] transition-colors flex-shrink-0">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
