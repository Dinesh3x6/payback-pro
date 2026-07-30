import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
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
  title: "PayBack Reminder",
  description: "Track money you've lent and automatically remind borrowers to repay.",
};

// If Clerk isn't configured, we still render the tree so the app can run
// with the built-in local-auth flow — see providers logic below.
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${sans.variable} ${mono.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-right" toastOptions={{ style: { fontSize: "14px" } }} />
        </ThemeProvider>
      </body>
    </html>
  );

  return clerkEnabled ? <ClerkProvider>{content}</ClerkProvider> : content;
}
