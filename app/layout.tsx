import type { Metadata } from "next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "刷片夹",
  description: "用刷卡方式整理看过、想看和不感兴趣的影视作品",
  manifest: "./manifest.webmanifest",
  applicationName: "刷片夹",
  appleWebApp: {
    capable: true,
    title: "刷片夹",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [
      { url: "./icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "./icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "./apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09111f"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
