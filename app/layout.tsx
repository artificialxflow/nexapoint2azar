import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";

const vazirmatn = localFont({
  src: [
    {
      path: "../public/fonts/Vazirmatn-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Vazirmatn-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Vazirmatn-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXA",
  description: "NEXA Dashboard Frontend",
  icons: {
    icon: [{ url: "/logo/nexa-logo03.png", type: "image/png" }],
    shortcut: "/logo/nexa-logo03.png",
    apple: [{ url: "/logo/nexa-logo03.png", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
