export default function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm">
      <div className="font-semibold">{d.campaign}</div>
      <div className="text-xs text-slate-400">{d.date}</div>
      <div className="mt-2">
        Impressions: <b>{d.impressions}</b>
      </div>
      <div>
        Clicks: <b>{d.clicks}</b>
      </div>
      <div>
        Spend: <b>${d.spend.toFixed(2)}</b>
      </div>
      <div>
        Conversions: <b>{d.conversions}</b>
      </div>
    </div>
  );
}
