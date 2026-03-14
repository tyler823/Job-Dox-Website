// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "JobDoxLiDAR",
    platforms: [.iOS(.v16)],
    products: [
        .library(name: "JobDoxLiDAR", targets: ["JobDoxLiDAR"]),
    ],
    dependencies: [
        // Capacitor is provided by the host app — no need to declare here
    ],
    targets: [
        .target(
            name: "JobDoxLiDAR",
            path: "Sources"
        ),
    ]
)
