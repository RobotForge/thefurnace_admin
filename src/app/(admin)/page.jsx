'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Users, FlaskConical, Search, Zap } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color = 'text-[#3B82F6]' }) {
  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[#1A1A1A] ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-[11px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    httpsCallable(functions, 'adminGetPlatformStats')()
      .then(r => setStats(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-lg font-bold text-white">Overview</h1>
        <p className="text-xs text-gray-500 mt-1">Platform-wide stats</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-6">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users"       value={stats?.totalUsers}       icon={Users}       color="text-[#3B82F6]" />
          <StatCard label="Experiments"       value={stats?.totalExperiments} icon={FlaskConical} color="text-violet-400" />
          <StatCard label="Leads"             value={stats?.totalLeads}       icon={Search}      color="text-emerald-400" />
          <StatCard label="Active Sessions"   value={stats?.activeSessions}   icon={Zap}         color="text-amber-400" />
        </div>
      )}
    </div>
  );
}
