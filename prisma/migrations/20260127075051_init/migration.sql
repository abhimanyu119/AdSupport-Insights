-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('ZERO_IMPRESSIONS', 'HIGH_SPEND_NO_CONVERSIONS', 'SUDDEN_DROP_IMPRESSIONS', 'LOW_CTR');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED');

-- CreateTable
CREATE TABLE "CampaignData" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL,
    "conversions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" SERIAL NOT NULL,
    "campaignDataId" INTEGER NOT NULL,
    "type" "IssueType" NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignData_date_key" ON "CampaignData"("date");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_campaignDataId_fkey" FOREIGN KEY ("campaignDataId") REFERENCES "CampaignData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
