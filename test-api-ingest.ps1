# Path to your CSV file
$csvPath = "D:\adsupport-insights\sample.csv"

# Read CSV into PowerShell objects
$csvObjects = Import-Csv -Path $csvPath

# Convert objects into API-ready JSON
$jsonBody = $csvObjects | ForEach-Object {
    [PSCustomObject]@{
        campaign    = $_.campaign
        date        = $_.date
        impressions = [int]$_.impressions
        clicks      = [int]$_.clicks
        spend       = [decimal]$_.spend
        conversions = [int]$_.conversions
    }
} | ConvertTo-Json -Depth 10

# Send POST request to your API
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/ingest" `
  -Method POST `
  -ContentType "application/json" `
  -Body $jsonBody
