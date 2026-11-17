import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '@/types/database';

function getCleanSupabaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

/**
 * Checks if the server-only SUPABASE_SERVICE_ROLE_KEY is configured with a real key.
 */
export function isServiceRoleConfigured(): boolean {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const url = getCleanSupabaseUrl();

  return Boolean(
    url &&
    serviceKey &&
    !url.includes('your-project-id') &&
    !url.includes('placeholder') &&
    !serviceKey.includes('your-supabase-service-role') &&
    !serviceKey.includes('placeholder') &&
    serviceKey.trim().length > 20
  );
}

/**
 * Creates a privileged Supabase Admin client using the server-only service role key.
 * NEVER import or call this from client components.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const url = getCleanSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!isServiceRoleConfigured()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server.');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface VerifiedCaller {
  userId: string;
  email: string;
  profile: Profile;
}

/**
 * Verifies the caller's Supabase JWT token from the Authorization header
 * and loads their authoritative role and department from public.profiles.
 */
export async function verifyRequestCaller(
  request: Request
): Promise<{ caller: VerifiedCaller | null; error: string | null; status: number }> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      caller: null,
      error: 'Missing or invalid Authorization bearer token.',
      status: 401,
    };
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();
  if (!accessToken) {
    return {
      caller: null,
      error: 'Empty authentication token.',
      status: 401,
    };
  }

  const url = getCleanSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !anonKey) {
    return {
      caller: null,
      error: 'Supabase environment variables are not configured.',
      status: 500,
    };
  }

  const userScopedClient = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: authData, error: authError } = await userScopedClient.auth.getUser(accessToken);
  if (authError || !authData?.user) {
    return {
      caller: null,
      error: authError?.message || 'Invalid or expired session token.',
      status: 401,
    };
  }

  const { data: profileData, error: profileError } = await userScopedClient
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profileData) {
    return {
      caller: null,
      error: 'Authenticated user does not have a valid institutional profile in public.profiles.',
      status: 403,
    };
  }

  return {
    caller: {
      userId: authData.user.id,
      email: authData.user.email || profileData.email,
      profile: profileData as Profile,
    },
    error: null,
    status: 200,
  };
}

