/*
 ──────────────────────────────────────────────────────────────────
  JobDox LiDAR Plugin  —  JS bridge to native Capacitor plugin

  On iOS (inside Capacitor shell):
    → Calls native RoomPlan API via the Swift plugin
  On web (browser):
    → Returns { supported: false } so the UI falls back to manual

  Usage:
    import { JobDoxLiDAR } from "../plugins/jobdox-lidar";

    const { supported } = await JobDoxLiDAR.checkSupport();
    if (supported) {
      const { rooms } = await JobDoxLiDAR.scanRoom();
    }
 ──────────────────────────────────────────────────────────────────
*/

import { Capacitor, registerPlugin } from "@capacitor/core";

// Register the native plugin — on web this returns a proxy that
// uses the web implementation below as fallback.
const NativeLiDAR = registerPlugin("JobDoxLiDAR", {
  web: () => import("./jobdox-lidar-web.js").then((m) => new m.JobDoxLiDARWeb()),
});

/**
 * Unified API — works on both native and web.
 * The DryDoxFloorPlan component imports this object.
 */
export const JobDoxLiDAR = {
  /**
   * Check if the current device supports LiDAR scanning.
   * @returns {Promise<{ supported: boolean, reason: string }>}
   */
  async checkSupport() {
    try {
      return await NativeLiDAR.checkSupport();
    } catch {
      return { supported: false, reason: "Plugin not available" };
    }
  },

  /**
   * Launch the LiDAR room scanner (RoomPlan on iOS).
   * Resolves with scanned room data when the user finishes.
   * @returns {Promise<{ rooms: Array<{ label, widthFt, depthFt, ceilingFt, walls }> }>}
   */
  async scanRoom() {
    return await NativeLiDAR.scanRoom();
  },

  /**
   * Whether we're running inside a native Capacitor shell.
   */
  get isNative() {
    return Capacitor.isNativePlatform();
  },
};
