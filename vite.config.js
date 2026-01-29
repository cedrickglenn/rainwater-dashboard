import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      // Use JSX file extensions
      appDirectory: "app",
      ignoredRouteFiles: ["**/.*"],
    }),
    tsconfigPaths(),
  ],
  // Resolve .jsx extensions
  resolve: {
    extensions: [".js", ".jsx", ".json"],
  },
});
