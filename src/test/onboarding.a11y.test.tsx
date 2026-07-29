import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Onboarding } from "@/routes/index";

async function goToConsentStep(user: ReturnType<typeof userEvent.setup>, name = "Aya") {
  await user.click(screen.getByRole("button", { name: /start/i }));
  await user.click(screen.getByRole("button", { name: /Hindi/i }));
  const input = await screen.findByRole("textbox", { name: /What's your name/i });
  await user.clear(input);
  if (name) await user.type(input, name);
  await user.click(screen.getByRole("button", { name: /Next/i }));
  return screen.findByRole("heading", { name: /A grown-up's permission/i });
}

describe("Word Wizard onboarding accessibility", () => {
  beforeEach(() => localStorage.clear());

  it("announces each step in the live region", async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    const live = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(live).toHaveTextContent("Step 1 of 4");

    await user.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(live).toHaveTextContent("Step 2 of 4"));
    expect(live).toHaveTextContent("Which language do you speak at home?");
  });

  it("labels each progress dot with its step number, total and state", () => {
    render(<Onboarding />);
    const dots = screen.getAllByRole("img", { name: /^Step \d of 4:/ });
    expect(dots).toHaveLength(4);
    expect(dots[0]).toHaveAttribute("aria-current", "step");
    expect(dots[0]).toHaveAccessibleName(/current step$/);
    expect(dots[3]).toHaveAccessibleName(/not started$/);
  });

  it("moves focus to the relevant control after a step change", async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    await user.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Which language/i })).toHaveFocus(),
    );

    await user.click(screen.getByRole("button", { name: /Hindi/i }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: /What's your name/i })).toHaveFocus());
  });

  it("traps Tab inside the wizard", async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    const inside = () =>
      document.querySelector("main")?.contains(document.activeElement) ?? false;

    for (let i = 0; i < 12; i++) {
      await user.tab();
      expect(inside()).toBe(true);
    }
    for (let i = 0; i < 12; i++) {
      await user.tab({ shift: true });
      expect(inside()).toBe(true);
    }
  });

  it("shows a focusable error summary listing what blocks continuing", async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await goToConsentStep(user);

    await user.click(screen.getByRole("button", { name: /Accept & Continue/i }));

    const summary = await screen.findByRole("alert", {
      name: /needs? fixing before you can continue/i,
    });
    await waitFor(() => expect(summary).toHaveFocus());
    expect(within(summary).getAllByRole("listitem")).toHaveLength(1);
    expect(summary).toHaveTextContent(/Grown-up permission/i);
  });

  it("navigates from an error-summary link back to the invalid field", async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await goToConsentStep(user, "Aya");

    // Wipe the name so the summary reports the name field too.
    await user.click(screen.getByRole("button", { name: /Go back to step 3/i }));
    const input = await screen.findByRole("textbox", { name: /What's your name/i });
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: /Next/i }));

    // Inline hint appears on the invalid field.
    const inlineError = await waitFor(() => {
      const el = document.getElementById("ww-name-error");
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(inlineError).toHaveAttribute("role", "alert");
    expect(inlineError).toHaveTextContent(/Please enter your name/i);
    expect(screen.getByRole("textbox", { name: /What's your name/i })).toHaveAttribute("aria-invalid", "true");
  });

  it("lists the invalid name field in the summary and jumps to it", async () => {
    const user = userEvent.setup();
    localStorage.setItem("ww_lang", "hi");
    localStorage.setItem("ww_name", "A");
    localStorage.setItem("ww_step", "4");
    render(<Onboarding />);

    await screen.findByRole("heading", { name: /A grown-up's permission/i });
    await user.click(screen.getByRole("button", { name: /Accept & Continue/i }));

    const summary = await screen.findByRole("alert", {
      name: /needs? fixing before you can continue/i,
    });
    const nameLink = within(summary).getByRole("button", { name: /Child's name/i });
    expect(nameLink).toHaveAttribute("data-issue-for", "ww-name-input");

    await user.click(nameLink);
    await waitFor(() => expect(screen.getByRole("textbox", { name: /What's your name/i })).toHaveFocus());
    expect(screen.getByRole("textbox", { name: /What's your name/i })).toHaveAttribute("aria-invalid", "true");
  });

  it("autosaves language and name and restores them on the next visit", async () => {
    const user = userEvent.setup();
    const first = render(<Onboarding />);
    await goToConsentStep(user, "Aya");

    expect(localStorage.getItem("ww_lang")).toBe("hi");
    expect(localStorage.getItem("ww_name")).toBe("Aya");
    expect(localStorage.getItem("ww_step")).toBe("4");

    first.unmount();
    render(<Onboarding />);

    await screen.findByRole("heading", { name: /A grown-up's permission/i });
    expect(screen.getByText(/Aya, by using Word Wizard/i)).toBeInTheDocument();
  });
});
