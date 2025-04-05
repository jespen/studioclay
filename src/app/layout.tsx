import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PerformanceOptimizer from "@/components/PerformanceOptimizer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Studio Clay | Creative Design Studio",
  description: "Studio Clay is a creative design studio specializing in branding, web design, and digital experiences.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <PerformanceOptimizer />
        {children}
      </body>
    </html>
  );
}
