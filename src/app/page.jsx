"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden animate-pulsating-gradient">
      <div className="relative z-10 w-full mx-auto px-8 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
          Boost your campaign insights
        </h1>

        <p className="text-lg text-slate-300 max-w-xl mx-auto mb-10 leading-relaxed">
          Upload your CSV campaign data and get instant AI-powered diagnostics.
          Uncover hidden issues and optimization opportunities in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/upload"
            className="px-8 py-4 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Get started
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-slate-700/50 text-slate-100 font-semibold rounded-lg border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300 backdrop-blur-sm flex items-center gap-2"
          >
            View dashboard
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        {/* <div className="mt-16 pt-12 border-t border-slate-700/50">
          <p className="text-sm text-slate-400 mb-4">
            Trusted by support teams
          </p>
          <div className="flex justify-center gap-8 text-slate-500 text-sm">
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              AI-Powered
            </span>
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Instant Results
            </span>
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Lightweight
            </span>
          </div>
        </div> */}
      </div>
    </div>
  );
}
