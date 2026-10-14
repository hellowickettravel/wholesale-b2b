/** Supabase's own wording and codes when it fails to hand the confirmation email to a mail server. */
export function isConfirmationEmailFailure(error: { code?: string; message?: string; status?: number }): boolean {
  // over_email_send_rate_limit: Supabase's built-in sender only allows a handful of emails an hour, so on a project
  // without its own SMTP a new application would be refused for no fault of the customer's.
  if (error.code === "unexpected_failure" || error.code === "email_provider_disabled" || error.code === "over_email_send_rate_limit") return true;
  return /error sending (confirmation|signup|magic link) email|smtp|email address not authorized|email rate limit exceeded/i.test(error.message ?? "");
}

