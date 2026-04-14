import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "ADES — Agent Design Studio",
  description:
    "Design, critique, and evaluate AI agents visually. Built for PMs and non-developers."
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
