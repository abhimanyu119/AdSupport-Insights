"use server";
import prisma from "@/lib/prisma";

export async function deleteRun(id) {
  await prisma.analyticsRun.delete({ where: { id } });
}

export async function updateIssueStatus(id, status) {
  await prisma.issueGroup.update({
    where: { id },
    data: { status },
  });
}
