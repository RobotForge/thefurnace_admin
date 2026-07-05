'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const ENRICH_COLOR = {
  enriched: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  pending:  'text-amber-400  bg-amber-500/10  border-amber-500/20',
  failed:   'text-red-400    bg-red-500/10    border-red-500/20',
};

export default function LeadsPage() {
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    httpsCallable(functions, 'adminListAllLeads')()
      .then(r => setLeads(r.data?.leads || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Leads</h1>
          <p className="text-xs text-gray-500 mt-1">{leads.length} total</p>
        </div>
        <input
          className="bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/50 w-56"
          placeholder="Search name, email, company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-4">{error}</div>}

      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading leads…</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {['Name', 'Company', 'Email', 'Source', 'Enrichment', 'ICP Score', 'Platform'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.firebaseId || i} className="border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{l.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{l.company || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{l.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{l.sourceCompetitor || l.source || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ENRICH_COLOR[l.enrichmentStatus] || ENRICH_COLOR.pending}`}>
                      {l.enrichmentStatus || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${l.icpMatchScore >= 70 ? 'text-emerald-400' : l.icpMatchScore >= 40 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {l.icpMatchScore ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{l.platform || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
