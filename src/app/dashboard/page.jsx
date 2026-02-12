"use client";

import {
  useEffect,
  useMemo,
  useState,
  Suspense,
  useCallback,
  memo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Bug,
  Trash2,
  Activity,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
  Calendar,
  TrendingUp,
} from "lucide-react";

import { fetchRuns, fetchRunDetails } from "./actions";
import { deleteRun, updateIssueStatus } from "../actions";

/* ---------------- CONSTANTS ---------------- */

const EMPTY_METRICS = {
  impressions: 0,
  clicks: 0,
  spend: 0,
  conversions: 0,
  ctr: 0,
};

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const SEVERITY_COLOR = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#facc15",
  LOW: "#94a3b8",
};

const SEVERITY_BADGE = {
  CRITICAL: "bg-red-500/20 text-red-400",
  HIGH: "bg-orange-500/20 text-orange-400",
  MEDIUM: "bg-yellow-500/20 text-yellow-400",
  LOW: "bg-slate-600/20 text-slate-300",
};

const WARNING_BG = {
  CRITICAL: "bg-red-900/40 border-red-700",
  HIGH: "bg-orange-900/40 border-orange-700",
  MEDIUM: "bg-yellow-900/30 border-yellow-700",
  LOW: "bg-slate-800 border-slate-700",
};

/* ---------------- HELPERS ---------------- */

function severityRank(sev) {
  return SEVERITY_ORDER.indexOf(sev);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function groupOccurrencesByDate(occurrences) {
  const grouped = {};
  occurrences.forEach((occ) => {
    const dateKey = new Date(occ.date).toDateString();
    if (!grouped[dateKey]) {
      grouped[dateKey] = { date: occ.date, count: 0, notes: [] };
    }
    grouped[dateKey].count++;
    grouped[dateKey].notes.push(occ.notes);
  });
  return Object.values(grouped).sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
}

function getLast7DaysOccurrences(groupedOccurrences) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return groupedOccurrences.filter(
    (item) => new Date(item.date) >= sevenDaysAgo,
  );
}

