import { NextRequest, NextResponse } from 'next/server';
import { dispatchWorkflowNotification, WorkflowNotificationEvent } from '@/lib/notifications/dispatcher';
import { getSupabaseAdminClient } from '@/lib/supabase/server-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      event,
      applicationId,
      facultyId,
      approverId,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      remarks,
    } = body;

    if (!event || !applicationId) {
      return NextResponse.json(
        { success: false, error: 'Event and applicationId are required' },
        { status: 400 }
      );
    }

    let recipientId = '';
    let recipientEmail = '';
    let recipientName = 'Academic Officer';
    let facultyName = 'Faculty Member';
    let departmentName = 'Academic Department';

    try {
      const client = getSupabaseAdminClient();

      // Lookup faculty profile
      if (facultyId) {
        const { data: facProfile } = await client
          .from('profiles')
          .select('name, email, department_id, departments(department_name)')
          .eq('id', facultyId)
          .single();

        if (facProfile) {
          facultyName = facProfile.name || facultyName;
          const dept = (facProfile as unknown as { departments?: { department_name?: string } | null })?.departments;
          if (dept?.department_name) {
            departmentName = dept.department_name;
          }

          // If event is for HOD (new leave or clarification response), find HOD
          if (event === 'NEW_LEAVE_APPLICATION' || event === 'CLARIFICATION_SUBMITTED') {
            const { data: hodProfile } = await client
              .from('profiles')
              .select('id, name, email')
              .eq('department_id', facProfile.department_id)
              .eq('role', 'hod')
              .limit(1)
              .single();

            if (hodProfile) {
              recipientId = hodProfile.id;
              recipientEmail = hodProfile.email;
              recipientName = hodProfile.name || 'Head of Department';
            }
          } else {
            // Event is for Faculty (approved, rejected, clarification requested)
            recipientId = facultyId;
            recipientEmail = facProfile.email;
            recipientName = facultyName;
          }
        }
      }
    } catch (dbErr) {
      console.warn('[Notify API] DB lookup warning (continuing with provided details):', dbErr);
    }

    // Fallbacks if not found in DB
    if (!recipientId) {
      recipientId = facultyId || approverId || 'system-user';
    }
    if (!recipientEmail) {
      recipientEmail = 'hod@btu.ac.in';
    }

    const eventPayload: WorkflowNotificationEvent = {
      event,
      applicationId,
      recipientId,
      recipientEmail,
      recipientName,
      facultyName,
      leaveType: leaveType || 'Casual Leave (CL)',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      totalDays: Number(totalDays) || 1,
      reason: reason || 'Academic Leave',
      department: departmentName,
      hodRemarks: remarks,
    };

    await dispatchWorkflowNotification(eventPayload);

    return NextResponse.json({ success: true, message: 'Notification & email alert dispatched successfully' });
  } catch (err: unknown) {
    console.error('Error dispatching notification:', err);
    const msg = err instanceof Error ? err.message : 'Failed to dispatch notification';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
