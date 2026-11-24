import { NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isServiceRoleConfigured,
  verifyRequestCaller,
} from '@/lib/supabase/server-admin';

interface RevokeAdminBody {
  profileId?: string;
  targetRole?: 'faculty' | 'hod';
}

/**
 * POST /api/admin/administrators/revoke
 * Revokes System Administrator privileges from a user and reassigns them to 'faculty' (or 'hod').
 * Safety constraints:
 *  - Cannot revoke yourself.
 *  - Cannot revoke if only 1 administrator exists in the system.
 */
export async function POST(request: Request) {
  try {
    const { caller, error: authError, status: authStatus } = await verifyRequestCaller(request);
    if (!caller || authError) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authStatus });
    }

    if (caller.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can modify administrative roles.' },
        { status: 403 }
      );
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: 'Server service role key is not configured.' },
        { status: 503 }
      );
    }

    let body: RevokeAdminBody;
    try {
      body = (await request.json()) as RevokeAdminBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const profileId = body.profileId?.trim();
    const targetRole = body.targetRole || 'faculty';

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required.' }, { status: 400 });
    }

    // Safety Constraint 1: Prevent self-revocation
    if (caller.userId === profileId) {
      return NextResponse.json(
        { error: 'Security Protection: You cannot revoke your own administrator account.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Safety Constraint 2: Verify at least 2 admins exist before revoking
    const { count: adminCount, error: countErr } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    if ((adminCount ?? 0) <= 1) {
      return NextResponse.json(
        {
          error:
            'Security Protection: This is the sole remaining System Administrator. You cannot revoke the only administrator in the institution.',
        },
        { status: 400 }
      );
    }

    // 1. Fetch target profile
    const { data: targetProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, designation')
      .eq('id', profileId)
      .single();

    if (profileErr || !targetProfile) {
      return NextResponse.json({ error: 'Target administrator not found.' }, { status: 404 });
    }

    if (targetProfile.role !== 'admin') {
      return NextResponse.json(
        { error: `"${targetProfile.name}" does not have the admin role.` },
        { status: 400 }
      );
    }

    const fallbackDesignation =
      targetRole === 'hod' ? 'Head of Department' : 'Assistant Professor';

    // 2. Update profile to targetRole
    const { data: updatedProfile, error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        role: targetRole,
        designation: fallbackDesignation,
      })
      .eq('id', profileId)
      .select('*')
      .single();

    if (updateErr) {
      console.error('Error revoking admin privileges:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 3. Update Supabase Auth metadata
    try {
      await supabaseAdmin.auth.admin.updateUserById(profileId, {
        user_metadata: {
          role: targetRole,
          designation: fallbackDesignation,
        },
      });
    } catch (authMetaErr) {
      console.warn('Warning: Could not update auth user metadata:', authMetaErr);
    }

    return NextResponse.json({
      message: `System Administrator privileges revoked for "${targetProfile.name}". Role changed to ${targetRole}.`,
      user: updatedProfile,
    });
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/administrators/revoke:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
