/*
  Warnings:

  - You are about to drop the column `metadata` on the `Issue` table. All the data in the column will be lost.
  - Added the required column `runId` to the `CampaignData` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RunSource" AS ENUM ('CSV', 'API');

-- DropIndex
DROP INDEX "CampaignData_campaign_date_key";

-- DropIndex
DROP INDEX "CampaignData_campaign_idx";

-- DropIndex
DROP INDEX "CampaignData_date_idx";

-- AlterTable
ALTER TABLE "CampaignData" ADD COLUMN     "runId" INTEGER NOT NULL,
ALTER COLUMN "spend" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Issue" DROP COLUMN "metadata";

-- CreateTable
CREATE TABLE "AnalyticsRun" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "source" "RunSource" NOT NULL,
    "platform" TEXT,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignData_runId_idx" ON "CampaignData"("runId");

-- CreateIndex
CREATE INDEX "CampaignData_campaign_date_idx" ON "CampaignData"("campaign", "date");

-- AddForeignKey
ALTER TABLE "CampaignData" ADD CONSTRAINT "CampaignData_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalyticsRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
