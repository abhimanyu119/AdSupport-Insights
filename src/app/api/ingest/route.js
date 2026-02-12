import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  normalizeApiObjects,
  buildDiscardWarnings,
  runAnomalyDiagnosticsForRun,
} from "@/lib/normalize";
import { detectPlatform } from "@/lib/platformAdapters";

/* ─── SSE helper ─────────────────────────────────────────────────── */

function frame(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/* ─── Route ──────────────────────────────────────────────────────── */

export async function POST(req) {
  let payload;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!Array.isArray(payload)) {
    return NextResponse.json(
      { error: "Expected array payload" },
      { status: 400 },
    );
  }

  if (payload.length === 0) {
    return NextResponse.json({ error: "Empty payload" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data) {
        controller.enqueue(encoder.encode(frame(data)));
      }

      try {
        /* ── 1. DETECT PLATFORM ─────────────────────────────── */
        send({
          step: "detecting",
          message: "Detecting platform format…",
        });

        const detectedPlatform = detectPlatform(payload);

        send({
          step: "detecting",
          message: `Detected ${detectedPlatform || "generic"} format.`,
        });

        /* ── 2. NORMALIZE ───────────────────────────────────── */
        send({
          step: "normalizing",
          message: `Normalizing ${payload.length} rows…`,
        });

        const normalized = normalizeApiObjects(payload, detectedPlatform);

        send({
          step: "normalizing",
          message: `${normalized.length} rows normalized.`,
        });

        /* ── 3. VALIDATE ────────────────────────────────────── */
        send({
          step: "validating",
          message: "Validating data…",
        });

        const { validRows, warnings, discardedPct } =
          buildDiscardWarnings(normalized);

        if (validRows.length === 0) {
          send({
            step: "error",
            message: "No valid rows found after validation.",
            warnings,
          });
          controller.close();
          return;
        }

        if (discardedPct > 50) {
          send({
            step: "error",
            message: "API ingest rejected — too many invalid rows.",
            warnings,
          });
          controller.close();
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

        /* ── 4. SAVE (ATOMIC) ───────────────────────────────── */
        send({
          step: "saving",
          message: `Saving ${validRows.length} rows across ${
            new Set(validRows.map((r) => r.campaign)).size
          } campaigns…`,
        });

        const run = await prisma.$transaction(async (tx) => {
          const createdRun = await tx.analyticsRun.create({
            data: {
              name: `API Ingest — ${new Date().toDateString()}`,
              source: "API",
              platform: detectedPlatform || "unknown",
              warnings,
              rawPayload: {
                rowCount: validRows.length,
                discardedPct,
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

        /* ── 5. DIAGNOSTICS (SYNC) ─────────────────────────── */
        send({
          step: "diagnostics",
          message: "Running anomaly detection…",
        });

        await runAnomalyDiagnosticsForRun(run.id);

        send({
          step: "diagnostics",
          message: "Anomaly detection complete.",
        });

        /* ── DONE ───────────────────────────────────────────── */
        send({
          step: "done",
          message: "All done!",
          done: true,
          runId: run.id,
          warnings,
          platform: detectedPlatform,
          rowsProcessed: validRows.length,
        });
      } catch (err) {
        console.error("[/api/ingest] stream error:", err);

        send({
          step: "error",
          message: err?.message || "An unexpected error occurred.",
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
