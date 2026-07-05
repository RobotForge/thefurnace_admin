'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const PLAN_COLOR = {
  growth:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  starter: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
  free:    'text-gray-400   bg-gray-500/10   border-gray-500/20',
};

export default function UsersPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    httpsCallable(functions, 'adminListUsers')()
      .then(r => setUsers(r.data?.users || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Users</h1>
          <p className="text-xs text-gray-500 mt-1">{users.length} total</p>
        </div>
        <input
          className="bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/50 w-56"
          placeholder="Search by email or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-4">{error}</div>}

      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading users…</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {['Email', 'Name', 'Company', 'Plan', 'Created'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.uid || i} className="border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-gray-300">{u.email}</td>
                  <td className="px-4 py-3 text-white font-medium">{u.displayName || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{u.companyName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_COLOR[u.plan] || PLAN_COLOR.free}`}>
                      {u.plan || 'free'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
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
