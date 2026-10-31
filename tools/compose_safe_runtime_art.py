"""Replace a small set of high-risk organic illustrations with safe, original icons.

The game keeps the existing asset keys so its interaction code and save files remain
compatible. The source illustrations are archived before this script is run.
"""

from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "images"
SCALE = 3


def canvas(size):
    return Image.new("RGBA", (size[0] * SCALE, size[1] * SCALE), (0, 0, 0, 0))


def draw_for(im):
    return ImageDraw.Draw(im)


def xy(values):
    return tuple(round(value * SCALE) for value in values)


def save(im, name, size):
    im.resize(size, Image.Resampling.LANCZOS).save(OUT / name, format="PNG", optimize=True, compress_level=9)


def recycling_flower(state):
    size = (384, 384)
    im = canvas(size)
    d = draw_for(im)
    # soft floor shadow
    d.ellipse(xy((64, 330, 320, 370)), fill=(3, 16, 22, 120))
    body = (26, 117, 122, 255)
    body_hi = (74, 214, 188, 255)
    gold = (255, 196, 78, 255)
    if state == "open":
        d.rounded_rectangle(xy((74, 155, 310, 343)), radius=24 * SCALE, fill=body, outline=(4, 40, 48, 255), width=7 * SCALE)
        d.rounded_rectangle(xy((88, 174, 296, 326)), radius=16 * SCALE, fill=(8, 45, 58, 255), outline=body_hi, width=4 * SCALE)
        d.ellipse(xy((118, 192, 266, 340)), fill=(7, 24, 37, 240), outline=gold, width=6 * SCALE)
        d.arc(xy((134, 208, 250, 324)), 206, 346, fill=body_hi, width=8 * SCALE)
        d.polygon([xy((233, 222)), xy((253, 230)), xy((236, 246))], fill=body_hi)
        d.arc(xy((134, 208, 250, 324)), 26, 166, fill=gold, width=8 * SCALE)
        d.polygon([xy((151, 216)), xy((137, 233)), xy((157, 236))], fill=gold)
        d.rounded_rectangle(xy((94, 122, 290, 172)), radius=18 * SCALE, fill=body_hi, outline=(4, 40, 48, 255), width=7 * SCALE)
        d.line([xy((127, 130)), xy((111, 94))], fill=gold, width=8 * SCALE)
        d.line([xy((257, 130)), xy((273, 94))], fill=gold, width=8 * SCALE)
    elif state == "chew":
        d.rounded_rectangle(xy((74, 151, 310, 343)), radius=24 * SCALE, fill=body, outline=(4, 40, 48, 255), width=7 * SCALE)
        d.rounded_rectangle(xy((90, 177, 294, 328)), radius=18 * SCALE, fill=(8, 45, 58, 255), outline=body_hi, width=4 * SCALE)
        for angle in (0, 120, 240):
            cx, cy = 192 + math.cos(math.radians(angle)) * 47, 252 + math.sin(math.radians(angle)) * 47
            d.ellipse(xy((cx - 16, cy - 16, cx + 16, cy + 16)), fill=gold, outline=(4, 40, 48, 255), width=3 * SCALE)
        d.rounded_rectangle(xy((94, 122, 290, 172)), radius=18 * SCALE, fill=body_hi, outline=(4, 40, 48, 255), width=7 * SCALE)
    else:
        d.rounded_rectangle(xy((74, 158, 310, 343)), radius=24 * SCALE, fill=body, outline=(4, 40, 48, 255), width=7 * SCALE)
        d.rounded_rectangle(xy((90, 178, 294, 328)), radius=18 * SCALE, fill=(8, 45, 58, 255), outline=body_hi, width=4 * SCALE)
        d.arc(xy((132, 210, 252, 326)), 25, 155, fill=gold, width=8 * SCALE)
        d.arc(xy((132, 210, 252, 326)), 145, 275, fill=body_hi, width=8 * SCALE)
        d.arc(xy((132, 210, 252, 326)), 265, 385, fill=gold, width=8 * SCALE)
        d.rounded_rectangle(xy((94, 126, 290, 174)), radius=18 * SCALE, fill=body_hi, outline=(4, 40, 48, 255), width=7 * SCALE)
    # status lights
    for cx, color in ((108, body_hi), (276, gold)):
        d.ellipse(xy((cx - 8, 142, cx + 8, 158)), fill=color, outline=(4, 40, 48, 255), width=3 * SCALE)
    return im


