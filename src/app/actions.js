"use server";
import prisma from "@/lib/prisma";

function serializeCampaign(c) {
  return {
    campaign: c.campaign,
    date: c.date.toISOString().slice(0, 10),
    impressions: c.impressions,
    clicks: c.clicks,
    spend: Number(c.spend),
    conversions: c.conversions,
  };
}

export async function getRuns() {
  return prisma.analyticsRun.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteRun(id) {
  await prisma.analyticsRun.delete({ where: { id } });
}

export async function getMetrics(runId) {
  const rows = await prisma.campaignData.findMany({ where: { runId } });

  const total = rows.reduce(
    (a, r) => {
      a.impressions += r.impressions;
      a.clicks += r.clicks;
      a.spend += Number(r.spend);
      a.conversions += r.conversions;
      return a;
    },
    { impressions: 0, clicks: 0, spend: 0, conversions: 0 },
  );

  total.ctr = total.impressions ? total.clicks / total.impressions : 0;

  return total;
}

export async function getChartData(runId) {
  const rows = await prisma.campaignData.findMany({
    where: { runId },
    orderBy: { date: "asc" },
  });

  return rows.map(serializeCampaign);
}

export async function getIssues(runId) {
  const issues = await prisma.issue.findMany({
    where: {
      campaignData: { runId },
    },
    include: { campaignData: true },
    orderBy: { createdAt: "desc" },
  });

  return issues.map((i) => ({
    id: i.id,
    type: i.type,
    severity: i.severity,
    status: i.status,
    notes: i.notes,
    campaign: i.campaignData.campaign,
    date: i.campaignData.date.toISOString().slice(0, 10),
  }));
}

export async function updateIssueStatus(id, status) {
  await prisma.issue.update({
    where: { id },
    data: { status },
  });
}
