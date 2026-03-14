/*
  Web fallback for the JobDoxLiDAR plugin.
  When running in a browser (not native Capacitor), LiDAR is not available.
*/
import { WebPlugin } from "@capacitor/core";

export class JobDoxLiDARWeb extends WebPlugin {
  async checkSupport() {
    return {
      supported: false,
      reason: "LiDAR scanning requires the Job-Dox Field iOS app. Use 'Add Rooms Manually' on web.",
    };
  }

  async scanRoom() {
    throw new Error("LiDAR scanning is not available in the browser. Please use the iOS app.");
  }
}
