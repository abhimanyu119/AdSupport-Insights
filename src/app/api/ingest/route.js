import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  normalizeApiObjects,
  runPreflightDiagnostics,
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

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found after normalization" },
        { status: 400 },
      );
    }

    /* ---------- LIGHT DIAGNOSTICS ---------- */
    const warnings = runPreflightDiagnostics(normalized);

    /* ---------- CREATE RUN ---------- */
    const run = await prisma.analyticsRun.create({
      data: {
        name: `API Ingest - ${new Date().toDateString()}`,
        source: "API",
        platform: detectedPlatform || "unknown",
        warnings,
        rawPayload: {
          rowCount: normalized.length,
          detectedPlatform: detectedPlatform,
        },
      },
    });

    /* ---------- INSERT DATA ---------- */
    await prisma.campaignData.createMany({
      data: normalized.map((r) => ({
        runId: run.id,
        campaign: r.campaign,
        date: r.date,
        impressions: r.impressions,
        clicks: r.clicks,
        spend: r.spend,
        conversions: r.conversions,
      })),
    });

    /* ---------- HEAVY DIAGNOSTICS ---------- */
    await runAnomalyDiagnosticsForRun(run.id);

    /* ---------- DONE ---------- */
    return NextResponse.json({
      runId: run.id,
      warnings,
      platform: detectedPlatform,
      rowsProcessed: normalized.length,
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
