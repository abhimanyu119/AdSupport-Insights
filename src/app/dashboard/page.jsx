"use client";

import { useEffect, useState, Suspense } from "react";
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
import { AlertTriangle, BarChart3, Bug, Trash2, Activity } from "lucide-react";

import { fetchRuns, fetchRunDetails } from "./actions";
import { updateIssueStatus, deleteRun } from "../actions";

const EMPTY_METRICS = {
  impressions: 0,
  clicks: 0,
  spend: 0,
  conversions: 0,
  ctr: 0,
};

const SEVERITY_COLOR = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#facc15",
  LOW: "#94a3b8",
};

const WARNING_BG = {
  CRITICAL: "bg-red-900/40 border-red-700",
  HIGH: "bg-orange-900/40 border-orange-700",
  MEDIUM: "bg-yellow-900/30 border-yellow-700",
  LOW: "bg-slate-800 border-slate-700",
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const runFromUrl = searchParams.get("run");

  const [runs, setRuns] = useState([]);

  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [scatterData, setScatterData] = useState([]);
  const [issueStats, setIssueStats] = useState([]);
  const [issues, setIssues] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [updatingIssueId, setUpdatingIssueId] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRuns().then(setRuns);
  }, []);

  const activeRunId = runFromUrl ? Number(runFromUrl) : null;

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

      /* SCATTER */
      setScatterData(
        rows.map((r) => {
          const issue = r.issues?.[0];
          return {
            spend: Number(r.spend),
            outcome: r.conversions > 0 ? r.conversions : r.clicks,
            impressions: r.impressions,
            severity: issue?.severity || "LOW",
          };
        }),
      );

      /* ISSUES */
      const flatIssues = rows.flatMap((r) => r.issues || []);
      setIssues(flatIssues);

      const byType = {};
      flatIssues.forEach((i) => {
        byType[i.type] = (byType[i.type] || 0) + 1;
      });

      setIssueStats(
        Object.entries(byType).map(([type, count]) => ({ type, count })),
      );
    }

    load();
  }, [activeRunId]);

  async function changeIssueStatus(issueId, status) {
    setUpdatingIssueId(issueId);
    await updateIssueStatus(issueId, status);
    const refreshed = await fetchRunDetails(activeRunId);
    setIssues(refreshed.campaignData.flatMap((r) => r.issues || []));
    setUpdatingIssueId(null);
  }

  async function deleteRunConfirmed() {
    if (!activeRunId) return;

    setDeleting(true);
    await deleteRun(activeRunId);
    setDeleting(false);
    setConfirmingDelete(false);
    setMetrics(EMPTY_METRICS);
    setScatterData([]);
    setIssueStats([]);
    setIssues([]);
    setWarnings([]);
    router.push("/dashboard");
    fetchRuns().then(setRuns);
  }

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
          <div className="bg-slate-800 p-4 rounded border border-slate-700">
            <div className="text-xs text-slate-400">Impressions</div>
            <div className="text-lg font-semibold">
              {metrics.impressions.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded border border-slate-700">
            <div className="text-xs text-slate-400">Clicks</div>
            <div className="text-lg font-semibold">
              {metrics.clicks.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded border border-slate-700">
            <div className="text-xs text-slate-400">Spend</div>
            <div className="text-lg font-semibold">
              ${metrics.spend.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded border border-slate-700">
            <div className="text-xs text-slate-400">Conversions</div>
            <div className="text-lg font-semibold">
              {metrics.conversions.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded border border-slate-700">
            <div className="text-xs text-slate-400">CTR</div>
            <div className="text-lg font-semibold">
              {(metrics.ctr * 100).toFixed(2)}%
            </div>
          </div>
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
                tick={{ fontSize: 11 }}
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
                  background: "#020617",
                  border: "1px solid #334155",
                  fontSize: 12,
                }}
                itemStyle={{ color: "#e5e7eb" }}
              />
              {Object.keys(SEVERITY_COLOR).map((sev) => (
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

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={issueStats}>
              <XAxis dataKey="type" tick={{ fontSize: 11 }} interval={0} />
              <YAxis
                type="number"
                domain={["auto", "auto"]}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* ISSUES */}
        <section className="bg-slate-800 p-6 rounded">
          <h3 className="flex items-center gap-2 text-sm mb-4">
            <Bug size={16} /> Issues
          </h3>

          {issues.length === 0 ? (
            <div className="text-sm text-slate-400">No issues detected</div>
          ) : (
            <div className="space-y-3">
              {issues.map((i) => (
                <div
                  key={i.id}
                  className="bg-slate-900 p-3 rounded border border-slate-700 space-y-2"
                >
                  {/* HEADER */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          i.severity === "CRITICAL"
                            ? "bg-red-500/20 text-red-400"
                            : i.severity === "HIGH"
                              ? "bg-orange-500/20 text-orange-400"
                              : i.severity === "MEDIUM"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-slate-600/20 text-slate-300"
                        }`}
                      >
                        {i.severity}
                      </span>

                      <span className="text-sm font-medium">
                        {i.type.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {updatingIssueId === i.id && (
                        <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                      )}

                      <select
                        value={i.status}
                        onChange={(e) =>
                          changeIssueStatus(i.id, e.target.value)
                        }
                        className="bg-slate-800 border border-slate-600 text-xs rounded px-2 py-1"
                      >
                        <option value="OPEN">Open</option>
                        <option value="INVESTIGATING">Investigating</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {i.notes}
                  </div>

                  {/* META */}
                  <div className="text-[11px] text-slate-500">
                    {new Date(i.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
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
    <Suspense
      fallback={
        <div className="min-h-screen flex bg-slate-950 text-slate-200 items-center justify-center">
          Loading...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
