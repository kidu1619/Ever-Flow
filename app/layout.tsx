import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EverFlow — Multi-Tenant Event Management & Vendor Coordination SaaS Platform",
  description: "Enterprise-grade multi-tenant event planning workspace with strict tenant isolation, RBAC permissions, and vendor coordination.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#FBF9F5] text-slate-800 antialiased selection:bg-[#E06B53]/20 selection:text-[#E06B53]">
        {children}
      </body>
    </html>
  );
}
