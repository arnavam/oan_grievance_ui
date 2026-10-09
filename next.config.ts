import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Headers here apply to every response, including /api/* — unlike the
// Content-Security-Policy (which needs a fresh nonce per request and so is
// generated in `proxy.ts` instead), none of these need per-request state.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Meaningless (and unenforceable) over plain HTTP in development.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // i.pravatar.cc: the placeholder submitter avatar in SubmitterDetails.tsx
    // — also allowlisted in the CSP's `img-src` in `proxy.ts`.
    remotePatterns: [{ protocol: "https", hostname: "i.pravatar.cc" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
