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
      <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-linear-to-r from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
            <svg className="w-10 h-10 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Loading Dashboard</h2>
          <p className="text-slate-600">Analyzing your campaign data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-cyan-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-slate-800 via-blue-800 to-slate-800 bg-clip-text text-transparent">
            AdSupport Insights
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Monitor campaign performance and detect issues automatically with AI-powered diagnostics
          </p>
        </div>

        {/* Upload Button */}
        <div className="text-center mb-12">
          <Link
            href="/upload"
            className="inline-flex items-center px-8 py-4 bg-linear-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg
              className="w-6 h-6 mr-3"
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

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="group bg-linear-to-br from-blue-50 to-blue-100 p-8 rounded-2xl shadow-sm border border-blue-200/50 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                  Total Impressions
                </p>
                <p className="text-4xl font-bold text-slate-900 mb-1">
                  {metrics?.impressions.toLocaleString()}
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  Campaign visibility
                </p>
              </div>
              <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-8 h-8 text-white"
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

          <div className="group bg-linear-to-br from-emerald-50 to-emerald-100 p-8 rounded-2xl shadow-sm border border-emerald-200/50 hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700 mb-2 uppercase tracking-wide">
                  Click-Through Rate
                </p>
                <p className="text-4xl font-bold text-slate-900 mb-1">
                  {isNaN(metrics.ctr)
                    ? "0.00%"
                    : (metrics.ctr * 100).toFixed(2) + "%"}
                </p>
                <p className="text-sm text-emerald-600 font-medium">
                  User engagement
                </p>
              </div>
              <div className="w-16 h-16 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-8 h-8 text-white"
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

          <div className="group bg-linear-to-br from-purple-50 to-purple-100 p-8 rounded-2xl shadow-sm border border-purple-200/50 hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                  Total Conversions
                </p>
                <p className="text-4xl font-bold text-slate-900 mb-1">
                  {metrics.conversions}
                </p>
                <p className="text-sm text-purple-600 font-medium">
                  Business impact
                </p>
              </div>
              <div className="w-16 h-16 bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-8 h-8 text-white"
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

        {/* Charts and Issues */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200/50 backdrop-blur-sm">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-linear-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">
                Performance Trends
              </h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8, stroke: "#3b82f6", strokeWidth: 2, fill: "#ffffff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200/50 backdrop-blur-sm">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-linear-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">
                Detected Issues
              </h2>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {issues.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-linear-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-10 h-10 text-green-600"
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
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">All Clear!</h3>
                  <p className="text-slate-500">
                    No issues detected in your campaign data
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    Upload campaign data to see diagnostics
                  </p>
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="group border border-slate-200 rounded-xl p-5 hover:bg-linear-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-300 hover:shadow-md hover:border-slate-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              issue.severity === "CRITICAL"
                                ? "bg-linear-to-r from-red-100 to-red-200 text-red-800 border border-red-300"
                                : issue.severity === "HIGH"
                                  ? "bg-linear-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300"
                                  : issue.severity === "MEDIUM"
                                    ? "bg-linear-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300"
                                    : "bg-linear-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300"
                            }`}
                          >
                            {issue.severity}
                          </span>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              issue.status === "OPEN"
                                ? "bg-slate-100 text-slate-700 border border-slate-300"
                                : issue.status === "INVESTIGATING"
                                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                                  : "bg-green-100 text-green-700 border border-green-300"
                            }`}
                          >
                            {issue.status}
                          </span>
                          <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                            {issue.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed mb-2">
                          {issue.notes}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(
                            issue.campaignData.date,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <select
                          value={issue.status}
                          onChange={(e) =>
                            handleStatusChange(issue.id, e.target.value)
                          }
                          className="w-full sm:w-auto text-sm border border-slate-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-400 shadow-sm"
                        >
                          <option value="OPEN">Open</option>
                          <option value="INVESTIGATING">Investigating</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </div>
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
