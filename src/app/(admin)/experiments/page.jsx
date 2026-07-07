'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const STATUS_COLOR = {
  Active:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Completed: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
  Planning:  'text-amber-400  bg-amber-500/10  border-amber-500/20',
  Scaled:    'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

export default function ExperimentsPage() {
  const router = useRouter();
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    httpsCallable(functions, 'adminListExperiments')()
      .then(r => setExperiments(r.data?.experiments || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white">Experiments</h1>
        <p className="text-xs text-gray-500 mt-1">{experiments.length} total</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-4">{error}</div>}

      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading experiments…</div>
        ) : experiments.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No experiments found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {['Name', 'Founder', 'Status', 'Channel', 'Outreach Sent', 'Replies', 'Created'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {experiments.map((e, i) => (
                <tr
                  key={e.firebaseId || i}
                  onClick={() => router.push(`/experiments/${e.firebaseId}`)}
                  className="border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{e.name}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-[10px]">{e.userUid?.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLOR[e.status] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{e.channel || '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{e.outreachSent ?? 0}</td>
                  <td className="px-4 py-3 text-gray-300">{e.replies ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}
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
