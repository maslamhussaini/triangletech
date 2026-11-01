"use client";

import { useMemo, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { calculateTimesheet, formatDecimalHours, formatDuration, formatMoney } from "@/lib/tools/time-card";

export default function WorkHoursClient() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:30");
  const [endsNextDay, setEndsNextDay] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState("30");
  const [rate, setRate] = useState("");

  const result = useMemo(
    () =>
      calculateTimesheet({
        weekStart: date,
        period: "weekly",
        sessions: [{ id: "single", date, start, end, endsNextDay, breakMinutes: Number(breakMinutes) || 0 }],
        hourlyRate: rate === "" ? null : Number(rate),
        currency: "USD",
        overtimeThresholdHours: 40,
        overtimeMultiplier: 1.5,
      }),
    [date, start, end, endsNextDay, breakMinutes, rate]
  );

  const session = result.sessions[0];

  return (
    <>
      <ScrollReveal />
      <section className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <p className="eyebrow-indigo">FREE WORK TOOL</p>
        <h1 style={{ fontSize: 34, lineHeight: 1.2, margin: "8px 0" }}>Work Hours Calculator</h1>
        <p style={{ maxWidth: 720, color: "#475569", lineHeight: 1.6 }}>
          How long is one shift, after an unpaid break? Enter a single shift — including overnight shifts — and get its duration
          in hours and minutes and in decimal hours. For a full week, use the <a href="/tools/time-card-calculator">Work Hours &amp; Time Card Calculator</a>.
        </p>

        {result.errors.length > 0 && (
          <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>{result.errors.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "end" }}>
          <div className="field">
            <label className="label-premium" htmlFor="wh-date">Date</label>
            <input id="wh-date" className="input-premium" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label-premium" htmlFor="wh-start">Start time</label>
            <input id="wh-start" className="input-premium" type="time" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label className="label-premium" htmlFor="wh-end">End time</label>
            <input id="wh-end" className="input-premium" type="time" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}>
            <input type="checkbox" checked={endsNextDay} onChange={e => setEndsNextDay(e.target.checked)} />
            Ends next day (explicit overnight shift)
          </label>
          <div className="field">
            <label className="label-premium" htmlFor="wh-break">Unpaid break (minutes)</label>
            <input id="wh-break" className="input-premium" type="number" inputMode="numeric" min="0" step="1" value={breakMinutes} onChange={e => setBreakMinutes(e.target.value)} />
          </div>
          <div className="field">
            <label className="label-premium" htmlFor="wh-rate">Hourly rate, optional ($)</label>
            <input id="wh-rate" className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)} />
          </div>
        </div>

        {session && result.errors.length === 0 && (
          <div style={{ marginTop: 24, border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <p><strong>Shift length:</strong> {formatDuration(session.grossMinutes)} before the break.</p>
            <p><strong>Paid time:</strong> {formatDuration(session.paidMinutes)} ({formatDecimalHours(session.paidMinutes)} decimal hours).</p>
            {session.segments.length > 1 && (
              <p style={{ color: "#475569" }}>
                Overnight split: {session.segments.map(s => `${s.date}: ${formatDuration(s.paidMinutes)} paid (${s.breakMinutes}m of the break allocated to this date)`).join("; ")}.
              </p>
            )}
            {rate !== "" && <p><strong>Estimated gross pay for this shift:</strong> {formatMoney(result.payCents, "USD")} (before tax; overtime is not applied to a single shift here).</p>}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          <button type="button" className="button-indigo-secondary" onClick={() => { setStart("09:00"); setEnd("17:30"); setEndsNextDay(false); setBreakMinutes("30"); }}>Example: 09:00–17:30, 30m break = 8h</button>
          <button type="button" className="button-indigo-secondary" onClick={() => { setStart("22:00"); setEnd("06:00"); setEndsNextDay(true); setBreakMinutes("30"); }}>Example: 22:00–06:00 next day, 30m break = 7h 30m</button>
        </div>
        <p style={{ color: "#475569", marginTop: 16 }}>
          An end time earlier than the start time is an error unless you check “Ends next day”. Break minutes must be shorter than the shift itself.
          Pay, when shown, is estimated gross pay only.
        </p>
      </section>
    </>
  );
}
