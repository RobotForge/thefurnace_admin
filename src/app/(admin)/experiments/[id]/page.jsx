'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import {
  ArrowLeft, ExternalLink, Mail, Users, Inbox, Send,
  ChevronDown, ChevronRight, Eye, MessageSquare, Search, Target, DollarSign,
  Pause, Play, RefreshCw,
} from 'lucide-react';

const STATUS_COLOR = {
  Active:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Completed: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
  Planning:  'text-amber-400  bg-amber-500/10  border-amber-500/20',
  Scaled:    'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

const SKIP_REASON_LABELS = {
  no_icp_role:                                'no ICP role is set on this experiment',
  no_message_angle_or_hypothesis:             'no message angle or hypothesis to search from',
  sprint_hypothesis_lookup_failed:            "the experiment's hypothesis lookup failed",
  no_message_angle_and_no_valid_sprint_id:    'no message angle and no valid experiment id to look up a hypothesis from',
};

function describeSkipReason(reason) {
  if (SKIP_REASON_LABELS[reason]) return SKIP_REASON_LABELS[reason];
  if (reason.startsWith('search_failed:')) return `the search itself failed (${reason.slice('search_failed:'.length).trim()})`;
  return reason;
}

function StatCard({ icon: Icon, label, value, color = '#3B82F6' }) {
  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} style={{ color }} />
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xs text-gray-300 leading-relaxed">{value}</p>
    </div>
  );
}

const APOLLO_PARAM_LABELS = {
  personTitles:   'Person titles',
  locations:      'Person locations',
  keywords:       'Keywords (q_keywords)',
  employeeRanges: 'Employee count range',
  limit:          'Page size (per_page)',
  page:           'Page',
};

function ParamValue({ value }) {
  if (value == null || value === '') return <span className="text-gray-700">—</span>;
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <span key={i} className="text-[10px] text-gray-300 bg-white/5 border border-[#2A2A2A] rounded-md px-1.5 py-0.5">{String(v)}</span>
        ))}
      </div>
    );
  }
  return <span className="text-[11px] text-gray-300">{String(value)}</span>;
}

