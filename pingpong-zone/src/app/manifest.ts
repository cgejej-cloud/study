import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "탁구존",
    short_name: "탁구존",
    description: "스마트 탁구장 예약 및 랭킹 시스템",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#15803d",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
