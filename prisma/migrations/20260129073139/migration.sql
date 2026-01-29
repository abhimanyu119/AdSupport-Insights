/*
  Warnings:

  - You are about to alter the column `spend` on the `CampaignData` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - A unique constraint covering the columns `[campaign,date]` on the table `CampaignData` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[campaignDataId,type]` on the table `Issue` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `campaign` to the `CampaignData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `severity` to the `Issue` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- DropIndex
DROP INDEX "CampaignData_date_key";

-- AlterTable
ALTER TABLE "CampaignData" ADD COLUMN     "campaign" TEXT NOT NULL,
ALTER COLUMN "spend" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "severity" "IssueSeverity" NOT NULL;

-- CreateIndex
CREATE INDEX "CampaignData_campaign_idx" ON "CampaignData"("campaign");

-- CreateIndex
CREATE INDEX "CampaignData_date_idx" ON "CampaignData"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignData_campaign_date_key" ON "CampaignData"("campaign", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_campaignDataId_type_key" ON "Issue"("campaignDataId", "type");
