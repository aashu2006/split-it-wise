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

const SITE_URL = "https://split-it-wise.vercel.app";
const DESCRIPTION =
  "Split bills with friends, see who owes whom, and settle up over UPI. Free, no ads, open source.";

// Icons, the link-preview image and the manifest come from the file
// conventions next to this layout (icon.svg, apple-icon.png,
// opengraph-image.png, manifest.js); Next adds their tags itself.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Split-It-Wise · Split bills, settle up over UPI",
    template: "%s · Split-It-Wise",
  },
  description: DESCRIPTION,
  applicationName: "Split-It-Wise",
  authors: [{ name: "Akshat Patil", url: "https://github.com/aashu2006" }],
  keywords: [
    "expense splitting",
    "split bills",
    "splitwise alternative",
    "UPI",
    "group expenses",
    "students",
  ],
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Split-It-Wise",
    title: "Split-It-Wise · Owed or owing?",
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Split-It-Wise · Owed or owing?",
    description: DESCRIPTION,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
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
