import { NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isServiceRoleConfigured,
  verifyRequestCaller,
} from '@/lib/supabase/server-admin';
import { DepartmentSummary } from '@/types';

/**
 * GET /api/admin/departments
 * Secure server-side retrieval of university departments with appointed HOD names,
 * faculty headcounts, and active leave counts using service-role privileges.
 */
export async function GET(request: Request) {
  try {
    const { caller, error: authError, status: authStatus } = await verifyRequestCaller(request);
    if (!caller || authError) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authStatus });
    }

    if (caller.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can access department allocations.' },
        { status: 403 }
      );
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: 'Server service role key is not configured.' },
        { status: 503 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Fetch all departments with joined HOD profile
    const { data: depts, error: deptsErr } = await supabaseAdmin
      .from('departments')
      .select(`
        id,
        department_name,
        hod_id,
        profiles:hod_id (
          id,
          name,
          email,
          designation
        )
      `)
      .order('department_name', { ascending: true });

    if (deptsErr) {
      console.error('Error querying departments in admin API:', deptsErr);
      return NextResponse.json({ error: deptsErr.message }, { status: 500 });
    }

    // 2. Fetch all HOD profiles to resolve any missing foreign key relationships
    const { data: allHods } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, designation, department_id, role')
      .eq('role', 'hod');

    // 3. Fetch faculty members count
    const { data: facultyMembers } = await supabaseAdmin
      .from('profiles')
      .select('department_id')
      .eq('role', 'faculty');

    // 4. Fetch active leaves today
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: activeLeaves } = await supabaseAdmin
      .from('leave_applications')
      .select('id, faculty_id, profiles:faculty_id(department_id)')
      .eq('status', 'approved')
      .lte('from_date', todayStr)
      .gte('to_date', todayStr);

    const summaries: DepartmentSummary[] = [];

    for (const d of depts || []) {
      const deptFaculty = (facultyMembers || []).filter((f) => f.department_id === d.id).length;
      const deptActiveLeaves = (activeLeaves || []).filter((l) => {
        const prof = l.profiles as unknown as { department_id?: string } | null;
        return prof?.department_id === d.id;
      }).length;

      const joinedProfile = d.profiles as unknown as { id?: string; name?: string; email?: string } | null;
      let effectiveHodId = d.hod_id;
      let effectiveHodName = joinedProfile?.name;
      let effectiveHodEmail = joinedProfile?.email;

      // If joined profile wasn't found by hod_id, match from allHods
      if (!effectiveHodName && d.hod_id && allHods) {
        const matching = allHods.find((h) => h.id === d.hod_id);
        if (matching) {
          effectiveHodName = matching.name;
          effectiveHodEmail = matching.email;
        }
      }

      // If hod_id was null on departments, check if an HOD profile has department_id === d.id
      if (!effectiveHodName && allHods) {
        const matching = allHods.find((h) => h.department_id === d.id);
        if (matching) {
          effectiveHodId = matching.id;
          effectiveHodName = matching.name;
          effectiveHodEmail = matching.email;

          // Auto-heal relationship in database in background
          supabaseAdmin
            .from('departments')
            .update({ hod_id: matching.id })
            .eq('id', d.id)
            .then(() => {});
        }
      }

      // Generate short code (e.g., Computer Science & Engineering -> CSE)
      const code =
        d.department_name
          .split(' ')
          .filter((w: string) => !['and', '&', 'of', 'in', 'the'].includes(w.toLowerCase()))
          .map((w: string) => w[0]?.toUpperCase())
          .join('') || 'DEPT';

      summaries.push({
        id: d.id,
        name: d.department_name,
        code,
        hodId: effectiveHodId || null,
        hodName: effectiveHodName || 'To Be Assigned',
        hodEmail: effectiveHodEmail || null,
        totalFaculty: deptFaculty,
        activeLeavesToday: deptActiveLeaves,
      });
    }

    return NextResponse.json({ departments: summaries });
  } catch (err) {
    console.error('Exception in GET /api/admin/departments:', err);
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
