/*
 ──────────────────────────────────────────────────────────────────
  JobDoxLiDARPlugin  —  Capacitor plugin that bridges Apple's
  RoomPlan API to the DryDox web layer.

  Requires:
    • iOS 16+
    • iPhone 12 Pro / iPad Pro 2020+ (LiDAR hardware)
    • Camera & ARKit usage descriptions in Info.plist

  JS usage:
    import { JobDoxLiDAR } from "../plugins/jobdox-lidar";
    const { supported } = await JobDoxLiDAR.checkSupport();
    const { rooms }     = await JobDoxLiDAR.scanRoom();
 ──────────────────────────────────────────────────────────────────
*/

import Foundation
import Capacitor
import ARKit

// RoomPlan is iOS 16+ only — conditionally import
#if canImport(RoomPlan)
import RoomPlan
#endif

// MARK: - Plugin Registration

@objc(JobDoxLiDARPlugin)
public class JobDoxLiDARPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "JobDoxLiDARPlugin"
    public let jsName = "JobDoxLiDAR"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkSupport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanRoom", returnType: CAPPluginReturnPromise),
    ]

    // MARK: - checkSupport
    /// Returns { supported: Bool, reason: String }

    @objc func checkSupport(_ call: CAPPluginCall) {
        #if canImport(RoomPlan)
        if #available(iOS 16.0, *) {
            let supported = ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
            call.resolve([
                "supported": supported,
                "reason": supported
                    ? "LiDAR hardware and RoomPlan available"
                    : "Device does not have LiDAR sensor",
            ])
        } else {
            call.resolve([
                "supported": false,
                "reason": "Requires iOS 16 or later",
            ])
        }
        #else
        call.resolve([
            "supported": false,
            "reason": "RoomPlan framework not available on this OS version",
        ])
        #endif
    }

    // MARK: - scanRoom
    /// Presents the RoomCaptureView, waits for the user to finish scanning,
    /// then returns an array of detected rooms with dimensions.

    @objc func scanRoom(_ call: CAPPluginCall) {
        #if canImport(RoomPlan)
        if #available(iOS 16.0, *) {
            guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else {
                call.reject("LiDAR sensor not available on this device")
                return
            }

            DispatchQueue.main.async {
                let scanner = RoomPlanScanner(plugin: self)
                scanner.start(call: call)
            }
        } else {
            call.reject("RoomPlan requires iOS 16+")
        }
        #else
        call.reject("RoomPlan not available")
        #endif
    }
}

// MARK: - RoomPlan Scanner Controller

#if canImport(RoomPlan)
@available(iOS 16.0, *)
class RoomPlanScanner: NSObject, RoomCaptureViewDelegate, RoomCaptureSessionDelegate {

    private weak var plugin: JobDoxLiDARPlugin?
    private var captureView: RoomCaptureView!
    private var captureSession: RoomCaptureSession!
    private var pendingCall: CAPPluginCall?
    private var hostVC: UIViewController?

    init(plugin: JobDoxLiDARPlugin) {
        self.plugin = plugin
        super.init()
    }

    func start(call: CAPPluginCall) {
        pendingCall = call

        // Create the RoomCaptureView (Apple's built-in scanning UI)
        captureView = RoomCaptureView(frame: UIScreen.main.bounds)
        captureView.captureSession.delegate = self
        captureView.delegate = self

        // Present it full-screen over the Capacitor webview
        let vc = UIViewController()
        vc.view = captureView
        vc.modalPresentationStyle = .fullScreen

        // Add a "Done" button so the user can finish scanning
        let doneBtn = UIButton(type: .system)
        doneBtn.setTitle("Done Scanning", for: .normal)
        doneBtn.titleLabel?.font = .boldSystemFont(ofSize: 16)
        doneBtn.setTitleColor(.white, for: .normal)
        doneBtn.backgroundColor = UIColor(red: 228/255, green: 53/255, blue: 49/255, alpha: 1) // --acc
        doneBtn.layer.cornerRadius = 12
        doneBtn.translatesAutoresizingMaskIntoConstraints = false
        doneBtn.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)
        vc.view.addSubview(doneBtn)

        NSLayoutConstraint.activate([
            doneBtn.bottomAnchor.constraint(equalTo: vc.view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            doneBtn.centerXAnchor.constraint(equalTo: vc.view.centerXAnchor),
            doneBtn.widthAnchor.constraint(equalToConstant: 200),
            doneBtn.heightAnchor.constraint(equalToConstant: 48),
        ])

        // Add a "Cancel" button
        let cancelBtn = UIButton(type: .system)
        cancelBtn.setTitle("Cancel", for: .normal)
        cancelBtn.titleLabel?.font = .systemFont(ofSize: 14)
        cancelBtn.setTitleColor(.white, for: .normal)
        cancelBtn.translatesAutoresizingMaskIntoConstraints = false
        cancelBtn.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        vc.view.addSubview(cancelBtn)

        NSLayoutConstraint.activate([
            cancelBtn.topAnchor.constraint(equalTo: vc.view.safeAreaLayoutGuide.topAnchor, constant: 12),
            cancelBtn.leadingAnchor.constraint(equalTo: vc.view.leadingAnchor, constant: 20),
        ])

        hostVC = vc

        // Present the scanner
        guard let bridge = plugin?.bridge, let rootVC = bridge.viewController else {
            call.reject("Unable to present scanner")
            return
        }
        rootVC.present(vc, animated: true) {
            // Start the capture session
            let config = RoomCaptureSession.Configuration()
            self.captureView.captureSession.run(configuration: config)
        }
    }

