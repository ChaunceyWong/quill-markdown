# Tauri v2 for a small macOS installer

Status: accepted

A small installation footprint is a product requirement (the user's chosen meaning of "as small as possible"). Electron was rejected because its bundle is over 100 MB; Tauri v2 uses the system WebView and produces a installer in the single-digit to low-tens of MB. The user does not write Rust, so the Rust side is limited to Tauri's thin shell and is authored by the agent; all product logic lives in TypeScript.

Consequence: builds must run on macOS (WKWebView is not available in the Linux build container); the user executes the build commands on their machine.
