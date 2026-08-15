import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "APT Tennis Club",
    short_name: "APT Tennis",
    description: "Área do membro, pagamentos e gestão do APT Tennis Club.",
    start_url: "/membros",
    scope: "/",
    display: "standalone",
    background_color: "#f8f7f2",
    theme_color: "#1f2e50",
    lang: "pt-BR",
    categories: ["sports", "lifestyle"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
