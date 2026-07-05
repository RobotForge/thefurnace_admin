'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { ExternalLink } from 'lucide-react';

export default function LandingPagesPage() {
  const [pages, setPages]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    httpsCallable(functions, 'adminGetPlatformStats')()
      .then(r => setPages(r.data?.landingPages || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white">Landing Pages</h1>
        <p className="text-xs text-gray-500 mt-1">{pages.length} total</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-4">{error}</div>}

      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading…</div>
        ) : pages.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No landing pages found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {['Name', 'Type', 'Sprint', 'Deployed URL', 'Created'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((p, i) => (
                <tr key={p.firebaseId || i} className="border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{p.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{p.pageType || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{p.sprintId || '—'}</td>
                  <td className="px-4 py-3">
                    {p.deployedUrl ? (
                      <a href={p.deployedUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#3B82F6] hover:underline">
                        {p.deployedUrl.replace(/^https?:\/\//, '').slice(0, 40)} <ExternalLink size={10} />
                      </a>
                    ) : <span className="text-gray-600">Not deployed</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
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
