import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { saveDailySummaryPreference } from "@/lib/parent-email.functions";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CATEGORY_PERFORMANCE,
  COMMON_TIMEZONES,
  accuracyTrend,
  buildHistory,
  csvFileName,
  currentStreak,
  dateKeyInTz,
  detectTimezone,
  formatDateKey,
  formatMinutes,
  formatTimeInTz,
  isValidTimezone,
  loadTimezone,
  saveTimezone,
  shortDate,
  toCsv,
  weekSlice,
  weekTotals,
  weekdayOf,
} from "@/lib/parent-progress";

export const Route = createFileRoute("/parent-dashboard")({
  head: () => ({
    meta: [
      { title: "Parent Dashboard — Word Wizard" },
      {
        name: "description",
        content:
          "Track your child's daily words learned, weekly streaks and quiz accuracy in one simple, child-safe dashboard.",
      },
      { property: "og:title", content: "Parent Dashboard — Word Wizard" },
      {
        property: "og:description",
        content:
          "Track your child's daily words learned, weekly streaks and quiz accuracy in one simple, child-safe dashboard.",
      },
    ],
  }),
  component: ParentDashboard,
});

const TABS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "analytics", label: "Analytics" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const FONT = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

const CACHE_KEY = "ww_parent_dashboard_cache";
const EMAIL_KEY = "ww_parent_email";
const EMAIL_ON_KEY = "ww_parent_email_on";

type CachedSnapshot = { timezone: string; savedAt: string };

