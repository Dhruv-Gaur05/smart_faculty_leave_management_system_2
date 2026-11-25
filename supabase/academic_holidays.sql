-- ==============================================================================
-- ACADEMIC CALENDAR & PUBLIC HOLIDAYS SCHEMA
-- Smart Faculty Leave Management System
-- ==============================================================================

CREATE TABLE IF NOT EXISTS academic_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date DATE NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'gazetted' CHECK (type IN ('gazetted', 'restricted', 'vacation', 'exam')),
    description TEXT,
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for date queries and range searches
CREATE INDEX IF NOT EXISTS idx_academic_holidays_date ON academic_holidays(date);
CREATE INDEX IF NOT EXISTS idx_academic_holidays_academic_year ON academic_holidays(academic_year);

-- Enable RLS
ALTER TABLE academic_holidays ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (Faculty, HOD, Admin) to view holidays
DROP POLICY IF EXISTS "Allow authenticated users to read holidays" ON academic_holidays;
CREATE POLICY "Allow authenticated users to read holidays" ON academic_holidays
    FOR SELECT TO authenticated USING (true);

-- Allow Admins and HODs to manage holidays
DROP POLICY IF EXISTS "Allow admins to manage holidays" ON academic_holidays;
CREATE POLICY "Allow admins to manage holidays" ON academic_holidays
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hod'))
    );

-- Seed Data: Standard University Gazetted Holidays 2026-2027
INSERT INTO academic_holidays (title, date, type, description, academic_year) VALUES
    ('Republic Day', '2026-01-26', 'gazetted', 'National Holiday', '2026-2027'),
    ('Maha Shivratri', '2026-02-15', 'gazetted', 'University Closed', '2026-2027'),
    ('Holi', '2026-03-04', 'gazetted', 'Festival of Colours', '2026-2027'),
    ('Good Friday', '2026-04-03', 'gazetted', 'Christian Religious Holiday', '2026-2027'),
    ('Eid-ul-Fitr', '2026-03-21', 'gazetted', 'Islamic Festival (subject to moon sighting)', '2026-2027'),
    ('Mahavir Jayanti', '2026-04-01', 'gazetted', 'Religious Holiday', '2026-2027'),
    ('Buddha Purnima', '2026-05-01', 'gazetted', 'Gazetted Holiday', '2026-2027'),
    ('Summer Vacation', '2026-06-01', 'vacation', 'Annual Faculty Summer Break Begins', '2026-2027'),
    ('Independence Day', '2026-08-15', 'gazetted', 'National Celebration Day', '2026-2027'),
    ('Milad-un-Nabi', '2026-08-26', 'gazetted', 'Prophet Birthday', '2026-2027'),
    ('Mahatma Gandhi Jayanti', '2026-10-02', 'gazetted', 'National Holiday', '2026-2027'),
    ('Dussehra (Vijay Dashami)', '2026-10-20', 'gazetted', 'Festival Holiday', '2026-2027'),
    ('Diwali (Deepavali)', '2026-11-09', 'gazetted', 'Festival of Lights', '2026-2027'),
    ('Govardhan Puja', '2026-11-10', 'restricted', 'Restricted Holiday', '2026-2027'),
    ('Bhai Dooj', '2026-11-11', 'restricted', 'Restricted Holiday', '2026-2027'),
    ('Guru Nanak Jayanti', '2026-11-24', 'gazetted', 'Sikh Holiday', '2026-2027'),
    ('Christmas Day', '2026-12-25', 'gazetted', 'Christian Holiday', '2026-2027'),
    ('Winter Vacation', '2026-12-28', 'vacation', 'Annual Winter Break', '2026-2027')
ON CONFLICT (date) DO NOTHING;
