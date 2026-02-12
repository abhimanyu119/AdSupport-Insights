# AdSupport Insights

A lightweight web application that simulates how product support teams investigate advertiser issues using campaign-style data, inspired by real Google Ads support workflows.

## 📋 Problem

Advertisers often face issues such as:

- Ads approved but not delivering impressions
- High spend with no conversions
- Sudden drops in performance
- Conversion tracking not firing

Support engineers investigate these issues by analyzing data, detecting abnormal patterns, and guiding customers toward resolution.

## ✨ Solution

AdSupport Insights provides a tool for support engineers to:

- Upload campaign data via CSV
- View key metrics and trends
- Automatically detect issues using rule-based diagnostics
- Track investigation status
- Generate support-style investigation notes

## 🔑 Key Concepts

### 1. Normalization

Incoming data is normalized into a common schema:

- Campaign name
- Date
- Impressions
- Clicks
- Spend
- Conversions

Field names can vary wildly (`campaign_name`, `campaign name`, `name`, etc.). Normalization resolves this automatically based on platform detection.

### 2. Validation & Discard Logic

Before anything is written to the database:

- Invalid rows are discarded
- Empty rows are ignored
- Reasons for discard are tracked (e.g. missing campaign, invalid date, negative metrics)

**If more than 50% of rows are invalid:**

- The upload / ingest fails
- No run is created
- No data is written

This guarantees data integrity.

### 3. Transactions

Run creation and campaign data inserts are wrapped in a Prisma transaction:

- Either the run and campaign data are fully written
- Or nothing is persisted


Diagnostics are deterministic: the same dataset will always produce the same issues.
They are also idempotent, allowing safe re-execution without corrupting data.

## 🚀 Features

### Data Ingestion

#### CSV Upload

- Upload CSV files via `/api/upload`
- Header-aware and platform-aware
- Handles inconsistent column naming
- Rejects malformed data safely

#### API Ingest

- Send JSON arrays to `/api/ingest`
- Same normalization and validation rules as CSV
- Designed for programmatic ingestion or integrations

### Data Validation & Warnings

Instead of vague warnings, the system reports:

- How many rows were discarded
- Percentage of bad data
- Exact reasons (aggregated)

**Example warning:**

```json
{
  "level": "MEDIUM",
  "message": "42 / 300 rows (14%) were discarded due to invalid data",
  "breakdown": {
    "missing campaign": 20,
    "invalid date": 12,
    "clicks > impressions": 10
  }
}
```

Warnings are stored on the `AnalyticsRun` record.

### Diagnostics Engine

After ingestion, the system runs rule-based anomaly detection.

**Detected issues include:**

- `ZERO_IMPRESSIONS`
- `HIGH_SPEND_NO_CONVERSIONS`
- `LOW_CTR`
- `SUDDEN_DROP_IMPRESSIONS`

**Issues are:**

- Grouped per campaign + issue type
- Escalated in severity when repeated
- Tracked as occurrences over time

### Metrics & Aggregation

- **CTR** (Click-Through Rate)
- **Conversion Rate**
- **Cost per Conversion**
- Time-based comparisons (current vs previous period)

### Support Workflow

- Issue statuses: `OPEN` → `INVESTIGATING` → `RESOLVED`
- Issue groups persist across days
- Individual occurrences show when and why the issue happened
- Auto-generated investigation notes with suggested next steps

### Dashboards

- Key metrics overview
- Issues list with status management
- Performance charts over time

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js (JavaScript), React, Tailwind CSS |
| **Backend** | Next.js Route Handlers (API Routes) + Server-side Processing |
| **Database** | PostgreSQL with Prisma ORM |
| **Charts** | Recharts |
| **Date Handling** | date-fns |

## 🚢 Deployment to Vercel

### 1. Deploy to Vercel

- Push your code to GitHub
- Connect your GitHub repo to Vercel
- Deploy the project

### 2. Create PostgreSQL Database

- In Vercel dashboard, go to your project → **Storage** tab
- Click **"Create Database"** → Select **PostgreSQL**
- Choose a name (e.g., `adsupport-insights-db`)
- Select region and create

### 3. Connect Database to Project

