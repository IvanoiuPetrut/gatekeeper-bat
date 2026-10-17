"""Draws the extension's pixel art in the PUMKYN4 palette.

    python3 tools/draw-sprites.py

Writes icons/icon{16,32,48,128}.png, lib/bat-hero.png (2-frame sprite sheet)
and lib/dither-sky.png. Edit the ASCII sprites below and re-run.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
INK, PLUM, EMBER, PEACH = (6, 6, 14, 255), (54, 28, 125, 255), (211, 79, 13, 255), (249, 158, 144, 255)
CLEAR = (0, 0, 0, 0)

# '#' body (ink)  'e' eye (ember)  'f' fang (peach)  '.' transparent
BAT_DOWN = """
#..............#
##...#....#...##
###..######..###
####.#e##e#.####
################
.######ff######.
..###.####.###..
...#...##...#...
"""
# Small bat for the 16px icon.
BAT_MINI = """
#..#...#..#
##.#####.##
####e#e####
.#########.
..#.###.#..
"""
BAT_UP = """
##............##
.##..#....#..##.
..##.######.##..
..####e##e####..
...##########...
....###ff###....
.....######.....
......#..#......
"""


def parse(art):
    return [row for row in art.strip("\n").splitlines()]


def stamp(img, art, ox, oy):
    colors = {"#": INK, "e": EMBER, "f": PEACH}
    for y, row in enumerate(parse(art)):
        for x, ch in enumerate(row):
            if ch in colors:
                img.putpixel((ox + x, oy + y), colors[ch])


def moon(img, cx, cy, r, craters):
    for y in range(img.height):
        for x in range(img.width):
            if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                img.putpixel((x, y), PEACH)
    for x, y in craters:
        img.putpixel((x, y), EMBER)


def icon():
    # 16x16: notched plum tile, peach moon, ink bat flying across it.
    img = Image.new("RGBA", (16, 16), CLEAR)
    for y in range(16):
        for x in range(16):
            corner = (x in (0, 15)) and (y in (0, 15))
            if not corner:
                img.putpixel((x, y), PLUM)
    moon(img, 8, 8, 6.5, craters=[(11, 3), (12, 4), (4, 12)])
    stamp(img, BAT_MINI, 2, 6)
    for n in (16, 32, 48, 128):
        img.resize((n, n), Image.NEAREST).save(ROOT / f"icons/icon{n}.png")


def hero():
    # Two 48x40 frames side by side: wings down, wings up. Shown at 2x in CSS.
    sheet = Image.new("RGBA", (96, 40), CLEAR)
    for i, art in enumerate((BAT_DOWN, BAT_UP)):
        frame = Image.new("RGBA", (48, 40), CLEAR)
        moon(frame, 24, 20, 19, craters=[(32, 6), (33, 6), (34, 7), (12, 29), (13, 30), (36, 28), (37, 28)])
        bat = Image.new("RGBA", (16, 8), CLEAR)
        stamp(bat, art, 0, 0)
        bat = bat.resize((32, 16), Image.NEAREST)  # 2x bat on a 1x moon: chunky but readable
        frame.alpha_composite(bat, (8, 13 if i == 0 else 10))
        sheet.alpha_composite(frame, (48 * i, 0))
    sheet.save(ROOT / "lib/bat-hero.png")


BAYER = [
    [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
]


def sky():
    # Plum at the top, ordered-dithered down to ink.
    w, h = 8, 160
    img = Image.new("RGBA", (w, h), INK)
    for y in range(h):
        t = (1 - y / (h - 1)) ** 1.6
        for x in range(w):
            if t * 64 > BAYER[y % 8][x % 8]:
                img.putpixel((x, y), PLUM)
    img.save(ROOT / "lib/dither-sky.png")


if __name__ == "__main__":
    icon()
    hero()
    sky()
