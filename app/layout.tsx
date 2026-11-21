import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "AuditOps · Compliance Operations Platform", template: "%s · AuditOps" },
  description: "AuditOps is the compliance operations platform where organizations, auditors and consultants run audits together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
