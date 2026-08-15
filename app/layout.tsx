import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.apttennis.com.br"),
  applicationName: "APT Tennis Club",
  title: "APT Tennis Club | Beyond the Court",
  description:
    "Um ranking para quem leva o tênis a sério. Jogos equilibrados e participação por indicação em Brasília.",
  openGraph: {
    title: "APT Tennis Club",
    description: "Um ranking para quem leva o tênis a sério.",
    url: "/",
    siteName: "APT Tennis Club",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/og-apt-social.png", width: 1200, height: 630, alt: "APT Tennis Club — O jogo começa na quadra." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "APT Tennis Club",
    description: "Um ranking para quem leva o tênis a sério.",
    images: ["/og-apt-social.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/logo-apt3-navy.svg", type: "image/svg+xml" },
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/pwa/icon-192.png",
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "APT Tennis",
    statusBarStyle: "black-translucent",
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
