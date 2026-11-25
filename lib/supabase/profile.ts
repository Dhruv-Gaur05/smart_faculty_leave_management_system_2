import fs from 'fs';
import path from 'path';
import { Profile } from '@/types/database';

const DATA_FILE = path.join(process.cwd(), 'data', 'profiles.json');

function readFallbackProfiles(): Profile[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read fallback profiles:', e);
  }
  return [];
}

function writeFallbackProfiles(profiles: Profile[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write fallback profiles:', e);
  }
}

/**
 * Fetch profile by user ID or email
 */
export async function fetchProfileByIdOrEmail(identifier: string): Promise<Profile | null> {
  // 1. Try Supabase
  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .or(`id.eq.${identifier},email.eq.${identifier}`)
      .limit(1)
      .single();

    if (!error && data) {
      return data as Profile;
    }
  } catch {
    // Continue to fallback
  }

  // 2. Fallback store
  const all = readFallbackProfiles();
  const match = all.find((p) => p.id === identifier || p.email.toLowerCase() === identifier.toLowerCase());
  return match || null;
}

/**
 * Update user profile details (avatar, signature, phone, room, emergency contact)
 */
export async function saveProfileDetails(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  let updatedRecord: Profile | null = null;

  // 1. Update in Supabase
  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('profiles')
      .update({
        phone: updates.phone,
        avatar_url: updates.avatar_url,
        signature_url: updates.signature_url,
        room_number: updates.room_number,
        emergency_contact: updates.emergency_contact,
        ...(updates.name ? { name: updates.name } : {}),
      })
      .eq('id', userId)
      .select()
      .single();

    if (!error && data) {
      updatedRecord = data as Profile;
    }
  } catch {
    // Continue to fallback
  }

  // 2. Always sync with fallback local store
  const all = readFallbackProfiles();
  const idx = all.findIndex((p) => p.id === userId || (updates.email && p.email.toLowerCase() === updates.email.toLowerCase()));

  if (idx >= 0) {
    all[idx] = {
      ...all[idx],
      ...updates,
      id: all[idx].id,
      email: all[idx].email,
      role: all[idx].role,
      employee_id: all[idx].employee_id,
    };
    writeFallbackProfiles(all);
    return updatedRecord || all[idx];
  } else {
    const newP: Profile = {
      id: userId,
      employee_id: updates.employee_id || `BTU-${Date.now().toString().slice(-4)}`,
      name: updates.name || 'University Faculty Member',
      email: updates.email || '',
      role: updates.role || 'faculty',
      department_id: updates.department_id || null,
      designation: updates.designation || 'Academic Staff',
      phone: updates.phone || null,
      avatar_url: updates.avatar_url || null,
      signature_url: updates.signature_url || null,
      room_number: updates.room_number || null,
      emergency_contact: updates.emergency_contact || null,
      created_at: new Date().toISOString(),
    };
    all.push(newP);
    writeFallbackProfiles(all);
    return updatedRecord || newP;
  }
}
