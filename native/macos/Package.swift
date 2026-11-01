// swift-tools-version: 6.2
import PackageDescription
let package = Package(
    name: "SemiDoneNative",
    platforms: [.macOS(.v26)],
    products: [.executable(name: "SemiDoneNative", targets: ["SemiDoneApp"])],
    targets: [
        .target(name: "SemiDoneCore"),
        .executableTarget(name: "SemiDoneApp", dependencies: ["SemiDoneCore"]),
        .testTarget(name: "SemiDoneCoreTests", dependencies: ["SemiDoneCore"]),
    ],
    swiftLanguageModes: [.v5]
)
