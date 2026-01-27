"use client";

import {
  getMetrics,
  getIssues,
  updateIssueStatus,
  getChartData,
} from "./actions";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [issues, setIssues] = useState([]);
  const [chartData, setChartData] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const m = await getMetrics();
      setMetrics(m);
      const i = await getIssues();
      setIssues(i);
      const c = await getChartData();
      setChartData(c);
    } catch (error) {
      console.error("Error loading data:", error);
      // Set default empty state
      setMetrics({
        total: {
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          ctr: 0,
          conversionRate: 0,
          cpc: 0,
        },
        last7: null,
        prev7: null,
      });
      setIssues([]);
      setChartData([]);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const m = await getMetrics();
        if (isMounted) setMetrics(m);
        const i = await getIssues();
        if (isMounted) setIssues(i);
        const c = await getChartData();
        if (isMounted) setChartData(c);
      } catch (error) {
        console.error("Error loading data:", error);
        if (isMounted) {
          // Set default empty state
          setMetrics({
            total: {
              impressions: 0,
              clicks: 0,
              spend: 0,
              conversions: 0,
              ctr: 0,
              conversionRate: 0,
              cpc: 0,
            },
            last7: null,
            prev7: null,
          });
          setIssues([]);
          setChartData([]);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleStatusChange(id, status) {
    await updateIssueStatus(id, status);
    loadData();
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-slate-800">
          AdSupport Insights Dashboard
        </h1>
        <p className="text-slate-600 mb-8">
          Monitor campaign performance and detect issues automatically
        </p>

        <div className="mb-8">
          <Link
            href="/upload"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload Campaign Data
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Impressions
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {metrics.total.impressions.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Click-Through Rate
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {isNaN(metrics.total.ctr)
                    ? "0.00%"
                    : (metrics.total.ctr * 100).toFixed(2) + "%"}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Conversions
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {metrics.total.conversions}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">
              Performance Trends
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">
              Detected Issues
            </h2>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {issues.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p>No issues detected</p>
                  <p className="text-sm">
                    Upload campaign data to see diagnostics
                  </p>
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              issue.type === "ZERO_IMPRESSIONS"
                                ? "bg-red-100 text-red-800"
                                : issue.type === "HIGH_SPEND_NO_CONVERSIONS"
                                  ? "bg-orange-100 text-orange-800"
                                  : issue.type === "SUDDEN_DROP_IMPRESSIONS"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {issue.type.replace(/_/g, " ")}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              issue.status === "OPEN"
                                ? "bg-gray-100 text-gray-800"
                                : issue.status === "INVESTIGATING"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                            }`}
                          >
                            {issue.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mb-1">
                          {issue.notes}
                        </p>
                        <p className="text-xs text-slate-500">
                          Date:{" "}
                          {new Date(
                            issue.campaignData.date,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <select
                        value={issue.status}
                        onChange={(e) =>
                          handleStatusChange(issue.id, e.target.value)
                        }
                        className="ml-4 text-sm border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="OPEN">Open</option>
                        <option value="INVESTIGATING">Investigating</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
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
