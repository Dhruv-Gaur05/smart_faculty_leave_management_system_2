import { NextRequest, NextResponse } from 'next/server';
import {
  getUserNotifications,
  createUserNotification,
  markNotificationAsRead,
  markAllUserNotificationsAsRead,
} from '@/lib/supabase/notifications';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const notifications = await getUserNotifications(userId);
    return NextResponse.json({ success: true, notifications });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch notifications';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, title, message, type, actionUrl, metadata } = body;

    if (!userId || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'userId, title, and message are required' },
        { status: 400 }
      );
    }

    const notification = await createUserNotification({
      userId,
      title,
      message,
      type: type || 'info',
      actionUrl,
      metadata,
    });

    return NextResponse.json({ success: true, notification });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create notification';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, markAll, userId } = body;

    if (markAll && userId) {
      await markAllUserNotificationsAsRead(userId);
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (id) {
      await markNotificationAsRead(id);
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid parameters for marking notification' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update notification';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
