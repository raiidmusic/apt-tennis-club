import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.apttennis.com.br"),
  title: "APT Tennis Club | Beyond the Court",
  description:
    "Um ranking para quem leva o tênis a sério. Jogos equilibrados e participação por indicação em Brasília.",
  openGraph: {
    title: "APT Tennis Club",
    description: "Um ranking para quem leva o tênis a sério.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "APT Tennis Club — Além das quadras." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "APT Tennis Club",
    description: "Um ranking para quem leva o tênis a sério.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/logo-apt3-navy.svg",
    shortcut: "/logo-apt3-navy.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f2e50",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
