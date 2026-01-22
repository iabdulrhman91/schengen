import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css"; // Import Flag Icons
import clsx from "clsx";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "نظام تجوال لتشغيل الشنغن",
  description: "نظام إدارة طلبات الشنغن للوكالات",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={clsx(cairo.className, "bg-gray-50 min-h-screen")}
      >
        {children}
      </body>
    </html>
  );
}
