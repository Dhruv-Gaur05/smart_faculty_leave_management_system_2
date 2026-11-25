import { NextRequest, NextResponse } from 'next/server';
import { sendBtuEmail } from '@/lib/email/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email || 'admin@btu.ac.in';

    const testPayload = {
      toEmail: email,
      recipientName: 'Administrator / Faculty Officer',
      subject: 'Test Notification from Bikaner Technical University Portal',
      headline: 'Institutional Email Delivery Test',
      statusBadge: {
        label: 'System Diagnostic',
        color: '#1e3a8a',
        bgColor: '#dbeafe',
      },
      details: {
        applicationId: 'TEST-DIAGNOSTIC-001',
        facultyName: 'BTU System Administrator',
        leaveType: 'Casual Leave (CL)',
        startDate: '2026-03-01',
        endDate: '2026-03-02',
        totalDays: 2,
        reason: 'Automated communication diagnostic test for Bikaner Technical University Portal.',
        department: 'Central Academic Administration',
        hodRemarks: 'Email service configuration verified and operational.',
      },
      actionUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      actionButtonText: 'Access BTU Academic Portal',
    };

    const res = await sendBtuEmail(testPayload);

    return NextResponse.json({
      success: true,
      simulated: !!res.simulated,
      message: res.simulated
        ? 'Test email processed in Development Mock Mode (logged to system console). To deliver live emails, set RESEND_API_KEY in .env.local.'
        : `Live test email successfully dispatched via Resend to ${email}!`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to dispatch test email';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
