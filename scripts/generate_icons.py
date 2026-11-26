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

# macOS 图标：图形只占画布中间约 82%，四周留白，避免比别的 App 图标"大一圈"
INSET = int(S * 0.09)
CONTENT = S - 2 * INSET
C = INSET  # 内容区左上角坐标

# 品牌蓝渐变（上浅下深）
BG_TOP = (84, 150, 250)
BG_BOTTOM = (47, 96, 205)


def lerp(a, b, t):
    return tuple(int(x + (y - x) * t) for x, y in zip(a, b))


def rounded_mask(size: int, radius_ratio: float = 0.22) -> Image.Image:
    """生成圆角矩形遮罩。"""
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    r = int(size * radius_ratio)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=r, fill=255)
    return m


def make_base() -> Image.Image:
    """内容区内的圆角方形渐变背景（四周留白、透明）。"""
    # 渐变只在内容区绘制
    strip = Image.new("RGBA", (1, CONTENT))
    sp = strip.load()
    for y in range(CONTENT):
        sp[0, y] = (*lerp(BG_TOP, BG_BOTTOM, y / CONTENT), 255)
    base = strip.resize((CONTENT, CONTENT))

    base.putalpha(rounded_mask(CONTENT))
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img.paste(base, (C, C))
    return img


def make_glow() -> Image.Image:
    """柔光层，限制在内容区圆角内。"""
    glow = Image.new("RGBA", (CONTENT, CONTENT), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((-150, -250, CONTENT + 150, CONTENT // 2 + 250), fill=(255, 255, 255, 85))
    glow = glow.filter(ImageFilter.GaussianBlur(100))
    glow.putalpha(Image.composite(glow.getchannel("A"), Image.new("L", glow.size, 0), rounded_mask(CONTENT)))
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(glow, (C, C))
    return out


def draw_quill(draw: ImageDraw.ImageDraw):
    """在内容区局部坐标画一支白色羽毛笔。"""
    scale = CONTENT / 1024
    def P(x, y):
        return (int(x * scale), int(y * scale))

    feather = [P(250, 760), P(300, 560), P(420, 360), P(600, 220), P(770, 180),
               P(720, 330), P(600, 500), P(450, 640), P(330, 740)]
    draw.polygon(feather, fill=(255, 255, 255, 245))

    draw.line([P(250, 780), P(770, 180)], fill=BG_BOTTOM + (200,), width=max(2, int(14 * scale)))

    for p in [P(360, 600), P(450, 500), P(540, 410), P(630, 320)]:
        draw.line([p, (p[0] + int(90 * scale), p[1] - int(120 * scale))],
                  fill=(200, 220, 250, 180), width=max(2, int(6 * scale)))

    draw.polygon([P(250, 780), P(205, 870), P(285, 815)], fill=(255, 255, 255, 255))
    draw.ellipse([P(225, 820), P(245, 840)], fill=BG_BOTTOM + (255,))


def make_icon() -> Image.Image:
    img = make_base()
    img = Image.alpha_composite(img, make_glow())

    # 羽毛笔（含投影）也限制在内容区圆角内
    layer = Image.new("RGBA", (CONTENT, CONTENT), (0, 0, 0, 0))
    draw_quill(ImageDraw.Draw(layer))
    layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", layer.size, 0), rounded_mask(CONTENT)))

    shadow = layer.filter(ImageFilter.GaussianBlur(16))
    shadow.putalpha(shadow.getchannel("A").point(lambda a: int(a * 0.35)))
    shadow_layer = Image.new("RGBA", (S, S), (10, 30, 80, 0))
    shadow_layer.paste(shadow, (C, C))
    img = Image.alpha_composite(img, shadow_layer)

    main_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    main_layer.paste(layer, (C, C))
    img = Image.alpha_composite(img, main_layer)
    return img


def main():
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    icon = make_icon()

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
    print(f"已生成: {ICON_DIR / 'icon.png'}")
    print(f"已生成: {ICON_DIR / 'icon.icns'}")


if __name__ == "__main__":
    main()
