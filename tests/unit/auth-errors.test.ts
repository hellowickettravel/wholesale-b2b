import { describe, expect, it } from "vitest";
import { isConfirmationEmailFailure } from "@/lib/auth-errors";

describe("isConfirmationEmailFailure", () => {
  it("recognises Supabase failing to send the email", () => {
    expect(isConfirmationEmailFailure({ code: "unexpected_failure", message: "Error sending confirmation email", status: 500 })).toBe(true);
    expect(isConfirmationEmailFailure({ message: "Error sending confirmation email" })).toBe(true);
    expect(isConfirmationEmailFailure({ message: "Email address not authorized" })).toBe(true);
    expect(isConfirmationEmailFailure({ code: "email_provider_disabled" })).toBe(true);
  });
  it("does not swallow other sign-up errors", () => {
    expect(isConfirmationEmailFailure({ code: "weak_password", message: "Password should be at least 8 characters" })).toBe(false);
    expect(isConfirmationEmailFailure({ code: "over_email_send_rate_limit", message: "email rate limit exceeded" })).toBe(false);
    expect(isConfirmationEmailFailure({ code: "validation_failed", message: "Unable to validate email address: invalid format" })).toBe(false);
  });
});
