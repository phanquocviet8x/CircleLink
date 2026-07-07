-- SQL Schema for CircleLink Supabase Backend (Hardened Security Version)
-- Copy and paste this script into the Supabase SQL Editor (https://supabase.com) to initialize your database tables.

-- ==================== 1. TABLES DEFINITIONS ====================

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL, -- Unique together with event_day (see UNIQUE constraint below), not globally unique
  title TEXT NOT NULL,
  description TEXT,
  host_email TEXT, -- Stores the creator email address
  host_id UUID, -- Optional: references auth.users(id) if authentication is set up
  is_checkin_open BOOLEAN DEFAULT true,
  require_phone BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  event_type TEXT DEFAULT 'offline', -- 'offline', 'online', 'hybrid'
  meeting_link TEXT, -- Link to Zoom, Google Meet, Teams, etc.
  admin_token TEXT DEFAULT gen_random_uuid()::text, -- Secure random token for host admin dashboard
  event_date TIMESTAMPTZ NOT NULL, -- When the event takes place (chosen by host at creation)
  duration_days SMALLINT NOT NULL CHECK (duration_days > 0), -- Host-selected lifetime (1/3/7/30 days in the UI)
  event_day DATE NOT NULL, -- Kept in sync by trg_set_event_computed_columns; scopes slug uniqueness per calendar day
  expires_at TIMESTAMPTZ NOT NULL, -- Kept in sync by trg_set_event_computed_columns; = event_date + duration_days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT events_slug_event_day_key UNIQUE (slug, event_day)
);

-- Add index on slug for fast event lookups
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON public.events(expires_at);

-- Trigger keeps event_day/expires_at in sync with event_date/duration_days.
-- (Can't use GENERATED columns here: "timestamptz AT TIME ZONE text" is
-- STABLE, not IMMUTABLE, in Postgres, so generated columns reject it.)
CREATE OR REPLACE FUNCTION public.set_event_computed_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.event_day := (NEW.event_date AT TIME ZONE 'utc')::date;
  NEW.expires_at := NEW.event_date + (NEW.duration_days * INTERVAL '1 day');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_event_computed_columns ON public.events;
CREATE TRIGGER trg_set_event_computed_columns
  BEFORE INSERT OR UPDATE OF event_date, duration_days ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_event_computed_columns();

-- Attendees table (Contains only non-sensitive public info)
CREATE TABLE IF NOT EXISTS public.attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  avatar TEXT DEFAULT 'avatar-1',
  looking TEXT DEFAULT 'Không chia sẻ cụ thể.',
  help TEXT DEFAULT 'Không chia sẻ cụ thể.',
  privacy JSONB DEFAULT '{}'::jsonb, -- Privacy settings (e.g. { "phone": false })
  edit_token TEXT NOT NULL DEFAULT gen_random_uuid()::text, -- Ownership secret; returned only to the guest at check-in. NEVER granted to clients.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index on event_id for fast attendee queries
CREATE INDEX IF NOT EXISTS idx_attendees_event ON public.attendees(event_id);

-- Attendee Contacts table (Separated to protect guest contact details from leaking)
CREATE TABLE IF NOT EXISTS public.attendee_contacts (
  attendee_id UUID PRIMARY KEY REFERENCES public.attendees(id) ON DELETE CASCADE,
  contacts JSONB DEFAULT '{}'::jsonb -- Sensitive details: email, phone, social URLs
);

-- ==================== 2. VIEWS DEFINITIONS ====================

-- Drop existing views first to avoid Postgres 'cannot drop columns from view' error
DROP VIEW IF EXISTS public.events_public CASCADE;
DROP VIEW IF EXISTS public.attendees_public CASCADE;

-- Public Events View (Does not expose host_email or admin_token)
CREATE OR REPLACE VIEW public.events_public 
WITH (security_invoker = true) 
AS 
SELECT
  id,
  slug,
  title,
  description,
  host_id,
  is_checkin_open,
  require_phone,
  is_premium,
  event_type,
  meeting_link,
  event_date,
  duration_days,
  expires_at,
  event_day,
  created_at
FROM public.events;

