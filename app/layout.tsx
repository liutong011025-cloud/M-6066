import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "M+6066 — Architecture Field Study",
  description: "Four ways of seeing M+. One group-made poster.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