def friendly_guest():
    size = (512, 512)
    im = canvas(size)
    d = draw_for(im)
    d.ellipse(xy((82, 115, 430, 465)), fill=(32, 103, 134, 255), outline=(5, 28, 50, 255), width=10 * SCALE)
    d.arc(xy((112, 144, 400, 432)), 28, 152, fill=(103, 235, 205, 255), width=8 * SCALE)
    d.arc(xy((112, 144, 400, 432)), 208, 332, fill=(255, 195, 78, 255), width=8 * SCALE)
    # antennae and soft circular eyes
    d.line([xy((164, 138)), xy((128, 72))], fill=(103, 235, 205, 255), width=10 * SCALE)
    d.line([xy((348, 138)), xy((384, 72))], fill=(103, 235, 205, 255), width=10 * SCALE)
    for cx in (128, 384):
        d.ellipse(xy((cx - 20, 48, cx + 20, 88)), fill=(255, 195, 78, 255), outline=(5, 28, 50, 255), width=5 * SCALE)
    for cx in (178, 334):
        d.ellipse(xy((cx - 34, 210, cx + 34, 278)), fill=(235, 250, 244, 255), outline=(5, 28, 50, 255), width=6 * SCALE)
        d.ellipse(xy((cx - 12, 231, cx + 12, 255)), fill=(16, 65, 88, 255))
    d.arc(xy((196, 272, 316, 374)), 15, 165, fill=(255, 195, 78, 255), width=9 * SCALE)
    d.ellipse(xy((218, 350, 294, 414)), fill=(103, 235, 205, 255), outline=(5, 28, 50, 255), width=5 * SCALE)
    return im


def cleaning_drone():
    size = (256, 256)
    im = canvas(size)
    d = draw_for(im)
    d.ellipse(xy((26, 206, 230, 238)), fill=(3, 16, 22, 120))
    d.rounded_rectangle(xy((42, 83, 214, 205)), radius=32 * SCALE, fill=(43, 130, 146, 255), outline=(5, 29, 46, 255), width=7 * SCALE)
    d.rounded_rectangle(xy((59, 103, 197, 176)), radius=18 * SCALE, fill=(9, 42, 60, 255), outline=(112, 241, 208, 255), width=4 * SCALE)
    d.ellipse(xy((84, 121, 111, 148)), fill=(255, 196, 78, 255))
    d.ellipse(xy((145, 121, 172, 148)), fill=(255, 196, 78, 255))
    d.line([xy((84, 83)), xy((72, 52))], fill=(112, 241, 208, 255), width=7 * SCALE)
    d.line([xy((172, 83)), xy((184, 52))], fill=(112, 241, 208, 255), width=7 * SCALE)
    d.ellipse(xy((62, 38, 82, 58)), fill=(255, 196, 78, 255), outline=(5, 29, 46, 255), width=3 * SCALE)
    d.ellipse(xy((174, 38, 194, 58)), fill=(255, 196, 78, 255), outline=(5, 29, 46, 255), width=3 * SCALE)
    d.rounded_rectangle(xy((62, 186, 93, 224)), radius=10 * SCALE, fill=(255, 196, 78, 255), outline=(5, 29, 46, 255), width=4 * SCALE)
    d.rounded_rectangle(xy((163, 186, 194, 224)), radius=10 * SCALE, fill=(255, 196, 78, 255), outline=(5, 29, 46, 255), width=4 * SCALE)
    return im


