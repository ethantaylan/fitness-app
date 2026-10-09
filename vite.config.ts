import { defineConfig } from "vite-plus";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  plugins: [tailwindcss(), react()],
  build: { target: "safari17" },
  test: { exclude: ["**/node_modules/**", "**/e2e/**", "**/ios/**", "**/dist/**"] },
});
