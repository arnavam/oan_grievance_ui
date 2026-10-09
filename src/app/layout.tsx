import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grievance Management Dashboard",
  description: "Ethiopia OpenAgriNet",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading a header here (the CSP nonce `proxy.ts` sets on the forwarded
  // request) is what opts this layout into dynamic rendering. Without it,
  // Next may statically optimize the shell at build time, when no per-request
  // nonce exists yet — the CSP's `script-src 'nonce-...'` would then never
  // match what actually got rendered. The value itself isn't otherwise used:
  // this app has no custom inline <Script> tags, so Next applies the nonce to
  // its own framework scripts automatically once rendering is dynamic.
  await headers();

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} antialiased`}
    >
      <body className="h-screen bg-gray-50 overflow-hidden">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