-- Public Attendees View (Bridges structure if needed, excludes contacts entirely)
CREATE OR REPLACE VIEW public.attendees_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  event_id,
  name,
  role,
  bio,
  avatar,
  looking,
  help,
  privacy,
  created_at
FROM public.attendees;

-- ==================== 3. SECURITY & RLS PERMISSIONS ====================

-- Enable Row Level Security (RLS) on all raw tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendee_contacts ENABLE ROW LEVEL SECURITY;

-- Revoke all direct actions on raw tables for anon/authenticated roles
REVOKE ALL ON public.events FROM anon, authenticated;
REVOKE ALL ON public.attendees FROM anon, authenticated;
REVOKE ALL ON public.attendee_contacts FROM anon, authenticated;

-- Grant column-level SELECT on events (excludes host_email, admin_token) for the view to function
GRANT SELECT (id, slug, title, description, host_id, is_checkin_open, require_phone, is_premium, event_type, meeting_link, event_date, duration_days, expires_at, event_day, created_at)
  ON public.events TO anon, authenticated;

-- Grant column-level SELECT on attendees (no contacts exists here anyway) for the view and Realtime to function
GRANT SELECT (id, event_id, name, role, bio, avatar, looking, help, privacy, created_at) 
  ON public.attendees TO anon, authenticated;

-- Grant SELECT on the public views
GRANT SELECT ON public.events_public TO anon, authenticated;
GRANT SELECT ON public.attendees_public TO anon, authenticated;

-- RLS SELECT policies (REQUIRED: security_invoker views need the caller to pass RLS on base tables).
-- Actual protection of sensitive columns comes from the column-level GRANTs above (host_email,
-- admin_token, edit_token are never granted). attendee_contacts has RLS enabled with NO policy on
-- purpose — it is reachable only via the SECURITY DEFINER RPC functions below.
DROP POLICY IF EXISTS "public_read_events" ON public.events;
DROP POLICY IF EXISTS "public_read_attendees" ON public.attendees;
CREATE POLICY "public_read_events" ON public.events
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_attendees" ON public.attendees
  FOR SELECT TO anon, authenticated USING (true);

-- Allow Realtime replication to subscribe to the attendees table safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE c.relname = 'attendees' AND p.pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendees;
  END IF;
END $$;

-- ==================== 4. SECURE SERVER-SIDE RPC FUNCTIONS ====================

