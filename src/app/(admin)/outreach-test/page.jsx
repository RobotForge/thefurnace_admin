'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Play, StopCircle, Download, Rocket } from 'lucide-react';

const DEFAULT_ICP = {
  role: '',
  industry: '',
  location: '',
  companySize: '',
  hypothesis: '',
  platform: 'instagram',
};

function StatusBadge({ status }) {
  const cfg = status === 'running'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : status === 'completed'
    ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    : status === 'failed'
    ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${cfg}`}>
      {status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {status || 'idle'}
    </span>
  );
}

export default function OutreachTestPage() {
  const [icp, setIcp]       = useState(DEFAULT_ICP);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [toast, setToast]   = useState(null);
  const [error, setError]   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRun = async () => {
    if (!icp.hypothesis.trim()) {
      setError('Hypothesis is required');
      return;
    }
    setError(null);
    setRunning(true);
    setResult(null);
    try {
      const r = await httpsCallable(functions, 'adminRunOutreachTest', { timeout: 540000 })({ config: icp });
      setResult(r.data);
      showToast(`Test complete — ${r.data?.profiles?.length || 0} profiles found`);
    } catch (e) {
      setError(e.message);
      showToast(e.message || 'Test failed', 'error');
    } finally {
      setRunning(false);
    }
  };

  const handleCancel = async () => {
    try {
      await httpsCallable(functions, 'adminCancelOutreachTest')({});
      setRunning(false);
      showToast('Test cancelled');
    } catch (e) { showToast(e.message || 'Cancel failed', 'error'); }
  };

  const handleExport = async () => {
    try {
      const r = await httpsCallable(functions, 'adminExportOutreachTestCSV')({});
      const blob = new Blob([r.data?.csv || ''], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'outreach_test.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { showToast(e.message || 'Export failed', 'error'); }
  };

  const handlePromote = async (experimentId) => {
    if (!result?.testId) return;
    setPromoting(true);
    try {
      await httpsCallable(functions, 'promoteOutreachTestToExperiment')({
        testId: result.testId,
        experimentId,
      });
      showToast('Promoted to experiment');
    } catch (e) { showToast(e.message || 'Promotion failed', 'error'); }
    finally { setPromoting(false); }
  };

  const field = (key, label, placeholder, type = 'text') => (
    <div key={key}>
      <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">{label}</label>
      {key === 'hypothesis' ? (
        <textarea
          rows={3}
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/50 resize-none"
          placeholder={placeholder}
          value={icp[key]}
          onChange={e => setIcp(v => ({ ...v, [key]: e.target.value }))}
        />
      ) : key === 'platform' ? (
        <select
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#3B82F6]/50"
          value={icp[key]}
          onChange={e => setIcp(v => ({ ...v, [key]: e.target.value }))}
        >
          {['instagram', 'linkedin', 'tiktok', 'facebook'].map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#3B82F6]/50"
          placeholder={placeholder}
          value={icp[key]}
          onChange={e => setIcp(v => ({ ...v, [key]: e.target.value }))}
        />
      )}
    </div>
  );

  return (
    <div className="p-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
          toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Outreach Test</h1>
          <p className="text-xs text-gray-500 mt-1">Run ICP scrape + enrichment without publishing outreach</p>
        </div>
        <div className="flex items-center gap-2">
          {result?.profiles?.length > 0 && (
            <>
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-400 hover:bg-gray-500/20 transition-colors">
                <Download size={13} /> Export CSV
              </button>
              <button onClick={() => handlePromote(prompt('Enter experiment ID to promote into:'))}
                disabled={promoting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-50">
                <Rocket size={13} /> {promoting ? 'Promoting…' : 'Promote to Experiment'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">ICP Configuration</p>
            {field('role',        'Target Role',      'e.g. Head of Marketing')}
            {field('industry',    'Industry',          'e.g. B2B SaaS')}
            {field('location',    'Location',          'e.g. United States')}
            {field('companySize', 'Company Size',      'e.g. 10-50')}
            {field('platform',    'Platform',          '')}
            {field('hypothesis',  'Hypothesis / Angle', 'Describe the pain point or growth trigger to target…')}

            {error && <p className="text-[10px] text-red-400">{error}</p>}

            <div className="flex gap-2 pt-2">
              {running ? (
                <button onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
                  <StopCircle size={13} /> Cancel
                </button>
              ) : (
                <button onClick={handleRun}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors">
                  <Play size={13} /> Run Test
                </button>
              )}
            </div>
            {running && (
              <p className="text-[10px] text-center text-amber-400 animate-pulse">Running… this may take up to 9 minutes</p>
            )}
          </div>
        </div>

        <div className="col-span-2">
          {!result ? (
            <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-10 flex items-center justify-center h-full">
              <p className="text-sm text-gray-600">{running ? 'Waiting for results…' : 'Configure and run a test to see results'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <StatusBadge status={result.status || 'completed'} />
                  <span className="text-xs text-gray-500">{result.profiles?.length || 0} profiles · {result.enriched || 0} enriched</span>
                </div>
                {result.icpExtracted && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mt-2 bg-[#0A0A0A] rounded-xl p-3 border border-[#1E1E1E]">
                    <div><span className="text-gray-600">Role:</span> {result.icpExtracted.role}</div>
                    <div><span className="text-gray-600">Industry:</span> {result.icpExtracted.industry}</div>
                    <div><span className="text-gray-600">Location:</span> {result.icpExtracted.location}</div>
                    <div><span className="text-gray-600">Angle:</span> {result.icpExtracted.messageAngle}</div>
                  </div>
                )}
              </div>

              <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1E1E1E]">
                      {['Name', 'Company', 'Email', 'ICP Score', 'Enriched', 'Source'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.profiles || []).map((p, i) => (
                      <tr key={i} className="border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{p.name || p.username || '—'}</td>
                        <td className="px-4 py-3 text-gray-400">{p.company || '—'}</td>
                        <td className="px-4 py-3 text-gray-400">{p.email || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${p.icpMatchScore >= 70 ? 'text-emerald-400' : p.icpMatchScore >= 40 ? 'text-amber-400' : 'text-gray-500'}`}>
                            {p.icpMatchScore ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            p.enrichmentStatus === 'enriched'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                          }`}>{p.enrichmentStatus || 'raw'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.sourceCompetitor || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
