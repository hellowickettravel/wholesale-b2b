import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
  } catch {
    return null;
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // react-pdf ships its own font and layout engines; keep it as a plain Node dependency.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // Enables forbidden() / unauthorized() with real 403/401 status codes.
    authInterrupts: true,
    serverActions: { bodySizeLimit: "12mb" },
  },
  images: {
    // The local Supabase stack serves images from 127.0.0.1; hosted Supabase is a public host.
    dangerouslyAllowLocalIP: supabaseHost ? ["127.0.0.1", "localhost"].includes(supabaseHost.hostname) : false,
    remotePatterns: [
      // Stock photos are normally rendered unoptimized (Unsplash resizes them); allowed here for any optimised use.
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseHost
        ? [
            {
              protocol: supabaseHost.protocol.replace(":", "") as "http" | "https",
              hostname: supabaseHost.hostname,
              port: supabaseHost.port,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
