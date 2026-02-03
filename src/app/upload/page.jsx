"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  function handleFile(file) {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      alert("Only CSV files are supported");
      return;
    }
    setSelectedFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);

    try {
      const text = await selectedFile.text();
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText: text,
          source: "CSV",
          filename: `CSV Upload - ${selectedFile.name} - ${new Date().toDateString()}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { runId } = await res.json();
      router.push(`/dashboard?run=${runId}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            ← Home
          </Link>

          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            Dashboard →
          </Link>
        </div>

        {/* HEADING */}
        <h1 className="text-2xl font-semibold">Upload Campaign Data</h1>

        {/* UPLOAD SECTION */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            required
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
            className={`cursor-pointer border-2 border-dashed rounded-lg p-10 text-center transition ${
              dragActive
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-slate-700 hover:border-slate-500"
            }`}
          >
            {selectedFile ? (
              <>
                <div className="font-medium">{selectedFile.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  Click to replace file
                </div>
              </>
            ) : (
              <>
                <div className="font-medium">Drag & drop your CSV here</div>
                <div className="text-xs text-slate-400 mt-1">
                  or click to browse
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={!selectedFile || loading}
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md py-2 text-sm font-semibold cursor-pointer"
          >
            {loading ? "Processing…" : "Upload & Analyze"}
          </button>
        </div>

        {/* CSV EXAMPLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-3">Example CSV format</h2>

          <pre className="bg-slate-950 border border-slate-800 rounded-md p-4 text-xs overflow-x-auto text-slate-300">
            {`date,campaign_name,impressions,clicks,spend,conversions
2025-02-01,Brand_Search,13200,710,5100,96
2025-02-02,Brand_Search,12950,695,5050,93
2025-02-01,Generic_Search,120,4,650,0
2025-02-01,Display_Remarketing,28000,210,4200,3
2025-02-01,Performance_Max,22000,1100,8200,92`}
          </pre>

          <p className="text-xs text-slate-400 mt-3">
            • Columns can be in any order • Extra columns are ignored • Numeric
            fields are sanitized automatically
          </p>
        </div>
      </form>
    </div>
  );
}
