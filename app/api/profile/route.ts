import { NextRequest, NextResponse } from 'next/server';
import { fetchProfileByIdOrEmail, saveProfileDetails } from '@/lib/supabase/profile';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('email');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User id or email is required' },
        { status: 400 }
      );
    }

    const profile = await fetchProfileByIdOrEmail(id);
    return NextResponse.json({ success: true, profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch user profile';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, updates } = body;

    if (!userId || !updates) {
      return NextResponse.json(
        { success: false, error: 'userId and updates object are required' },
        { status: 400 }
      );
    }

    const updated = await saveProfileDetails(userId, updates);
    return NextResponse.json({ success: true, profile: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update user profile';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
