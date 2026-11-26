"""生成 Quill Markdown 的全套应用图标（PNG + macOS .icns）。

用法: python3 scripts/generate_icons.py
依赖: Pillow（DSH 运行时自带；系统 Python 可 pip install pillow）
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import subprocess

ROOT = Path(__file__).resolve().parent.parent
ICON_DIR = ROOT / "src-tauri" / "icons"
S = 1024  # 以 1024 为基准绘制，再缩放到各尺寸

# 品牌蓝渐变（上浅下深）
BG_TOP = (84, 150, 250)
BG_BOTTOM = (47, 96, 205)


def lerp(a, b, t):
    return tuple(int(x + (y - x) * t) for x, y in zip(a, b))


def make_base():
    """圆角方形渐变背景 + 柔和阴影。"""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    px = img.load()
    for y in range(S):
        c = lerp(BG_TOP, BG_BOTTOM, y / S)
        for x in range(S):
            px[x, y] = (*c, 255)

    # 圆角遮罩（macOS 图标的 squircle 观感）
    mask = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(mask)
    r = int(S * 0.22)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=r, fill=255)
    img.putalpha(mask)
    return img


def draw_quill(draw: ImageDraw.ImageDraw):
    """画一支白色羽毛笔：斜置的笔杆 + 羽片 + 笔尖。"""
    # 羽毛主体（用多边形近似羽片轮廓）
    feather = [
        (250, 760), (300, 560), (420, 360), (600, 220), (770, 180),
        (720, 330), (600, 500), (450, 640), (330, 740),
    ]
    draw.polygon(feather, fill=(255, 255, 255, 245))

    # 羽轴（深蓝细线）
    draw.line([(250, 780), (770, 180)], fill=BG_BOTTOM + (200,), width=14)

    # 羽片上的分隔线
    for p in [(360, 600), (450, 500), (540, 410), (630, 320)]:
        draw.line([p, (p[0] + 90, p[1] - 120)], fill=(200, 220, 250, 180), width=6)

    # 笔尖（左下端）
    draw.polygon(
        [(250, 780), (205, 870), (285, 815)],
        fill=(255, 255, 255, 255),
    )
    draw.ellipse((225, 820, 245, 840), fill=BG_BOTTOM + (255,))


def make_icon():
    img = make_base()

    # 高光层（左上到中央的柔光）
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-200, -300, 700, 500), fill=(255, 255, 255, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.alpha_composite(img, glow)

    # 主体
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw_quill(ImageDraw.Draw(layer))
    # 轻微投影让羽毛从背景浮起来
    shadow = layer.filter(ImageFilter.GaussianBlur(18))
    shadow.putalpha(shadow.getchannel("A").point(lambda a: int(a * 0.35)))
    shadow_layer = Image.new("RGBA", (S, S), (10, 30, 80, 0))
    shadow_layer.putalpha(shadow.getchannel("A"))
    img = Image.alpha_composite(img, shadow_layer)
    img = Image.alpha_composite(img, layer)

    return img


def main():
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    icon = make_icon()

    # 主图标 512x512（Tauri 配置用）
    icon.resize((512, 512), Image.Resampling.LANCZOS).save(ICON_DIR / "icon.png")

    # iconutil 需要的尺寸集
    icon_size = 16
    sizes = [16, 32, 64, 128, 256, 512]
    iconset = ICON_DIR / "icon.iconset"
    iconset.mkdir(exist_ok=True)
    for s in sizes:
        icon.resize((s, s), Image.Resampling.LANCZOS).save(iconset / f"icon_{s}x{s}.png")
    # 2x 变体
    for s in [16, 32, 128, 256, 512]:
        icon.resize((s * 2, s * 2), Image.Resampling.LANCZOS).save(iconset / f"icon_{s}x{s}@2x.png")

    # 生成 .icns
    subprocess.run(
        ["iconutil", "-c", "icns", str(iconset), "-o", str(ICON_DIR / "icon.icns")],
        check=True,
    )
    print(f"已生成: {ICON_DIR / 'icon.png'}")
    print(f"已生成: {ICON_DIR / 'icon.icns'}")


if __name__ == "__main__":
    main()
