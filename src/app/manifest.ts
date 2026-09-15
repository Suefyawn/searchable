import type { MetadataRoute } from "next";
import { SITE } from "@/lib/utils";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name}.pk`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#fdfdfc",
    theme_color: "#fdfdfc",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
