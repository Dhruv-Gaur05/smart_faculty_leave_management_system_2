import { NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isServiceRoleConfigured,
  verifyRequestCaller,
} from '@/lib/supabase/server-admin';

interface AssignHodBody {
  departmentId?: string;
  hodId?: string | null;
}

/**
 * POST /api/admin/departments/assign-hod
 * Appoints or reassigns an HOD to a department, ensuring both departments.hod_id
 * and profiles.department_id are atomically kept in sync.
 */
export async function POST(request: Request) {
  try {
    const { caller, error: authError, status: authStatus } = await verifyRequestCaller(request);
    if (!caller || authError) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authStatus });
    }

    if (caller.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can assign or reassign Heads of Department.' },
        { status: 403 }
      );
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: 'Server service role key is not configured.' },
        { status: 503 }
      );
    }

    let body: AssignHodBody;
    try {
      body = (await request.json()) as AssignHodBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const departmentId = body.departmentId?.trim();
    const hodId = body.hodId?.trim() || null;

    if (!departmentId) {
      return NextResponse.json({ error: 'departmentId is required.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Verify department exists
    const { data: dept, error: deptErr } = await supabaseAdmin
      .from('departments')
      .select('id, department_name, hod_id')
      .eq('id', departmentId)
      .single();

    if (deptErr || !dept) {
      return NextResponse.json({ error: 'Department not found in database.' }, { status: 404 });
    }

    if (hodId) {
      // Verify target staff member exists
      const { data: hodProfile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email, role, department_id')
        .eq('id', hodId)
        .single();

      if (profileErr || !hodProfile) {
        return NextResponse.json({ error: 'Selected staff profile not found.' }, { status: 404 });
      }

      // 1. Update department's appointed hod_id
      const { error: updateDeptErr } = await supabaseAdmin
        .from('departments')
        .update({ hod_id: hodId })
        .eq('id', departmentId);

      if (updateDeptErr) {
        console.error('Error updating departments.hod_id:', updateDeptErr);
        return NextResponse.json({ error: updateDeptErr.message }, { status: 500 });
      }

      // 2. Update profile's department_id and ensure role is 'hod'
      const { error: updateProfErr } = await supabaseAdmin
        .from('profiles')
        .update({
          department_id: departmentId,
          role: 'hod',
          designation: hodProfile.role === 'hod' ? hodProfile.name : 'Head of Department',
        })
        .eq('id', hodId);

      if (updateProfErr) {
        console.error('Error updating profiles for HOD assignment:', updateProfErr);
        return NextResponse.json({ error: updateProfErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Appointed "${hodProfile.name}" as Head of Department for "${dept.department_name}".`,
        department: {
          id: departmentId,
          name: dept.department_name,
          hodId: hodProfile.id,
          hodName: hodProfile.name,
        },
      });
    } else {
      // Unassign HOD
      const { error: unassignErr } = await supabaseAdmin
        .from('departments')
        .update({ hod_id: null })
        .eq('id', departmentId);

      if (unassignErr) {
        return NextResponse.json({ error: unassignErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Unassigned HOD for "${dept.department_name}".`,
      });
    }
  } catch (err) {
    console.error('Exception in POST /api/admin/departments/assign-hod:', err);
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
