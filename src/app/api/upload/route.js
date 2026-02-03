import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  normalizeCsvRows,
  runPreflightDiagnostics,
  runAnomalyDiagnosticsForRun,
} from "@/lib/normalize";
import { detectPlatform } from "@/lib/platformAdapters";

export async function POST(req) {
  try {
    const { csvText, filename } = await req.json();

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json(
        { error: "Expected raw CSV text" },
        { status: 400 },
      );
    }

    /* ---------- PARSE CSV ---------- */
    const lines = csvText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must contain header and at least one data row" },
        { status: 400 },
      );
    }

    /* ---------- DETECT PLATFORM ---------- */
    const detectedPlatform = detectPlatform(lines);

    /* ---------- PARSE HEADERS ---------- */
    const headers = lines[0].split(",").map((h) => h.trim());
    const dataLines = lines.slice(1);

    /* ---------- NORMALIZE ---------- */
    const normalized = normalizeCsvRows(dataLines, detectedPlatform, headers);

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
        name: filename || `CSV Upload - ${new Date().toISOString()}`,
        source: "CSV",
        platform: detectedPlatform || "unknown",
        warnings,
        rawPayload: {
          rowCount: normalized.length,
          headers: headers,
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
    console.error("CSV upload error:", err);
    return NextResponse.json(
      {
        error: "CSV upload failed",
        details: err.message,
      },
      { status: 500 },
    );
  }
}
