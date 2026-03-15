/*
 ──────────────────────────────────────────────────────────────────
  JobDox LiDAR Plugin  —  TypeScript wrapper for Capacitor bridge

  On iOS (inside Capacitor shell):
    → Calls native RoomPlan API via the Swift plugin
  On web (browser):
    → Returns { supported: false } so the UI falls back to manual

  Usage:
    import { JobDoxLiDAR } from "../plugins/jobdox-lidar";

    const { supported, reason } = await JobDoxLiDAR.checkSupport();
    if (supported) {
      const { rooms } = await JobDoxLiDAR.scanRoom();
    }
 ──────────────────────────────────────────────────────────────────
*/

import { Capacitor, registerPlugin } from "@capacitor/core";

// ── TypeScript Interfaces ──

/** A single wall measurement returned from a LiDAR scan. */
export interface LiDARWall {
  /** Cardinal label, e.g. "North Wall", "East Wall" */
  label: string;
  /** Wall length in feet (rounded to 0.1 ft) */
  lengthFt: number;
}

/** Room data returned from a single LiDAR scan. */
export interface LiDARRoom {
  /** Display name, e.g. "Scanned Room" */
  label: string;
  /** Room width in feet (bounding box X axis) */
  widthFt: number;
  /** Room depth in feet (bounding box Z axis) */
  depthFt: number;
  /** Ceiling height in feet (derived from wall height or default 8 ft) */
  ceilingFt: number;
  /** Individual wall measurements (up to 4: North, East, South, West) */
  walls: LiDARWall[];
}

/** Result of checkSupport() */
export interface LiDARSupportResult {
  /** True if device has LiDAR hardware and iOS 16+ */
  supported: boolean;
  /** Human-readable reason string */
  reason: string;
}

/** Result of scanRoom() */
export interface LiDARScanResult {
  /** Array of detected rooms (typically one per scan) */
  rooms: LiDARRoom[];
}

/** Plugin method signatures for Capacitor's type system. */
export interface JobDoxLiDARPlugin {
  checkSupport(): Promise<LiDARSupportResult>;
  scanRoom(): Promise<LiDARScanResult>;
}

// ── Register the native plugin ──
// On web, the proxy loads the web fallback implementation.

const NativeLiDAR = registerPlugin<JobDoxLiDARPlugin>("JobDoxLiDAR", {
  web: () =>
    import("./jobdox-lidar-web.js").then((m) => new m.JobDoxLiDARWeb()),
});

// ── Unified API ──

export const JobDoxLiDAR = {
  /**
   * Check if the current device supports LiDAR scanning.
   * Returns { supported, reason } — never throws.
   */
  async checkSupport(): Promise<LiDARSupportResult> {
    try {
      return await NativeLiDAR.checkSupport();
    } catch {
      return { supported: false, reason: "Plugin not available" };
    }
  },

  /**
   * Launch the LiDAR room scanner (RoomPlan on iOS).
   * Resolves with scanned room data when the user finishes.
   * Rejects if the user cancels or on error.
   */
  async scanRoom(): Promise<LiDARScanResult> {
    return await NativeLiDAR.scanRoom();
  },

  /**
   * Whether we're running inside a native Capacitor shell
   * (i.e. the iOS app, not the browser).
   */
  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  },
};

export default JobDoxLiDAR;
