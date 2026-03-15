/*
 ──────────────────────────────────────────────────────────────────
  JobDoxLiDARPlugin  —  Capacitor plugin that bridges Apple's
  RoomPlan API to the DryDox web layer.

  Features:
    • SceneKit wireframe grid overlay (Job-Dox red @ 40% opacity)
    • Three-phase instruction overlay:
      Phase 1 — Pre-scan instruction card with "Begin Scan" button
      Phase 2 — Persistent top instruction bar during scanning
      Phase 3 — Auto-dismiss when RoomPlan coaching shows good coverage

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
import SceneKit

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

// MARK: - Job-Dox Brand Colors

private enum JDColor {
    /// Job-Dox accent red  —  RGB(228, 53, 49)
    static let red = UIColor(red: 228/255, green: 53/255, blue: 49/255, alpha: 1)
    /// Grid overlay red at 40% opacity
    static let gridRed = UIColor(red: 228/255, green: 53/255, blue: 49/255, alpha: 0.40)
    /// Dark background  —  #10121e
    static let darkBg = UIColor(red: 16/255, green: 18/255, blue: 30/255, alpha: 1)
    /// Slightly lighter surface for cards
    static let cardBg = UIColor(red: 22/255, green: 25/255, blue: 40/255, alpha: 1)
    /// Muted text
    static let mutedText = UIColor(white: 0.65, alpha: 1)
}

// MARK: - RoomPlan Scanner Controller

#if canImport(RoomPlan)
@available(iOS 16.0, *)
class RoomPlanScanner: NSObject, RoomCaptureViewDelegate, RoomCaptureSessionDelegate {

    private weak var plugin: JobDoxLiDARPlugin?
    private var captureView: RoomCaptureView!
    private var pendingCall: CAPPluginCall?
    private var hostVC: UIViewController?

    // Grid overlay
    private var gridOverlayView: SCNView!
    private var gridScene: SCNScene!
    private var gridNodes: [String: SCNNode] = [:]

    // Instruction overlay
    private var instructionOverlay: UIView?
    private var instructionBar: UIView?
    private var instructionLabel: UILabel?
    private var doneButton: UIButton?
    private var cancelButton: UIButton?
    private var scanStarted = false
    private var instructionsDismissed = false

    init(plugin: JobDoxLiDARPlugin) {
        self.plugin = plugin
        super.init()
    }

    // MARK: - Start

    func start(call: CAPPluginCall) {
        pendingCall = call

        // Create the RoomCaptureView (Apple's built-in scanning UI)
        captureView = RoomCaptureView(frame: UIScreen.main.bounds)
        captureView.captureSession.delegate = self
        captureView.delegate = self

        // Present it full-screen over the Capacitor webview
        let vc = UIViewController()
        vc.view.backgroundColor = .black
        vc.view.addSubview(captureView)
        captureView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            captureView.topAnchor.constraint(equalTo: vc.view.topAnchor),
            captureView.bottomAnchor.constraint(equalTo: vc.view.bottomAnchor),
            captureView.leadingAnchor.constraint(equalTo: vc.view.leadingAnchor),
            captureView.trailingAnchor.constraint(equalTo: vc.view.trailingAnchor),
        ])

        vc.modalPresentationStyle = .fullScreen

        // ── SceneKit grid overlay (transparent, on top of RoomCaptureView) ──
        setupGridOverlay(on: vc)

        // ── Phase 1: Pre-scan instruction card ──
        setupInstructionOverlay(on: vc)

        // ── Done button (hidden until scanning starts) ──
        setupDoneButton(on: vc)

        // ── Cancel button ──
        setupCancelButton(on: vc)

        hostVC = vc

        // Present the scanner
        guard let bridge = plugin?.bridge, let rootVC = bridge.viewController else {
            call.reject("Unable to present scanner")
            return
        }
        rootVC.present(vc, animated: true)
    }

    // MARK: - SceneKit Grid Overlay

    private func setupGridOverlay(on vc: UIViewController) {
        gridScene = SCNScene()
        gridOverlayView = SCNView(frame: UIScreen.main.bounds)
        gridOverlayView.scene = gridScene
        gridOverlayView.backgroundColor = .clear
        gridOverlayView.isUserInteractionEnabled = false
        gridOverlayView.autoenablesDefaultLighting = true
        gridOverlayView.translatesAutoresizingMaskIntoConstraints = false

        vc.view.addSubview(gridOverlayView)
        NSLayoutConstraint.activate([
            gridOverlayView.topAnchor.constraint(equalTo: vc.view.topAnchor),
            gridOverlayView.bottomAnchor.constraint(equalTo: vc.view.bottomAnchor),
            gridOverlayView.leadingAnchor.constraint(equalTo: vc.view.leadingAnchor),
            gridOverlayView.trailingAnchor.constraint(equalTo: vc.view.trailingAnchor),
        ])

        // Camera node — we'll sync with ARSession
        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.camera?.zNear = 0.05
        cameraNode.camera?.zFar = 50
        gridScene.rootNode.addChildNode(cameraNode)
        gridOverlayView.pointOfView = cameraNode
    }

    /// Create a fine wireframe grid mesh for a detected surface.
    private func createGridNode(for surface: CapturedRoom.Surface, id: String) -> SCNNode {
        let width = CGFloat(surface.dimensions.x)
        let height = CGFloat(surface.dimensions.y)

        // Fine mesh pattern — grid lines every ~0.15m (≈6 inches) for technical aesthetic
        let gridSpacing: CGFloat = 0.15

        let containerNode = SCNNode()
        containerNode.name = id

        // Build grid lines as thin cylinders for a crisp wireframe look
        let lineRadius: CGFloat = 0.002  // 2mm thick lines
        let gridColor = JDColor.gridRed

        // Horizontal lines
        let hCount = Int(height / gridSpacing) + 1
        for i in 0..<hCount {
            let y = -height / 2 + CGFloat(i) * gridSpacing
            if y > height / 2 { break }
            let line = SCNCylinder(radius: lineRadius, height: width)
            line.firstMaterial?.diffuse.contents = gridColor
            line.firstMaterial?.isDoubleSided = true
            let node = SCNNode(geometry: line)
            node.position = SCNVector3(0, Float(y), 0)
            node.eulerAngles = SCNVector3(0, 0, Float.pi / 2)
            // Start invisible, animate in
            node.opacity = 0
            containerNode.addChildNode(node)
        }

        // Vertical lines
        let vCount = Int(width / gridSpacing) + 1
        for i in 0..<vCount {
            let x = -width / 2 + CGFloat(i) * gridSpacing
            if x > width / 2 { break }
            let line = SCNCylinder(radius: lineRadius, height: height)
            line.firstMaterial?.diffuse.contents = gridColor
            line.firstMaterial?.isDoubleSided = true
            let node = SCNNode(geometry: line)
            node.position = SCNVector3(Float(x), 0, 0)
            // Start invisible, animate in
            node.opacity = 0
            containerNode.addChildNode(node)
        }

        // Apply the surface transform
        containerNode.simdTransform = surface.transform

        // Animate grid lines drawing in with staggered timing
        let children = containerNode.childNodes
        for (index, child) in children.enumerated() {
            let delay = Double(index) * 0.03 // stagger each line by 30ms
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                SCNTransaction.begin()
                SCNTransaction.animationDuration = 0.4
                SCNTransaction.animationTimingFunction = CAMediaTimingFunction(name: .easeOut)
                child.opacity = 1
                SCNTransaction.commit()
            }
        }

        return containerNode
    }

    /// Update or add a grid for a detected surface.
    private func updateGrid(for surface: CapturedRoom.Surface, category: String, index: Int) {
        let id = "\(category)_\(index)"

        // Remove old node if surface was updated
        if let existing = gridNodes[id] {
            existing.removeFromParentNode()
            gridNodes.removeValue(forKey: id)
        }

        let node = createGridNode(for: surface, id: id)
        gridScene.rootNode.addChildNode(node)
        gridNodes[id] = node
    }

    /// Sync the SceneKit camera with the AR session camera transform.
    private func syncCamera(with frame: ARFrame) {
        guard let pointOfView = gridOverlayView.pointOfView else { return }
        pointOfView.simdTransform = frame.camera.transform

        // Match projection
        let projection = frame.camera.projectionMatrix
        pointOfView.camera?.projectionTransform = SCNMatrix4(projection)
    }

    // MARK: - Phase 1: Pre-scan Instruction Card

    private func setupInstructionOverlay(on vc: UIViewController) {
        let overlay = UIView()
        overlay.backgroundColor = JDColor.darkBg
        overlay.translatesAutoresizingMaskIntoConstraints = false
        vc.view.addSubview(overlay)
        NSLayoutConstraint.activate([
            overlay.topAnchor.constraint(equalTo: vc.view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: vc.view.bottomAnchor),
            overlay.leadingAnchor.constraint(equalTo: vc.view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: vc.view.trailingAnchor),
        ])

        // Content stack
        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 24
        stack.translatesAutoresizingMaskIntoConstraints = false
        overlay.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: overlay.centerYAnchor, constant: -20),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: overlay.leadingAnchor, constant: 32),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: overlay.trailingAnchor, constant: -32),
        ])

        // LiDAR icon circle
        let iconContainer = UIView()
        iconContainer.backgroundColor = JDColor.red.withAlphaComponent(0.15)
        iconContainer.layer.cornerRadius = 40
        iconContainer.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            iconContainer.widthAnchor.constraint(equalToConstant: 80),
            iconContainer.heightAnchor.constraint(equalToConstant: 80),
        ])

        let iconLabel = UILabel()
        iconLabel.text = "◎"
        iconLabel.font = .systemFont(ofSize: 36)
        iconLabel.textColor = JDColor.red
        iconLabel.textAlignment = .center
        iconLabel.translatesAutoresizingMaskIntoConstraints = false
        iconContainer.addSubview(iconLabel)
        NSLayoutConstraint.activate([
            iconLabel.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
            iconLabel.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
        ])
        stack.addArrangedSubview(iconContainer)

        // Title
        let title = UILabel()
        title.text = "LiDAR Room Scanner"
        title.font = .boldSystemFont(ofSize: 22)
        title.textColor = .white
        title.textAlignment = .center
        stack.addArrangedSubview(title)

        // Instruction card
        let card = UIView()
        card.backgroundColor = JDColor.cardBg
        card.layer.cornerRadius = 16
        card.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            card.widthAnchor.constraint(equalToConstant: 300),
        ])

        let cardStack = UIStackView()
        cardStack.axis = .vertical
        cardStack.spacing = 12
        cardStack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(cardStack)
        NSLayoutConstraint.activate([
            cardStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 20),
            cardStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -20),
            cardStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            cardStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
        ])

        let steps = [
            "1. Stand in the center of the room",
            "2. Point your device at the first wall",
            "3. Slowly sweep to capture all surfaces",
        ]
        for step in steps {
            let lbl = UILabel()
            lbl.text = step
            lbl.font = .systemFont(ofSize: 15)
            lbl.textColor = JDColor.mutedText
            lbl.numberOfLines = 0
            cardStack.addArrangedSubview(lbl)
        }

        stack.addArrangedSubview(card)

        // Spacer
        let spacer = UIView()
        spacer.translatesAutoresizingMaskIntoConstraints = false
        spacer.heightAnchor.constraint(equalToConstant: 8).isActive = true
        stack.addArrangedSubview(spacer)

        // "Begin Scan" button
        let beginBtn = UIButton(type: .system)
        beginBtn.setTitle("Begin Scan", for: .normal)
        beginBtn.titleLabel?.font = .boldSystemFont(ofSize: 17)
        beginBtn.setTitleColor(.white, for: .normal)
        beginBtn.backgroundColor = JDColor.red
        beginBtn.layer.cornerRadius = 14
        beginBtn.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            beginBtn.widthAnchor.constraint(equalToConstant: 260),
            beginBtn.heightAnchor.constraint(equalToConstant: 52),
        ])
        beginBtn.addTarget(self, action: #selector(beginScanTapped), for: .touchUpInside)
        stack.addArrangedSubview(beginBtn)

        // Cancel link on instruction overlay
        let cancelLink = UIButton(type: .system)
        cancelLink.setTitle("Cancel", for: .normal)
        cancelLink.titleLabel?.font = .systemFont(ofSize: 14)
        cancelLink.setTitleColor(JDColor.mutedText, for: .normal)
        cancelLink.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        stack.addArrangedSubview(cancelLink)

        instructionOverlay = overlay
    }

    // MARK: - Phase 2: Scanning Instruction Bar

    private func setupInstructionBar(on vc: UIViewController) {
        let bar = UIView()
        bar.backgroundColor = JDColor.darkBg.withAlphaComponent(0.85)
        bar.translatesAutoresizingMaskIntoConstraints = false
        vc.view.addSubview(bar)
        NSLayoutConstraint.activate([
            bar.topAnchor.constraint(equalTo: vc.view.safeAreaLayoutGuide.topAnchor),
            bar.leadingAnchor.constraint(equalTo: vc.view.leadingAnchor),
            bar.trailingAnchor.constraint(equalTo: vc.view.trailingAnchor),
            bar.heightAnchor.constraint(equalToConstant: 44),
        ])

        let label = UILabel()
        label.text = "Sweep slowly left to right \u{2014} tilt up to ceiling, down to floor \u{2014} rotate to each wall."
        label.font = .systemFont(ofSize: 12, weight: .medium)
        label.textColor = .white
        label.textAlignment = .center
        label.numberOfLines = 2
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.7
        label.translatesAutoresizingMaskIntoConstraints = false
        bar.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerYAnchor.constraint(equalTo: bar.centerYAnchor),
            label.leadingAnchor.constraint(equalTo: bar.leadingAnchor, constant: 16),
            label.trailingAnchor.constraint(equalTo: bar.trailingAnchor, constant: -16),
        ])

        // Start with fade-in
        bar.alpha = 0
        UIView.animate(withDuration: 0.4) { bar.alpha = 1 }

        instructionBar = bar
        instructionLabel = label
    }

    // MARK: - Phase 3: Auto-dismiss on good coverage

    private func dismissInstructionBar() {
        guard !instructionsDismissed else { return }
        instructionsDismissed = true
        UIView.animate(withDuration: 0.5, animations: {
            self.instructionBar?.alpha = 0
        }) { _ in
            self.instructionBar?.removeFromSuperview()
            self.instructionBar = nil
        }
    }

    // MARK: - Done / Cancel Buttons

    private func setupDoneButton(on vc: UIViewController) {
        let btn = UIButton(type: .system)
        btn.setTitle("Done Scanning", for: .normal)
        btn.titleLabel?.font = .boldSystemFont(ofSize: 16)
        btn.setTitleColor(.white, for: .normal)
        btn.backgroundColor = JDColor.red
        btn.layer.cornerRadius = 12
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)
        btn.isHidden = true  // Hidden until scanning starts
        vc.view.addSubview(btn)

        NSLayoutConstraint.activate([
            btn.bottomAnchor.constraint(equalTo: vc.view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            btn.centerXAnchor.constraint(equalTo: vc.view.centerXAnchor),
            btn.widthAnchor.constraint(equalToConstant: 200),
            btn.heightAnchor.constraint(equalToConstant: 48),
        ])

        doneButton = btn
    }

    private func setupCancelButton(on vc: UIViewController) {
        let btn = UIButton(type: .system)
        btn.setTitle("Cancel", for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 14)
        btn.setTitleColor(.white, for: .normal)
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        btn.isHidden = true  // Hidden until scanning starts (Phase 1 has its own cancel)
        vc.view.addSubview(btn)

        NSLayoutConstraint.activate([
            btn.topAnchor.constraint(equalTo: vc.view.safeAreaLayoutGuide.topAnchor, constant: 12),
            btn.leadingAnchor.constraint(equalTo: vc.view.leadingAnchor, constant: 20),
        ])

        cancelButton = btn
    }

    // MARK: - Actions

    @objc private func beginScanTapped() {
        scanStarted = true

        // Dismiss Phase 1 overlay with animation
        UIView.animate(withDuration: 0.35, animations: {
            self.instructionOverlay?.alpha = 0
        }) { _ in
            self.instructionOverlay?.removeFromSuperview()
            self.instructionOverlay = nil
        }

        // Show Done & Cancel buttons
        doneButton?.isHidden = false
        cancelButton?.isHidden = false

        // Show Phase 2 instruction bar
        if let vc = hostVC {
            setupInstructionBar(on: vc)
        }

        // Start the capture session
        let config = RoomCaptureSession.Configuration()
        captureView.captureSession.run(configuration: config)
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

    // MARK: - RoomCaptureSessionDelegate

    func captureSession(_ session: RoomCaptureSession, didUpdate room: CapturedRoom) {
        // Update grid overlays for all detected surfaces
        DispatchQueue.main.async {
            // Walls
            for (i, wall) in room.walls.enumerated() {
                self.updateGrid(for: wall, category: "wall", index: i)
            }
            // Floors
            for (i, floor) in room.floors.enumerated() {
                self.updateGrid(for: floor, category: "floor", index: i)
            }
        }
    }

    func captureSession(_ session: RoomCaptureSession, didProvide instruction: RoomCaptureSession.Instruction) {
        DispatchQueue.main.async {
            // Phase 3: Dismiss instruction bar when coaching indicates
            // sufficient coverage (e.g. .moveCloseToWall, .turnOnLight
            // are remedial — but .none means good coverage)
            switch instruction {
            case .moveCloseToWall:
                self.instructionLabel?.text = "Move closer to the wall for better detail."
            case .moveAwayFromWall:
                self.instructionLabel?.text = "Move back a bit \u{2014} you\u{2019}re too close to the wall."
            case .slowDown:
                self.instructionLabel?.text = "Slow down \u{2014} move the device more slowly."
            case .turnOnLight:
                self.instructionLabel?.text = "The room is too dark \u{2014} turn on more lights."
            case .normal:
                // Good coverage — dismiss instructions
                self.dismissInstructionBar()
            case .lowTexture:
                self.instructionLabel?.text = "Point at surfaces with more visual detail."
            @unknown default:
                break
            }
        }
    }

    func captureSession(_ session: RoomCaptureSession, didStartWith configuration: RoomCaptureSession.Configuration) {
        // Session started
    }

    func captureSession(_ session: RoomCaptureSession, didEndWith data: CapturedRoomData, error: (any Error)?) {
        // Session ended — data will be processed by the view delegate
    }

    func captureSession(_ session: RoomCaptureSession, didAdd room: CapturedRoom) {
        // Room added
    }

    func captureSession(_ session: RoomCaptureSession, didChange room: CapturedRoom) {
        // Room changed — same as didUpdate for our purposes
    }

    // Sync camera from AR frames for grid overlay alignment
    func captureSession(_ session: RoomCaptureSession, didUpdate frame: ARFrame) {
        DispatchQueue.main.async {
            self.syncCamera(with: frame)
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
