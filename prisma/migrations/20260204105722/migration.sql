/*
  Warnings:

  - You are about to drop the `Issue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_campaignDataId_fkey";

-- DropTable
DROP TABLE "Issue";

-- CreateTable
CREATE TABLE "IssueGroup" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "campaign" TEXT NOT NULL,
    "type" "IssueType" NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueOccurrence" (
    "id" SERIAL NOT NULL,
    "issueGroupId" INTEGER NOT NULL,
    "campaignDataId" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssueGroup_runId_campaign_type_key" ON "IssueGroup"("runId", "campaign", "type");

-- CreateIndex
CREATE UNIQUE INDEX "IssueOccurrence_issueGroupId_campaignDataId_key" ON "IssueOccurrence"("issueGroupId", "campaignDataId");

-- AddForeignKey
ALTER TABLE "IssueGroup" ADD CONSTRAINT "IssueGroup_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalyticsRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueOccurrence" ADD CONSTRAINT "IssueOccurrence_issueGroupId_fkey" FOREIGN KEY ("issueGroupId") REFERENCES "IssueGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueOccurrence" ADD CONSTRAINT "IssueOccurrence_campaignDataId_fkey" FOREIGN KEY ("campaignDataId") REFERENCES "CampaignData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
