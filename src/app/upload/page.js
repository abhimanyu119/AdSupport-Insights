"use client";

import { uploadCampaignData } from "../actions";
import { useState } from "react";
import Link from "next/link";

export default function UploadPage() {
  const [message, setMessage] = useState("");

  async function handleSubmit(formData) {
    try {
      await uploadCampaignData(formData);
      setMessage("Data uploaded successfully!");
    } catch (error) {
      setMessage("Error: " + error.message);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Upload Campaign Data
            </h1>
            <p className="text-slate-600">
              Import your campaign performance data to analyze and detect issues
            </p>
          </div>

          <form action={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                CSV File
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-slate-400 transition-colors">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-slate-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-slate-600">
                    <label
                      htmlFor="csvFile"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a CSV file</span>
                      <input
                        id="csvFile"
                        name="csvFile"
                        type="file"
                        accept=".csv"
                        required
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-slate-500">CSV up to 10MB</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
              Upload and Analyze
            </button>
          </form>

          {message && (
            <div
              className={`mt-6 p-4 rounded-lg ${message.includes("Error") ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}
            >
              <div className="flex">
                <div className="shrink-0">
                  {message.includes("Error") ? (
                    <svg
                      className="h-5 w-5 text-red-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-green-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium">{message}</p>
                  {!message.includes("Error") && (
                    <div className="mt-2">
                      <Link
                        href="/"
                        className="text-sm font-medium text-green-700 hover:text-green-600"
                      >
                        View dashboard →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 bg-slate-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-slate-800 mb-2">
              CSV Format Requirements
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Your CSV file must contain the following columns in order:
            </p>
            <div className="bg-white rounded border p-3 font-mono text-sm text-slate-700">
              date,impressions,clicks,spend,conversions
            </div>
            <p className="text-sm text-slate-600 mt-3">
              <strong>Example:</strong> 2023-01-01,1000,50,100.0,5
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Date format: YYYY-MM-DD | Numbers can be integers or decimals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
