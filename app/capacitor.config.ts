
import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "ai.jobdox.cortex",
  appName: "Cortex",
  webDir: "dist",
  // When running as a native app, load from the bundled web assets.
  // For dev, you can override with `server.url` pointing at your Vite dev server.
  server: {
    // Uncomment below for live-reload during development:
    // url: "http://YOUR_LOCAL_IP:5173",
url: "https://job-dox.ai/app-login.html",
 androidScheme: "https",
    iosScheme: "https",
  },
  ios: {
    allowsLinkPreview: false,
    contentInset: "never",
    scrollEnabled: false,
  },
  plugins: {},
};

export default config;
