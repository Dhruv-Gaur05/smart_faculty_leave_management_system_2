import { createUserNotification } from '@/lib/supabase/notifications';
import { sendBtuEmail, LeaveEmailPayload } from '@/lib/email/service';

export interface WorkflowNotificationEvent {
  event:
    | 'NEW_LEAVE_APPLICATION'
    | 'LEAVE_APPROVED'
    | 'LEAVE_REJECTED'
    | 'CLARIFICATION_REQUESTED'
    | 'CLARIFICATION_SUBMITTED';
  applicationId: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  facultyName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  department?: string;
  hodRemarks?: string;
}

export async function dispatchWorkflowNotification(eventData: WorkflowNotificationEvent) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  let inAppTitle = '';
  let inAppMessage = '';
  let inAppType: 'leave_applied' | 'leave_approved' | 'leave_rejected' | 'clarification' = 'leave_applied';
  let actionUrl = '';
  let emailSubject = '';
  let headline = '';
  let statusBadge = { label: '', color: '', bgColor: '' };
  let actionButtonText = '';

  switch (eventData.event) {
    case 'NEW_LEAVE_APPLICATION':
      inAppTitle = `New Leave Application: ${eventData.facultyName}`;
      inAppMessage = `${eventData.facultyName} has submitted an application for ${eventData.leaveType} (${eventData.totalDays} days: ${eventData.startDate} to ${eventData.endDate}).`;
      inAppType = 'leave_applied';
      actionUrl = `/hod#approvals`;
      emailSubject = `New Leave Application from ${eventData.facultyName} (${eventData.leaveType})`;
      headline = `New Faculty Leave Request Awaiting Your Review`;
      statusBadge = { label: 'Pending Review', color: '#854d0e', bgColor: '#fef9c3' };
      actionButtonText = 'Review & Sanction Application';
      break;

    case 'LEAVE_APPROVED':
      inAppTitle = `Leave Officially Sanctioned!`;
      inAppMessage = `Your application for ${eventData.leaveType} (${eventData.startDate} to ${eventData.endDate}) has been sanctioned by Head of Department.`;
      inAppType = 'leave_approved';
      actionUrl = `/faculty/applications/${eventData.applicationId}`;
      emailSubject = `Leave Sanctioned: ${eventData.leaveType} (#${eventData.applicationId.slice(0, 8).toUpperCase()})`;
      headline = `Official Leave Sanction Order Accorded`;
      statusBadge = { label: 'Approved & Recorded', color: '#14532d', bgColor: '#dcfce7' };
      actionButtonText = 'Download Official Sanction Slip';
      break;

    case 'LEAVE_REJECTED':
      inAppTitle = `Leave Application Update`;
      inAppMessage = `Your application for ${eventData.leaveType} was not sanctioned. Reason: ${eventData.hodRemarks || 'Administrative constraints'}`;
      inAppType = 'leave_rejected';
      actionUrl = `/faculty/applications/${eventData.applicationId}`;
      emailSubject = `Leave Request Decision: ${eventData.leaveType}`;
      headline = `Leave Request Decision Notification`;
      statusBadge = { label: 'Not Sanctioned', color: '#7f1d1d', bgColor: '#fee2e2' };
      actionButtonText = 'View Application Details';
      break;

    case 'CLARIFICATION_REQUESTED':
      inAppTitle = `Action Required: Clarification Requested`;
      inAppMessage = `HOD has requested additional information regarding your ${eventData.leaveType} application: "${eventData.hodRemarks || 'Please clarify'}"`;
      inAppType = 'clarification';
      actionUrl = `/faculty/applications/${eventData.applicationId}`;
      emailSubject = `Action Required: Clarification Requested (#${eventData.applicationId.slice(0, 8).toUpperCase()})`;
      headline = `Additional Academic Clarification Requested`;
      statusBadge = { label: 'Clarification Needed', color: '#581c87', bgColor: '#f3e8ff' };
      actionButtonText = 'Submit Clarification Response';
      break;

    case 'CLARIFICATION_SUBMITTED':
      inAppTitle = `Clarification Received: ${eventData.facultyName}`;
      inAppMessage = `${eventData.facultyName} has provided a written response to your clarification request for ${eventData.leaveType}.`;
      inAppType = 'clarification';
      actionUrl = `/hod#approvals`;
      emailSubject = `Clarification Submitted by ${eventData.facultyName}`;
      headline = `Faculty Clarification Response Submitted`;
      statusBadge = { label: 'Clarification Provided', color: '#1e3a8a', bgColor: '#dbeafe' };
      actionButtonText = 'Review Response & Sanction';
      break;
  }

  // 1. Create In-App Notification (Bell 🔔)
  try {
    await createUserNotification({
      userId: eventData.recipientId,
      title: inAppTitle,
      message: inAppMessage,
      type: inAppType,
      actionUrl,
      metadata: { applicationId: eventData.applicationId },
    });
  } catch (err) {
    console.error('[Dispatcher] In-App notification error:', err);
  }

  // 2. Dispatch Email Alert
  try {
    const fullActionUrl = actionUrl.startsWith('http') ? actionUrl : `${origin}${actionUrl}`;
    const emailPayload: LeaveEmailPayload = {
      toEmail: eventData.recipientEmail,
      recipientName: eventData.recipientName,
      subject: emailSubject,
      headline,
      statusBadge,
      details: {
        applicationId: eventData.applicationId,
        facultyName: eventData.facultyName,
        leaveType: eventData.leaveType,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        totalDays: eventData.totalDays,
        reason: eventData.reason,
        department: eventData.department,
        hodRemarks: eventData.hodRemarks,
      },
      actionUrl: fullActionUrl,
      actionButtonText,
    };

    await sendBtuEmail(emailPayload);
  } catch (err) {
    console.error('[Dispatcher] Email alert error:', err);
  }
}
