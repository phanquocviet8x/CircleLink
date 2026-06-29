-- SQL Schema for CircleLink Supabase Backend
-- Copy and paste this script into the Supabase SQL Editor (https://supabase.com) to initialize your database tables.

-- 1. Create the Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  host_email TEXT, -- Stores the creator email address
  host_id UUID, -- Optional: references auth.users(id) if authentication is set up
  is_checkin_open BOOLEAN DEFAULT true,
  require_phone BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index on slug for fast event lookups
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);

-- 2. Create the Attendees table
CREATE TABLE IF NOT EXISTS public.attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  avatar TEXT DEFAULT 'avatar-1',
  looking TEXT DEFAULT 'Không chia sẻ cụ thể.',
  help TEXT DEFAULT 'Không chia sẻ cụ thể.',
  contacts JSONB DEFAULT '{}'::jsonb,
  privacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index on event_id for fast attendee queries
CREATE INDEX IF NOT EXISTS idx_attendees_event ON public.attendees(event_id);

-- 3. Enable Realtime database broadcasting for attendees table
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendees;

-- Enable Realtime database broadcasting for events table (optional, for remote admin updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- Note on Row Level Security (RLS):
-- By default, tables are secure. To allow public guest submissions and viewing:
-- Run the following queries to allow all reads and inserts (for basic prototype staging):

ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees DISABLE ROW LEVEL SECURITY;

-- If you prefer RLS enabled, create Policies in the Supabase Dashboard:
-- Policy 1: Enable Read access to everyone for events and attendees.
-- Policy 2: Enable Insert access to everyone for attendees (to check in).
-- Policy 3: Enable Insert/Update access to authenticated hosts for events.
