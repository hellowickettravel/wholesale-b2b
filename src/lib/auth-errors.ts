/** Supabase's own wording and codes when it fails to hand the confirmation email to a mail server. */
export function isConfirmationEmailFailure(error: { code?: string; message?: string; status?: number }): boolean {
  if (error.code === "unexpected_failure" || error.code === "email_provider_disabled") return true;
  return /error sending (confirmation|signup|magic link) email|smtp|email address not authorized/i.test(error.message ?? "");
}

