import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ScrollReveal from "@/components/ScrollReveal";
import { UIProvider } from "@/components/ui/UIProvider";
import AccessibilityApplier from "@/components/AccessibilityApplier";

export const metadata: Metadata = {
  title: "MemoryCare",
  description: "AI-powered memory assistant system for Alzheimer's, Dementia, and MCI patients",
  icons: {
    icon: "/images/memoracare.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ScrollReveal />
        <AccessibilityApplier />
        <AuthProvider>
          <UIProvider>
            {children}
          </UIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
