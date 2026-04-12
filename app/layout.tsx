import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-ades-bg text-ades-ink antialiased">{children}</body>
    </html>
  );
}
