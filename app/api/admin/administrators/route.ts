import { NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isServiceRoleConfigured,
  verifyRequestCaller,
} from '@/lib/supabase/server-admin';
import { UserRole } from '@/types/database';

export interface AdminSummary {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  department_id: string | null;
  department_name: string;
  designation: string;
  role: UserRole;
  created_at: string;
}

/**
 * GET /api/admin/administrators
 * Returns the list of all System Administrators across the university.
 * Strictly restricted to verified administrators.
 */
export async function GET(request: Request) {
  try {
    const { caller, error: authError, status: authStatus } = await verifyRequestCaller(request);
    if (!caller || authError) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authStatus });
    }

    if (caller.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can view the administrator directory.' },
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

    const { data: admins, error: adminsErr } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        employee_id,
        name,
        email,
        department_id,
        designation,
        role,
        created_at,
        departments:department_id (
          department_name
        )
      `)
      .eq('role', 'admin')
      .order('created_at', { ascending: true });

    if (adminsErr) {
      console.error('Error fetching administrators:', adminsErr);
      return NextResponse.json({ error: adminsErr.message }, { status: 500 });
    }

    const formatted: AdminSummary[] = (admins || []).map((row) => {
      const deptObj = row.departments as unknown as { department_name?: string } | null;
      return {
        id: row.id,
        employee_id: row.employee_id,
        name: row.name,
        email: row.email,
        department_id: row.department_id,
        department_name: deptObj?.department_name || 'Central Administration',
        designation: row.designation || 'System Administrator',
        role: row.role as UserRole,
        created_at: row.created_at,
      };
    });

    return NextResponse.json({
      administrators: formatted,
      totalCount: formatted.length,
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/administrators:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
