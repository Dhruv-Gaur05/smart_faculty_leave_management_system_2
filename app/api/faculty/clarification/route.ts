import { NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isServiceRoleConfigured,
  verifyRequestCaller,
} from '@/lib/supabase/server-admin';

interface ClarificationBody {
  applicationId?: string;
  message?: string;
}

/**
 * POST /api/faculty/clarification
 * Allows a faculty applicant to submit a message in response to an HOD clarification request.
 * Transitions application status back to 'pending' and logs the response in the approvals audit.
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate caller and load profile
    const { caller, error: authError, status: authStatus } = await verifyRequestCaller(request);
    if (!caller || authError) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authStatus });
    }

    // 2. Parse request payload
    let body: ClarificationBody;
    try {
      body = (await request.json()) as ClarificationBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const applicationId = body.applicationId?.trim();
    const message = body.message?.trim();

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required.' }, { status: 400 });
    }

    if (!message || message.length < 3) {
      return NextResponse.json(
        { error: 'Please enter a clarification message (at least 3 characters).' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' },
        { status: 503 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // 3. Retrieve application to verify ownership and status
    const { data: application, error: appFetchErr } = await supabaseAdmin
      .from('leave_applications')
      .select('id, faculty_id, status, reason')
      .eq('id', applicationId)
      .maybeSingle();

    if (appFetchErr || !application) {
      return NextResponse.json({ error: 'Leave application record not found.' }, { status: 404 });
    }

    // Verify ownership: Caller must be the applicant (or admin)
    if (application.faculty_id !== caller.userId && caller.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: You can only respond to clarification requests on your own leave applications.' },
        { status: 403 }
      );
    }

    // Verify current status allows clarification response
    if (application.status !== 'clarification' && application.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Cannot submit clarification. This application is already marked as "${application.status}".`,
        },
        { status: 400 }
      );
    }

    const applicantDisplayName = caller.profile.name || 'Faculty Applicant';
    const auditRemark = `[Applicant Clarification (${applicantDisplayName})]: ${message}`;

    // 4. Insert audit entry into approvals table
    const { data: insertedApproval, error: apprInsertErr } = await supabaseAdmin
      .from('approvals')
      .insert({
        leave_id: applicationId,
        approver_id: caller.userId,
        action: 'clarification',
        remarks: auditRemark,
      })
      .select('id, leave_id, action, remarks, action_time')
      .single();

    if (apprInsertErr) {
      console.error('Failed to log clarification in approvals table:', apprInsertErr);
      return NextResponse.json(
        { error: 'Failed to record clarification in audit log: ' + apprInsertErr.message },
        { status: 500 }
      );
    }

    // 5. Update leave application status back to 'pending' for HOD re-evaluation
    const { error: appUpdateErr } = await supabaseAdmin
      .from('leave_applications')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (appUpdateErr) {
      console.error('Failed to update application status:', appUpdateErr);
      return NextResponse.json(
        { error: 'Failed to update application status: ' + appUpdateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Clarification response submitted successfully. Your application has been returned to the HOD for evaluation.',
      approval: insertedApproval,
    });
  } catch (err) {
    console.error('Unexpected error in POST /api/faculty/clarification:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
