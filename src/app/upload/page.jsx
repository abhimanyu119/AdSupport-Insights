"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Circle,
  Loader2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

/* ─── Step definitions ───────────────────────────────────────────── */

const STEPS = [
  { key: "parsing", label: "Parsing CSV" },
  { key: "normalizing", label: "Normalizing columns" },
  { key: "validating", label: "Validating rows" },
  { key: "saving", label: "Saving to database" },
  { key: "diagnostics", label: "Running anomaly detection" },
];

// Full ordered key list (done is not shown as a step row, just triggers redirect)
const STEP_KEYS = [...STEPS.map((s) => s.key), "done", "error"];

/* ─── Step icon ──────────────────────────────────────────────────── */

function StepIcon({ status }) {
  if (status === "done")
    return <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />;
  if (status === "active")
    return (
      <Loader2 className="h-5 w-5 text-indigo-400 animate-spin shrink-0" />
    );
  if (status === "error")
    return <XCircle className="h-5 w-5 text-red-400 shrink-0" />;
  return <Circle className="h-5 w-5 text-slate-600 shrink-0" />;
}

/**
 * Returns one of: "idle" | "active" | "done" | "error"
 *
 * Rules:
 *  - All steps before the current one → done
 *  - Current step → active (or "error" if processing errored on this step)
 *  - Steps after the current one → idle
 *  - If overall error: current step shows error, everything before is done,
 *    everything after is idle
 */
function resolveStatus(stepKey, currentStep, hasError) {
  const currentIdx = STEP_KEYS.indexOf(currentStep ?? "");
  const thisIdx = STEP_KEYS.indexOf(stepKey);

  if (currentStep === "done") return "done"; // all complete

  if (hasError) {
    if (thisIdx < currentIdx) return "done";
    if (thisIdx === currentIdx) return "error";
    return "idle";
  }

  if (thisIdx < currentIdx) return "done";
  if (thisIdx === currentIdx) return "active";
  return "idle";
}

/* ─── Page ───────────────────────────────────────────────────────── */

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Processing state
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(null); // null = not started
  const [stepMessages, setStepMessages] = useState({}); // stepKey → latest message string
  const [errorMessage, setErrorMessage] = useState(null);

  const inputRef = useRef(null);
  const router = useRouter();

  /* ── File selection ── */

  function handleFile(file) {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      alert("Only .csv files are supported.");
      return;
    }
    setSelectedFile(file);
    // Clear any previous run state when a new file is picked
    setCurrentStep(null);
    setStepMessages({});
    setErrorMessage(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  /* ── Submit ── */

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedFile || loading) return;

    setLoading(true);
    setCurrentStep(null);
    setStepMessages({});
    setErrorMessage(null);

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

      // Non-2xx before the stream even starts (e.g. 400 bad body)
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      /* ── Read SSE stream ── */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by "\n\n"
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? ""; // keep any incomplete trailing frame

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;

          let event;
          try {
            event = JSON.parse(line.slice("data:".length).trim());
          } catch {
            continue; // malformed frame, skip
          }

          if (event.step === "error") {
            setCurrentStep("error");
            setErrorMessage(event.message);
            setLoading(false);
            return;
          }

          // Update which step is active and store its message
          setCurrentStep(event.step);
          if (event.message) {
            setStepMessages((prev) => ({
              ...prev,
              [event.step]: event.message,
            }));
          }

          if (event.done && event.runId) {
            // Small pause so the user sees the green "complete" state
            await new Promise((r) => setTimeout(r, 800));
            router.push(`/dashboard?run=${event.runId}`);
            return;
          }
        }
      }
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong. Please try again.");
      setCurrentStep("error");
    } finally {
      setLoading(false);
    }
  }

  /* ── Derived booleans ── */

  const hasError = currentStep === "error";
  const isComplete = currentStep === "done";
  const showProgress = loading || currentStep !== null;

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Home
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Dashboard →
          </Link>
        </div>

        {/* HEADING */}
        <h1 className="text-2xl font-semibold">Upload Campaign Data</h1>

        {/* UPLOAD CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            required
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => !loading && inputRef.current.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
              loading
                ? "border-slate-700 opacity-50 cursor-not-allowed"
                : dragActive
                  ? "border-indigo-500 bg-indigo-500/10 cursor-pointer"
                  : "border-slate-700 hover:border-slate-500 cursor-pointer"
            }`}
          >
            {selectedFile ? (
              <>
                <div className="font-medium">{selectedFile.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {loading ? "Processing…" : "Click to replace file"}
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

          {/* Submit button */}
          <button
            type="submit"
            disabled={!selectedFile || loading}
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              "Upload & Analyze"
            )}
          </button>
        </div>

        {/* LIVE PROGRESS CARD */}
        {showProgress && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-1">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">
              Processing Status
            </h2>

            {/* Step rows */}
            <div className="space-y-4">
              {STEPS.map((step) => {
                const status = resolveStatus(step.key, currentStep, hasError);
                const message = stepMessages[step.key];

                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <StepIcon status={status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          status === "active"
                            ? "text-slate-100"
                            : status === "done"
                              ? "text-slate-300"
                              : status === "error"
                                ? "text-red-400"
                                : "text-slate-500"
                        }`}
                      >
                        {step.label}
                      </p>
                      {message && (
                        <p
                          className={`text-xs mt-0.5 ${
                            status === "error"
                              ? "text-red-400"
                              : "text-slate-400"
                          }`}
                        >
                          {message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error banner */}
            {hasError && errorMessage && (
              <div className="mt-5 bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300">
                    Upload failed
                  </p>
                  <p className="text-xs text-red-400 mt-1">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Success banner */}
            {isComplete && (
              <div className="mt-5 bg-emerald-900/30 border border-emerald-700 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-300">
                  {stepMessages.done || "All done! Redirecting to dashboard…"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* CSV FORMAT EXAMPLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-3">Example CSV format</h2>
          <pre className="bg-slate-950 border border-slate-800 rounded-md p-4 text-xs overflow-x-auto text-slate-300 leading-relaxed">
            {`date,campaign_name,impressions,clicks,spend,conversions
2025-02-01,Brand_Search,13200,710,5100,96
2025-02-02,Brand_Search,12950,695,5050,93
2025-02-01,Generic_Search,120,4,650,0
2025-02-01,Display_Remarketing,28000,210,4200,3
2025-02-01,Performance_Max,22000,1100,8200,92`}
          </pre>
          <p className="text-xs text-slate-400 mt-3">
            • Columns can be in any order &nbsp;•&nbsp; Extra columns are
            ignored &nbsp;•&nbsp; Numeric fields are sanitized automatically
          </p>
        </div>
      </form>
    </div>
  );
}
