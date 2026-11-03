fn main() {
    let store = std::env::var_os("CARGO_FEATURE_APP_STORE").is_some();
    let desktop = std::env::var_os("CARGO_FEATURE_DESKTOP_INTEGRATIONS").is_some();
    if store {
        assert!(
            !desktop,
            "app-store must be built with --no-default-features"
        );
        assert_eq!(
            std::env::var("CARGO_CFG_TARGET_OS").unwrap(),
            "macos",
            "app-store is macOS only"
        );
        // One editable source for CSS and native clipping. Values are logical points/pixels.
        let appearance_path = "../src/config/windowAppearance.json";
        let appearance: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(appearance_path).expect("read window appearance"),
        )
        .expect("valid window appearance JSON");
        let mut header = String::new();
        for (key, name) in [
            ("expandedRadius", "SD_EXPANDED_RADIUS"),
            ("barRadius", "SD_BAR_RADIUS"),
            ("floatingRadius", "SD_FLOATING_RADIUS"),
            ("snappedRadius", "SD_SNAPPED_RADIUS"),
            ("clipInset", "SD_CLIP_INSET"),
        ] {
            let value = appearance[key].as_f64().expect("numeric appearance value");
            assert!(
                value.is_finite() && (0.0..=100.0).contains(&value),
                "invalid {key}"
            );
            header.push_str(&format!("#define {name} {value}\n"));
        }
        let output = std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap());
        std::fs::write(output.join("WindowAppearance.generated.h"), header).unwrap();
        println!("cargo:rerun-if-changed={appearance_path}");
        cc::Build::new()
            .include(output)
            .file("macos/LoginItem.m")
            .file("macos/WindowAppearance.m")
            .flag("-fobjc-arc")
            .flag("-mmacosx-version-min=26.0")
            .compile("semidone_login");
        println!("cargo:rustc-link-lib=framework=ServiceManagement");
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=AppKit");
        println!("cargo:rustc-link-lib=framework=QuartzCore");
        println!("cargo:rerun-if-changed=macos/LoginItem.m");
        println!("cargo:rerun-if-changed=macos/WindowAppearance.m");
    } else {
        assert!(
            desktop,
            "desktop builds require the default desktop-integrations feature"
        );
    }
    tauri_build::build()
}
