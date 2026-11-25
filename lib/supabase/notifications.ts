import { NotificationItem } from '@/types';
import fs from 'fs';
import path from 'path';

const FALLBACK_NOTIFICATIONS_PATH = path.join(process.cwd(), 'data', 'notifications.json');

function readFallbackNotifications(): NotificationItem[] {
  try {
    if (fs.existsSync(FALLBACK_NOTIFICATIONS_PATH)) {
      const data = fs.readFileSync(FALLBACK_NOTIFICATIONS_PATH, 'utf-8');
      return JSON.parse(data) as NotificationItem[];
    }
  } catch (err) {
    console.warn('Error reading fallback notifications:', err);
  }
  return [];
}

function writeFallbackNotifications(items: NotificationItem[]) {
  try {
    const dir = path.dirname(FALLBACK_NOTIFICATIONS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_NOTIFICATIONS_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing fallback notifications:', err);
  }
}

/**
 * Fetch all notifications for a given user
 */
export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      return (data as Array<{
        id: string;
        user_id: string;
        title: string;
        message: string;
        type: NotificationItem['type'];
        action_url?: string | null;
        is_read: boolean;
        created_at: string;
        metadata?: Record<string, unknown> | null;
      }>).map((n) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        actionUrl: n.action_url || undefined,
        isRead: n.is_read,
        createdAt: n.created_at,
        metadata: n.metadata as Record<string, unknown> | undefined,
      }));
    }
  } catch {
    // Continue to fallback
  }

  // Fallback to local store
  const all = readFallbackNotifications();
  return all
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Create a new notification for a user
 */
export async function createUserNotification(
  item: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>
): Promise<NotificationItem> {
  const newNotification: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId: item.userId,
    title: item.title,
    message: item.message,
    type: item.type,
    actionUrl: item.actionUrl,
    isRead: false,
    createdAt: new Date().toISOString(),
    metadata: item.metadata,
  };

  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('notifications')
      .insert({
        user_id: newNotification.userId,
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        action_url: newNotification.actionUrl,
        is_read: false,
        metadata: newNotification.metadata || {},
      })
      .select()
      .single();

    if (!error && data) {
      newNotification.id = data.id;
    }
  } catch {
    // Continue to fallback
  }

  // Local fallback persistence
  const all = readFallbackNotifications();
  all.unshift(newNotification);
  // Cap at 200 items to avoid excessive size
  if (all.length > 200) all.length = 200;
  writeFallbackNotifications(all);

  return newNotification;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
    const client = getSupabaseAdminClient();
    await client.from('notifications').update({ is_read: true }).eq('id', id);
  } catch {
    // Continue to fallback
  }

  const all = readFallbackNotifications();
  const target = all.find((n) => n.id === id);
  if (target) {
    target.isRead = true;
    writeFallbackNotifications(all);
  }
  return true;
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllUserNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
    const client = getSupabaseAdminClient();
    await client.from('notifications').update({ is_read: true }).eq('user_id', userId);
  } catch {
    // Continue to fallback
  }

  const all = readFallbackNotifications();
  all.forEach((n) => {
    if (n.userId === userId) {
      n.isRead = true;
    }
  });
  writeFallbackNotifications(all);
  return true;
}