function getDateRange(occurrences) {
  if (occurrences.length === 0) return "";
  const dates = occurrences.map((o) => new Date(o.date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  if (minDate.toDateString() === maxDate.toDateString())
    return formatDate(minDate);
  return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
}

/* ---------------- MEMOIZED COMPONENTS ---------------- */

const MetricsCard = memo(({ label, value, isCTR }) => (
  <div className="bg-slate-800 p-4 rounded border border-slate-700">
    <div className="text-xs text-slate-400">{label}</div>
    <div className="text-lg font-semibold">
      {isCTR ? `${(value * 100).toFixed(2)}%` : value.toLocaleString()}
    </div>
  </div>
));
MetricsCard.displayName = "MetricsCard";

const WarningAlert = memo(({ warning }) => (
  <div
    className={`border p-4 rounded text-sm flex gap-2 ${WARNING_BG[warning.level]}`}
  >
    <AlertTriangle size={16} />
    {warning.message}
  </div>
));
WarningAlert.displayName = "WarningAlert";

const OccurrenceDetailModal = memo(({ group, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOccurrences = useMemo(() => {
    if (!searchTerm) return group.occurrences;
    const searchLower = searchTerm.toLowerCase();
    return group.occurrences.filter((occ) => {
      const notesMatch = occ.notes.toLowerCase().includes(searchLower);
      const dateMatch = formatDate(occ.date)
        .toLowerCase()
        .includes(searchLower);
      const rawDateMatch = new Date(occ.date)
        .toISOString()
        .includes(searchLower);
      const typeMatch = group.type
        .toLowerCase()
        .replace(/_/g, " ")
        .includes(searchLower);
      const campaignMatch = group.campaign.toLowerCase().includes(searchLower);
      return (
        notesMatch || dateMatch || rawDateMatch || typeMatch || campaignMatch
      );
    });
  }, [group.occurrences, group.type, group.campaign, searchTerm]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {group.type.replace(/_/g, " ")} · {group.campaign}
              <span
                className={`text-xs px-2 py-0.5 rounded ${SEVERITY_BADGE[group.severity]}`}
              >
                {group.severity}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {group.occurrences.length} total occurrences
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <input
            type="text"
            placeholder="Search by date, notes, issue type, or campaign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Try: dates like &quot;Jan 15&quot; or &quot;2024-01&quot;, keywords
            from notes, issue type, or campaign name
          </p>
        </div>

        {/* Occurrences List */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {filteredOccurrences.length > 0 ? (
            <div className="space-y-2">
              {filteredOccurrences.map((occ) => (
                <div
                  key={occ.id}
                  className="bg-slate-900 border border-slate-700 rounded p-3 text-sm"
                >
                  <div className="text-slate-300 mb-1">{occ.notes}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(occ.date)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">
              No occurrences found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            Showing {filteredOccurrences.length} of {group.occurrences.length}{" "}
            occurrences
          </span>
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});
OccurrenceDetailModal.displayName = "OccurrenceDetailModal";

const IssueGroupItem = memo(
  ({ group, isExpanded, isUpdating, onToggle, onStatusChange, onViewAll }) => {
    const [showMoreCount, setShowMoreCount] = useState(3);

    const groupedOccurrences = useMemo(
      () => groupOccurrencesByDate(group.occurrences),
      [group.occurrences],
    );

    const last7Days = useMemo(
      () => getLast7DaysOccurrences(groupedOccurrences),
      [groupedOccurrences],
    );

    const dateRange = useMemo(
      () => getDateRange(group.occurrences),
      [group.occurrences],
    );

    const displayedOccurrences = useMemo(
      () => last7Days.slice(0, showMoreCount),
      [last7Days, showMoreCount],
    );

    const hasMore = showMoreCount < last7Days.length;
    const remainingCount = last7Days.length - showMoreCount;

    const handleShowMore = useCallback(() => {
      setShowMoreCount((prev) => Math.min(prev + 10, last7Days.length));
    }, [last7Days.length]);

    const handleCollapse = useCallback(() => {
      setShowMoreCount(3);
      onToggle();
    }, [onToggle]);

    return (
      <div className="bg-slate-900 p-4 rounded border border-slate-700 mb-3">
        <div className="flex items-center justify-between">
          <div
            onClick={isExpanded ? handleCollapse : onToggle}
            className="flex items-center gap-2 cursor-pointer flex-1"
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}

            <span
              className={`text-xs px-2 py-0.5 rounded ${SEVERITY_BADGE[group.severity]}`}
            >
              {group.severity}
            </span>

            <span className="text-sm font-medium">
              {group.type.replace(/_/g, " ")} · {group.campaign}
            </span>

            {!isExpanded && (
              <span className="text-xs text-slate-400">
                | {group.occurrences.length} occurrence
                {group.occurrences.length !== 1 ? "s" : ""} | {dateRange}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isUpdating && (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            )}
            <select
              value={group.status}
              onChange={(e) => onStatusChange(group.id, e.target.value)}
              className="bg-slate-800 border border-slate-600 text-xs rounded px-2 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3">
            {/* Summary Stats */}
            <div className="flex items-center gap-4 text-xs text-slate-400 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1">
                <TrendingUp size={12} />
                <span>{group.occurrences.length} total occurrences</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>{dateRange}</span>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-300">
              📊 Recent Activity (Last 7 days):
            </div>

            <div className="space-y-2">
              {displayedOccurrences.length > 0 ? (
                displayedOccurrences.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/50 border border-slate-700 rounded p-3 text-xs"
                  >
                    <div className="font-medium text-slate-200 mb-1">
                      {formatDate(item.date)}: {item.count} occurrence
                      {item.count !== 1 ? "s" : ""}
                    </div>
                    <div className="text-slate-400">
                      {item.notes[0]}
                      {item.count > 1 && (
                        <span className="ml-1 text-slate-500">
                          (and {item.count - 1} more)
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-center py-4">
                  No occurrences in the last 7 days
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              {hasMore && (
                <button
                  onClick={handleShowMore}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
                >
                  Show more ({remainingCount} remaining)
                </button>
              )}
              {group.occurrences.length > 3 && (
                <button
                  onClick={() => onViewAll(group)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors"
                >
                  View all {group.occurrences.length} in detail →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);
IssueGroupItem.displayName = "IssueGroupItem";

const RunListItem = memo(({ run, isActive, onClick }) => (
  <div
    onClick={onClick}
    className={`px-4 py-3 cursor-pointer border-b border-slate-800 ${
      isActive ? "bg-slate-800" : "hover:bg-slate-800"
    }`}
  >
    <div className="text-sm">{run.name}</div>
  </div>
));
RunListItem.displayName = "RunListItem";

/* ---------------- DASHBOARD ---------------- */

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeRunId = Number(searchParams.get("run")) || null;

  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [loadingRunDetails, setLoadingRunDetails] = useState(false);

  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [scatterData, setScatterData] = useState([]);
  const [issueStats, setIssueStats] = useState([]);
  const [issueGroups, setIssueGroups] = useState([]);
  const [warnings, setWarnings] = useState([]);

  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [updatingGroupId, setUpdatingGroupId] = useState(null);
  const [modalGroup, setModalGroup] = useState(null);

  const [sortDesc, setSortDesc] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ---------------- LOAD RUN LIST ---------------- */

  useEffect(() => {
    setRunsLoading(true);
    fetchRuns()
      .then(setRuns)
      .finally(() => setRunsLoading(false));
  }, []);

  /* ---------------- LOAD RUN DETAILS ---------------- */

  useEffect(() => {
    if (!activeRunId) {
      setMetrics(EMPTY_METRICS);
      setScatterData([]);
      setIssueGroups([]);
      setIssueStats([]);
      setWarnings([]);
      setExpandedGroups(new Set());
      return;
    }

    async function load() {
      setLoadingRunDetails(true);
      try {
        const data = await fetchRunDetails(activeRunId);
        const rows = data.campaignData ?? [];

        let impressions = 0,
          clicks = 0,
          spend = 0,
          conversions = 0;
        rows.forEach((r) => {
          impressions += r.impressions;
          clicks += r.clicks;
          spend += Number(r.spend);
          conversions += r.conversions;
        });

        setMetrics({
          impressions,
          clicks,
          spend,
          conversions,
          ctr: impressions ? clicks / impressions : 0,
        });
        setWarnings(Array.isArray(data.warnings) ? data.warnings : []);

        const severityByCampaignDataId = {};
        (data.issueGroups || []).forEach((group) => {
          group.occurrences.forEach((occ) => {
            const existing = severityByCampaignDataId[occ.campaignDataId];
            if (
              !existing ||
              severityRank(group.severity) < severityRank(existing)
            ) {
              severityByCampaignDataId[occ.campaignDataId] = group.severity;
            }
          });
        });

        setScatterData(
          rows.map((r) => ({
            spend: Number(r.spend),
            outcome: r.conversions > 0 ? r.conversions : r.clicks,
            impressions: r.impressions,
            severity: severityByCampaignDataId[r.id] || "LOW",
          })),
        );

        setIssueGroups(data.issueGroups || []);

        const byType = {};
        (data.issueGroups || []).forEach((g) => {
          byType[g.type] = (byType[g.type] || 0) + g.occurrences.length;
        });
        setIssueStats(
          Object.entries(byType).map(([type, count]) => ({ type, count })),
        );

        setExpandedGroups(new Set());
      } finally {
        setLoadingRunDetails(false);
      }
    }

    load();
  }, [activeRunId]);

  /* ---------------- SORT + FILTER ---------------- */

  const visibleIssueGroups = useMemo(() => {
    let list = [...issueGroups];
    if (severityFilter !== "ALL")
      list = list.filter((g) => g.severity === severityFilter);
    list.sort((a, b) => {
      const diff = severityRank(a.severity) - severityRank(b.severity);
      return sortDesc ? diff : -diff;
    });
    return list;
  }, [issueGroups, sortDesc, severityFilter]);

  /* ---------------- CALLBACKS ---------------- */

  const handleRunClick = useCallback(
    (runId) => {
      router.push(`/dashboard?run=${runId}`);
    },
    [router],
  );

  const deleteRunConfirmed = useCallback(async () => {
    setDeleting(true);
    await deleteRun(activeRunId);
    setDeleting(false);
    setConfirmingDelete(false);
    setMetrics(EMPTY_METRICS);
    setScatterData([]);
    setIssueGroups([]);
    setIssueStats([]);
    setWarnings([]);
    router.push("/dashboard");
    fetchRuns().then(setRuns);
  }, [activeRunId, router]);

  const changeGroupStatus = useCallback(
    async (groupId, status) => {
      setUpdatingGroupId(groupId);
      await updateIssueStatus(groupId, status);
      const refreshed = await fetchRunDetails(activeRunId);
      setIssueGroups(refreshed.issueGroups || []);
      setUpdatingGroupId(null);
    },
    [activeRunId],
  );

  const toggleGroup = useCallback((id) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSortToggle = useCallback(() => setSortDesc((prev) => !prev), []);
  const handleSeverityFilterChange = useCallback(
    (e) => setSeverityFilter(e.target.value),
    [],
  );
  const handleViewAllOccurrences = useCallback(
    (group) => setModalGroup(group),
    [],
  );
  const handleCloseModal = useCallback(() => setModalGroup(null), []);

  /* ---------------- RENDER ---------------- */

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200">
      {/* SIDEBAR */}
      <aside className="w-72 sticky top-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 font-semibold text-sm">Analytics Runs</div>

        <div className="flex-1 overflow-y-auto">
          {runsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : runs.length === 0 ? (
            <div className="p-4 text-sm text-slate-400 text-center">
              No runs yet. Upload data to get started.
            </div>
          ) : (
            runs.map((run) => (
              <RunListItem
                key={run.id}
                run={run}
                isActive={run.id === activeRunId}
                onClick={() => handleRunClick(run.id)}
              />
            ))
          )}
        </div>

        <Link
          href="/upload"
          className="m-4 text-center bg-indigo-600 hover:bg-indigo-700 rounded py-2 text-sm transition-colors"
        >
          + Upload Data
        </Link>
      </aside>

      {/* LOADING OVERLAY — fixed to viewport, always centered regardless of scroll */}
      {loadingRunDetails && (
        <div className="fixed top-0 bottom-0 left-72 right-0 bg-slate-950/60 backdrop-blur-m z-50 flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-6 py-5 flex items-center gap-3 shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            <span className="text-sm">Loading run details...</span>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 p-4 space-y-4">
        {/* METRICS */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricsCard label="IMPRESSIONS" value={metrics.impressions} />
          <MetricsCard label="CLICKS" value={metrics.clicks} />
          <MetricsCard label="SPEND" value={metrics.spend} />
          <MetricsCard label="CONVERSIONS" value={metrics.conversions} />
          <MetricsCard label="CTR" value={metrics.ctr} isCTR />
        </section>

        {/* WARNINGS */}
        {warnings.map((w, i) => (
          <WarningAlert key={i} warning={w} />
        ))}

        {/* SCATTER */}
        {scatterData.length > 0 && (
          <section className="bg-slate-800 p-6 rounded">
            <h3 className="flex items-center gap-2 text-sm mb-4">
              <Activity size={16} /> Spend vs Outcome
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart
                margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
              >
                <CartesianGrid stroke="#334155" />
                <XAxis
                  dataKey="spend"
                  type="number"
                  domain={["auto", "auto"]}
                  name="Spend"
                  tickCount={20}
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "Spend ($)",
                    position: "insideBottom",
                    offset: -15,
                  }}
                />
                <YAxis
                  dataKey="outcome"
                  type="number"
                  domain={["auto", "auto"]}
                  name="Outcome"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Outcome",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  contentStyle={{ background: "#334155", fontSize: 12 }}
                  itemStyle={{ color: "#e5e7eb" }}
                />
                {SEVERITY_ORDER.map((sev) => (
                  <Scatter
                    key={sev}
                    data={scatterData.filter((d) => d.severity === sev)}
                    fill={SEVERITY_COLOR[sev]}
                    isAnimationActive={false}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* ISSUE DISTRIBUTION */}
        {issueStats.length > 0 && (
          <section className="bg-slate-800 p-6 rounded">
            <h3 className="flex items-center gap-2 text-sm mb-4">
              <BarChart3 size={16} /> Issue Distribution
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={issueStats}>
                <XAxis dataKey="type" interval={0} tick={{ fontSize: 12 }} />
                <YAxis type="number" domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "#334155",
                    border: "1px solid #334155",
                    fontSize: 12,
                  }}
                  itemStyle={{ color: "#e5e7eb" }}
                />
                <Bar
                  dataKey="count"
                  fill="#818cf8"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* ISSUES */}
        {issueGroups.length > 0 && (
          <section className="bg-slate-800 p-6 rounded">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm">
                <Bug size={16} /> Issues
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSortToggle}
                  className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors"
                >
                  <ArrowUpDown size={12} /> Severity
                </button>
                <select
                  value={severityFilter}
                  onChange={handleSeverityFilterChange}
                  className="bg-slate-700 hover:bg-slate-600 text-xs px-2 py-1 rounded transition-colors"
                >
                  <option value="ALL">All</option>
                  {SEVERITY_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {visibleIssueGroups.map((g) => (
              <IssueGroupItem
                key={g.id}
                group={g}
                isExpanded={expandedGroups.has(g.id)}
                isUpdating={updatingGroupId === g.id}
                onToggle={() => toggleGroup(g.id)}
                onStatusChange={changeGroupStatus}
                onViewAll={handleViewAllOccurrences}
              />
            ))}
          </section>
        )}

        {/* DELETE */}
        {activeRunId && (
          <div className="mt-4">
            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded cursor-pointer transition-colors"
              >
                <Trash2 size={14} /> Delete Run
              </button>
            ) : (
              <div className="flex items-center gap-3 text-sm bg-red-950/40 border border-red-800 px-4 py-3 rounded">
                <span className="text-red-300">
                  This action cannot be reversed.
                </span>
                <button
                  disabled={deleting}
                  onClick={deleteRunConfirmed}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Deleting…
                    </span>
                  ) : (
                    "Confirm"
                  )}
                </button>
                <button
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                  className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL */}
      {modalGroup && (
        <OccurrenceDetailModal group={modalGroup} onClose={handleCloseModal} />
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
