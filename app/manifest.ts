import type { MetadataRoute } from "next";

/**
 * Manifesto PWA. Permite "instalar" o app (necessário para Web Push no iOS
 * 16.4+) e define ícones/cores da marca. Ícone em SVG (escalável); para melhor
 * suporte no iOS, adicione PNGs 192/512 e referencie-os aqui.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MMC Incidências",
    short_name: "MMC",
    description: "Plataforma de incidências e suporte da MMC.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b1f3a",
    theme_color: "#0b1f3a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
