CREATE TABLE public.parent_email_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  timezone text NOT NULL DEFAULT 'UTC',
  send_hour smallint NOT NULL DEFAULT 8,
  last_sent_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.parent_email_subscriptions TO service_role;

ALTER TABLE public.parent_email_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER parent_email_subscriptions_updated_at
BEFORE UPDATE ON public.parent_email_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();