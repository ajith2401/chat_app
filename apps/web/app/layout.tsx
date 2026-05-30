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
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://res.cloudinary.com https://cloudinary.com; connect-src 'self' http://localhost:4005 ws://localhost:4005 http://127.0.0.1:4005 ws://127.0.0.1:4005 http://localhost:3005 https://api.cloudinary.com;"
        />
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
