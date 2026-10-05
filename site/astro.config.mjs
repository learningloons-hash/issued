import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import redirects from "./src/data/redirects.json";

export default defineConfig({
  site: "https://learningloons.com",
  trailingSlash: "always",
  integrations: [sitemap()],
  redirects,
  markdown: {
    shikiConfig: { theme: "everforest-light" },
  },
});
