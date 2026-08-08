from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance


DOWNLOADED_SOURCE = Path(r"C:\Users\Carol\Downloads\MAPA.png")
SOURCE = DOWNLOADED_SOURCE if DOWNLOADED_SOURCE.exists() else Path("public/mapa/mapa-guia-2d.png")
OUTPUT = Path("artifacts/mapa-png-audit")


def render_crop(name: str, bounds: tuple[int, int, int, int], scale: int = 3) -> None:
    source = Image.open(SOURCE).convert("RGBA")
    white = Image.new("RGBA", source.size, "white")
    white.alpha_composite(source)
    crop = white.convert("RGB").crop(bounds)
    crop = ImageEnhance.Contrast(crop).enhance(1.7)
    crop = crop.resize((crop.width * scale, crop.height * scale), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(crop)
    left, top, right, bottom = bounds
    for x in range(((left + 49) // 50) * 50, right, 50):
        px = (x - left) * scale
        draw.line((px, 0, px, crop.height), fill=(220, 38, 38), width=1)
        draw.text((px + 3, 3), str(x), fill=(185, 28, 28))
    for y in range(((top + 49) // 50) * 50, bottom, 50):
        py = (y - top) * scale
        draw.line((0, py, crop.width, py), fill=(37, 99, 235), width=1)
        draw.text((3, py + 3), str(y), fill=(29, 78, 216))
    crop.save(OUTPUT / f"{name}.png")


OUTPUT.mkdir(parents=True, exist_ok=True)
render_crop("north", (80, 170, 1300, 310), 4)
render_crop("west-south", (70, 730, 650, 1025), 4)
render_crop("center-south", (630, 720, 1300, 1025), 4)
render_crop("east-hall", (1550, 620, 1900, 970), 5)
render_crop("north-west-detail", (380, 180, 760, 295), 7)
render_crop("north-center-detail", (720, 180, 1080, 295), 7)
render_crop("north-east-detail", (1030, 180, 1300, 300), 7)
render_crop("letter-gates", (70, 135, 1305, 205), 7)
render_crop("hall-accesses", (70, 995, 1305, 1080), 7)
render_crop("letter-gates-west", (250, 135, 650, 205), 10)
render_crop("letter-gates-east", (650, 135, 1180, 205), 10)
render_crop("hall-accesses-west", (150, 995, 700, 1070), 10)
render_crop("hall-accesses-east", (680, 995, 1300, 1070), 10)

if __name__ == "__main__":
    rgba = Image.open(SOURCE).convert("RGBA")
    pixels = rgba.load()

    def dark(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        return a >= 70 and max(r, g, b) <= 110

    def runs(values: list[bool], offset: int, minimum: int = 5) -> list[tuple[int, int]]:
        found: list[tuple[int, int]] = []
        start = None
        for index, value in enumerate(values + [False]):
            if value and start is None:
                start = index
            elif not value and start is not None:
                if index - start >= minimum:
                    found.append((start + offset, index - 1 + offset))
                start = None
        return found

    for y in (190, 197, 204, 212, 215, 240, 266, 274, 286):
        print(f"y={y}: {runs([dark(x, y) for x in range(250, 1301)], 250)}")
    for x in (296, 308, 320, 416, 428, 451, 518, 541, 552, 564, 635, 656, 712, 736, 764, 832, 855, 868, 889, 981, 1019, 1064, 1097, 1225, 1285):
        print(f"x={x}: {runs([dark(x, y) for y in range(180, 291)], 180)}")
    vertical_axes = []
    for x in range(250, 1301):
        coverage = sum(dark(x, y) for y in range(210, 267)) / 57
        if coverage >= .72:
            vertical_axes.append(x)
    print(f"vertical 210..266: {runs([x in set(vertical_axes) for x in range(250, 1301)], 250, 1)}")
    for y1, y2 in ((758, 799), (814, 854), (868, 910), (916, 944)):
        axes = []
        for x in range(1550, 1901):
            coverage = sum(dark(x, y) for y in range(y1, y2 + 1)) / (y2 - y1 + 1)
            if coverage >= .62:
                axes.append(x)
        axis_set = set(axes)
        print(f"east vertical {y1}..{y2}: {runs([x in axis_set for x in range(1550, 1901)], 1550, 1)}")
    for y in (916, 920, 928, 942, 944):
        print(f"east y={y}: {runs([dark(x, y) for x in range(1550, 1901)], 1550, 3)}")
    for y in (1015, 1020, 1025, 1030, 1035, 1040, 1045, 1050):
        print(f"south y={y}: {runs([dark(x, y) for x in range(80, 1301)], 80, 3)}")
