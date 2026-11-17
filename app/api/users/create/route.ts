import { NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isServiceRoleConfigured,
  verifyRequestCaller,
} from '@/lib/supabase/server-admin';

interface CreateUserBody {
  name?: string;
  email?: string;
  password?: string;
  employeeId?: string;
  designation?: string;
  role?: string;
  departmentId?: string;
}

/**
 * GET /api/users/create
 * Returns whether server-side user provisioning (SUPABASE_SERVICE_ROLE_KEY) is active.
 */
export async function GET() {
  return NextResponse.json({
    serviceRoleConfigured: isServiceRoleConfigured(),
  });
}

/**
 * POST /api/users/create
 * Allows:
 *  - Admin to create HOD or Faculty accounts and assign them to a department.
 *  - HOD to create Faculty accounts strictly within their own department.
 */
export async function POST(request: Request) {
  try {
    // 1. Verify authenticated caller & authoritative DB role
    const { caller, error: authError, status: authStatus } = await verifyRequestCaller(request);
    if (!caller || authError) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authStatus });
    }

    const callerRole = caller.profile.role;
    if (callerRole !== 'admin' && callerRole !== 'hod') {
      return NextResponse.json(
        { error: 'Forbidden: Only System Administrators or Department HODs can onboard staff accounts.' },
        { status: 403 }
      );
    }

    // 2. Parse & validate request body
    let body: CreateUserBody;
    try {
      body = (await request.json()) as CreateUserBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const name = body.name?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const password = body.password || '';
    const employeeId = body.employeeId?.trim() || '';
    const designation = body.designation?.trim() || '';
    const requestedRole = body.role?.trim().toLowerCase() || '';
    const requestedDepartmentId = body.departmentId?.trim() || '';

    if (!name || !email || !password || !employeeId || !designation) {
      return NextResponse.json(
        { error: 'All fields are required: name, email, password, employeeId, and designation.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid institutional email address.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Temporary password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 3. Enforce Role-Based Provisioning Boundaries
    let finalRole: 'hod' | 'faculty';
    let finalDepartmentId: string;

    if (callerRole === 'admin') {
      if (requestedRole !== 'hod' && requestedRole !== 'faculty') {
        return NextResponse.json(
          { error: 'Invalid target role. Admin can create accounts with role "hod" or "faculty".' },
          { status: 400 }
        );
      }
      if (!requestedDepartmentId) {
        return NextResponse.json(
          { error: 'Please select a department to assign this staff member to.' },
          { status: 400 }
        );
      }
      finalRole = requestedRole;
      finalDepartmentId = requestedDepartmentId;
    } else {
      // Caller is HOD: strictly restricted to adding Faculty to their OWN department
      if (requestedRole && requestedRole !== 'faculty') {
        return NextResponse.json(
          { error: 'Forbidden: Department HODs can only add Faculty members, not HODs or Admins.' },
          { status: 403 }
        );
      }
      if (!caller.profile.department_id) {
        return NextResponse.json(
          {
            error:
              'Your HOD profile is not assigned to any department yet. Ask the System Administrator to assign your department first.',
          },
          { status: 400 }
        );
      }
      if (requestedDepartmentId && requestedDepartmentId !== caller.profile.department_id) {
        return NextResponse.json(
          { error: 'Forbidden: HODs can only add faculty members to their own department.' },
          { status: 403 }
        );
      }
      finalRole = 'faculty';
      finalDepartmentId = caller.profile.department_id;
    }

    // 4. Verify Server Service Role Key is configured before attempting admin.createUser
    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        {
          error:
            'SUPABASE_SERVICE_ROLE_KEY is not configured yet in .env.local. Once your friend provides the service_role key and you add it to .env.local (and restart the server), new accounts will be created automatically.',
          code: 'SERVICE_ROLE_MISSING',
        },
        { status: 503 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // 5. Verify target department exists
    const { data: deptRow, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id, department_name')
      .eq('id', finalDepartmentId)
      .single();

    if (deptError || !deptRow) {
      return NextResponse.json(
        { error: 'The selected department does not exist in the database.' },
        { status: 404 }
      );
    }

    // 6. Check for duplicate email or employee ID in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, employee_id')
      .or(`email.eq.${email},employee_id.eq.${employeeId}`)
      .maybeSingle();

    if (existingProfile) {
      const conflictField =
        existingProfile.email.toLowerCase() === email ? 'Email address' : 'Employee ID';
      return NextResponse.json(
        { error: `${conflictField} is already registered to another staff member.` },
        { status: 409 }
      );
    }

    // 7. Create Supabase Auth user with email auto-confirmed (keeps caller logged in)
    const { data: createdAuth, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: finalRole,
        employee_id: employeeId,
        designation,
        department_id: finalDepartmentId,
      },
    });

    if (createAuthError || !createdAuth?.user) {
      return NextResponse.json(
        { error: createAuthError?.message || 'Failed to create authentication account in Supabase.' },
        { status: 400 }
      );
    }

    const newUserId = createdAuth.user.id;

    // 8. Upsert authoritative row in public.profiles
    const { data: insertedProfile, error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          employee_id: employeeId,
          name,
          email,
          department_id: finalDepartmentId,
          designation,
          role: finalRole,
        },
        { onConflict: 'id' }
      )
      .select('*, departments:department_id(department_name)')
      .single();

    if (profileUpsertError || !insertedProfile) {
      // Rollback auth user so we don't leave orphaned auth records
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: profileUpsertError?.message || 'Failed to store profile record in database.' },
        { status: 500 }
      );
    }

    // 9. If creating an HOD, automatically appoint them on departments.hod_id
    if (finalRole === 'hod') {
      const { error: deptUpdateError } = await supabaseAdmin
        .from('departments')
        .update({ hod_id: newUserId })
        .eq('id', finalDepartmentId);

      if (deptUpdateError) {
        console.error('Warning: HOD user created, but departments.hod_id update failed:', deptUpdateError);
      }
    }

    return NextResponse.json(
      {
        message: `${finalRole === 'hod' ? 'HOD' : 'Faculty member'} "${name}" created and assigned to ${deptRow.department_name}.`,
        user: {
          ...insertedProfile,
          department_name: deptRow.department_name,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Unexpected error in POST /api/users/create:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

