/**
 * Transactional email via Resend (optional).
 * When RESEND_API_KEY is missing, callers should fall back to demo UI.
 */

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

export function emailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "CvSU Events <onboarding@resend.dev>"
  );
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
  expiresAt: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not set." };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: emailFrom(),
      to: opts.to,
      subject: "Reset your CvSU Events password",
      html: `
        <p>You requested a password reset for your CvSU Campus Event Management account.</p>
        <p><a href="${opts.resetUrl}">Reset your password</a></p>
        <p>This link expires at ${opts.expiresAt} (about 1 hour).</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
      text: `Reset your CvSU Events password: ${opts.resetUrl}\nExpires: ${opts.expiresAt}`,
    });
    if (error) {
      return { ok: false, error: error.message || "Resend send failed." };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed.";
    return { ok: false, error: message };
  }
}

export async function sendSpeakerLoginEmail(opts: {
  to: string;
  loginUrl: string;
  expiresAt: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not set." };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: emailFrom(),
      to: opts.to,
      subject: "Your CvSU Events speaker sign-in link",
      html: `
        <p>Use this link to sign in to the CvSU Campus Event Management speaker portal.</p>
        <p><a href="${opts.loginUrl}">Sign in as speaker</a></p>
        <p>This link expires at ${opts.expiresAt} and can be used once.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
      text: `Sign in as speaker: ${opts.loginUrl}\nExpires: ${opts.expiresAt}`,
    });
    if (error) {
      return { ok: false, error: error.message || "Resend send failed." };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed.";
    return { ok: false, error: message };
  }
}
