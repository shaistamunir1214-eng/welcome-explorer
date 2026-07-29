import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/keyboard-accessibility")({
  head: () => ({
    meta: [
      { title: "Keyboard Accessibility Checklist — Word Wizard" },
      {
        name: "description",
        content:
          "How keyboard focus moves through the Word Wizard onboarding wizard, its progress dots, and its consent error summary.",
      },
      { property: "og:title", content: "Keyboard Accessibility Checklist — Word Wizard" },
      {
        property: "og:description",
        content:
          "A short keyboard-only checklist covering focus order, live announcements, and error recovery in Word Wizard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KeyboardChecklist,
});

type Item = { keys: string; what: string };

const SECTIONS: { heading: string; intro: string; items: Item[] }[] = [
  {
    heading: "Moving through the wizard",
    intro: "Focus is trapped inside the onboarding flow, so Tab never escapes into stale content.",
    items: [
      { keys: "Tab / Shift + Tab", what: "Cycles through the controls of the current step only, wrapping at each end." },
      { keys: "Enter / Space", what: "Activates the focused button, checkbox, or form submit." },
      { keys: "Enter (in the name field)", what: "Submits the name and moves to the permission step." },
    ],
  },
  {
    heading: "Landing on the right control",
    intro: "Every step change moves focus for you — you never have to hunt for it.",
    items: [
      { keys: "Going forward", what: "Focus lands on the step's main input, or on the step heading when there is no input." },
      { keys: "Going back", what: "Focus returns to the choice you already made, such as your selected language." },
      { keys: "Finishing", what: "Focus moves to the heading of the home screen once onboarding completes." },
    ],
  },
  {
    heading: "Announcements and progress dots",
    intro: "A polite live region announces each transition; the dots expose the same information.",
    items: [
      { keys: "On every step change", what: 'The live region announces "Step 2 of 4" plus that step\'s title.' },
      { keys: "Progress dots", what: "Each dot is labelled with its step number, total steps, title, and whether it is completed, current, or not started." },
      { keys: "Restored progress", what: "Returning later announces that your saved language and name were restored." },
    ],
  },
  {
    heading: "Fixing errors on the permission step",
    intro: "Errors are reported both as a summary and next to the field they belong to.",
    items: [
      { keys: "Accept & Continue with problems", what: "Focus jumps to an error summary at the top listing everything that needs fixing." },
      { keys: "Tab, then Enter on a summary item", what: "Jumps straight to the field to fix — including back to the language or name step." },
      { keys: "Inline hints", what: "Each invalid field is marked invalid and describes its own error message." },
    ],
  },
];

function KeyboardChecklist() {
  return (
    <main
      className="min-h-dvh w-full px-4 py-10"
      style={{
        fontFamily: "'Fredoka', system-ui, sans-serif",
        backgroundImage: "linear-gradient(160deg, #63C439 0%, #378ADD 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-[720px] rounded-[30px] bg-white p-6 shadow-2xl sm:p-10">
        <h1 className="font-bold text-[#1c6b12]" style={{ fontSize: "clamp(26px, 5vw, 36px)" }}>
          Keyboard-only accessibility checklist
        </h1>
        <p className="mt-3 font-medium text-slate-700" style={{ fontSize: 18 }}>
          Everything in Word Wizard onboarding works without a mouse. Here is exactly how focus
          moves, what gets announced, and how to recover from mistakes.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="font-bold text-[#1c6b12]" style={{ fontSize: 22 }}>
              {section.heading}
            </h2>
            <p className="mt-1 font-medium text-slate-600" style={{ fontSize: 16 }}>
              {section.intro}
            </p>
            <ul className="mt-3 space-y-3">
              {section.items.map((item) => (
                <li
                  key={item.keys}
                  className="rounded-2xl bg-[#63C439]/10 p-4 text-slate-800"
                  style={{ fontSize: 17 }}
                >
                  <span className="font-bold text-[#1c6b12]">{item.keys}</span>
                  <span className="mx-2" aria-hidden="true">
                    —
                  </span>
                  <span>{item.what}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <Link
          to="/"
          className="ww-tap mt-10 inline-flex min-h-14 items-center rounded-2xl bg-[#378ADD] px-6 font-bold text-white shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1c6b12]"
          style={{ fontSize: 19 }}
        >
          ← Back to the wizard
        </Link>
      </div>
    </main>
  );
}
