/** Where an email link may send the user after verifying. Anything else goes to the role home. */
export const EMAIL_LINK_DESTINATIONS = new Set(["/register/pending", "/auth/invite", "/reset-password", "/login"]);

export function emailLinkDestination(next: string | null): string | null {
  return next && EMAIL_LINK_DESTINATIONS.has(next) ? next : null;
}
