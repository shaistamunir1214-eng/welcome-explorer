import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  enabled: z.boolean(),
  timezone: z.string().trim().min(1).max(64),
});

/**
 * Subscribes / unsubscribes a parent from the daily progress summary email.
 * Runs server-side with elevated access; the table is not readable from the browser.
 */
export const saveDailySummaryPreference = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("parent_email_subscriptions")
      .upsert(
        {
          email: data.email,
          enabled: data.enabled,
          timezone: data.timezone,
        },
        { onConflict: "email" },
      );

    if (error) {
      console.error("[parent-email] failed to save preference", error);
      throw new Error("We could not save your email reminder. Please try again.");
    }

    return { ok: true as const, enabled: data.enabled, email: data.email };
  });