-- Drop existing functions first to avoid Postgres 'cannot change return type of existing function' error
DROP FUNCTION IF EXISTS public.create_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_event(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TIMESTAMPTZ, SMALLINT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_event(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_attendees(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_kick_attendee(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reset_event(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.checkin_attendee(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.get_attendee_self(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_attendee_self(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_attendee_self(UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.update_attendee_self(UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.delete_attendee_self(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.delete_attendee_self(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_attendee_contact(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_regenerate_token(TEXT, TEXT) CASCADE;

-- A. Create Event (Returns new event including admin_token to the creator)
-- p_event_date + p_duration_days are required: the host picks when the event
-- happens and how long its link/data stays alive (1, 3, 7 or 30 days). Slugs
-- are only unique per calendar day (event_day), so two hosts can reuse the
-- same event name as long as it's not the same day.
CREATE OR REPLACE FUNCTION public.create_event(
  p_slug TEXT,
  p_title TEXT,
  p_description TEXT,
  p_host_email TEXT,
  p_event_type TEXT,
  p_meeting_link TEXT,
  p_event_date TIMESTAMPTZ,
  p_duration_days SMALLINT
)
RETURNS public.events
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_new_event public.events;
  v_recent INTEGER;
  v_email TEXT;
  v_existing INTEGER;
  v_event_day DATE;
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 OR p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'INVALID_INPUT';
  END IF;

  IF p_event_date IS NULL THEN
    RAISE EXCEPTION 'EVENT_DATE_REQUIRED';
  END IF;

  -- Small grace window for clock skew / an event that has already started
  IF p_event_date < (now() - interval '2 hours') THEN
    RAISE EXCEPTION 'EVENT_DATE_IN_PAST';
  END IF;

  IF p_duration_days IS NULL OR p_duration_days NOT IN (1, 3, 7, 30) THEN
    RAISE EXCEPTION 'INVALID_DURATION';
  END IF;

  -- Reject unsafe meeting links (only http/https allowed)
  IF p_meeting_link IS NOT NULL AND length(trim(p_meeting_link)) > 0
     AND p_meeting_link !~* '^https?://' THEN
    RAISE EXCEPTION 'INVALID_MEETING_LINK';
  END IF;

  -- Host email comes ONLY from the verified JWT. p_host_email is ignored
  -- (kept in the signature for frontend compatibility) so it can never be spoofed.
  v_email := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'LOGIN_REQUIRED';
  END IF;

  -- Basic flood guard against scripted spam bursts
  SELECT COUNT(*) INTO v_recent FROM public.events
  WHERE created_at > now() - interval '10 seconds';
  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;

  -- One active event per host email at a time
  SELECT COUNT(*) INTO v_existing FROM public.events
  WHERE lower(host_email) = v_email;
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'HOST_EVENT_LIMIT';
  END IF;

  -- Slug collisions are only blocked on the same calendar day
  v_event_day := (p_event_date AT TIME ZONE 'utc')::date;
  IF EXISTS (SELECT 1 FROM public.events WHERE slug = p_slug AND event_day = v_event_day) THEN
    RAISE EXCEPTION 'SLUG_DATE_TAKEN';
  END IF;

  INSERT INTO public.events (
    slug, title, description, host_email, event_type, meeting_link, admin_token,
    event_date, duration_days
  ) VALUES (
    p_slug, p_title, p_description, v_email, p_event_type, p_meeting_link, gen_random_uuid()::text,
    p_event_date, p_duration_days
  )
  RETURNING * INTO v_new_event;
  RETURN v_new_event;
END;
$$ LANGUAGE plpgsql;

-- A2. Get the event hosted by the currently authenticated user (email from JWT only).
--     Returns public fields only; never exposes admin_token. Authenticated-only.
DROP FUNCTION IF EXISTS public.get_my_hosted_event() CASCADE;
CREATE OR REPLACE FUNCTION public.get_my_hosted_event()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  description TEXT,
  event_type TEXT,
  event_date TIMESTAMPTZ,
  duration_days SMALLINT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  admin_token TEXT
)
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_email TEXT;
BEGIN
  v_email := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  IF v_email = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT e.id, e.slug, e.title, e.description, e.event_type, e.event_date, e.duration_days, e.expires_at, e.created_at, e.admin_token
  FROM public.events e
  WHERE lower(e.host_email) = v_email
  ORDER BY e.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- B. Update Event Configuration (Authorized by admin_token)
CREATE OR REPLACE FUNCTION public.admin_update_event(
  p_slug TEXT,
  p_token TEXT,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_is_checkin_open BOOLEAN DEFAULT NULL,
  p_require_phone BOOLEAN DEFAULT NULL,
  p_is_premium BOOLEAN DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL,
  p_meeting_link TEXT DEFAULT NULL,
  p_event_date TIMESTAMPTZ DEFAULT NULL,
  p_duration_days SMALLINT DEFAULT NULL
)
RETURNS public.events
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_updated_event public.events;
BEGIN
  IF p_meeting_link IS NOT NULL AND length(trim(p_meeting_link)) > 0
     AND p_meeting_link !~* '^https?://' THEN
    RAISE EXCEPTION 'INVALID_MEETING_LINK';
  END IF;

  IF p_duration_days IS NOT NULL AND p_duration_days NOT IN (1, 3, 7, 30) THEN
    RAISE EXCEPTION 'INVALID_DURATION';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.events WHERE slug = p_slug AND admin_token = p_token
  ) THEN
    UPDATE public.events
    SET
      title = COALESCE(p_title, title),
      description = COALESCE(p_description, description),
      is_checkin_open = COALESCE(p_is_checkin_open, is_checkin_open),
      require_phone = COALESCE(p_require_phone, require_phone),
      is_premium = COALESCE(p_is_premium, is_premium),
      event_type = COALESCE(p_event_type, event_type),
      meeting_link = COALESCE(p_meeting_link, meeting_link),
      event_date = COALESCE(p_event_date, event_date),
      duration_days = COALESCE(p_duration_days, duration_days)
    WHERE slug = p_slug
    RETURNING * INTO v_updated_event;
    RETURN v_updated_event;
  ELSE
    RAISE EXCEPTION 'Unauthorized admin token';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- C. Delete Event (Authorized by admin_token)
CREATE OR REPLACE FUNCTION public.admin_delete_event(
  p_slug TEXT,
  p_token TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.events WHERE slug = p_slug AND admin_token = p_token
  ) THEN
    DELETE FROM public.events WHERE slug = p_slug;
  ELSE
    RAISE EXCEPTION 'Unauthorized admin token';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- D. Fetch All Attendees with Contacts (Authorized by admin_token for Host Dashboard)
CREATE OR REPLACE FUNCTION public.admin_get_attendees(
  p_event_id UUID,
  p_slug TEXT,
  p_token TEXT
)
RETURNS TABLE (
  id UUID,
  event_id UUID,
  name TEXT,
  role TEXT,
  bio TEXT,
  avatar TEXT,
  looking TEXT,
  help TEXT,
  contacts JSONB,
  privacy JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND slug = p_slug AND admin_token = p_token
  ) THEN
    RETURN QUERY
    SELECT
      a.id,
      a.event_id,
      a.name,
      a.role,
      a.bio,
      a.avatar,
      a.looking,
      a.help,
      COALESCE(c.contacts, '{}'::jsonb) AS contacts,
      a.privacy,
      a.created_at
    FROM public.attendees a
    LEFT JOIN public.attendee_contacts c ON a.id = c.attendee_id
    WHERE a.event_id = p_event_id
    ORDER BY a.created_at DESC;
  ELSE
    RAISE EXCEPTION 'Unauthorized admin token';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- E. Kick Attendee (Authorized by admin_token)
CREATE OR REPLACE FUNCTION public.admin_kick_attendee(
  p_attendee_id UUID,
  p_slug TEXT,
  p_token TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.events WHERE slug = p_slug AND admin_token = p_token
  ) THEN
    DELETE FROM public.attendees WHERE id = p_attendee_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized admin token';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- F. Reset Event / Clear Check-ins (Authorized by admin_token)
CREATE OR REPLACE FUNCTION public.admin_reset_event(
  p_event_id UUID,
  p_slug TEXT,
  p_token TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.events WHERE id = p_event_id AND slug = p_slug AND admin_token = p_token
  ) THEN
    DELETE FROM public.attendees WHERE event_id = p_event_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized admin token';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- G. Check-in Guest (Inserts to both tables, enforces limit <= 50 for non-premium, checks if gate open)
CREATE OR REPLACE FUNCTION public.checkin_attendee(
  p_event_id UUID,
  p_name TEXT,
  p_role TEXT,
  p_bio TEXT,
  p_avatar TEXT,
  p_looking TEXT,
  p_help TEXT,
  p_contacts JSONB,
  p_privacy JSONB
)
RETURNS JSONB
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_is_checkin_open BOOLEAN;
  v_count INTEGER;
  v_recent INTEGER;
  v_new_attendee_id UUID;
  v_new_attendee JSONB;
BEGIN
  -- 1. Check if event exists and check-in is open
  SELECT is_premium, is_checkin_open INTO v_is_premium, v_is_checkin_open
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND';
  END IF;

  IF NOT v_is_checkin_open THEN
    RAISE EXCEPTION 'CHECKIN_CLOSED';
  END IF;

  -- 1b. Basic per-event flood control (max 10 check-ins / 10s)
  SELECT COUNT(*) INTO v_recent FROM public.attendees
  WHERE event_id = p_event_id AND created_at > now() - interval '10 seconds';
  IF v_recent >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;

  -- 2. Check attendee limit for non-premium
  IF NOT v_is_premium THEN
    SELECT COUNT(*) INTO v_count
    FROM public.attendees
    WHERE event_id = p_event_id;
    
    IF v_count >= 50 THEN
      RAISE EXCEPTION 'LIMIT_EXCEEDED';
    END IF;
  END IF;

  -- 3. Insert public info
  INSERT INTO public.attendees (
    event_id, name, role, bio, avatar, looking, help, privacy
  ) VALUES (
    p_event_id, p_name, p_role, p_bio, p_avatar, p_looking, p_help, p_privacy
  )
  RETURNING id INTO v_new_attendee_id;

  -- 4. Insert contact details
  INSERT INTO public.attendee_contacts (
    attendee_id, contacts
  ) VALUES (
    v_new_attendee_id, p_contacts
  );

  -- 5. Return merged data
  SELECT to_jsonb(a.*) || jsonb_build_object('contacts', p_contacts) INTO v_new_attendee
  FROM public.attendees a
  WHERE a.id = v_new_attendee_id;
  
  RETURN v_new_attendee;
END;
$$ LANGUAGE plpgsql;

-- H. Get Guest's Own Profile (Using their secure attendee UUID)
-- Requires the matching edit_token; returns NULL for a wrong/missing token.
CREATE OR REPLACE FUNCTION public.get_attendee_self(
  p_attendee_id UUID,
  p_edit_token TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_attendee JSONB;
  v_contacts JSONB;
BEGIN
  SELECT to_jsonb(a.*) INTO v_attendee
  FROM public.attendees a
  WHERE a.id = p_attendee_id AND a.edit_token = p_edit_token;

  IF v_attendee IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT contacts INTO v_contacts
  FROM public.attendee_contacts
  WHERE attendee_id = p_attendee_id;

  v_attendee := v_attendee - 'edit_token'; -- never expose the secret
  RETURN v_attendee || jsonb_build_object('contacts', COALESCE(v_contacts, '{}'::jsonb));
END;
$$ LANGUAGE plpgsql;

-- I. Update Guest's Own Profile (Using their secure attendee UUID)
CREATE OR REPLACE FUNCTION public.update_attendee_self(
  p_attendee_id UUID,
  p_edit_token TEXT,
  p_data JSONB
)
RETURNS JSONB
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_updated_row JSONB;
  v_contacts JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.attendees WHERE id = p_attendee_id AND edit_token = p_edit_token
  ) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  -- Update attendees table
  UPDATE public.attendees
  SET
    name = COALESCE((p_data->>'name'), name),
    role = COALESCE((p_data->>'role'), role),
    bio = COALESCE((p_data->>'bio'), bio),
    avatar = COALESCE((p_data->>'avatar'), avatar),
    looking = COALESCE((p_data->>'looking'), looking),
    help = COALESCE((p_data->>'help'), help),
    privacy = COALESCE((p_data->'privacy'), privacy)
  WHERE id = p_attendee_id;
  
  -- Update attendee_contacts table
  IF p_data ? 'contacts' THEN
    INSERT INTO public.attendee_contacts (attendee_id, contacts)
    VALUES (p_attendee_id, p_data->'contacts')
    ON CONFLICT (attendee_id)
    DO UPDATE SET contacts = EXCLUDED.contacts;
  END IF;

  -- Get updated contacts
  SELECT contacts INTO v_contacts FROM public.attendee_contacts WHERE attendee_id = p_attendee_id;

  -- Return merged updated row (edit_token stripped)
  SELECT (to_jsonb(a.*) - 'edit_token') || jsonb_build_object('contacts', COALESCE(v_contacts, '{}'::jsonb)) INTO v_updated_row
  FROM public.attendees a
  WHERE a.id = p_attendee_id;

  RETURN v_updated_row;
END;
$$ LANGUAGE plpgsql;

-- J. Delete Guest's Own Profile (Requires matching edit_token)
CREATE OR REPLACE FUNCTION public.delete_attendee_self(
  p_attendee_id UUID,
  p_edit_token TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.attendees WHERE id = p_attendee_id AND edit_token = p_edit_token
  ) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  DELETE FROM public.attendees WHERE id = p_attendee_id;
END;
$$ LANGUAGE plpgsql;

-- K. Get Contact Details (Filters contacts based on target's privacy, requires requester check-in)
CREATE OR REPLACE FUNCTION public.get_attendee_contact(
  p_attendee_id UUID,
  p_event_id UUID,
  p_requester_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_contacts JSONB;
  v_privacy JSONB;
  v_result JSONB := '{}'::jsonb;
  v_key TEXT;
BEGIN
  -- 1. Requester is REQUIRED and must be checked into the same event.
  --    (A NULL requester previously bypassed this check, allowing contact
  --     harvesting by anyone who knew an attendee_id + event_id.)
  IF p_requester_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.attendees
    WHERE id = p_requester_id AND event_id = p_event_id
  ) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: requester must be checked into this event';
  END IF;

  -- 2. Fetch contacts and privacy
  SELECT c.contacts, a.privacy INTO v_contacts, v_privacy
  FROM public.attendees a
  LEFT JOIN public.attendee_contacts c ON a.id = c.attendee_id
  WHERE a.id = p_attendee_id AND a.event_id = p_event_id;

  IF NOT FOUND OR v_contacts IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  -- 3. Filter contacts based on privacy
  FOR v_key IN SELECT jsonb_object_keys(v_contacts) LOOP
    IF (v_privacy ->> v_key) IS DISTINCT FROM 'false' THEN
      v_result := jsonb_set(v_result, ARRAY[v_key], v_contacts -> v_key);
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- L. Rotate the host admin token (Authorized by current admin_token)
CREATE OR REPLACE FUNCTION public.admin_regenerate_token(
  p_slug TEXT,
  p_token TEXT
)
RETURNS TEXT
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_new_token TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.events WHERE slug = p_slug AND admin_token = p_token) THEN
    v_new_token := gen_random_uuid()::text;
    UPDATE public.events SET admin_token = v_new_token WHERE slug = p_slug;
    RETURN v_new_token;
  ELSE
    RAISE EXCEPTION 'Unauthorized admin token';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- M. Purge Expired Events (internal only — invoked by the pg_cron job below,
--    never exposed over the REST API). Deletes an event, and cascades to its
--    attendees/attendee_contacts, 24 hours after the event's expires_at.
CREATE OR REPLACE FUNCTION public.purge_expired_events()
RETURNS void
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  DELETE FROM public.events WHERE expires_at < (now() - interval '24 hours');
END;
$$ LANGUAGE plpgsql;

-- Schedule the purge to run hourly. Requires the pg_cron extension
-- (Supabase: Database > Extensions > pg_cron, or `CREATE EXTENSION pg_cron;`).
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-expired-events';
EXCEPTION WHEN OTHERS THEN
  NULL; -- pg_cron not installed yet / no prior job — safe to ignore
END $$;

SELECT cron.schedule('purge-expired-events', '0 * * * *', $$SELECT public.purge_expired_events();$$);

-- ==================== 5. RPC EXECUTION GRANTS ====================

-- create_event requires a signed-in user (JWT email); never grant to anon
REVOKE ALL ON FUNCTION public.create_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, SMALLINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_event(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TIMESTAMPTZ, SMALLINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_event(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_attendees(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_kick_attendee(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_event(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_regenerate_token(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_attendee(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendee_self(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_attendee_self(UUID, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_attendee_self(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendee_contact(UUID, UUID, UUID) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_hosted_event() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_hosted_event() TO authenticated;
-- purge_expired_events is for the internal pg_cron job only — never expose it over the REST API
REVOKE ALL ON FUNCTION public.purge_expired_events() FROM PUBLIC, anon, authenticated;


-- ==================== 6. DATABASE MIGRATION FOR EXISTING SYSTEM ====================
-- If you already created tables, copy/paste and execute these statements to migrate existing data:
--
-- DROP VIEW IF EXISTS public.events_public CASCADE;
-- DROP VIEW IF EXISTS public.attendees_public CASCADE;
--
-- ALTER TABLE public.events ADD COLUMN IF NOT EXISTS admin_token TEXT DEFAULT gen_random_uuid()::text;
--
-- CREATE TABLE IF NOT EXISTS public.attendee_contacts (
--   attendee_id UUID PRIMARY KEY REFERENCES public.attendees(id) ON DELETE CASCADE,
--   contacts JSONB DEFAULT '{}'::jsonb
-- );
--
-- INSERT INTO public.attendee_contacts (attendee_id, contacts)
-- SELECT id, contacts FROM public.attendees
-- ON CONFLICT (attendee_id) DO NOTHING;
--
-- ALTER TABLE public.attendees DROP COLUMN IF EXISTS contacts;
