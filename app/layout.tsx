import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Identity Verification", description: "Private, on-device KYC document scan prototype" };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
