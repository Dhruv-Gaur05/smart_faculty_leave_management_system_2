import { NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isServiceRoleConfigured,
  verifyRequestCaller,
} from '@/lib/supabase/server-admin';

interface ResetPasswordBody {
  email?: string;
  newPassword?: string;
  targetUserId?: string;
}

/**
 * POST /api/auth/reset-password
 * Handles:
 *  1. Admin-initiated password reset: Admin can reset any staff member's password using targetUserId.
 *  2. Institutional self-service reset: Direct password update for university staff email.
 */
export async function POST(request: Request) {
  try {
    let body: ResetPasswordBody;
    try {
      body = (await request.json()) as ResetPasswordBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const { email, newPassword, targetUserId } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
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

    // Mode 1: Admin-initiated password reset for a target user
    if (targetUserId) {
      const { caller, error: authError, status: authStatus } = await verifyRequestCaller(request);
      if (!caller || authError) {
        return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authStatus });
      }

      if (caller.profile.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: Only System Administrators can perform direct staff password resets.' },
          { status: 403 }
        );
      }

      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        {
          password: newPassword,
        }
      );

      if (updateError || !updatedUser.user) {
        return NextResponse.json(
          { error: updateError?.message || 'Failed to update user password in authentication provider.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: `Password updated successfully for account ${updatedUser.user.email}.`,
        user: {
          id: updatedUser.user.id,
          email: updatedUser.user.email,
        },
      });
    }

    // Mode 2: Self-service password reset for institutional email
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return NextResponse.json(
          { error: 'Please enter a valid institutional email address.' },
          { status: 400 }
        );
      }

      // Verify the profile exists in public.profiles
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profileErr || !profile) {
        return NextResponse.json(
          { error: 'No academic staff record found matching this email address.' },
          { status: 404 }
        );
      }

      // Update password directly in Supabase Auth
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        profile.id,
        {
          password: newPassword,
        }
      );

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || 'Failed to update password.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: `Password has been successfully updated for ${profile.name} (${profile.email}). You can now log in with your new credentials.`,
        success: true,
      });
    }

    return NextResponse.json(
      { error: 'Please provide either an email address or targetUserId with a new password.' },
      { status: 400 }
    );
  } catch (err) {
    console.error('Unexpected error in POST /api/auth/reset-password:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
