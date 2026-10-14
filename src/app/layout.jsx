import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Amounts, labels and buttons are set in the mono: it's what makes the app
// read like a ledger, and its figures line up in columns on their own.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const SITE_URL = "https://split-it-wise.vercel.app";
const DESCRIPTION =
  "Add what you spent, see who pays whom, settle up. Free, no ads, open source.";

// Icons, the link-preview image and the manifest come from the file
// conventions next to this layout (icon.svg, apple-icon.png,
// opengraph-image.png, manifest.js); Next adds their tags itself.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Split-It-Wise · Split bills with friends",
    template: "%s · Split-It-Wise",
  },
  description: DESCRIPTION,
  applicationName: "Split-It-Wise",
  authors: [{ name: "Akshat Patil", url: "https://github.com/aashu2006" }],
  keywords: [
    "expense splitting",
    "split bills",
    "splitwise alternative",
    "settle up",
    "group expenses",
    "students",
  ],
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Split-It-Wise",
    title: "Split-It-Wise · split bills, not friendships.",
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Split-It-Wise · split bills, not friendships.",
    description: DESCRIPTION,
  },
};

// Dark is the default whatever the system setting (see ThemeProvider below),
// so the browser chrome starts dark too.
export const viewport = {
  themeColor: "#0b0b0b",
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
      className={`${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
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
