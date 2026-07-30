import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "PayBack Pro",
  description: "AI Smart Lending, Expense & Multi-Channel Reminder Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${sans.variable} ${mono.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <WorkspaceProvider>
            {children}
            <Toaster position="top-right" toastOptions={{ style: { fontSize: "14px" } }} />
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
