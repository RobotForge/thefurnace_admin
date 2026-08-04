'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { ArrowLeft } from 'lucide-react';

const PLAN_COLOR = {
  growth:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  starter: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
  free:    'text-gray-400   bg-gray-500/10   border-gray-500/20',
};

const STATUS_COLOR = {
  Active:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Completed: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
  Planning:  'text-amber-400  bg-amber-500/10  border-amber-500/20',
  Scaled:    'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xs text-gray-300 leading-relaxed">{value}</p>
    </div>
  );
}

export default function UserDetailPage() {
  const { uid } = useParams();
  const router = useRouter();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState('ideas');

  useEffect(() => {
    httpsCallable(functions, 'adminGetUserDetail')({ uid })
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) return <div className="p-8 text-center text-sm text-gray-500">Loading user…</div>;
  if (error) return (
    <div className="p-8">
      <button onClick={() => router.push('/users')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white mb-4"><ArrowLeft size={13} /> Back to Users</button>
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400">{error}</div>
    </div>
  );

  const { user: u, sprints } = data;
  const sprintsWithIdea = sprints.filter(s => s.hypothesis?.trim());

  const tabs = [
    { id: 'ideas',   label: `Ideas (${sprintsWithIdea.length})` },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <div className="p-8 space-y-6">
      <button onClick={() => router.push('/users')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
        <ArrowLeft size={13} /> Back to Users
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-lg font-bold text-white">{u.displayName || u.email}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_COLOR[u.plan] || PLAN_COLOR.free}`}>
              {u.plan || 'free'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {u.email} · {sprints.length} experiment{sprints.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1E1E1E]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              tab === t.id ? 'text-white border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ideas' && (
        <div className="space-y-3">
          {sprintsWithIdea.length === 0 ? (
            <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-8 text-center text-sm text-gray-500">
              No experiment hypothesis on file for this user yet.
            </div>
          ) : (
            sprintsWithIdea.map(s => (
              <div key={s.firebaseId} className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-bold text-white">{s.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLOR[s.status] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{s.hypothesis}</p>
                {s.successCriteria && (
                  <p className="text-[11px] text-gray-500 mt-2">
                    <span className="text-gray-600 uppercase tracking-widest text-[9px] font-bold">Success criteria: </span>
                    {s.successCriteria}
                  </p>
                )}
                {s.messageAngle && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    <span className="text-gray-600 uppercase tracking-widest text-[9px] font-bold">Message angle: </span>
                    {s.messageAngle}
                  </p>
                )}
                <p className="text-[10px] text-gray-700 mt-2">
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailField label="Role" value={u.role} />
            <DetailField label="Location" value={u.location} />
            <DetailField label="Company" value={u.companyName} />
            <DetailField label="Company Stage" value={u.companyStage} />
            <DetailField label="Team Size" value={u.teamSize} />
            <DetailField label="Joined" value={u.createdAt ? new Date(u.createdAt).toLocaleDateString() : null} />
          </div>
          {u.bio && (
            <div className="mt-4 pt-4 border-t border-[#1E1E1E]">
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Bio</p>
              <p className="text-xs text-gray-300 leading-relaxed">{u.bio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