// Unit costs range from ~$0.04 (image gen) down to ~$0.0000004 (a single chat
// token-ish classification call) — a flat 2-decimal format would show "$0.00"
// for most line items, so scale precision to the magnitude instead.
function formatCost(n) {
  const v = Number(n) || 0;
  if (v === 0) return '$0.00';
  if (v >= 0.01) return `$${v.toFixed(2)}`;
  if (v >= 0.0001) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(6)}`;
}

const CATEGORY_LABELS = {
  lead_enrichment:    'Lead enrichment',
  email_verification: 'Email verification',
  tavily_research:    'Tavily research',
  social_crawl:        'Social crawl',
  ai_generation:       'AI generation',
  mailgun_send:        'Mailgun send',
};

function CostBreakdown({ costs }) {
  const rows = costs?.byCategory || [];
  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <DollarSign size={13} className="text-emerald-400" />
          <p className="text-xs font-bold text-white">Cost Breakdown</p>
        </div>
        <p className="text-xs font-bold text-white">{formatCost(costs?.total)}</p>
      </div>
      <p className="text-[10px] text-gray-500 mb-3">API/AI spend recorded against this experiment</p>
      {rows.length === 0 ? (
        <p className="text-[10px] text-gray-600 mt-2">No costs recorded yet for this experiment.</p>
      ) : (
        <div className="space-y-1.5 mt-3">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-[11px] text-gray-200 truncate">
                  {CATEGORY_LABELS[r.category] || r.category}
                  {r.subcategory && <span className="text-gray-500"> · {r.subcategory}</span>}
                </p>
                <p className="text-[9px] text-gray-600">{r.count} call{r.count === 1 ? '' : 's'}</p>
              </div>
              <span className="text-[11px] font-semibold text-gray-300 flex-shrink-0">{formatCost(r.totalCost)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApiCallCard({ icon: Icon, title, subtitle, color, empty, children }) {
  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} style={{ color }} />
        <p className="text-xs font-bold text-white">{title}</p>
      </div>
      {subtitle && <p className="text-[10px] text-gray-500 mb-3">{subtitle}</p>}
      {empty ? <p className="text-[10px] text-gray-600 mt-2">{empty}</p> : <div className="mt-3 space-y-2.5">{children}</div>}
    </div>
  );
}

function SourceBadge({ isInbound }) {
  return isInbound ? (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <Inbox size={9} /> Inbound
    </span>
  ) : (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
      <Send size={9} /> Outbound
    </span>
  );
}

function LeadRow({ lead, expanded, onToggle }) {
  return (
    <div className="border-b border-[#1A1A1A] last:border-0">
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white">{lead.name || 'Unknown'}</span>
            <SourceBadge isInbound={lead.isInbound} />
            {lead.enrichmentStatus === 'enriched' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 uppercase tracking-wider">verified</span>
            )}
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {[lead.title, lead.company].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        {lead.email && <span className="text-[10px] text-gray-400 hidden sm:block">{lead.email}</span>}
        <div className="flex items-center gap-1 text-[10px] text-gray-500 flex-shrink-0">
          <Mail size={10} />
          {lead.emailsSentCount}
        </div>
        {expanded ? <ChevronDown size={12} className="text-gray-600 flex-shrink-0" /> : <ChevronRight size={12} className="text-gray-600 flex-shrink-0" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pl-8">
          {lead.status && (
            <p className="text-[10px] text-gray-500 mb-2">Status: <span className="text-gray-300">{lead.status}</span> · Source: <span className="text-gray-300">{lead.sourceType || lead.source || '—'}</span></p>
          )}
          {lead.notes && <p className="text-[10px] text-gray-500 mb-2 italic">&quot;{lead.notes}&quot;</p>}

          {lead.emailsSent.length === 0 ? (
            <p className="text-[10px] text-gray-600">No emails sent to this lead yet.</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">Email history ({lead.emailsSent.length})</p>
              {lead.emailsSent.map((e, i) => (
                <div key={i} className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 flex items-center gap-3">
                  <Mail size={11} className="text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-200 truncate">{e.subject || '(no subject)'}</p>
                    <p className="text-[9px] text-gray-600">{e.sentAt ? new Date(e.sentAt).toLocaleString() : 'unknown time'}</p>
                  </div>
                  {e.opens > 0 && (
                    <span className="flex items-center gap-1 text-[9px] text-amber-400 flex-shrink-0"><Eye size={9} /> {e.opens}</span>
                  )}
                  {e.replies > 0 && (
                    <span className="flex items-center gap-1 text-[9px] text-emerald-400 flex-shrink-0"><MessageSquare size={9} /> {e.replies}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExperimentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [expandedLead, setExpandedLead] = useState(null);
  const [filter, setFilter]   = useState('all'); // all | inbound | outbound
  const [pausing, setPausing]     = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = () => {
    httpsCallable(functions, 'adminGetExperimentDetail')({ experimentId: id })
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleTogglePause = async () => {
    const isPaused = data?.agentSession?.status === 'admin_paused';
    const uid = data?.experiment?.user?.uid;
    if (!uid) { showToast('No agent session owner found for this experiment', 'error'); return; }

    const confirmed = window.confirm(
      isPaused
        ? 'Resume this experiment? Sourcing, enrichment, and outreach will pick back up on the next cycle.'
        : 'Pause this experiment? This stops new lead sourcing/enrollment AND any already-queued outreach sends for this experiment only.'
    );
    if (!confirmed) return;

    setPausing(true);
    try {
      await httpsCallable(functions, isPaused ? 'adminResumeExperiment' : 'adminPauseExperiment')({
        uid, experimentId: String(id),
      });
      load();
      showToast(isPaused ? 'Experiment resumed' : 'Experiment paused');
    } catch (e) {
      showToast(e.message || 'Failed', 'error');
    } finally {
      setPausing(false);
    }
  };

  const handleRerun = async () => {
    const uid = data?.experiment?.user?.uid;
    if (!uid) { showToast('No agent session owner found for this experiment', 'error'); return; }

    const confirmed = window.confirm(
      'Restart this experiment now? This immediately re-runs lead sourcing/enrichment/enrollment against its existing config, without waiting for the next scheduled cycle.'
    );
    if (!confirmed) return;

    setRerunning(true);
    try {
      const res = await httpsCallable(functions, 'adminRerunExperiment')({ uid, experimentId: String(id) });
      const result = res.data || {};
      if (result.blocked) {
        // ICP reframe needed or reachability dropped below the floor since launch —
        // the backend refused the restart on purpose, not a call failure.
        showToast(result.message || 'Restart refused — ICP needs attention before sourcing can resume', 'error');
      } else if (result.problemSearchBackfilled) {
        showToast('Restart triggered — backfilled a Problem Search report and running in the background');
        load();
      } else if (result.problemSearchSkipReason) {
        // Sourcing did restart — only the accessory Problem Search backfill
        // was skipped/failed. Surface why rather than showing a plain
        // success toast, since a silent skip here is exactly what's hard to
        // diagnose from logs alone.
        showToast(`Restart triggered, but couldn't backfill a Problem Search report — ${describeSkipReason(result.problemSearchSkipReason)}`, 'error');
      } else {
        showToast('Restart triggered — running in the background');
      }
    } catch (e) {
      showToast(e.message || 'Failed', 'error');
    } finally {
      setRerunning(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-gray-500">Loading experiment…</div>;
  if (error)   return (
    <div className="p-8">
      <button onClick={() => router.push('/experiments')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white mb-4"><ArrowLeft size={13} /> Back to Experiments</button>
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400">{error}</div>
    </div>
  );

  const { experiment: e, leads, stats, costs, agentSession, apolloConfig, apolloParams, socialCrawlQueries } = data;
  const visibleLeads = leads.filter(l => filter === 'all' ? true : filter === 'inbound' ? l.isInbound : !l.isInbound);
  const isPaused = agentSession?.status === 'admin_paused';

  return (
    <div className="p-8 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
          toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>{toast.msg}</div>
      )}

      <button onClick={() => router.push('/experiments')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
        <ArrowLeft size={13} /> Back to Experiments
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-lg font-bold text-white">{e.name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLOR[e.status] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>
              {e.status}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            #{e.number} · {e.user?.displayName || e.user?.email || 'Unknown founder'} · {e.channel || e.sprintType || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {agentSession && (
            <>
              <button onClick={handleRerun} disabled={rerunning}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 rounded-xl text-xs font-bold text-blue-400 transition-colors disabled:opacity-50">
                <RefreshCw size={12} className={rerunning ? 'animate-spin' : ''} /> {rerunning ? 'Checking ICP & reachability…' : 'Restart Now'}
              </button>
              <button onClick={handleTogglePause} disabled={pausing}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${
                  isPaused
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                }`}>
                {isPaused ? <Play size={12} /> : <Pause size={12} />}
                {pausing ? '…' : isPaused ? 'Resume' : 'Pause'}
              </button>
            </>
          )}
          {e.landingPageUrl && (
            <a href={e.landingPageUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#111] border border-[#1E1E1E] hover:border-blue-500/30 rounded-xl text-xs text-blue-400 transition-colors">
              <ExternalLink size={12} /> View landing page
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Total Leads" value={stats.totalLeads} color="#3B82F6" />
        <StatCard icon={Inbox} label="Inbound (Form)" value={stats.inboundCount} color="#10B981" />
        <StatCard icon={Send} label="Outbound (Apollo)" value={stats.outboundCount} color="#8B5CF6" />
        <StatCard icon={Mail} label="Emails Sent" value={stats.totalEmailsSent} color="#F59E0B" />
        <StatCard icon={Eye} label="Page Visits" value={e.visitCount ?? '—'} color="#EC4899" />
        <StatCard icon={DollarSign} label="Total Cost" value={formatCost(costs?.total)} color="#10B981" />
      </div>

      {/* Experiment details */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5">
        <p className="text-xs font-bold text-white mb-4">Experiment Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailField label="Hypothesis" value={e.hypothesis} />
          <DetailField label="Success Criteria" value={e.successCriteria} />
          <DetailField label="ICP" value={[e.icpRole, e.icpCompany, e.icpSize].filter(Boolean).join(' · ')} />
          <DetailField label="ICP Attributes" value={e.icpAttributes} />
          <DetailField label="Message Angle" value={e.messageAngle} />
          <DetailField label="Channel" value={e.channel} />
        </div>
        {(e.hypothesisVerdict || e.qualitativeLearning) && (
          <div className="mt-4 pt-4 border-t border-[#1E1E1E] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailField label="Verdict" value={e.hypothesisVerdict} />
            <DetailField label="Qualitative Learning" value={e.qualitativeLearning} />
          </div>
        )}
      </div>

      {/* Cost breakdown */}
      <CostBreakdown costs={costs} />

      {/* API calls — exact values/filters sent to Apollo and SocialCrawl */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ApiCallCard
          icon={Target} color="#8B5CF6" title="Apollo API"
          subtitle="Params sent to POST /mixed_people/api_search for outbound sourcing"
          empty={!apolloParams ? 'No agent session found for this experiment (Apollo sourcing hasn’t run yet).' : null}
        >
          {apolloParams && Object.entries(APOLLO_PARAM_LABELS).map(([key, label]) => (
            <div key={key}>
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">{label}</p>
              <ParamValue value={apolloParams[key]} />
            </div>
          ))}
          {apolloConfig?.industry && !apolloParams?.keywords && (
            <p className="text-[9px] text-amber-500/80 mt-1">Industry &quot;{apolloConfig.industry}&quot; set but not applied (no keywords resolved).</p>
          )}
        </ApiCallCard>

        <ApiCallCard
          icon={Search} color="#10B981" title="SocialCrawl API"
          subtitle="Query variants sent to GET /search/everywhere during Problem Search"
          empty={!socialCrawlQueries ? 'No Problem Search report found for this experiment.' : null}
        >
          {socialCrawlQueries && (
            <>
              <div>
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Sources filter</p>
                <ParamValue value={socialCrawlQueries.platforms} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">
                  Query strings ({socialCrawlQueries.queries.length})
                </p>
                {socialCrawlQueries.queries.length === 0 ? (
                  <span className="text-gray-700 text-[10px]">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {socialCrawlQueries.queries.map((q, i) => (
                      <span key={i} className="text-[10px] text-gray-300 bg-white/5 border border-[#2A2A2A] rounded-md px-2 py-1">{q}</span>
                    ))}
                  </div>
                )}
              </div>
              {socialCrawlQueries.totalRawCount != null && (
                <p className="text-[10px] text-gray-500">{socialCrawlQueries.totalRawCount} raw mentions returned across all queries</p>
              )}
            </>
          )}
        </ApiCallCard>
      </div>

      {/* Leads */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-white">Leads Discovered</p>
          <div className="flex items-center gap-1">
            {[['all', 'All'], ['inbound', 'Inbound'], ['outbound', 'Outbound']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  filter === key ? 'bg-[#3B82F6]/15 text-blue-400 border border-blue-500/25' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
          {visibleLeads.length === 0 ? (
            <p className="px-5 py-8 text-xs text-gray-600 text-center">No leads in this category.</p>
          ) : (
            visibleLeads.map((lead, i) => (
              <LeadRow
                key={lead.firebaseId || i}
                lead={lead}
                expanded={expandedLead === (lead.firebaseId || i)}
                onToggle={() => setExpandedLead(expandedLead === (lead.firebaseId || i) ? null : (lead.firebaseId || i))}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