def sparkle_beacon():
    size = (128, 128)
    im = canvas(size)
    d = draw_for(im)
    cx, cy = 64, 64
    points = []
    for index in range(16):
        angle = -math.pi / 2 + index * math.pi / 8
        radius = 52 if index % 2 == 0 else 22
        points.append(xy((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius)))
    d.polygon(points, fill=(112, 241, 208, 255), outline=(5, 29, 46, 255))
    d.ellipse(xy((38, 38, 90, 90)), fill=(255, 196, 78, 255), outline=(5, 29, 46, 255), width=5 * SCALE)
    d.ellipse(xy((51, 51, 77, 77)), fill=(22, 80, 103, 255))
    return im


def food_column(state):
    size = (512, 896)
    im = canvas(size)
    d = draw_for(im)
    palette = {
        "raw": ((236, 188, 112, 255), (255, 220, 153, 255), (95, 177, 166, 255)),
        "best": ((205, 103, 40, 255), (247, 166, 63, 255), (93, 207, 178, 255)),
        "burnt": ((104, 66, 52, 255), (156, 96, 56, 255), (66, 156, 145, 255)),
    }[state]
    base, highlight, accent = palette
    d.ellipse(xy((92, 824, 420, 878)), fill=(3, 16, 22, 150))
    d.rectangle(xy((244, 44, 268, 840)), fill=(178, 187, 184, 255), outline=(35, 45, 49, 255), width=5 * SCALE)
    d.ellipse(xy((224, 28, 288, 78)), fill=(197, 204, 198, 255), outline=(35, 45, 49, 255), width=6 * SCALE)
    d.ellipse(xy((190, 804, 322, 862)), fill=(112, 127, 126, 255), outline=(35, 45, 49, 255), width=6 * SCALE)
    d.ellipse(xy((204, 814, 308, 850)), fill=(35, 53, 57, 255))
    for row in range(6):
        y = 122 + row * 112
        for col in range(3):
            x = 112 + col * 96 + (row % 2) * 8
            d.rounded_rectangle(xy((x, y, x + 104, y + 92)), radius=29 * SCALE, fill=base, outline=(51, 42, 44, 255), width=5 * SCALE)
            d.arc(xy((x + 12, y + 12, x + 92, y + 74)), 188, 346, fill=highlight, width=7 * SCALE)
            d.ellipse(xy((x + 42, y + 31, x + 50, y + 39)), fill=accent)
    d.rounded_rectangle(xy((80, 104, 432, 792)), radius=56 * SCALE, outline=(30, 31, 40, 180), width=5 * SCALE)
    return im


def food_slice():
    size = (192, 192)
    im = canvas(size)
    d = draw_for(im)
    d.ellipse(xy((20, 145, 172, 176)), fill=(3, 16, 22, 130))
    d.rounded_rectangle(xy((25, 45, 167, 145)), radius=35 * SCALE, fill=(210, 111, 47, 255), outline=(44, 32, 36, 255), width=6 * SCALE)
    d.arc(xy((42, 62, 150, 122)), 200, 340, fill=(255, 191, 72, 255), width=6 * SCALE)
    d.arc(xy((42, 72, 150, 132)), 20, 160, fill=(99, 213, 181, 255), width=5 * SCALE)
    for cx, cy in ((67, 92), (106, 76), (128, 111)):
        d.ellipse(xy((cx - 5, cy - 5, cx + 5, cy + 5)), fill=(255, 224, 125, 255))
    return im


def star_vegetable():
    size = (192, 192)
    im = canvas(size)
    d = draw_for(im)
    d.ellipse(xy((32, 145, 160, 174)), fill=(3, 16, 22, 120))
    points = [xy((96 + math.cos(-math.pi / 2 + i * math.pi / 8) * (70 if i % 2 == 0 else 33), 94 + math.sin(-math.pi / 2 + i * math.pi / 8) * (70 if i % 2 == 0 else 33))) for i in range(16)]
    d.polygon(points, fill=(46, 185, 145, 255), outline=(9, 48, 58, 255))
    d.line([xy((73, 112)), xy((101, 54)), xy((124, 116))], fill=(181, 255, 182, 255), width=7 * SCALE, joint="curve")
    d.ellipse(xy((83, 128, 109, 154)), fill=(255, 196, 78, 255), outline=(9, 48, 58, 255), width=4 * SCALE)
    return im


