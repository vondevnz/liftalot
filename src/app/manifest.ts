import type { MetadataRoute } from "next";

/**
 * Makes the icons work when the app is added to a home screen. This is not the
 * deferred PWA work — there is no service worker and nothing offline here, just
 * the name, colours and icons an installed shortcut needs so it isn't a blank
 * square labelled with the URL.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Liftalot",
    short_name: "Liftalot",
    description: "A lift tracker that rewards moving every day.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0c",
    theme_color: "#0b0b0c",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      // maskable so Android can crop to its own shape without clipping the mark
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
