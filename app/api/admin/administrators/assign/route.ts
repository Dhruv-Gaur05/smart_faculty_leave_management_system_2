import { NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isServiceRoleConfigured,
  verifyRequestCaller,
} from '@/lib/supabase/server-admin';

interface AssignAdminBody {
  profileId?: string;
  designation?: string;
}

/**
 * POST /api/admin/administrators/assign
 * Promotes an existing staff member (Faculty or HOD) to System Administrator.
 * Strictly restricted to existing administrators.
 */
export async function POST(request: Request) {
  try {
    const { caller, error: authError, status: authStatus } = await verifyRequestCaller(request);
    if (!caller || authError) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authStatus });
    }

    if (caller.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can promote members to System Administrator.' },
        { status: 403 }
      );
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: 'Server service role key is not configured.' },
        { status: 503 }
      );
    }

    let body: AssignAdminBody;
    try {
      body = (await request.json()) as AssignAdminBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const profileId = body.profileId?.trim();
    const designation = body.designation?.trim();

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Fetch target staff profile
    const { data: targetProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, employee_id, role, designation, department_id')
      .eq('id', profileId)
      .single();

    if (profileErr || !targetProfile) {
      return NextResponse.json({ error: 'Selected staff profile not found.' }, { status: 404 });
    }

    if (targetProfile.role === 'admin') {
      return NextResponse.json({
        message: `${targetProfile.name} is already a System Administrator.`,
        alreadyAdmin: true,
      });
    }

    const finalDesignation =
      designation ||
      (targetProfile.designation
        ? `${targetProfile.designation} & Administrator`
        : 'System Administrator');

    // 2. If user was an HOD of a department, clear that department's hod_id to avoid stale links
    if (targetProfile.role === 'hod' && targetProfile.department_id) {
      await supabaseAdmin
        .from('departments')
        .update({ hod_id: null })
        .eq('hod_id', targetProfile.id);
    }

    // 3. Update public.profiles with role = 'admin'
    const { data: updatedProfile, error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'admin',
        designation: finalDesignation,
      })
      .eq('id', profileId)
      .select('*, departments:department_id(department_name)')
      .single();

    if (updateErr) {
      console.error('Error promoting staff to admin:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 4. Update Supabase Auth user metadata so JWT tokens reflect role 'admin'
    try {
      await supabaseAdmin.auth.admin.updateUserById(profileId, {
        user_metadata: {
          role: 'admin',
          designation: finalDesignation,
        },
      });
    } catch (authMetaErr) {
      console.warn('Warning: Could not update auth user metadata:', authMetaErr);
    }

    return NextResponse.json({
      message: `Successfully granted System Administrator privileges to "${targetProfile.name}".`,
      user: updatedProfile,
    });
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/administrators/assign:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