function ParentDashboard() {
  const [tab, setTab] = useState<TabId>("today");
  const [emailSummary, setEmailSummary] = useState(false);
  const [parentEmail, setParentEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [notice, setNotice] = useState("");
  const savePreference = useServerFn(saveDailySummaryPreference);

  // Timezone lives in localStorage, so it can only be read after hydration.
  const [tz, setTz] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const savedTz = loadTimezone();
    setTz(savedTz);
    setNow(new Date());

    try {
      setParentEmail(localStorage.getItem(EMAIL_KEY) ?? "");
      setEmailSummary(localStorage.getItem(EMAIL_ON_KEY) === "1");
    } catch {}

    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    setOffline(isOffline);

    let cached: CachedSnapshot | null = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      cached = raw ? (JSON.parse(raw) as CachedSnapshot) : null;
    } catch {}

    if (isOffline && cached) {
      // Offline: keep showing the last snapshot we successfully loaded.
      setLastUpdated(new Date(cached.savedAt));
      if (isValidTimezone(cached.timezone)) setTz(cached.timezone);
    } else {
      const stamp = new Date();
      setLastUpdated(stamp);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ timezone: savedTz, savedAt: stamp.toISOString() } satisfies CachedSnapshot),
        );
      } catch {}
    }

    const goOffline = () => {
      setOffline(true);
      setNotice("You are offline. Showing the last saved progress data.");
    };
    const goOnline = () => {
      setOffline(false);
      const stamp = new Date();
      setLastUpdated(stamp);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ timezone: loadTimezone(), savedAt: stamp.toISOString() } satisfies CachedSnapshot),
        );
      } catch {}
      setNotice("Back online. Progress data refreshed.");
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  const changeTimezone = (next: string) => {
    saveTimezone(next);
    setTz(next);
    setNow(new Date());
    setNotice(`Timezone saved. "Today" now follows ${next}.`);
    // Keep the reminder schedule aligned with the parent's timezone.
    if (emailSummary && parentEmail) {
      void savePreference({ data: { email: parentEmail, enabled: true, timezone: next } }).catch(
        () => {},
      );
    }
  };

  const toggleEmailSummary = async (checked: boolean) => {
    const email = parentEmail.trim();
    setEmailError("");

    if (checked && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address to receive the daily summary.");
      setNotice("Enter a valid email address to receive the daily summary.");
      return;
    }
    if (!checked && !email) {
      setEmailSummary(false);
      return;
    }

    setEmailSaving(true);
    try {
      await savePreference({ data: { email, enabled: checked, timezone: tz ?? detectTimezone() } });
      setEmailSummary(checked);
      try {
        localStorage.setItem(EMAIL_KEY, email);
        localStorage.setItem(EMAIL_ON_KEY, checked ? "1" : "0");
      } catch {}
      setNotice(
        checked
          ? `Daily email summary on. We'll email ${email} each morning at 8:00 (${tz}).`
          : "Daily email summary turned off.",
      );
    } catch {
      setEmailError("We could not save that. Please check your connection and try again.");
      setNotice("We could not save your email reminder.");
    } finally {
      setEmailSaving(false);
    }
  };

  const model = useMemo(() => {
    if (!tz || !now) return null;
    const todayKey = dateKeyInTz(now, tz);
    const history = buildHistory(todayKey);
    const week = weekSlice(history);
    return {
      todayKey,
      history,
      week,
      totals: weekTotals(week),
      today: history[history.length - 1],
      streak: currentStreak(history),
      trend: accuracyTrend(history),
    };
  }, [tz, now]);

  const timezoneOptions = useMemo(() => {
    const detected = detectTimezone();
    return Array.from(new Set([detected, ...(tz ? [tz] : []), ...COMMON_TIMEZONES])).sort();
  }, [tz]);

  const downloadCsv = () => {
    if (!model || !tz) return;
    const csv = toCsv(model.history, { timezone: tz, generatedAt: new Date() });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName(model.history);
    a.click();
    URL.revokeObjectURL(url);
    setNotice(
      `Progress report downloaded: ${model.history[0].date} to ${model.todayKey}, ${tz}.`,
    );
  };

  if (!model || !tz) {
    return (
      <div className="min-h-dvh bg-[#F7F9F4] p-6 text-[#2b2b2b]" style={FONT}>
        <p className="text-[18px] font-bold">Loading your child's progress…</p>
      </div>
    );
  }

  const { history, week, totals, today, streak, trend, todayKey } = model;

  return (
    <div className="min-h-dvh bg-[#F7F9F4] text-foreground" style={FONT}>
      <p aria-live="polite" className="sr-only">
        {notice}
      </p>

      <header className="bg-[#2F7D1F] px-4 py-5 text-white shadow-md">
        <div className="mx-auto grid max-w-[900px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-[24px] font-bold sm:text-[28px]">Parent Dashboard</h1>
            <p className="truncate text-[14px] text-white/90">
              {formatDateKey(todayKey)} · {tz}
            </p>
          </div>
          <Link
            to="/"
            className="min-h-11 shrink-0 rounded-full bg-white px-4 py-2 text-[15px] font-bold text-[#2F7D1F] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[700px] px-4 pb-10 lg:max-w-[900px]">
        {/* Offline / cached-data state */}
        {offline && (
          <p
            role="status"
            className="mt-4 rounded-2xl bg-[#FFF3D6] p-4 text-[15px] font-semibold text-[#6B4A00] ring-1 ring-[#D8A400]"
          >
            <span aria-hidden="true">📴</span> You are offline — this is saved (cached) progress
            data, not live.{" "}
            {lastUpdated
              ? `Last updated ${formatTimeInTz(lastUpdated, tz)}.`
              : "No saved update time available."}
          </p>
        )}
        {!offline && lastUpdated && (
          <p className="mt-4 text-[14px] text-[#4a4a4a]">
            Last updated {formatTimeInTz(lastUpdated, tz)} ({tz}).
          </p>
        )}

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Progress period"
          className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2"
        >
          {TABS.map((t) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => {
                  const i = TABS.findIndex((x) => x.id === tab);
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next =
                      e.key === "ArrowRight"
                        ? TABS[(i + 1) % TABS.length]
                        : TABS[(i - 1 + TABS.length) % TABS.length];
                    setTab(next.id);
                    document.getElementById(`tab-${next.id}`)?.focus();
                  }
                }}
                className={`min-h-11 shrink-0 rounded-full px-5 text-[16px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2F7D1F] ${
                  selected
                    ? "bg-[#2F7D1F] text-white shadow"
                    : "bg-white text-[#2b2b2b] ring-1 ring-[#D7E3D2]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "today" && (
          <section role="tabpanel" id="panel-today" aria-labelledby="tab-today" tabIndex={0}>
            <h2 className="mt-4 text-[20px] font-bold">Today</h2>
            <p className="mt-1 text-[15px] text-[#4a4a4a]">
              {formatDateKey(todayKey)} in your timezone ({tz}).
            </p>
            {today.words === 0 && today.quizzes === 0 ? (
              <Card>
                <p className="text-[18px] font-bold">No activity yet.</p>
                <p className="mt-1 text-[16px] text-[#4a4a4a]">
                  Encourage your child to learn!
                </p>
              </Card>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Stat label="Lessons completed" value={`${today.words}/10 words learned`} emoji="📚" />
                <Stat label="Time spent" value={formatMinutes(today.minutes)} emoji="⏱️" />
                <Stat
                  label="Quiz score"
                  value={`${Math.round((today.accuracy / 100) * 10)}/10 (${today.accuracy}%)`}
                  emoji="🎯"
                />
                <Stat label="Streak" value={`✅ ${streak}-day streak maintained!`} emoji="🔥" />
              </div>
            )}
          </section>
        )}

        {tab === "week" && (
          <section role="tabpanel" id="panel-week" aria-labelledby="tab-week" tabIndex={0}>
            <h2 className="mt-4 text-[20px] font-bold">This week</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Stat label="Total words learned" value={String(totals.words)} emoji="📖" />
              <Stat label="Total time spent" value={formatMinutes(totals.minutes)} emoji="⏱️" />
              <Stat label="Total quizzes" value={String(totals.quizzes)} emoji="📝" />
              <Stat label="Average score" value={`${totals.avg}%`} emoji="⭐" />
            </div>

            <h3 className="mt-6 text-[18px] font-bold">Day by day</h3>
            <ul className="mt-3 grid gap-2">
              {week.map((d) => (
                <li
                  key={d.date}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E4EDE0]"
                >
                  <span className="truncate text-[16px] font-bold">{weekdayOf(d.date)}</span>
                  <span className="shrink-0 text-[16px] text-[#3a3a3a]">
                    {d.words > 0 ? (
                      <>
                        <span aria-hidden="true">✅</span> {d.words} word{d.words > 1 ? "s" : ""}
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">❌</span> no activity
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <h3 className="mt-6 text-[18px] font-bold">Streak</h3>
            <ul className="mt-3 flex flex-wrap gap-3" aria-label="Daily streak for the last 7 days">
              {week.map((d) => (
                <li key={d.date} className="flex flex-col items-center gap-1">
                  <span
                    className={`size-9 rounded-full ${d.words > 0 ? "bg-[#2F7D1F]" : "bg-[#B9B9B9]"}`}
                    aria-hidden="true"
                  />
                  <span className="text-[13px] text-[#3a3a3a]">
                    {weekdayOf(d.date).slice(0, 3)}
                  </span>
                  <span className="sr-only">
                    {weekdayOf(d.date)}: {d.words > 0 ? "active" : "inactive"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === "analytics" && (
          <section
            role="tabpanel"
            id="panel-analytics"
            aria-labelledby="tab-analytics"
            tabIndex={0}
          >
            <h2 className="mt-4 text-[20px] font-bold">Analytics</h2>

            <p className="mt-3 rounded-2xl bg-[#E8F5E1] p-4 text-[16px] font-bold text-[#215C15] ring-1 ring-[#BFE0B0]">
              {trend > 0
                ? `Your child is improving! Quiz scores up ${trend}% this week.`
                : trend < 0
                  ? `Quiz scores are down ${Math.abs(trend)}% this week — a little practice will help.`
                  : "Quiz scores are steady this week."}
            </p>

            <Chart
              title="Words learned (last 30 days)"
              data={history}
              dataKey="words"
              color="#2F7D1F"
              unit=" words"
            />
            <Chart
              title="Quiz accuracy (last 30 days)"
              data={history}
              dataKey="accuracy"
              color="#1D6FBF"
              unit="%"
            />
            <Chart
              title="Time spent per day (last 30 days)"
              data={history}
              dataKey="minutes"
              color="#B5451B"
              unit=" min"
            />

            <h3 className="mt-6 text-[18px] font-bold">Category performance</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {CATEGORY_PERFORMANCE.map((c) => (
                <li
                  key={c.name}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E4EDE0]"
                >
                  <p className="text-[16px] font-bold">
                    <span aria-hidden="true">{c.emoji}</span> {c.name}
                  </p>
                  <p className="mt-1 text-[15px] text-[#3a3a3a]">
                    {c.words} words, {c.accuracy}% accuracy
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Options */}
        <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E4EDE0]">
          <label className="block text-[16px] font-semibold" htmlFor="tz-select">
            Your timezone
          </label>
          <p className="mt-1 text-[14px] text-[#4a4a4a]">
            "Today" and the weekly breakdown follow this timezone. It is saved on this device.
          </p>
          <select
            id="tz-select"
            value={tz}
            onChange={(e) => changeTimezone(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-[#C9D8C3] bg-white px-3 text-[16px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2F7D1F]"
          >
            {timezoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>

          <hr className="my-4 border-[#E4EDE0]" />

          <label className="block text-[16px] font-semibold" htmlFor="parent-email">
            Your email address
          </label>
          <input
            id="parent-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder="you@example.com"
            aria-describedby={emailError ? "parent-email-error" : undefined}
            aria-invalid={emailError ? true : undefined}
            className="mt-2 min-h-11 w-full rounded-xl border border-[#C9D8C3] bg-white px-3 text-[16px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2F7D1F]"
          />
          {emailError && (
            <p id="parent-email-error" className="mt-2 text-[14px] font-semibold text-[#9B1C1C]">
              {emailError}
            </p>
          )}

          <label className="mt-3 flex items-start gap-3 text-[16px] font-semibold">
            <input
              type="checkbox"
              checked={emailSummary}
              disabled={emailSaving || offline}
              onChange={(e) => void toggleEmailSummary(e.target.checked)}
              className="mt-1 size-5 accent-[#2F7D1F]"
            />
            Email me a daily progress summary at 8:00 am ({tz})
          </label>
          <p className="mt-1 text-[14px] text-[#4a4a4a]">
            {offline
              ? "Reconnect to change your email reminder."
              : emailSaving
                ? "Saving your preference…"
                : "One short summary a day. No marketing, and you can switch it off any time."}
          </p>
          <Link
            to="/daily-email-preview"
            className="mt-2 inline-flex min-h-11 items-center text-[15px] font-bold text-[#215C15] underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2F7D1F]"
          >
            Preview the daily email
          </Link>
          <button
            onClick={downloadCsv}
            className="mt-4 min-h-11 w-full rounded-full bg-[#2F7D1F] px-5 text-[16px] font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D6FBF] sm:w-auto"
          >
            Download progress report
          </button>
        </div>

        {/* Settings + trust */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[16px] font-bold text-[#215C15] underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2F7D1F]"
          >
            ⚙️ Settings
          </Link>
        </div>

        <footer className="mt-6 flex flex-col items-center gap-3 pb-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#E8F5E1] px-4 py-2 text-[14px] font-bold text-[#215C15] ring-1 ring-[#2F7D1F]">
            <span aria-hidden="true">✓</span> Child-Safe Certified
            <span className="rounded-full bg-[#2F7D1F] px-2 py-0.5 text-[12px] text-white">
              COPPA
            </span>
          </p>
          <a
            href="/privacy-policy.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 text-[15px] font-semibold text-[#1D5C9E] underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D6FBF]"
          >
            Privacy Policy (opens PDF in a new tab)
          </a>
        </footer>
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E4EDE0]">{children}</div>
  );
}

function Stat({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E4EDE0]">
      <p className="text-[15px] font-semibold text-[#4a4a4a]">
        <span aria-hidden="true">{emoji}</span> {label}
      </p>
      <p className="mt-1 text-[20px] font-bold">{value}</p>
    </div>
  );
}

function Chart({
  title,
  data,
  dataKey,
  color,
  unit,
}: {
  title: string;
  data: Array<Record<string, unknown>>;
  dataKey: string;
  color: string;
  unit: string;
}) {
  return (
    <figure className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E4EDE0]">
      <figcaption className="text-[16px] font-bold">{title}</figcaption>
      <div className="mt-3 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#E4EDE0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: "#3a3a3a", fontSize: 12 }}
              interval={6}
            />
            <YAxis tick={{ fill: "#3a3a3a", fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              formatter={(v: number) => [`${v}${unit}`, ""]}
              labelFormatter={(l: string) => shortDate(l)}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}