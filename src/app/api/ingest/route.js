import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeApiObjects, runPreflightDiagnostics, runAnomalyDiagnosticsForRun } from "@/lib/normalize";

export async function POST(req) {
  try {
    const payload = await req.json();

    if (!Array.isArray(payload)) {
      return NextResponse.json(
        { error: "Expected array payload" },
        { status: 400 },
      );
    }

    const normalized = normalizeApiObjects(payload);
    const warnings = runPreflightDiagnostics(normalized);

    const run = await prisma.analyticsRun.create({
      data: {
        name: `Ingest - ${Date.now()}`,
        source: "API",
        // platform: platform || null,
        warnings,
        rawPayload: { rowCount: normalized.length },
      },
    });

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

    await runAnomalyDiagnosticsForRun(run.id);

    return NextResponse.json({ runId: run.id, warnings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "API ingest failed" }, { status: 500 });
  }
}
