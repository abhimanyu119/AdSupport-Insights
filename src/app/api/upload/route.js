import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  normalizeCsvRows,
  runPreflightDiagnostics,
  runAnomalyDiagnosticsForRun,
} from "@/lib/normalize";

export async function POST(req) {
  try {
    const { csvText, platform, filename } = await req.json();

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

    const dataLines = lines.slice(1); // drop header

    /* ---------- NORMALIZE ---------- */

    const normalized = normalizeCsvRows(dataLines);

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found" },
        { status: 400 },
      );
    }

    /* ---------- LIGHT DIAGNOSTICS ---------- */

    const warnings = runPreflightDiagnostics(normalized);

    /* ---------- CREATE RUN ---------- */

    const run = await prisma.analyticsRun.create({
      data: {
        name: filename || `CSV Upload - ${Date.now()}`,
        source: "CSV",
        platform: platform || null,
        warnings,
        rawPayload: { rowCount: normalized.length },
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
    // creates issues in DB
    await runAnomalyDiagnosticsForRun(run.id);

    /* ---------- DONE ---------- */

    return NextResponse.json({ runId: run.id, warnings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "CSV upload failed" }, { status: 500 });
  }
}
