'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Download, Mail } from 'lucide-react';

export default function WaitlistersPage() {
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    httpsCallable(functions, 'adminListWaiters')()
      .then(r => setWaiters(r.data?.waiters || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Same waitlistSignups data the Waitlist tab lists, but this view leads with
  // the idea text itself — Waitlist stays the name/email/company/role/source
  // CRM-style view, this one's for reading what people actually said they're building.
  const withIdea = waiters.filter(w => w.idea?.trim());
  const filtered = withIdea.filter(w =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.email?.toLowerCase().includes(search.toLowerCase()) ||
    w.idea?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    if (!withIdea.length) return;
    const headers = ['Name', 'Email', 'Idea', 'Role', 'Source', 'Joined'];
    const rows = withIdea.map(w => [
      w.name || '', w.email || '', w.idea || '', w.role || '',
      w.source || '', w.createdAt ? new Date(w.createdAt).toISOString() : '',
    ]);
    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `waitlisters_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Waitlisters</h1>
          <p className="text-xs text-gray-500 mt-1">{withIdea.length} with an idea · from the same waitlist signups as the Waitlist tab</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/50 w-56"
            placeholder="Search name, email, idea…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            onClick={handleExportCSV}
            disabled={!withIdea.length}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-400 hover:bg-gray-500/20 transition-colors disabled:opacity-40"
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-4">{error}</div>}

      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading waitlisters…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No waitlist signups with an idea found.</div>
        ) : (
          filtered.map((w, i) => (
            <div key={w.id || i} className="px-5 py-4 border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{w.name || 'Unknown'}</span>
                    {w.role && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border text-violet-400 bg-violet-500/10 border-violet-500/20">{w.role}</span>
                    )}
                    {w.source && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border text-blue-400 bg-blue-500/10 border-blue-500/20">{w.source}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-gray-500">
                    <Mail size={10} className="flex-shrink-0" />
                    <span className="text-[11px]">{w.email}</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-600 flex-shrink-0">
                  {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed mt-2.5">{w.idea}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
