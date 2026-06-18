import webpush from "web-push";
import { User } from "@couple-chat/database";

// Web Push is optional: if VAPID keys aren't set, sends are skipped so the app
// still runs. Configure once at module load.
const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@example.com";
const configured = Boolean(PUBLIC && PRIVATE);
if (configured) webpush.setVapidDetails(SUBJECT, PUBLIC!, PRIVATE!);

export const pushConfigured = () => configured;
export const vapidPublicKey = () => PUBLIC || "";

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const saveSubscription = async (userId: string, sub: PushSub) => {
  // De-dupe by endpoint, then add.
  await User.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } });
  await User.updateOne({ _id: userId }, { $push: { pushSubscriptions: sub } });
};

export const removeSubscription = async (userId: string, endpoint: string) => {
  await User.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint } } });
};

/**
 * Send a push to every device a user has subscribed. Notifications are generic
 * (no message content) because messages are E2E-encrypted and the server can't
 * read them. Stale subscriptions (410/404) are pruned.
 */
export const sendPushToUser = async (
  userId: string,
  payload: { title: string; body: string; url?: string }
) => {
  if (!configured) return;
  const user = await User.findById(userId).select("pushSubscriptions");
  const subs: PushSub[] = (user?.pushSubscriptions as any) || [];
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub as any, data);
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await removeSubscription(userId, sub.endpoint).catch(() => {});
        }
      }
    })
  );
};
