import { useEffect, useRef, useState } from "react";
import {
  AGE_OPTIONS,
  loadSettings,
  saveSettings,
  type QuizSettings,
} from "@/lib/quiz-store";

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-[15px] bg-white p-4 shadow-sm">
      <span className="flex-1">
        <span className="block text-[18px] font-bold text-[#333]">{label}</span>
        <span className="block text-[14px] text-[#666]">{hint}</span>
      </span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#378ADD]"
        style={{ width: 68, height: 38, background: checked ? "#63C439" : "#CCC" }}
      >
        <span
          className="absolute top-1 flex size-[30px] items-center justify-center rounded-full bg-white text-[14px] font-bold text-[#333] transition-all"
          style={{ left: checked ? 34 : 4 }}
          aria-hidden="true"
        >
          {checked ? "✓" : "✕"}
        </span>
      </button>
    </li>
  );
}

export function ParentControls({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<QuizSettings>(() => loadSettings());
  const [notice, setNotice] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const update = (patch: Partial<QuizSettings>, message: string) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveSettings(next);
      return next;
    });
    setNotice(message);
  };

  return (
    <div className="min-h-dvh bg-[#F7F9F4] pb-16" style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}>
      <p aria-live="polite" className="sr-only">{notice}</p>

      <header className="flex items-center gap-3 bg-[#378ADD] px-3 text-white" style={{ minHeight: 60 }}>
        <button
          onClick={onClose}
          aria-label="Back to home"
          className="flex size-11 items-center justify-center rounded-full text-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          <span aria-hidden="true">←</span>
        </button>
        <h1 ref={headingRef} tabIndex={-1} className="text-[22px] font-bold outline-none">
          <span aria-hidden="true">👨‍👩‍👧</span> Parent Controls
        </h1>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-4">
        <section aria-labelledby="ww-age-heading" className="mt-5">
          <h2 id="ww-age-heading" className="mb-2 text-[18px] font-bold text-[#333]">Difficulty</h2>
          <ul className="flex flex-col gap-3">
            {AGE_OPTIONS.map((o) => {
              const active = settings.ageRange === o.value;
              return (
                <li key={o.value}>
                  <button
                    onClick={() => update({ ageRange: o.value }, `Difficulty set to ${o.label}`)}
                    aria-pressed={active}
                    className="flex w-full items-center gap-3 rounded-[15px] border-2 px-4 py-3 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#378ADD]"
                    style={{
                      background: active ? "#63C439" : "#fff",
                      borderColor: active ? "#4EA52C" : "#DDD",
                      color: active ? "#fff" : "#333",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-7 items-center justify-center rounded-full border-2 text-[14px] font-bold"
                      style={{ borderColor: active ? "#fff" : "#BBB", color: active ? "#fff" : "transparent" }}
                    >
                      ✓
                    </span>
                    <span>
                      <span className="block text-[18px] font-bold">{o.label}</span>
                      <span className={`block text-[14px] ${active ? "text-white/90" : "text-[#666]"}`}>{o.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="ww-play-heading" className="mt-6">
          <h2 id="ww-play-heading" className="mb-2 text-[18px] font-bold text-[#333]">Play options</h2>
          <ul className="flex flex-col gap-3">
            <Toggle
              label="Sound effects"
              hint="Chimes and buzzers during the quiz"
              checked={settings.sound}
              onChange={(v) => update({ sound: v }, v ? "Sound on" : "Sound off")}
            />
            <Toggle
              label="Confetti"
              hint="Celebration animation on correct answers"
              checked={settings.confetti}
              onChange={(v) => update({ confetti: v }, v ? "Confetti on" : "Confetti off")}
            />
            <Toggle
              label="Jump with progress dots"
              hint="Let the child skip to any question"
              checked={settings.allowJump}
              onChange={(v) => update({ allowJump: v }, v ? "Jumping allowed" : "Jumping disabled")}
            />
          </ul>
        </section>

        <p className="mt-6 rounded-[15px] bg-[#F0F7FF] p-4 text-[15px] text-[#555]">
          <span aria-hidden="true">💾</span> Settings and quiz progress are saved on this device, so everything works
          offline and survives a reload.
        </p>
      </main>
    </div>
  );
}