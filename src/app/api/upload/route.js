import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  normalizeCsvRows,
  runAnomalyDiagnosticsForRun,
  buildDiscardWarnings,
} from "@/lib/normalize";
import { detectPlatform } from "@/lib/platformAdapters";

export async function POST(req) {
  const startTime = Date.now();

  try {
    const { csvText, filename } = await req.json();

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json(
        { error: "Expected raw CSV text" },
        { status: 400 },
      );
    }

    /* ---------- PARSE CSV ---------- */
    console.time("CSV Parsing");
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
    console.timeEnd("CSV Parsing");

    /* ---------- NORMALIZE ---------- */
    console.time("Normalization & Validation");
    const normalized = normalizeCsvRows(dataLines, detectedPlatform, headers);

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
          error: "Upload failed due to excessive invalid data",
          warnings,
        },
        { status: 422 },
      );
    }
    console.timeEnd("Normalization & Validation");
    console.log(
      `Valid rows: ${validRows.length}, Discarded: ${discardedPct}%`,
    );

    /* ---------- CREATE RUN + DATA (ATOMIC) ---------- */
    console.time("Database Transaction");
    const run = await prisma.$transaction(async (tx) => {
      console.time("  └─ Create AnalyticsRun");
      const createdRun = await tx.analyticsRun.create({
        data: {
          name: filename || `CSV Upload - ${new Date().toISOString()}`,
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
      console.timeEnd("  └─ Create AnalyticsRun");

      console.time("  └─ Insert CampaignData");
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
      console.timeEnd("  └─ Insert CampaignData");

      return createdRun;
    });
    console.timeEnd("Database Transaction");

    /* ---------- POST-RUN DIAGNOSTICS ---------- */
    const diagnosticsStartTime = Date.now();
    runAnomalyDiagnosticsForRun(run.id)
      .catch((err) => {
        console.error("Background diagnostics failed:", err);
      })
      .then(() => {
        console.log(
          `Background diagnostics completed in ${Date.now() - diagnosticsStartTime}ms`,
        );
      });

    /* ---------- DONE ---------- */
    const totalTime = Date.now() - startTime;
    console.log(
      `TOTAL UPLOAD TIME: ${totalTime}ms for ${validRows.length} rows`,
    );

    return NextResponse.json({
      runId: run.id,
      warnings,
      platform: detectedPlatform,
      rowsProcessed: validRows.length,
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
