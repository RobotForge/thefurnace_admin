'use client';

import { Fragment, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { generateProblemReportPdf } from '@/lib/problemReportPdf';
import {
  Download, ChevronDown, ChevronRight, Mail, Phone,
  DollarSign, MessageSquare, Users2, Building2, FileDown,
} from 'lucide-react';

const SIGNAL_META = {
  STRONG:   { label: 'Strong',   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  MODERATE: { label: 'Moderate', color: 'text-blue-400    bg-blue-500/10    border-blue-500/20'    },
  WEAK:     { label: 'Weak',     color: 'text-amber-400   bg-amber-500/10   border-amber-500/20'   },
  SILENT:   { label: 'Silent',   color: 'text-red-400     bg-red-500/10     border-red-500/20'     },
  ERROR:    { label: 'Error',    color: 'text-gray-400    bg-gray-500/10    border-gray-500/20'     },
};

function SignalBadge({ signal }) {
  const meta = SIGNAL_META[signal] || SIGNAL_META.ERROR;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function formatCost(n) {
  const v = Number(n) || 0;
  return v === 0 ? '$0.00' : v >= 0.01 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`;
}

function ReportDetail({ report }) {
  if (!report) return <p className="px-4 py-4 text-[11px] text-gray-600">No report data.</p>;
  const evidenceWall = report.evidenceWall || [];
  const vocabulary   = report.vocabulary || [];
  const competitors  = report.competition?.named || [];

  return (
    <div className="px-4 pb-4 pl-8 space-y-4">
      {report.interpretation && (
        <p className="text-[11px] text-gray-300 leading-relaxed">{report.interpretation}</p>
      )}
      {report.facetInsight && (
        <p className="text-[11px] text-gray-500 leading-relaxed">{report.facetInsight}</p>
      )}

      {report.suggestedPrice && (
        <div className="flex items-start gap-2">
          <DollarSign size={11} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">Suggested price</p>
            <p className="text-[11px] text-gray-300">
              <span className="font-bold">{report.suggestedPrice.currency} {report.suggestedPrice.amount}</span>
              {report.suggestedPrice.rationale && <span className="text-gray-500"> — {report.suggestedPrice.rationale}</span>}
            </p>
          </div>
        </div>
      )}

      {competitors.length > 0 && (
        <div className="flex items-start gap-2">
          <Building2 size={11} className="text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Named competitors</p>
            <div className="flex flex-wrap gap-1.5">
              {competitors.map((c, i) => (
                <span key={i} className="text-[10px] text-gray-300 bg-white/5 border border-[#2A2A2A] rounded-md px-1.5 py-0.5">{c.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {vocabulary.length > 0 && (
        <div>
          <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1.5">Founder words vs. market words</p>
          <div className="space-y-1">
            {vocabulary.map((v, i) => (
              <p key={i} className="text-[10px]">
                <span className="text-gray-600 line-through">{v.founderTerm}</span>
                <span className="text-gray-700"> → </span>
                <span className="text-gray-200 font-medium">{v.marketTerm}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {evidenceWall.length > 0 && (
        <div>
          <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1.5">
            Evidence wall ({report.mentionCount ?? evidenceWall.length}{report.totalRawCount ? ` of ${report.totalRawCount}` : ''} mentions)
          </p>
          <div className="space-y-1.5">
            {evidenceWall.map((e, i) => (
              <div key={i} className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare size={9} className="text-gray-600" />
                  <span className="text-[9px] text-gray-600 uppercase tracking-wider">{e.platform} · intensity {e.intensity}/5</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">&quot;{e.quote}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProblemScansPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    httpsCallable(functions, 'adminListProblemScanRequests')({ limit: 500 })
      .then(r => setRequests(r.data?.requests || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase()) ||
    r.ideaText?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownloadPdf = (r) => {
    if (!r.report) return;
    generateProblemReportPdf(r.report, { title: r.name || r.email || 'Problem Scan' });
  };

  const handleExportCSV = () => {
    if (!requests.length) return;
    const headers = ['Name', 'Email', 'Phone', 'Idea', 'Problem', 'ICP', 'Location', 'Signal', 'Mentions', 'Cost', 'Requested'];
    const rows = requests.map(r => [
      r.name || '', r.email || '', r.phone || '', r.ideaText || '',
      r.problem || '', r.icp || '', r.location || '', r.signal || '',
      r.mentionCount ?? '', formatCost(r.cost), r.createdAt ? new Date(r.createdAt).toISOString() : '',
    ]);
    const csv  = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `problem_scans_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Problem Scans</h1>
          <p className="text-xs text-gray-500 mt-1">{requests.length} total · landing page &quot;get my free report&quot; submissions</p>
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
            disabled={!requests.length}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-400 hover:bg-gray-500/20 transition-colors disabled:opacity-40"
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-4">{error}</div>}

      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading problem scans…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No submissions found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {['', 'Name', 'Email', 'Idea', 'Signal', 'Mentions', 'Cost', 'Requested', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const key = r.id || i;
                const isExpanded = expanded === key;
                return (
                  <Fragment key={key}>
                    <tr
                      onClick={() => setExpanded(isExpanded ? null : key)}
                      className="border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-600">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{r.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <Mail size={10} className="text-gray-600 flex-shrink-0" />
                          {r.email}
                        </div>
                        {r.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-gray-500">
                            <Phone size={9} className="flex-shrink-0" />
                            <span className="text-[10px]">{r.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[280px]">
                        <p className="truncate">{r.ideaText || r.problem || '—'}</p>
                        {r.icp && (
                          <div className="flex items-center gap-1 mt-0.5 text-gray-600">
                            <Users2 size={9} className="flex-shrink-0" />
                            <span className="text-[10px] truncate">{r.icp}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3"><SignalBadge signal={r.signal} /></td>
                      <td className="px-4 py-3 font-bold text-violet-400">{r.mentionCount ?? 0}</td>
                      <td className="px-4 py-3 text-gray-400">{formatCost(r.cost)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleDownloadPdf(r)}
                          disabled={!r.report}
                          title={r.report ? 'Download report as PDF' : 'No report data to export'}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <FileDown size={11} /> PDF
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-0 bg-[#0D0D0D] border-b border-[#1A1A1A]">
                          <ReportDetail report={r.report} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
