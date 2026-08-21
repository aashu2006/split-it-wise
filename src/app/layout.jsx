import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Split-It-Wise",
  description: "Simple expense splitting for students and friends",
};

export default function RootLayout({ children }) {
  return (
    // The font variables live on <html>, not <body>: globals.css applies
    // `font-sans` to <html>, and a custom property set on <body> is invisible
    // to its own parent, so the page would fall back to the browser default.
    // suppressHydrationWarning is required, not cosmetic: next-themes sets the
    // theme class on <html> before React hydrates, so the server and client
    // markup differ by design on this one element.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
