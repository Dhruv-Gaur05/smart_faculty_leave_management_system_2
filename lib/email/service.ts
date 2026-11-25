import { Resend } from 'resend';

export interface LeaveEmailPayload {
  toEmail: string;
  recipientName: string;
  subject: string;
  headline: string;
  statusBadge: {
    label: string;
    color: string;
    bgColor: string;
  };
  details: {
    applicationId: string;
    facultyName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    department?: string;
    hodRemarks?: string;
  };
  actionUrl: string;
  actionButtonText: string;
}

/**
 * Generate official Bikaner Technical University HTML Email template
 */
export function generateBtuEmailHtml(payload: LeaveEmailPayload): string {
  const { headline, statusBadge, details, actionUrl, actionButtonText, recipientName } = payload;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${payload.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #020617 0%, #1e3a8a 100%); color: #ffffff; padding: 28px 24px; text-align: center; border-bottom: 4px solid #f59e0b; }
    .crest-text { font-size: 20px; font-weight: bold; font-family: Georgia, serif; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
    .sub-crest { font-size: 11px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; font-weight: 600; }
    .body { padding: 32px 28px; }
    .headline { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background-color: ${statusBadge.bgColor}; color: ${statusBadge.color}; margin-bottom: 20px; }
    .table-box { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .table-box td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .table-box td.label { font-weight: 600; color: #475569; width: 38%; background-color: #f8fafc; }
    .table-box td.value { font-weight: 500; color: #0f172a; }
    .button-wrap { text-align: center; margin: 30px 0 10px; }
    .btn { display: inline-block; background-color: #1e3a8a; color: #ffffff !important; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="crest-text">Bikaner Technical University</h1>
      <p class="sub-crest">Office of Academic Affairs • Faculty Leave Governance</p>
    </div>
    <div class="body">
      <p style="font-size: 13px; color: #64748b; margin-top: 0;">Dear ${recipientName},</p>
      <h2 class="headline">${headline}</h2>
      <div>
        <span class="badge">${statusBadge.label}</span>
      </div>
      
      <table class="table-box">
        <tr>
          <td class="label">Application Reference</td>
          <td class="value" style="font-family: monospace; font-weight: bold; color: #1e3a8a;">#${details.applicationId.slice(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td class="label">Faculty Member</td>
          <td class="value">${details.facultyName}</td>
        </tr>
        ${details.department ? `<tr><td class="label">Department</td><td class="value">${details.department}</td></tr>` : ''}
        <tr>
          <td class="label">Leave Category</td>
          <td class="value"><strong>${details.leaveType}</strong></td>
        </tr>
        <tr>
          <td class="label">Sanctioned Period</td>
          <td class="value">${details.startDate} to ${details.endDate}</td>
        </tr>
        <tr>
          <td class="label">Net Duration</td>
          <td class="value"><strong>${details.totalDays} ${details.totalDays === 1 ? 'Working Day' : 'Working Days'}</strong></td>
        </tr>
        <tr>
          <td class="label">Academic Purpose</td>
          <td class="value">${details.reason}</td>
        </tr>
        ${details.hodRemarks ? `<tr><td class="label">HOD Remarks</td><td class="value" style="font-style: italic; color: #0f172a;">"${details.hodRemarks}"</td></tr>` : ''}
      </table>

      <div class="button-wrap">
        <a href="${actionUrl}" class="btn" target="_blank">${actionButtonText}</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px;"><strong>Bikaner Technical University (BTU)</strong></p>
      <p style="margin: 0 0 4px;">Karni Industrial Area, Pugal Road, Bikaner, Rajasthan 334004</p>
      <p style="margin: 0;">This is an automated institutional notification from the Official BTU Academic Leave Portal.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send an email using Resend (with graceful fallback if RESEND_API_KEY is not set)
 */
export async function sendBtuEmail(payload: LeaveEmailPayload): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  const htmlContent = generateBtuEmailHtml(payload);

  if (apiKey && apiKey.trim().length > 10 && !apiKey.includes('placeholder')) {
    try {
      const resend = new Resend(apiKey.trim());
      const { data, error } = await resend.emails.send({
        from: 'Bikaner Technical University <onboarding@resend.dev>',
        to: payload.toEmail,
        subject: `[BTU Leave Portal] ${payload.subject}`,
        html: htmlContent,
      });

      if (error) {
        console.error('Resend delivery error:', error);
        return { success: false };
      }

      console.log(`[BTU Email Service] Successfully dispatched email via Resend to ${payload.toEmail} (ID: ${data?.id})`);
      return { success: true, messageId: data?.id };
    } catch (err) {
      console.error('[BTU Email Service] Exception during Resend dispatch:', err);
    }
  }

  // Graceful Mock / Development Mode (Zero crash when key is not configured)
  console.log(`\n======================================================`);
  console.log(`[BTU EMAIL DISPATCH (DEV MOCK MODE)]`);
  console.log(`To: ${payload.toEmail} (${payload.recipientName})`);
  console.log(`Subject: [BTU Leave Portal] ${payload.subject}`);
  console.log(`Headline: ${payload.headline}`);
  console.log(`Leave Ref: #${payload.details.applicationId.slice(0, 8)} (${payload.details.leaveType})`);
  console.log(`Action Link: ${payload.actionUrl}`);
  console.log(`Status: Resend API Key is pending in .env.local — Email logged to system console.`);
  console.log(`======================================================\n`);

  return { success: true, simulated: true };
}
