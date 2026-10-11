import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.vincere.fitness",
  appName: "Vincere",
  webDir: "dist",
  backgroundColor: "#ffffff",
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
    scheme: "App",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    Keyboard: { resize: "native", autoBackdropColor: "dom" },
    StatusBar: { style: "DEFAULT" },
  },
};

export default config;
