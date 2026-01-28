"use client";

import { uploadCampaignData } from "../actions";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
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
        router.push("/dashboard");
      }, 1200);
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

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMessage("");
      // Mirror the dropped file to the hidden input so file pickers and form libraries see it
      try {
        if (inputRef?.current) {
          const dt = new DataTransfer();
          dt.items.add(file);
          inputRef.current.files = dt.files;
        }
      } catch (err) {
        // Some environments may not allow setting input.files; ignore silently
      }
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 relative overflow-hidden animate-pulsating-gradient">
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">
            Upload Campaign Data
          </h1>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 text-slate-300 hover:text-white transition-colors group"
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
            Back to Home
          </Link>
        </div>

        {/* Upload Form */}
        <div className="bg-slate-800/50 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-sm p-8 mb-12">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-linear-to-r from-indigo-500/30 to-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
                <svg
                  className="w-12 h-12 text-indigo-400"
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
              <h2 className="text-2xl font-bold text-white mb-2">
                Choose Your CSV File
              </h2>
              <p className="text-slate-400">
                Select a CSV file containing your campaign performance data
              </p>
            </div>

            <div className="flex justify-center">
              <label
                className="group cursor-pointer w-full"
                onDragEnter={handleDragEnter}
              >
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 mx-auto max-w-2xl ${
                    selectedFile
                      ? "border-green-400 bg-green-500/10 shadow-inner"
                      : dragActive
                        ? "border-indigo-400 bg-indigo-500/10 shadow-md"
                        : "border-slate-600 bg-slate-700/40"
                  }`}
                >
                  <svg
                    className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
                      selectedFile
                        ? "text-green-400"
                        : "text-slate-400 group-hover:text-indigo-400"
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
                      <p className="text-lg font-medium text-green-400 mb-1">
                        File Selected
                      </p>
                      <p className="text-sm text-green-400 font-mono bg-green-500/20 px-3 py-1 rounded-lg inline-block border border-green-500/50">
                        {selectedFile.name}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-slate-200 mb-2">
                        Drop your CSV file here
                      </p>
                      <p className="text-sm text-slate-400 mb-4">
                        or click to browse
                      </p>
                    </>
                  )}
                  <input
                    ref={inputRef}
                    type="file"
                    name="csvFile"
                    accept=".csv"
                    required
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {/* clicking the area will open file browser via label/input */}
                </div>
              </label>
            </div>

            <div className="text-center">
              <button
                type="submit"
                disabled={isProcessing || !selectedFile}
                className={`px-8 py-4 font-semibold rounded-xl transition-all duration-300 shadow-lg transform hover:-translate-y-0.5 ${
                  isProcessing || !selectedFile
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl cursor-pointer"
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
                    ? "bg-red-500/20 border border-red-500/50 text-red-400"
                    : "bg-green-500/20 border border-green-500/50 text-green-400"
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
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-linear-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
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
            <h3 className="text-xl font-bold text-white">CSV Format Guide</h3>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h4 className="font-semibold text-slate-200 mb-3">
                Required Columns
              </h4>
              <div className="bg-slate-700/50 rounded-lg border border-slate-600/50 p-4 font-mono text-sm text-slate-300 shadow-sm w-full wrap-break-words">
                <pre className="m-0">
                  date,campaign,spend,impressions,clicks,conversions
                </pre>
              </div>

              <h4 className="font-semibold text-slate-200 mt-6 mb-3">
                Example Rows
              </h4>
              <div className="bg-slate-700/50 rounded-lg border border-slate-600/50 p-4 text-sm text-slate-300 shadow-sm w-full wrap-break-words">
                <pre className="m-0 font-mono text-slate-300">
                  2024-01-01,Brand Campaign,500.00,10000,200,15
                </pre>
                <pre className="m-0 font-mono text-slate-300 mt-2">
                  2024-01-02,Generic Search,750.50,8500,170,12
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-indigo-500/20 rounded-lg border border-indigo-500/50">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-indigo-400 mt-0.5 mr-3 shrink-0"
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
                <h4 className="font-semibold text-indigo-300 mb-1">
                  Data Format Notes
                </h4>
                <ul className="text-sm text-indigo-200 space-y-1">
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