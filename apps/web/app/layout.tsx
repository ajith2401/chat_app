import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Couple Chat | Premium & Private",
  description: "A cinematic space for your relationship.",
};

import { Providers } from "../providers";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Derive the API origin from env so LAN / tunnel hosts work without editing CSP.
  const apiOrigin = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4005";
  const wsOrigin = apiOrigin.replace(/^http/, "ws");
  const connectSrc = [
    "'self'",
    "http://localhost:4005",
    "ws://localhost:4005",
    "http://127.0.0.1:4005",
    "ws://127.0.0.1:4005",
    apiOrigin,
    wsOrigin,
    "https://api.cloudinary.com",
  ].join(" ");
  // blob: in img-src lets decrypted images render from in-memory blob URLs.
  const csp = `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://res.cloudinary.com https://cloudinary.com; connect-src ${connectSrc};`;
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={csp} />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