def sauce_swirls():
    size = (256, 128)
    im = canvas(size)
    d = draw_for(im)
    d.ellipse(xy((26, 93, 230, 118)), fill=(3, 16, 22, 100))
    for cx, cy, radius in ((66, 72, 25), (126, 58, 34), (190, 74, 22)):
        d.ellipse(xy((cx - radius, cy - radius, cx + radius, cy + radius)), fill=(225, 87, 48, 235), outline=(79, 35, 38, 255), width=4 * SCALE)
        d.arc(xy((cx - radius + 8, cy - radius + 8, cx + radius - 8, cy + radius - 8)), 200, 345, fill=(255, 190, 75, 255), width=4 * SCALE)
    return im


def fries_burnt():
    size = (256, 256)
    im = canvas(size)
    d = draw_for(im)
    d.ellipse(xy((28, 210, 228, 241)), fill=(3, 16, 22, 120))
    d.polygon([xy((32, 122)), xy((224, 122)), xy((201, 226)), xy((55, 226))], fill=(73, 106, 117, 255), outline=(25, 37, 45, 255))
    for x, top, bottom in ((62, 53, 143), (88, 38, 145), (117, 57, 144), (145, 42, 144), (173, 56, 145)):
        d.rounded_rectangle(xy((x, top, x + 22, bottom)), radius=8 * SCALE, fill=(164, 104, 63, 255), outline=(54, 39, 38, 255), width=4 * SCALE)
        d.line([xy((x + 6, top + 14)), xy((x + 15, bottom - 16))], fill=(227, 163, 78, 255), width=3 * SCALE)
    d.line([xy((195, 67)), xy((234, 42))], fill=(174, 185, 181, 255), width=8 * SCALE)
    return im


def courier_head():
    size = (320, 320)
    im = canvas(size)
    d = draw_for(im)
    d.ellipse(xy((30, 40, 290, 300)), fill=(44, 122, 144, 255), outline=(8, 33, 47, 255), width=8 * SCALE)
    d.rounded_rectangle(xy((68, 88, 252, 202)), radius=24 * SCALE, fill=(9, 47, 64, 255), outline=(113, 239, 204, 255), width=5 * SCALE)
    d.ellipse(xy((101, 119, 127, 145)), fill=(255, 196, 78, 255))
    d.ellipse(xy((193, 119, 219, 145)), fill=(255, 196, 78, 255))
    d.arc(xy((112, 155, 208, 234)), 20, 160, fill=(255, 196, 78, 255), width=7 * SCALE)
    d.rounded_rectangle(xy((94, 26, 226, 74)), radius=14 * SCALE, fill=(255, 196, 78, 255), outline=(8, 33, 47, 255), width=6 * SCALE)
    d.rectangle(xy((137, 74, 183, 93)), fill=(113, 239, 204, 255), outline=(8, 33, 47, 255), width=3 * SCALE)
    return im


save(recycling_flower("closed"), "bio_maw_closed.png", (384, 384))
save(recycling_flower("open"), "bio_maw_open.png", (384, 384))
save(recycling_flower("chew"), "bio_maw_chew.png", (384, 384))
save(cleaning_drone(), "bio_slug.png", (256, 256))
save(sparkle_beacon(), "bio_roach.png", (128, 128))
save(food_column("raw"), "food_meat_column_raw.png", (512, 896))
save(food_column("best"), "food_meat_column_best.png", (512, 896))
save(food_column("burnt"), "food_meat_column_burnt.png", (512, 896))
save(food_slice(), "food_meat_slice.png", (192, 192))
save(star_vegetable(), "food_tentacle.png", (192, 192))
save(sauce_swirls(), "food_sauce_splat.png", (256, 128))
save(fries_burnt(), "food_fries_burnt.png", (256, 256))
save(courier_head(), "head_thief.png", (320, 320))
save(friendly_guest(), "head_worm.png", (512, 512))
print("Wrote safe runtime illustrations")
