import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "@/lib/canonical-host";

const base = { host: "wholesale-b2b-uy4a.vercel.app", pathAndQuery: "/invoices?page=2", siteUrl: "https://wholesalestreet.co.uk", vercelEnv: "production" };

describe("canonicalRedirect", () => {
  it("sends the production vercel.app alias to the same path on the real domain", () => {
    expect(canonicalRedirect(base)).toBe("https://wholesalestreet.co.uk/invoices?page=2");
  });
  it("leaves the real domain alone", () => {
    expect(canonicalRedirect({ ...base, host: "wholesalestreet.co.uk" })).toBeNull();
    expect(canonicalRedirect({ ...base, host: "www.wholesalestreet.co.uk" })).toBeNull();
  });
  it("does nothing until the site URL is a custom domain", () => {
    expect(canonicalRedirect({ ...base, siteUrl: "https://wholesale-b2b-uy4a.vercel.app" })).toBeNull();
    expect(canonicalRedirect({ ...base, siteUrl: undefined })).toBeNull();
    expect(canonicalRedirect({ ...base, siteUrl: "not a url" })).toBeNull();
  });
  it("never touches previews or local development", () => {
    expect(canonicalRedirect({ ...base, vercelEnv: "preview" })).toBeNull();
    expect(canonicalRedirect({ ...base, vercelEnv: undefined })).toBeNull();
    expect(canonicalRedirect({ ...base, host: "localhost:3000" })).toBeNull();
  });
  it("keeps the root path", () => {
    expect(canonicalRedirect({ ...base, pathAndQuery: "/" })).toBe("https://wholesalestreet.co.uk/");
  });
});