- In the database settings, click **"Connect"**
- Select your project and environment (`.env.local`)
- Vercel will automatically add `DATABASE_URL` to your environment variables

### 4. Run Database Migrations

- In Vercel dashboard, go to your project → **Functions** tab
- Open a terminal session
- Run:
  ```bash
  npx prisma migrate deploy
  ```

### 5. Redeploy

- Push a new commit or manually redeploy to apply the database schema

## 📖 Usage

1. **Upload Data**: Go to `/upload` and upload a CSV file with columns: `date`, `impressions`, `clicks`, `spend`, `conversions`
2. **View Dashboard**: Main page shows metrics, issues, and charts
3. **Manage Issues**: Update issue status from `Open` → `Investigating` → `Resolved`

## 🔌 API Usage

### CSV Upload

**Route:**

```
POST /api/upload
```

**Body:**

```json
{
  "filename": "google_ads_export.csv",
  "csvText": "date,campaign,impressions,clicks,spend,conversions\n2024-01-01,Brand Search,1000,50,120,10"
}
```

**Responses:**

- Returns `text/event-stream`
- Emits progress events for:
  - parsing
  - normalization
  - validation
  - saving
  - diagnostics
  - done

The connection remains open until diagnostics complete.

If validation fails (>50% invalid rows), an `error` event is emitted and no data is written.

### API Ingest

**Route:**

```
POST /api/ingest
```

**Body:**

```json
[
  {
    "campaign_name": "Brand Search",
    "date": "2024-01-01",
    "impressions": 1000,
    "clicks": 50,
    "spend": 120,
    "conversions": 10
  },
  {
    "campaign": "Display - Retargeting",
    "day": "2024-01-02",
    "impr": 500,
    "clicks": 12,
    "cost": 40,
    "conversions": 1
  }
]
```

**Notes:**

- Field names do not need to match exactly
- Platform detection + normalization handles variants automatically

## 📄 Sample CSV Format

```csv
date,campaign_name,impressions,clicks,spend,conversions
2025-02-01,Brand_Search,1000,50,100.0,5
2025-02-01,Generic_Search,1200,60,120.0,6
2025-02-01,Performance_Max,0,0,0.0,0
```
## ⚙️ Processing Model

**Data ingestion follows a deterministic, staged pipeline:**

- Parse (CSV only)
- Normalize into a common schema
- Validate rows and compute discard statistics
- Hard fail if >50% invalid
- Transactional write (run + campaign data)
- Post-write diagnostics
- Completion event

## Streaming Upload Behavior ##

The CSV endpoint (`/api/upload`) returns `text/event-stream`.

**The server emits real-time progress updates:**

- parsing
- normalization
- validation
- saving
- diagnostics
- done

The connection remains open until diagnostics complete.

This avoids client polling while still providing immediate user feedback during long-running operations.

## 🏗️ Architecture

```
src/
├── app/
│   ├── actions.js          # Server actions
│   ├── dashboard/
│   │   ├── page.jsx        # Main dashboard
│   │   └── actions.js      # Client actions
│   ├── upload/
│   │   └── page.jsx        # Data upload page
│   └── api/
│       ├── upload/         # CSV upload endpoint
│       └── ingest/         # JSON ingest endpoint
├── prisma/
│   └── schema.prisma       # Database schema with CampaignData and Issue models
└── lib/
    └── normalize.js        # Normalization, data processing and diagnostics
```

**Key Design Principles:**

- Clean separation between data ingestion, diagnostics logic, and UI
- Server-side data processing with Next.js Route Handlers and server logic
- Relational database schema for structured campaign data
- Transaction-based ingestion for data integrity
- Platform-agnostic normalization layer

## 🔍 Diagnostics Rules

The system uses deterministic, explainable rules:

| Rule | Condition | Issue Type |
|------|-----------|------------|
| **Zero Impressions** | `impressions === 0` | Delivery issue |
| **High Spend, No Conversions** | `spend > $100 && conversions === 0` | Tracking/targeting issue |
| **Performance Regression** | `impressions drop > 50% vs previous day` | Regression |
| **Low CTR** | `CTR < 1%` | Creative/relevance issue |

Each detected issue includes investigation notes with metrics and suggested next steps.