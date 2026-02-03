import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const runs = await prisma.analyticsRun.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(runs);
}
