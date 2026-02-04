import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  normalizeApiObjects,
  buildDiscardWarnings,
  runAnomalyDiagnosticsForRun,
} from "@/lib/normalize";
import { detectPlatform } from "@/lib/platformAdapters";

export async function POST(req) {
  try {
    const payload = await req.json();

    if (!Array.isArray(payload)) {
      return NextResponse.json(
        { error: "Expected array payload" },
        { status: 400 },
      );
    }

    if (payload.length === 0) {
      return NextResponse.json({ error: "Empty payload" }, { status: 400 });
    }

    /* ---------- DETECT PLATFORM ---------- */
    const detectedPlatform = detectPlatform(payload);

    /* ---------- NORMALIZE ---------- */
    const normalized = normalizeApiObjects(payload, detectedPlatform);

    const { validRows, warnings, discardedPct } =
      buildDiscardWarnings(normalized);

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found after validation", warnings },
        { status: 400 },
      );
    }

    if (discardedPct > 50) {
      return NextResponse.json(
        {
          error: "API ingest failed due to excessive invalid data",
          warnings,
        },
        { status: 422 },
      );
    }

    /* ---------- CREATE RUN + DATA (ATOMIC) ---------- */
    const run = await prisma.$transaction(async (tx) => {
      const createdRun = await tx.analyticsRun.create({
        data: {
          name: `API Ingest - ${new Date().toDateString()}`,
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

    /* ---------- POST-RUN DIAGNOSTICS ---------- */
    await runAnomalyDiagnosticsForRun(run.id);

    /* ---------- DONE ---------- */
    return NextResponse.json({
      runId: run.id,
      warnings,
      platform: detectedPlatform,
      rowsProcessed: validRows.length,
    });
  } catch (err) {
    console.error("API ingest error:", err);
    return NextResponse.json(
      {
        error: "API ingest failed",
        details: err.message,
      },
      { status: 500 },
    );
  }
}
