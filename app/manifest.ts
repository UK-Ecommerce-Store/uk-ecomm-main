import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UK Store Surat",
    short_name: "UK Store",
    description: "Everyday essentials delivered within Surat.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faf6",
    theme_color: "#079a31",
    icons: [
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  };
}
