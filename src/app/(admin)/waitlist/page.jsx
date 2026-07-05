'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Download } from 'lucide-react';

export default function WaitlistPage() {
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

  const filtered = waiters.filter(w =>
    w.email?.toLowerCase().includes(search.toLowerCase()) ||
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.company?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    if (!waiters.length) return;
    const headers = ['Name', 'Email', 'Company', 'Role', 'Source', 'Joined'];
    const rows    = waiters.map(w => [
      w.name || '', w.email || '', w.company || '', w.role || '',
      w.source || '', w.createdAt ? new Date(w.createdAt).toISOString() : '',
    ]);
    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `waitlist_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Waitlist</h1>
          <p className="text-xs text-gray-500 mt-1">{waiters.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/50 w-56"
            placeholder="Search name, email, company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            onClick={handleExportCSV}
            disabled={!waiters.length}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-400 hover:bg-gray-500/20 transition-colors disabled:opacity-40"
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-4">{error}</div>}

      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading waitlist…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No entries found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {['Name', 'Email', 'Company', 'Role', 'Source', 'Joined'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => (
                <tr key={w.id || i} className="border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{w.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{w.email}</td>
                  <td className="px-4 py-3 text-gray-400">{w.company || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{w.role || '—'}</td>
                  <td className="px-4 py-3">
                    {w.source && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border text-blue-400 bg-blue-500/10 border-blue-500/20">
                        {w.source}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
