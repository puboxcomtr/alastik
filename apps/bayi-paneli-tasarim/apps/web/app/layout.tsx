import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "B2B Lastik Toptan Satış",
  description: "Bayilere özel toptan lastik satış platformu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
