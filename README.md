# AdSupport Insights

A lightweight web application that simulates how product support teams investigate advertiser issues using campaign-style data, inspired by real Google Ads support workflows.

## Problem

Advertisers often face issues such as:
- Ads approved but not delivering impressions
- High spend with no conversions
- Sudden drops in performance
- Conversion tracking not firing

Support engineers investigate these issues by analyzing data, detecting abnormal patterns, and guiding customers toward resolution.

## Solution

AdSupport Insights provides a tool for support engineers to:
- Upload campaign data via CSV
- View key metrics and trends
- Automatically detect issues using rule-based diagnostics
- Track investigation status
- Generate support-style investigation notes

## Features

### Data Ingestion
- Upload CSV files with campaign data (date, impressions, clicks, spend, conversions)
- Data validation and storage in PostgreSQL database

### Metrics & Aggregation
- CTR (Click-Through Rate)
- Conversion Rate
- Cost per Conversion
- Time-based comparisons (current vs previous period)

### Rule-Based Diagnostics
Detects issues such as:
- Zero impressions → delivery issue
- High spend with zero conversions → tracking/targeting issue
- Sudden drops in performance → regression
- Very low CTR → creative/relevance issue

### Support Workflow
- Issue status tracking: Open, Investigating, Resolved
- Auto-generated investigation notes with suggested next steps

### Dashboards
- Key metrics overview
- Issues list with status management
- Performance charts over time

## Tech Stack

- **Frontend**: Next.js (JavaScript), React, Tailwind CSS
- **Backend**: Next.js Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Charts**: Recharts
- **CSV Parsing**: papaparse
- **Date Handling**: date-fns

## Deployment to Vercel

1. **Deploy to Vercel:**
   - Push your code to GitHub
   - Connect your GitHub repo to Vercel
   - Deploy the project

2. **Create PostgreSQL Database:**
   - In Vercel dashboard, go to your project → Storage tab
   - Click "Create Database" → Select PostgreSQL
   - Choose a name (e.g., `adsupport-insights-db`)
   - Select region and create

3. **Connect Database to Project:**
   - In the database settings, click "Connect"
   - Select your project and environment (.env.local)
   - Vercel will automatically add `DATABASE_URL` to your environment variables

4. **Run Database Migrations:**
   - In Vercel dashboard, go to your project → Functions tab
   - Open a terminal session
   - Run: `npx prisma migrate deploy`

5. **Redeploy:**
   - Push a new commit or manually redeploy to apply the database schema

## Usage

1. **Upload Data**: Go to `/upload` and upload a CSV file with columns: date, impressions, clicks, spend, conversions
2. **View Dashboard**: Main page shows metrics, issues, and charts
3. **Manage Issues**: Update issue status from Open → Investigating → Resolved

## Sample CSV Format

```csv
date,impressions,clicks,spend,conversions
2023-01-01,1000,50,100.0,5
2023-01-02,1200,60,120.0,6
2023-01-03,0,0,0.0,0
```

## Architecture

- `src/app/actions.js`: Server actions for data processing and diagnostics
- `src/app/page.js`: Main dashboard
- `src/app/upload/page.js`: Data upload page
- `prisma/schema.prisma`: Database schema with CampaignData and Issue models
- Clean separation between data ingestion, diagnostics logic, and UI

## Diagnostics Rules

The system uses deterministic, explainable rules:
- Zero impressions flag delivery issues
- Spend > $100 with 0 conversions flags tracking/targeting
- Impressions drop >50% vs previous day flags regression
- CTR <1% flags creative/relevance issues

Each detected issue includes investigation notes with metrics and next steps.
