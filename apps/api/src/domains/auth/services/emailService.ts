import { Resend } from "resend";

// Resend is optional: if RESEND_API_KEY is unset, email sends are skipped
// (and logged) so local/dev still works without an email provider.
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM = process.env.EMAIL_FROM || "A Space for Us <onboarding@resend.dev>";
const APP_URL =
  process.env.APP_URL || (process.env.CLIENT_URL || "http://localhost:3005").split(",")[0].trim();
// The verify-email link must hit the API itself. Render injects RENDER_EXTERNAL_URL.
const API_URL = process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || APP_URL;

const shell = (title: string, body: string, cta: { href: string; label: string }) => `
  <div style="background:#0a0a0a;padding:40px 0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid #222;border-radius:20px;padding:40px;color:#e5e5e5">
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0 0 8px">A Space for Us</h1>
      <h2 style="font-size:16px;color:#bbb;font-weight:500;margin:0 0 20px">${title}</h2>
      <p style="font-size:14px;line-height:1.6;color:#999;margin:0 0 28px">${body}</p>
      <a href="${cta.href}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;font-weight:700">${cta.label}</a>
      <p style="font-size:11px;color:#555;margin:28px 0 0">If the button doesn't work, paste this link:<br><span style="color:#777;word-break:break-all">${cta.href}</span></p>
    </div>
  </div>`;

export async function sendVerificationEmail(to: string, token: string) {
  const href = `${API_URL.replace(/\/$/, "")}/api/v1/auth/verify-email?token=${token}`;
  if (!resend) { console.log(`[email skipped] verify ${to}: ${href}`); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your email — A Space for Us",
    html: shell("Confirm your email", "Tap below to confirm this is you and finish setting up your private space.", { href, label: "Verify email" }),
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const href = `${APP_URL.replace(/\/$/, "")}/reset-password?token=${token}`;
  if (!resend) { console.log(`[email skipped] reset ${to}: ${href}`); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your password — A Space for Us",
    html: shell(
      "Reset your password",
      "Tap below to set a new password. This link expires in 1 hour. <br><br><b>Note:</b> after resetting, you'll need your <b>recovery code</b> to unlock your encrypted message history on this device.",
      { href, label: "Reset password" }
    ),
  });
}
