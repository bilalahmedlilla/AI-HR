import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-HR | Smart Interview Platform",
  description: "AI-powered interview platform for modern hiring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
