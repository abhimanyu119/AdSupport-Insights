"use client";

import {
  getMetrics,
  getIssues,
  updateIssueStatus,
  getChartData,
} from "../actions";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [issues, setIssues] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loadingIssueId, setLoadingIssueId] = useState(null);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">
              {data.campaign}
            </span>
          </p>
          <p className="text-xs text-slate-300">
            Date: <span className="text-indigo-300">{data.date}</span>
          </p>
          <p className="text-xs text-slate-300">
            Impressions:{" "}
            <span className="text-indigo-300">
              {data.impressions?.toLocaleString()}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const m = await getMetrics();
        setMetrics(m);
        const i = await getIssues();
        setIssues(i);
        const c = await getChartData();
        setChartData(c);
      } catch (error) {
        console.error("Error loading data:", error);
        setMetrics({
          total: { impressions: 0, clicks: 0, spend: 0, conversions: 0 },
        });
        setIssues([]);
        setChartData([]);
      }
    };

    loadData();
  }, []);

  async function handleStatusChange(id, status) {
    setLoadingIssueId(id);
    try {
      await updateIssueStatus(id, status);
      // Only reload issues instead of all data
      const i = await getIssues();
      setIssues(i);
    } catch (error) {
      console.error("Error updating issue status:", error);
    } finally {
      setLoadingIssueId(null);
    }
  }

  if (!metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-indigo-900 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-indigo-400 mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 relative overflow-hidden animate-pulsating-gradient">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-white">Campaign Dashboard</h1>
          <Link
            href="/upload"
            className="px-4 py-2 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-sm font-semibold"
          >
            + Upload New Data
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {/* Metrics Cards */}
          <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-sm">
            <h3 className="text-slate-400 text-sm font-medium mb-2">
              Total Impressions
            </h3>
            <p className="text-3xl font-bold text-white">
              {metrics.total?.impressions?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-sm">
            <h3 className="text-slate-400 text-sm font-medium mb-2">
              Click-Through Rate
            </h3>
            <p className="text-3xl font-bold text-white">
              {metrics.total?.ctr ? (metrics.total.ctr * 100).toFixed(2) : 0}%
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-sm">
            <h3 className="text-slate-400 text-sm font-medium mb-2">
              Total Spend
            </h3>
            <p className="text-3xl font-bold text-white">
              ${metrics.total?.spend?.toFixed(2) || "0.00"}
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-sm">
            <h3 className="text-slate-400 text-sm font-medium mb-2">
              Total Conversions
            </h3>
            <p className="text-3xl font-bold text-white">
              {metrics.total?.conversions?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12h4l2-5 4 10 2-5h4"
                />
              </svg>
              Performance Trends
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12}>
                    <Label
                      value="Date"
                      position="insideBottomRight"
                      offset={-5}
                      fill="#94a3b8"
                      fontSize={12}
                    />
                  </XAxis>
                  <YAxis stroke="#94a3b8" fontSize={12}>
                    <Label
                      value="Impressions"
                      angle={-90}
                      position="insideLeft"
                      fill="#94a3b8"
                      fontSize={12}
                    />
                  </YAxis>
                  <Tooltip
                    content={<CustomTooltip />}
                    contentStyle={{
                      backgroundColor: "transparent",
                      border: "none",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={{ fill: "#818cf8", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Detected Issues
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {issues.length === 0 ? (
                <div className="text-sm text-slate-400">
                  No issues detected. Upload data to run diagnostics.
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 border border-slate-700/50 rounded-md bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-200">
                          {issue.type.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {issue.notes}
                        </div>
                      </div>
                      {loadingIssueId === issue.id ? (
                        <div className="flex items-center justify-center w-22.5">
                          <svg
                            className="w-5 h-5 text-indigo-400 animate-spin"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </div>
                      ) : (
                        <select
                          value={issue.status}
                          onChange={(e) =>
                            handleStatusChange(issue.id, e.target.value)
                          }
                          className="text-sm border border-slate-600 bg-slate-700 text-slate-200 rounded px-2 py-1 hover:border-slate-500 transition-colors"
                        >
                          <option value="OPEN" className="bg-slate-800">
                            Open
                          </option>
                          <option
                            value="INVESTIGATING"
                            className="bg-slate-800"
                          >
                            Investigating
                          </option>
                          <option value="RESOLVED" className="bg-slate-800">
                            Resolved
                          </option>
                        </select>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
