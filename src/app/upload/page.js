"use client";

import { uploadCampaignData } from "../actions";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setMessage("Please select a file first");
      return;
    }

    setIsProcessing(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("csvFile", selectedFile);

      await uploadCampaignData(formData);
      setMessage("Data uploaded successfully!");
      // Redirect to dashboard after successful upload
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      setMessage("Error: " + error.message);
      setIsProcessing(false);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files[0];
    setSelectedFile(file);
    setMessage("");
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-cyan-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-linear-to-r from-blue-600 to-purple-600 rounded-3xl mb-8 shadow-xl">
            <svg
              className="w-10 h-10 text-white"
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
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-linear-to-r from-slate-800 via-blue-800 to-slate-800 bg-clip-text text-transparent">
            Upload Campaign Data
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Import your campaign performance data and let AI-powered diagnostics
            identify issues automatically
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors group"
          >
            <svg
              className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200"
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

        {/* Upload Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 backdrop-blur-sm p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-linear-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Choose Your CSV File
              </h2>
              <p className="text-slate-600">
                Select a CSV file containing your campaign performance data
              </p>
            </div>

            <div className="flex justify-center">
              <label className="group cursor-pointer">
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 group-hover:scale-105 ${
                    selectedFile
                      ? "border-green-400 bg-green-50/50"
                      : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50"
                  }`}
                >
                  <svg
                    className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
                      selectedFile
                        ? "text-green-500"
                        : "text-slate-400 group-hover:text-blue-500"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  {selectedFile ? (
                    <div className="mb-4">
                      <p className="text-lg font-medium text-green-700 mb-1">
                        File Selected
                      </p>
                      <p className="text-sm text-green-600 font-mono bg-green-100 px-3 py-1 rounded-lg inline-block">
                        {selectedFile.name}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-slate-700 mb-2">
                        Drop your CSV file here
                      </p>
                      <p className="text-sm text-slate-500 mb-4">
                        or click to browse
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    name="csvFile"
                    accept=".csv"
                    required
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    className="px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    {selectedFile ? "Change File" : "Browse Files"}
                  </button>
                </div>
              </label>
            </div>

            <div className="text-center">
              <button
                type="submit"
                disabled={isProcessing || !selectedFile}
                className={`px-8 py-4 font-semibold rounded-xl transition-all duration-300 shadow-lg transform hover:-translate-y-0.5 ${
                  isProcessing || !selectedFile
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-linear-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-xl"
                }`}
              >
                {isProcessing ? (
                  <>
                    <svg
                      className="w-5 h-5 inline mr-2 animate-spin"
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
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 inline mr-2"
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
                    Upload & Analyze
                  </>
                )}
              </button>
            </div>

            {message && !isProcessing && (
              <div
                className={`text-center p-4 rounded-lg ${
                  message.includes("Error")
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : "bg-green-50 border border-green-200 text-green-700"
                }`}
              >
                <p className="font-medium">{message}</p>
                {message.includes("successfully") && (
                  <p className="text-sm mt-2 opacity-75">
                    Redirecting to dashboard...
                  </p>
                )}
              </div>
            )}
          </form>
        </div>

        {/* CSV Format Guide */}
        <div className="mt-12 bg-linear-to-r from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200/50">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-linear-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mr-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              CSV Format Guide
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-slate-700 mb-3">
                Required Columns
              </h4>
              <div className="bg-white rounded-lg border border-slate-200 p-4 font-mono text-sm text-slate-700 shadow-sm">
                date,campaign,spend,impressions,clicks,conversions
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-700 mb-3">
                Example Data
              </h4>
              <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm text-slate-600 shadow-sm">
                <div className="font-mono text-slate-700 mb-2">
                  2024-01-01,Brand Campaign,500.00,10000,200,15
                </div>
                <div className="font-mono text-slate-700">
                  2024-01-02,Generic Search,750.50,8500,170,12
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 mr-3 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">
                  Data Format Notes
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>
                    • <strong>Date:</strong> YYYY-MM-DD format (e.g.,
                    2024-01-15)
                  </li>
                  <li>
                    • <strong>Campaign:</strong> Campaign name or identifier
                  </li>
                  <li>
                    • <strong>Numbers:</strong> Can be integers or decimals
                  </li>
                  <li>
                    • <strong>Headers:</strong> First row must contain column
                    names
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}