    @objc private func doneTapped() {
        captureView.captureSession.stop()
    }

    @objc private func cancelTapped() {
        captureView.captureSession.stop()
        hostVC?.dismiss(animated: true) {
            self.pendingCall?.reject("Scan cancelled by user")
            self.pendingCall = nil
        }
    }

    // MARK: - RoomCaptureViewDelegate

    func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: (any Error)?) -> Bool {
        // Return true to let RoomCaptureView process and show the final result
        return true
    }

    func captureView(didPresent processedResult: CapturedRoom, error: (any Error)?) {
        // Dismiss the scanner UI
        hostVC?.dismiss(animated: true)

        guard let call = pendingCall else { return }
        pendingCall = nil

        if let error = error {
            call.reject("Scan processing failed: \(error.localizedDescription)")
            return
        }

        // Convert CapturedRoom data to JSON-friendly format
        let rooms = convertCapturedRoom(processedResult)
        call.resolve(["rooms": rooms])
    }

    // MARK: - Convert CapturedRoom → JS-friendly dictionaries

    private func convertCapturedRoom(_ captured: CapturedRoom) -> [[String: Any]] {
        var results: [[String: Any]] = []

        // Each detected "room" from RoomPlan. In a single scan, there is
        // typically one room, but the API returns surfaces we can use.
        // We use the room's walls to compute dimensions.

        // Collect all wall surfaces
        let wallSurfaces = captured.walls
        let floorSurfaces = captured.floors

        if wallSurfaces.isEmpty {
            // Fallback: use overall bounding box from floors
            if let floor = floorSurfaces.first {
                let w = floor.dimensions.x  // meters
                let d = floor.dimensions.z  // meters
                let room: [String: Any] = [
                    "label": "Scanned Room",
                    "widthFt": round(Double(w) * 3.28084 * 10) / 10,
                    "depthFt": round(Double(d) * 3.28084 * 10) / 10,
                    "ceilingFt": 8.0,
                    "walls": buildWallArray(widthM: w, depthM: d),
                ]
                results.append(room)
            }
            return results
        }

        // Compute bounding box from wall positions
        var minX: Float = .infinity, maxX: Float = -.infinity
        var minZ: Float = .infinity, maxZ: Float = -.infinity
        var maxY: Float = 0

        for wall in wallSurfaces {
            let pos = wall.transform.columns.3
            let halfW = wall.dimensions.x / 2
            let halfH = wall.dimensions.y / 2

            // Wall center position
            let cx = pos.x
            let cz = pos.z
            let cy = pos.y

            minX = min(minX, cx - halfW)
            maxX = max(maxX, cx + halfW)
            minZ = min(minZ, cz - halfW)
            maxZ = max(maxZ, cz + halfW)
            maxY = max(maxY, cy + halfH)
        }

        let widthM = maxX - minX
        let depthM = maxZ - minZ
        let heightM = maxY > 0 ? maxY : 2.4

        let widthFt = round(Double(widthM) * 3.28084 * 10) / 10
        let depthFt = round(Double(depthM) * 3.28084 * 10) / 10
        let ceilingFt = round(Double(heightM) * 3.28084 * 10) / 10

        // Build individual wall measurements
        var walls: [[String: Any]] = []
        let labels = ["North Wall", "East Wall", "South Wall", "West Wall"]
        for (i, wall) in wallSurfaces.prefix(4).enumerated() {
            let lengthM = max(wall.dimensions.x, wall.dimensions.z)
            walls.append([
                "label": i < labels.count ? labels[i] : "Wall \(i + 1)",
                "lengthFt": round(Double(lengthM) * 3.28084 * 10) / 10,
            ])
        }

        // If fewer than 4 walls detected, fill in estimates
        while walls.count < 4 {
            let isWidth = walls.count % 2 == 0
            walls.append([
                "label": walls.count < labels.count ? labels[walls.count] : "Wall \(walls.count + 1)",
                "lengthFt": isWidth ? widthFt : depthFt,
            ])
        }

        let room: [String: Any] = [
            "label": "Scanned Room",
            "widthFt": widthFt,
            "depthFt": depthFt,
            "ceilingFt": ceilingFt,
            "walls": walls,
        ]
        results.append(room)

        return results
    }

    private func buildWallArray(widthM: Float, depthM: Float) -> [[String: Any]] {
        let wFt = round(Double(widthM) * 3.28084 * 10) / 10
        let dFt = round(Double(depthM) * 3.28084 * 10) / 10
        return [
            ["label": "North Wall", "lengthFt": wFt],
            ["label": "East Wall",  "lengthFt": dFt],
            ["label": "South Wall", "lengthFt": wFt],
            ["label": "West Wall",  "lengthFt": dFt],
        ]
    }
}
#endif
