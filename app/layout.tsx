import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "ADES — Agent Design Studio",
  description:
    "Design, critique, and evaluate AI agents visually. Built for PMs and non-developers.",
  icons: {
    icon: [
      { url: "/ades-favicon-32x32.svg", sizes: "32x32", type: "image/svg+xml" },
      { url: "/ades-favicon-16x16.svg", sizes: "16x16", type: "image/svg+xml" },
    ],
    apple: [{ url: "/ades-apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }],
    shortcut: ["/ades-favicon-32x32.svg"],
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ades-bg text-ades-ink antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
