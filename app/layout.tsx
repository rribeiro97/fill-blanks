import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fill the Blanks — Francês",
  description: "Exercícios de preenchimento de lacunas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
