import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, context) {
  const params = await context.params;
  const runId = Number(params.id);

  // const run = await prisma.analyticsRun.findUnique({
  //   where: { id: runId },
  //   include: {
  //     campaignData: {include: { issues: true } },
  //   },
  // });
  const run = await prisma.analyticsRun.findUnique({
    where: { id: runId },
    include: {
      campaignData: true,
      issueGroups: {
        include: {
          occurrences: {
            include: {
              campaignData: true,
            },
          },
        },
      },
    },
  });

  if (!Number.isInteger(runId)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
