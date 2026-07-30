import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { buildDailySummary } from "@/lib/daily-email-summary";
import { COMMON_TIMEZONES, detectTimezone, loadTimezone } from "@/lib/parent-progress";

export const Route = createFileRoute("/daily-email-preview")({
  head: () => ({
    meta: [
      { title: "Daily Progress Email Preview — Word Wizard" },
      {
        name: "description",
        content:
          "See exactly how the daily progress email looks: today's highlights, weekly totals and date ranges in your own timezone.",
      },
      { property: "og:title", content: "Daily Progress Email Preview — Word Wizard" },
      {
        property: "og:description",
        content:
          "See exactly how the daily progress email looks before you switch it on.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyEmailPreview,
});

const FONT = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

/** Inline styles only — this mirrors what email clients will render. */
const S = {
  body: { backgroundColor: "#ffffff", margin: "0 auto", maxWidth: "600px" },
  container: { padding: "24px" },
  h1: { fontSize: "22px", lineHeight: "1.3", margin: "0 0 4px", color: "#215C15" },
  sub: { fontSize: "14px", color: "#4a4a4a", margin: "0 0 20px" },
  card: {
    border: "1px solid #E4EDE0",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "16px",
    backgroundColor: "#F7F9F4",
  },
  statLabel: { fontSize: "13px", color: "#4a4a4a", margin: "0" },
  statValue: { fontSize: "20px", fontWeight: 700, color: "#2b2b2b", margin: "2px 0 0" },
  h2: { fontSize: "16px", margin: "0 0 8px", color: "#215C15" },
  li: { fontSize: "15px", color: "#2b2b2b", margin: "0 0 6px" },
  th: {
    fontSize: "12px",
    color: "#4a4a4a",
    textAlign: "left" as const,
    padding: "6px 8px",
    borderBottom: "1px solid #E4EDE0",
  },
  td: { fontSize: "14px", color: "#2b2b2b", padding: "6px 8px", borderBottom: "1px solid #EEF3EB" },
  footer: { fontSize: "12px", color: "#4a4a4a", marginTop: "18px", lineHeight: "1.6" },
};

function DailyEmailPreview() {
  const [tz, setTz] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setTz(loadTimezone());
    setNow(new Date());
  }, []);

  const zones = useMemo(
    () => Array.from(new Set([detectTimezone(), ...(tz ? [tz] : []), ...COMMON_TIMEZONES])).sort(),
    [tz],
  );

  const summary = useMemo(() => (tz && now ? buildDailySummary(tz, now) : null), [tz, now]);

  if (!summary || !tz) {
    return (
      <div className="min-h-dvh bg-[#F7F9F4] p-6 text-[#2b2b2b]" style={FONT}>
        <p className="text-[18px] font-bold">Loading the email preview…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F7F9F4] px-4 py-6 text-[#2b2b2b]" style={FONT}>
      <div className="mx-auto max-w-[680px]">
        <h1 className="text-[24px] font-bold text-[#215C15]">Daily progress email preview</h1>
        <p className="mt-1 text-[15px] text-[#4a4a4a]">
          This is exactly what lands in your inbox each morning at 8:00 in your timezone.
        </p>

        <label className="mt-4 block text-[15px] font-semibold" htmlFor="preview-tz">
          Preview in timezone
        </label>
        <select
          id="preview-tz"
          value={tz}
          onChange={(e) => {
            setTz(e.target.value);
            setNow(new Date());
          }}
          className="mt-2 min-h-11 w-full rounded-xl border border-[#C9D8C3] bg-white px-3 text-[16px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2F7D1F] sm:w-auto"
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>

        {/* Envelope details */}
        <div className="mt-5 rounded-2xl bg-white p-4 text-[14px] shadow-sm ring-1 ring-[#E4EDE0]">
          <p>
            <span className="font-semibold">Subject:</span> {summary.subject}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Preview text:</span> {summary.preview}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Sends:</span> daily at 8:00 am ({summary.timezone})
          </p>
        </div>

        {/* The email itself */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E4EDE0]">
          <div style={S.body}>
            <div style={S.container}>
              <h1 style={S.h1}>Today's progress ✨</h1>
              <p style={S.sub}>
                {summary.todayLabel} · {summary.timezone}
              </p>

              <div style={S.card}>
                <table width="100%" cellPadding={0} cellSpacing={0}>
                  <tbody>
                    <tr>
                      <td>
                        <p style={S.statLabel}>Words learned</p>
                        <p style={S.statValue}>{summary.today.words}</p>
                      </td>
                      <td>
                        <p style={S.statLabel}>Time spent</p>
                        <p style={S.statValue}>{summary.today.minutes}</p>
                      </td>
                      <td>
                        <p style={S.statLabel}>Quiz score</p>
                        <p style={S.statValue}>{summary.today.accuracy}%</p>
                      </td>
                      <td>
                        <p style={S.statLabel}>Streak</p>
                        <p style={S.statValue}>{summary.streak} days</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 style={S.h2}>Today's highlights</h2>
              <ul style={{ margin: "0 0 18px", paddingLeft: "18px" }}>
                {summary.highlights.map((h) => (
                  <li key={h} style={S.li}>
                    {h}
                  </li>
                ))}
              </ul>

              <h2 style={S.h2}>This week · {summary.week.rangeLabel}</h2>
              <p style={{ ...S.li, marginBottom: "10px" }}>
                {summary.week.words} words · {summary.week.minutes} · {summary.week.quizzes} quizzes ·{" "}
                {summary.week.avgAccuracy}% average score
              </p>
              <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: "18px" }}>
                <thead>
                  <tr>
                    <th style={S.th} scope="col">
                      Day
                    </th>
                    <th style={S.th} scope="col">
                      Date
                    </th>
                    <th style={S.th} scope="col">
                      Words
                    </th>
                    <th style={S.th} scope="col">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.week.days.map((d) => (
                    <tr key={d.date}>
                      <td style={S.td}>
                        {d.done ? "⭐ " : ""}
                        {d.label}
                      </td>
                      <td style={S.td}>{d.date}</td>
                      <td style={S.td}>{d.words}</td>
                      <td style={S.td}>{d.minutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 style={S.h2}>Category performance</h2>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  {summary.categories.map((c) => (
                    <tr key={c.name}>
                      <td style={S.td}>
                        {c.emoji} {c.name}
                      </td>
                      <td style={S.td}>{c.words} words</td>
                      <td style={S.td}>{c.accuracy}% accuracy</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={S.footer}>
                Day-level summaries only — Word Wizard never emails detailed session logs. Child-Safe
                Certified (COPPA). You can turn this email off any time from the parent dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/parent-dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[16px] font-bold text-[#215C15] underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2F7D1F]"
          >
            ← Back to parent dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
