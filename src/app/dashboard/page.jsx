"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
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
} from "lucide-react";

import { fetchRuns, fetchRunDetails } from "./actions";
import { deleteRun, updateIssueStatus } from "../actions";
import { set } from "date-fns";

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

/* ---------------- DASHBOARD ---------------- */

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeRunId = Number(searchParams.get("run")) || null;

  const [runs, setRuns] = useState([]);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [scatterData, setScatterData] = useState([]);
  const [issueStats, setIssueStats] = useState([]);
  const [issueGroups, setIssueGroups] = useState([]);
  const [warnings, setWarnings] = useState([]);

  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [updatingGroupId, setUpdatingGroupId] = useState(null);

  const [sortDesc, setSortDesc] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ---------------- LOAD RUN LIST ---------------- */

  useEffect(() => {
    fetchRuns().then(setRuns);
  }, []);

  /* ---------------- LOAD RUN DETAILS ---------------- */

  useEffect(() => {
    if (!activeRunId) return;

    async function load() {
      const data = await fetchRunDetails(activeRunId);
      const rows = data.campaignData ?? [];

      /* METRICS */
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

      /* WARNINGS */
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

      /* SCATTER */
      setScatterData(
        rows.map((r) => ({
          spend: Number(r.spend),
          outcome: r.conversions > 0 ? r.conversions : r.clicks,
          impressions: r.impressions,
          severity: severityByCampaignDataId[r.id] || "LOW",
        })),
      );

      /* ISSUE GROUPS */
      setIssueGroups(data.issueGroups || []);

      /* ISSUE DISTRIBUTION (by occurrences) */
      const byType = {};
      (data.issueGroups || []).forEach((g) => {
        byType[g.type] = (byType[g.type] || 0) + g.occurrences.length;
      });

      setIssueStats(
        Object.entries(byType).map(([type, count]) => ({
          type,
          count,
        })),
      );
    }

    load();
  }, [activeRunId]);

  /* ---------------- SORT + FILTER ---------------- */

  const visibleIssueGroups = useMemo(() => {
    let list = [...issueGroups];

    if (severityFilter !== "ALL") {
      list = list.filter((g) => g.severity === severityFilter);
    }

    list.sort((a, b) => {
      const diff = severityRank(a.severity) - severityRank(b.severity);
      return sortDesc ? diff : -diff;
    });

    return list;
  }, [issueGroups, sortDesc, severityFilter]);

  /* ---------------- ACTIONS ---------------- */

  async function deleteRunConfirmed() {
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
  }

  async function changeGroupStatus(groupId, status) {
    setUpdatingGroupId(groupId);
    await updateIssueStatus(groupId, status);
    const refreshed = await fetchRunDetails(activeRunId);
    setIssueGroups(refreshed.issueGroups || []);
    setUpdatingGroupId(null);
  }

  function toggleGroup(id) {
    const next = new Set(expandedGroups);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedGroups(next);
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200">
      {/* SIDEBAR */}
      <aside className="w-72 sticky top-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 font-semibold text-sm">Analytics Runs</div>

        <div className="flex-1 overflow-y-auto">
          {runs.map((run) => (
            <div
              key={run.id}
              onClick={() => router.push(`/dashboard?run=${run.id}`)}
              className={`px-4 py-3 cursor-pointer border-b border-slate-800 ${
                run.id === activeRunId ? "bg-slate-800" : "hover:bg-slate-800"
              }`}
            >
              <div className="text-sm">{run.name}</div>
            </div>
          ))}
        </div>

        <Link
          href="/upload"
          className="m-4 text-center bg-indigo-600 rounded py-2 text-sm"
        >
          + Upload Data
        </Link>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-4 space-y-4">
        {/* METRICS */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(metrics).map(([k, v]) => (
            <div
              key={k}
              className="bg-slate-800 p-4 rounded border border-slate-700"
            >
              <div className="text-xs text-slate-400">{k.toUpperCase()}</div>
              <div className="text-lg font-semibold">
                {k === "ctr" ? `${(v * 100).toFixed(2)}%` : v.toLocaleString()}
              </div>
            </div>
          ))}
        </section>

        {/* WARNINGS */}
        {warnings.map((w, i) => (
          <div
            key={i}
            className={`border p-4 rounded text-sm flex gap-2 ${WARNING_BG[w.level]}`}
          >
            <AlertTriangle size={16} />
            {w.message}
          </div>
        ))}

        {/* SCATTER */}
        <section className="bg-slate-800 p-6 rounded">
          <h3 className="flex items-center gap-2 text-sm mb-4">
            <Activity size={16} /> Spend vs Outcome
          </h3>

          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
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
                contentStyle={{
                  background: "#334155",
                  fontSize: 12,
                }}
                itemStyle={{ color: "#e5e7eb" }}
              />
              {SEVERITY_ORDER.map((sev) => (
                <Scatter
                  key={sev}
                  data={scatterData.filter((d) => d.severity === sev)}
                  fill={SEVERITY_COLOR[sev]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </section>

        {/* ISSUE DISTRIBUTION */}
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
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* ISSUES */}
        <section className="bg-slate-800 p-6 rounded">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-sm">
              <Bug size={16} /> Issues
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortDesc(!sortDesc)}
                className="flex items-center gap-1 text-xs bg-slate-700 px-2 py-1 rounded"
              >
                <ArrowUpDown size={12} />
                Severity
              </button>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-700 text-xs px-2 py-1 rounded"
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
            <div
              key={g.id}
              className="bg-slate-900 p-4 rounded border border-slate-700 mb-3"
            >
              <div className="flex items-center justify-between">
                <div
                  onClick={() => toggleGroup(g.id)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {expandedGroups.has(g.id) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}

                  <span
                    className={`text-xs px-2 py-0.5 rounded ${SEVERITY_BADGE[g.severity]}`}
                  >
                    {g.severity}
                  </span>

                  <span className="text-sm font-medium">
                    {g.type.replace(/_/g, " ")} · {g.campaign}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {updatingGroupId === g.id && (
                    <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                  )}

                  <select
                    value={g.status}
                    onChange={(e) => changeGroupStatus(g.id, e.target.value)}
                    className="bg-slate-800 border border-slate-600 text-xs rounded px-2 py-1"
                  >
                    <option value="OPEN">Open</option>
                    <option value="INVESTIGATING">Investigating</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
              </div>

              {expandedGroups.has(g.id) && (
                <div className="mt-3 space-y-2 text-xs text-slate-400">
                  {g.occurrences.map((o) => (
                    <div
                      key={o.id}
                      className="flex justify-between border-b border-slate-800 pb-1"
                    >
                      <span>{new Date(o.date).toDateString()}</span>
                      <span>{o.notes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* DELETE */}
        {activeRunId && (
          <div className="mt-4">
            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded cursor-pointer"
              >
                <Trash2 size={14} />
                Delete Run
              </button>
            ) : (
              <div className="flex items-center gap-3 text-sm bg-red-950/40 border border-red-800 px-4 py-3 rounded">
                <span className="text-red-300">
                  This action cannot be reversed.
                </span>

                <button
                  disabled={deleting}
                  onClick={deleteRunConfirmed}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded cursor-pointer"
                >
                  {deleting ? "Deleting…" : "Confirm"}
                </button>

                <button
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                  className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-10">Loading…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
