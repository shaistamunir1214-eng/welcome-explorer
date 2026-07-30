import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WORD_CATEGORIES, lastWordKey, type WordCategory } from "@/lib/words";

export function LearningScreen({
  categoryId,
  wordIds,
  onClose,
}: {
  categoryId: string;
  /** Optional subset (e.g. review the words missed in a quiz). */
  wordIds?: string[];
  onClose: () => void;
}) {
  const base: WordCategory = WORD_CATEGORIES[categoryId] ?? WORD_CATEGORIES.animals;
  const subset = wordIds?.length ? base.words.filter((w) => wordIds.includes(w.id)) : [];
  const category: WordCategory = subset.length ? { ...base, words: subset } : base;
  const total = category.words.length;

  const [index, setIndex] = useState(0);
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">("loading");
  const [pulsing, setPulsing] = useState(false);
  const [barVisible, setBarVisible] = useState(true);
  const [caption, setCaption] = useState("");
  const autoPlayed = useRef(false);
  const lastScroll = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const word = category.words[index];

  // Restore last viewed word for this category
  useEffect(() => {
    try {
      if (wordIds?.length) return; // review sessions always start at the first missed word
      const saved = Number(localStorage.getItem(lastWordKey(category.id)));
      if (Number.isFinite(saved) && saved > 0 && saved < total) setIndex(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.id]);

  useEffect(() => {
    try {
      if (wordIds?.length) return;
      localStorage.setItem(lastWordKey(category.id), String(index));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.id, index]);

  useEffect(() => {
    setImgState("loading");
  }, [word.id]);

  // Preload the next two images
  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    for (let i = 1; i <= 2; i++) {
      const next = category.words[index + i];
      if (!next) break;
      const im = new Image();
      im.src = next.imageUrl;
      imgs.push(im);
    }
    return () => {
      imgs.forEach((im) => {
        im.src = "";
      });
    };
  }, [category.words, index]);

  const playAudio = useCallback(
    (w = word) => {
      setPulsing(true);
      window.setTimeout(() => setPulsing(false), 1200);
      setCaption(w.translations.english);
      try {
        const synth = window.speechSynthesis;
        if (!synth) throw new Error("no tts");
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(w.translations.english.toLowerCase());
        utter.rate = 0.85;
        utter.onerror = () => toast.error("Audio couldn't load, try again", { duration: 3000 });
        synth.speak(utter);
      } catch {
        toast.error("Audio couldn't load, try again", { duration: 3000 });
      }
    },
    [word],
  );

  // Auto-play once on first load only
  useEffect(() => {
    if (autoPlayed.current) return;
    autoPlayed.current = true;
    const t = window.setTimeout(() => playAudio(), 600);
    return () => window.clearTimeout(t);
  }, [playAudio]);

  // Cleanup speech on unmount
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        const n = Math.min(total - 1, Math.max(0, i + dir));
        return n;
      });
      window.speechSynthesis?.cancel();
      headingRef.current?.focus();
    },
    [total],
  );

  // Keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Auto-hide progress bar on scroll down
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setBarVisible(y < 40 || y < lastScroll.current);
      lastScroll.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pct = Math.round(((index + 1) / total) * 100);

  return (
    <div
      className="min-h-dvh bg-[#FFFFFF] pb-[110px]"
      style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
      onTouchStart={(e) => {
        const t = e.changedTouches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const s = touchStart.current;
        if (!s) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x;
        const dy = t.clientY - s.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <p aria-live="polite" className="sr-only">
        Word {index + 1} of {total}: {word.translations.english}
      </p>

      {/* Progress bar */}
      <header
        className="fixed inset-x-0 top-0 z-40 bg-[#F5F5F5] transition-transform duration-300"
        style={{ height: 50, transform: barVisible ? "translateY(0)" : "translateY(-100%)" }}
      >
        <div className="mx-auto flex h-[46px] max-w-[900px] items-center justify-between px-3">
          <p className="truncate font-semibold text-[#333]" style={{ fontSize: 18 }}>
            <span aria-hidden="true">{category.emoji}</span> {category.name}
          </p>
          <p className="font-semibold text-[#666]" style={{ fontSize: 18 }}>
            Word {index + 1}/{total}
          </p>
          <button
            onClick={onClose}
            aria-label="Close lesson and return to home"
            className="flex size-10 items-center justify-center rounded-full text-xl font-bold text-[#333] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#378ADD]"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div
          className="h-1 w-full bg-[#E4E4E4]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Lesson progress: ${pct} percent`}
        >
          <div
            className="ww-fill h-full"
            style={{ ["--ww-fill" as string]: `${pct}%`, backgroundImage: "linear-gradient(90deg,#63C439,#2FB380)" }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-4 pt-[66px]">
        <h1 ref={headingRef} tabIndex={-1} className="sr-only outline-none">
          {word.translations.english} — word {index + 1} of {total} in {category.name}
        </h1>

        {/* Image */}
        <div className="flex justify-center">
          <div
            className="relative w-[90%] max-w-[400px] overflow-hidden rounded-[20px] bg-[#E9E9E9]"
            style={{ aspectRatio: "1 / 1", boxShadow: "0 6px 8px rgba(0,0,0,0.2)" }}
          >
            {imgState !== "loaded" && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#E9E9E9] text-5xl" aria-hidden="true">
                {imgState === "error" ? "🖼️" : ""}
              </div>
            )}
            {imgState !== "error" && (
              <img
                key={word.id}
                src={word.imageUrl}
                alt={`${word.alt} — ${word.translations.english} in English`}
                width={400}
                height={400}
                loading="eager"
                onLoad={() => setImgState("loaded")}
                onError={() => setImgState("error")}
                className={`size-full object-cover transition-opacity duration-300 ${imgState === "loaded" ? "opacity-100" : "opacity-0"}`}
              />
            )}
          </div>
        </div>

        {/* Audio button */}
        <div className="mt-5 flex flex-col items-center">
          <button
            onClick={() => playAudio()}
            aria-label={`Hear the word ${word.translations.english}`}
            className={`flex items-center justify-center rounded-full bg-[#63C439] text-white shadow-lg transition-transform duration-200 hover:scale-110 hover:shadow-[0_0_28px_rgba(99,196,57,0.75)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#378ADD] ${pulsing ? "ww-tap-pulse" : ""}`}
            style={{ width: 120, height: 120, fontSize: 52 }}
          >
            <span aria-hidden="true">🔊</span>
          </button>
          <p className="mt-2 font-semibold text-[#666]" style={{ fontSize: 18 }}>
            Tap to hear
          </p>
          {caption && (
            <p className="mt-1 font-bold text-[#63C439]" style={{ fontSize: 18 }}>
              {caption}
            </p>
          )}
        </div>

        {/* Word display */}
        <section key={word.id} className="ww-slide-up mt-6 text-center">
          <p dir="rtl" lang="ur" className="pb-[10px] font-bold text-[#333]" style={{ fontSize: 36, fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2 }}>
            {word.translations.urdu}
          </p>
          <p lang="hi" className="pb-[10px] font-bold text-[#333]" style={{ fontSize: 36, fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
            {word.translations.hindi}
          </p>
          <p lang="bn" className="pb-[10px] font-bold text-[#333]" style={{ fontSize: 36, fontFamily: "'Noto Sans Bengali', sans-serif" }}>
            {word.translations.bengali}
          </p>
          <p lang="en" className="font-bold uppercase text-[#63C439]" style={{ fontSize: 48, fontFamily: "Arial, sans-serif" }}>
            {word.translations.english}
          </p>
          <p className="text-[#666]" style={{ fontSize: 18 }}>
            {word.phonetic}
          </p>
        </section>
      </main>

      {/* Navigation */}
      <nav
        aria-label="Word navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EEE] bg-white px-4 py-3"
      >
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-3">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            className="w-[45%] rounded-2xl font-bold text-white shadow-md transition active:scale-95 disabled:cursor-not-allowed sm:w-[30%]"
            style={{ height: 70, fontSize: 20, background: index === 0 ? "#BDBDBD" : "#378ADD" }}
          >
            ← Back
          </button>
          <p className="font-semibold text-[#666]" style={{ fontSize: 18 }}>
            {index + 1}/{total}
          </p>
          <button
            onClick={() => (index === total - 1 ? onClose() : go(1))}
            className="ww-next-pulse w-[45%] rounded-2xl bg-[#63C439] font-bold text-white shadow-md transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#378ADD] sm:w-[30%]"
            style={{ height: 70, fontSize: 20 }}
          >
            {index === total - 1 ? "Finish ✓" : "Next →"}
          </button>
        </div>
      </nav>
    </div>
  );
}
