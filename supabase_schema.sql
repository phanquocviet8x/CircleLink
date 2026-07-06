-- SQL Schema for CircleLink Supabase Backend (Hardened Security Version)
-- Copy and paste this script into the Supabase SQL Editor (https://supabase.com) to initialize your database tables.

-- ==================== 1. TABLES DEFINITIONS ====================

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index on slug for fast event lookups
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);

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
GRANT SELECT (id, slug, title, description, host_id, is_checkin_open, require_phone, is_premium, event_type, meeting_link, created_at) 
  ON public.events TO anon, authenticated;

-- Grant column-level SELECT on attendees (no contacts exists here anyway) for the view and Realtime to function
GRANT SELECT (id, event_id, name, role, bio, avatar, looking, help, privacy, created_at) 
  ON public.attendees TO anon, authenticated;

-- Grant SELECT on the public views
GRANT SELECT ON public.events_public TO anon, authenticated;
GRANT SELECT ON public.attendees_public TO anon, authenticated;

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
DROP FUNCTION IF EXISTS public.admin_update_event(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_event(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_attendees(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_kick_attendee(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reset_event(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.checkin_attendee(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.get_attendee_self(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_attendee_self(UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.delete_attendee_self(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_attendee_contact(UUID, UUID, UUID) CASCADE;

-- A. Create Event (Returns new event including admin_token to the creator)
CREATE OR REPLACE FUNCTION public.create_event(
  p_slug TEXT,
  p_title TEXT,
  p_description TEXT,
  p_host_email TEXT,
  p_event_type TEXT,
  p_meeting_link TEXT
)
RETURNS public.events
SECURITY DEFINER
AS $$
DECLARE
  v_new_event public.events;
BEGIN
  INSERT INTO public.events (
    slug, title, description, host_email, event_type, meeting_link, admin_token
  ) VALUES (
    p_slug, p_title, p_description, p_host_email, p_event_type, p_meeting_link, gen_random_uuid()::text
  )
  RETURNING * INTO v_new_event;
  RETURN v_new_event;
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
  p_meeting_link TEXT DEFAULT NULL
)
RETURNS public.events
SECURITY DEFINER
AS $$
DECLARE
  v_updated_event public.events;
BEGIN
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
      meeting_link = COALESCE(p_meeting_link, meeting_link)
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
AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_is_checkin_open BOOLEAN;
  v_count INTEGER;
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
CREATE OR REPLACE FUNCTION public.get_attendee_self(
  p_attendee_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_attendee JSONB;
  v_contacts JSONB;
BEGIN
  SELECT to_jsonb(a.*) INTO v_attendee
  FROM public.attendees a
  WHERE a.id = p_attendee_id;
  
  IF v_attendee IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT contacts INTO v_contacts
  FROM public.attendee_contacts
  WHERE attendee_id = p_attendee_id;
  
  RETURN v_attendee || jsonb_build_object('contacts', COALESCE(v_contacts, '{}'::jsonb));
END;
$$ LANGUAGE plpgsql;

-- I. Update Guest's Own Profile (Using their secure attendee UUID)
CREATE OR REPLACE FUNCTION public.update_attendee_self(
  p_attendee_id UUID,
  p_data JSONB
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_updated_row JSONB;
  v_contacts JSONB;
BEGIN
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

  -- Return merged updated row
  SELECT to_jsonb(a.*) || jsonb_build_object('contacts', COALESCE(v_contacts, '{}'::jsonb)) INTO v_updated_row
  FROM public.attendees a
  WHERE a.id = p_attendee_id;
  
  RETURN v_updated_row;
END;
$$ LANGUAGE plpgsql;

-- J. Delete Guest's Own Profile (Using their secure attendee UUID)
CREATE OR REPLACE FUNCTION public.delete_attendee_self(
  p_attendee_id UUID
)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
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
AS $$
DECLARE
  v_contacts JSONB;
  v_privacy JSONB;
  v_result JSONB := '{}'::jsonb;
  v_key TEXT;
BEGIN
  -- 1. Verify requester is checked in to the same event
  IF p_requester_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.attendees 
      WHERE id = p_requester_id AND event_id = p_event_id
    ) THEN
      RAISE EXCEPTION 'Requester is not checked into this event';
    END IF;
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

-- ==================== 5. RPC EXECUTION GRANTS ====================

GRANT EXECUTE ON FUNCTION public.create_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_event(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_event(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_attendees(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_kick_attendee(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_event(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_attendee(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendee_self(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_attendee_self(UUID, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_attendee_self(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendee_contact(UUID, UUID, UUID) TO anon, authenticated;


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
