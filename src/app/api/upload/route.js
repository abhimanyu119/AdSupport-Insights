import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  normalizeCsvRows,
  runAnomalyDiagnosticsForRun,
  buildDiscardWarnings,
} from "@/lib/normalize";
import { detectPlatform } from "@/lib/platformAdapters";

/* ─── SSE helper ─────────────────────────────────────────────────── */

/**
 * Serialises one SSE event frame.
 * The client splits on "\n\n" and JSON-parses the "data:" line.
 */
function frame(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/* ─── Route ──────────────────────────────────────────────────────── */

/**
 * POST /api/upload
 *
 * Accepts { csvText, filename } as JSON.
 *
 * Returns a text/event-stream response. Each processing step emits an
 * event so the upload page can show live status. The very last event
 * carries { done: true, runId } — the client uses this to redirect.
 *
 * Everything is synchronous: diagnostics run before the stream closes.
 * The client stays on the upload page for the full duration.
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { csvText, filename } = body;

  if (!csvText || typeof csvText !== "string") {
    return NextResponse.json(
      { error: "Expected { csvText: string }" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      /** Emit one SSE event to the client. */
      function send(data) {
        controller.enqueue(encoder.encode(frame(data)));
      }

      try {
        /* ── 1. PARSE ─────────────────────────────────────────── */
        send({ step: "parsing", message: "Reading CSV…" });

        const lines = csvText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          send({
            step: "error",
            message: "CSV must contain a header row and at least one data row.",
          });
          return;
        }

        const detectedPlatform = detectPlatform(lines);
        const headers = lines[0].split(",").map((h) => h.trim());
        const dataLines = lines.slice(1);

        send({
          step: "parsing",
          message: `Detected ${detectedPlatform || "generic"} format — ${dataLines.length} rows found.`,
        });

        /* ── 2. NORMALIZE ─────────────────────────────────────── */
        send({
          step: "normalizing",
          message: "Mapping columns to standard schema…",
        });

        const normalized = normalizeCsvRows(
          dataLines,
          detectedPlatform,
          headers,
        );

        send({
          step: "normalizing",
          message: `${normalized.length} rows normalized.`,
        });

        /* ── 3. VALIDATE ──────────────────────────────────────── */
        send({
          step: "validating",
          message: "Checking rows for invalid data…",
        });

        const { validRows, warnings, discardedPct } =
          buildDiscardWarnings(normalized);

        if (validRows.length === 0) {
          send({
            step: "error",
            message: "No valid rows remain after validation.",
            warnings,
          });
          return;
        }

        if (discardedPct > 50) {
          send({
            step: "error",
            message: `Upload rejected: ${discardedPct}% of rows are invalid (limit is 50%). Fix the data and try again.`,
            warnings,
          });
          return;
        }

        const discardNote =
          discardedPct > 0
            ? ` (${discardedPct}% discarded)`
            : " — all rows valid";
        send({
          step: "validating",
          message: `${validRows.length} valid rows${discardNote}.`,
          warnings,
        });

        /* ── 4. SAVE ──────────────────────────────────────────── */
        send({
          step: "saving",
          message: `Saving ${validRows.length} rows across ${
            new Set(validRows.map((r) => r.campaign)).size
          } campaigns…`,
        });

        // The run + campaign data share a transaction — if either fails
        // we want no half-written run in the DB. Diagnostics are NOT
        // included here; they're idempotent and don't need atomicity.
        const run = await prisma.$transaction(async (tx) => {
          const createdRun = await tx.analyticsRun.create({
            data: {
              name: `${filename} - ${new Date().toLocaleString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).replace(",", "")}`,
              source: "CSV",
              platform: detectedPlatform || "unknown",
              warnings,
              rawPayload: {
                rowCount: validRows.length,
                discardedPct,
                headers,
                detectedPlatform,
              },
            },
          });

          await tx.campaignData.createMany({
            data: validRows.map((r) => ({
              runId: createdRun.id,
              campaign: r.campaign,
              date: r.date,
              impressions: r.impressions,
              clicks: r.clicks,
              spend: r.spend,
              conversions: r.conversions,
            })),
          });

          return createdRun;
        });

        send({
          step: "saving",
          message: "Campaign data saved.",
        });

        /* ── 5. DIAGNOSTICS ───────────────────────────────────── */
        send({
          step: "diagnostics",
          message: "Running anomaly detection…",
        });

        // Fully synchronous — stream stays open until this resolves.
        // runAnomalyDiagnosticsForRun uses bulk createMany (no transaction)
        // so it won't hit Prisma's 5 s transaction timeout.
        await runAnomalyDiagnosticsForRun(run.id);

        send({
          step: "diagnostics",
          message: "Anomaly detection complete.",
        });

        /* ── DONE ─────────────────────────────────────────────── */
        send({
          step: "done",
          message: "All done! Taking you to your dashboard…",
          done: true,
          runId: run.id,
          warnings,
          platform: detectedPlatform,
          rowsProcessed: validRows.length,
        });
      } catch (err) {
        console.error("[/api/upload] stream error:", err);
        send({
          step: "error",
          message: err.message || "An unexpected error occurred.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
