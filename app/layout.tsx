import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PropPilot | State AI",
  description:
    "PropPilot is the AI-first CRM by State AI for real estate professionals — centralizing leads, properties, pipeline, and appointments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // PropPilot is dark-first by design (see globals.css) — `dark` is applied
    // unconditionally for now rather than behind a toggle that doesn't exist yet.
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
