"""生成 Quill Markdown 的全套应用图标（PNG + macOS .icns）。

用法: python3 scripts/generate_icons.py
依赖: Pillow（DSH 运行时自带；系统 Python 可 pip install pillow）

源图为 src-tauri/icons/desktop-1024x1024.png（设计稿）。
脚本会按 macOS 图标惯例在四周留出约 9% 的透明边距，避免图标在
Finder / Dock 中比其他应用大一圈，然后生成全套尺寸与 .icns。
"""

from pathlib import Path
from PIL import Image
import subprocess

ROOT = Path(__file__).resolve().parent.parent
ICON_DIR = ROOT / "src-tauri" / "icons"
SOURCE = ICON_DIR / "desktop-1024x1024.png"

S = 1024
INSET = int(S * 0.09)          # 四周留白，内容区占约 82%
CONTENT = S - 2 * INSET


def main():
    if not SOURCE.exists():
        raise SystemExit(f"找不到源图: {SOURCE}")

    source = Image.open(SOURCE).convert("RGBA")
    if source.size != (S, S):
        source = source.resize((S, S), Image.Resampling.LANCZOS)

    # 裁掉源图自身的留白，只保留不透明内容区域
    bbox = source.getchannel("A").getbbox()
    if bbox:
        source = source.crop(bbox)

    # 等比缩放进内容区（保持透明边距）
    source.thumbnail((CONTENT, CONTENT), Image.Resampling.LANCZOS)
    icon = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    offset = ((S - source.width) // 2, (S - source.height) // 2)
    icon.paste(source, offset)

    # 主图标 512x512（Tauri 配置用）
    icon.resize((512, 512), Image.Resampling.LANCZOS).save(ICON_DIR / "icon.png")

    # iconutil 需要的尺寸集
    sizes = [16, 32, 64, 128, 256, 512]
    iconset = ICON_DIR / "icon.iconset"
    iconset.mkdir(exist_ok=True)
    for s in sizes:
        icon.resize((s, s), Image.Resampling.LANCZOS).save(iconset / f"icon_{s}x{s}.png")
    for s in [16, 32, 128, 256, 512]:
        icon.resize((s * 2, s * 2), Image.Resampling.LANCZOS).save(iconset / f"icon_{s}x{s}@2x.png")

    subprocess.run(
        ["iconutil", "-c", "icns", str(iconset), "-o", str(ICON_DIR / "icon.icns")],
        check=True,
    )
    print(f"源图: {SOURCE}")
    print(f"已生成: {ICON_DIR / 'icon.png'}")
    print(f"已生成: {ICON_DIR / 'icon.icns'}")


if __name__ == "__main__":
    main()
