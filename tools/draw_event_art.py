"""重绘事件角色头像与谜语记事板。

用法：
    python3 tools/draw_event_art.py [输出目录]

默认输出到 assets/images。四倍超采样后缩放，保留透明通道。
"""

import sys
from math import cos, pi, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

INK = (27, 16, 51, 255)
VOID = (11, 10, 31, 255)
PANEL = (42, 27, 77, 255)
PANEL_LIT = (61, 42, 107, 255)
PINK = (255, 61, 154, 255)
CYAN = (34, 224, 214, 255)
GOLD = (255, 201, 60, 255)
ALERT = (255, 77, 77, 255)
METAL = (138, 147, 181, 255)
METAL_DARK = (92, 99, 128, 255)
TEXT = (245, 240, 255, 255)
VEIN = (156, 255, 240, 255)
ORGANIC = (212, 86, 140, 255)
ORGANIC_DARK = (150, 52, 96, 255)
SAUCE = (161, 92, 255, 255)
DOUGH = (233, 216, 166, 255)


def blob(cx, cy, radius, mods=(), n=96):
    """极坐标有机轮廓。mods 为 (频率, 振幅, 相位) 序列。"""
    pts = []
    for index in range(n):
        angle = 2 * pi * index / n
        r = radius
        for freq, amp, phase in mods:
            r += amp * sin(freq * angle + phase)
        pts.append((cx + r * cos(angle), cy + r * sin(angle)))
    return pts


def ring_points(cx, cy, radius, count, phase=0.0):
    return [
        (cx + radius * cos(2 * pi * i / count + phase), cy + radius * sin(2 * pi * i / count + phase))
        for i in range(count)
    ]


def bezier(p0, p1, p2, steps=24):
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        out.append((
            u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
        ))
    return out


class Art:
    """带描边的超采样画布，坐标按目标尺寸给出。"""

    def __init__(self, size, ss=4):
        self.size = size
        self.ss = ss
        self.im = Image.new('RGBA', (size * ss, size * ss), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def _s(self, pts):
        return [(x * self.ss, y * self.ss) for x, y in pts]

    def _w(self, w):
        return max(1, int(round(w * self.ss)))

    def poly(self, pts, fill, outline=INK, w=3.0):
        self.d.polygon(self._s(pts), fill=fill, outline=outline if w else None, width=self._w(w) if w else 0)

    def ell(self, cx, cy, rx, ry, fill, outline=INK, w=3.0):
        box = [(cx - rx) * self.ss, (cy - ry) * self.ss, (cx + rx) * self.ss, (cy + ry) * self.ss]
        self.d.ellipse(box, fill=fill, outline=outline if w else None, width=self._w(w) if w else 0)

    def line(self, pts, color, w=3.0, joint='curve'):
        self.d.line(self._s(pts), fill=color, width=self._w(w), joint=joint)

    def dot(self, cx, cy, r, fill, outline=None, w=1.5):
        self.ell(cx, cy, r, r, fill, outline, w if outline else 0)

    def overlay(self, alpha=110):
        """返回一个可叠加的半透明子层与其绘制器。"""
        layer = Image.new('RGBA', self.im.size, (0, 0, 0, 0))
        return layer, ImageDraw.Draw(layer), alpha

    def merge(self, layer, alpha):
        if alpha < 255:
            r, g, b, a = layer.split()
            a = a.point(lambda v: int(v * alpha / 255))
            layer = Image.merge('RGBA', (r, g, b, a))
        self.im = Image.alpha_composite(self.im, layer)
        self.d = ImageDraw.Draw(self.im)

    def glow(self, cx, cy, radius, color, strength=90):
        layer, draw, _ = self.overlay()
        box = [(cx - radius) * self.ss, (cy - radius) * self.ss, (cx + radius) * self.ss, (cy + radius) * self.ss]
        draw.ellipse(box, fill=color)
        layer = layer.filter(ImageFilter.GaussianBlur(radius * self.ss * 0.35))
        self.merge(layer, strength)

    def save(self, path):
        out = self.im.resize((self.size, self.size), Image.LANCZOS)
        out.save(path, optimize=True)
        return out


def draw_scavenger(size=320):
    """拾荒机器人：破损金属头壳、单摄像头眼、天线与外露线束。"""
    a = Art(size)
    cx, cy = size / 2, size / 2 + 6

    # 天线
    for sx, tilt in ((-1, -16), (1, 14)):
        base = (cx + sx * 44, cy - 74)
        tip = (cx + sx * 60 + tilt, cy - 132)
        a.line([base, (cx + sx * 54, cy - 106), tip], INK, 9)
        a.line([base, (cx + sx * 54, cy - 106), tip], METAL, 5)
        a.glow(tip[0], tip[1], 14, CYAN, 120)
        a.dot(tip[0], tip[1], 9, CYAN, INK, 3)
        a.dot(tip[0] - 2, tip[1] - 3, 3, TEXT)

    # 外露线束
    for sx, col in ((-1, PINK), (1, CYAN)):
        p0 = (cx + sx * 58, cy + 46)
        curve = bezier(p0, (cx + sx * 96, cy + 74), (cx + sx * 74, cy + 116))
        a.line(curve, INK, 10)
        a.line(curve, col, 5)

    # 头壳主体
    shell = [
        (cx - 84, cy - 34), (cx - 70, cy - 76), (cx - 30, cy - 98), (cx + 34, cy - 96),
        (cx + 76, cy - 70), (cx + 90, cy - 24), (cx + 84, cy + 42), (cx + 52, cy + 84),
        (cx - 48, cy + 86), (cx - 82, cy + 44),
    ]
    a.poly(shell, METAL, INK, 5)

    # 右侧暗面
    a.poly([
        (cx + 30, cy - 96), (cx + 76, cy - 70), (cx + 90, cy - 24), (cx + 84, cy + 42),
        (cx + 52, cy + 84), (cx + 34, cy + 84),
    ], METAL_DARK, None, 0)

    # 顶部高光
    a.poly([(cx - 62, cy - 68), (cx - 28, cy - 88), (cx + 12, cy - 86), (cx - 6, cy - 68), (cx - 44, cy - 58)],
           (176, 184, 214, 255), None, 0)

    # 显示屏凹槽
    a.poly([(cx - 62, cy - 52), (cx + 58, cy - 56), (cx + 66, cy + 8), (cx - 58, cy + 14)], VOID, INK, 5)
    a.poly([(cx - 54, cy - 44), (cx + 50, cy - 48), (cx + 56, cy + 2), (cx - 50, cy + 6)], (24, 18, 52, 255), None, 0)

    # 摄像头眼
    a.glow(cx + 10, cy - 22, 30, ALERT, 110)
    a.ell(cx + 10, cy - 22, 28, 28, ALERT, INK, 5)
    a.ell(cx + 10, cy - 22, 15, 15, (140, 26, 40, 255), None, 0)
    a.dot(cx + 20, cy - 32, 8, TEXT)
    a.dot(cx - 1, cy - 12, 3, (255, 190, 190, 255))

    # 屏幕扫描线
    for i in range(4):
        y = cy - 40 + i * 14
        a.line([(cx - 48, y), (cx + 48, y - 2)], (60, 48, 104, 160), 1.6)

    # 下颚格栅
    a.poly([(cx - 56, cy + 26), (cx + 62, cy + 22), (cx + 56, cy + 62), (cx - 50, cy + 64)], PANEL, INK, 4)
    for i in range(6):
        x = cx - 44 + i * 19
        a.line([(x, cy + 32), (x - 2, cy + 58)], (28, 22, 60, 255), 4)

    # 警示斜条
    for i in range(3):
        x = cx - 74 + i * 13
        a.poly([(x, cy + 6), (x + 8, cy + 6), (x + 1, cy + 32), (x - 7, cy + 32)], GOLD, None, 0)

    # 铆钉
    for px, py in ring_points(cx, cy - 4, 82, 12):
        a.dot(px, py * 0.98 + cy * 0.02, 4.2, METAL_DARK, INK, 1.6)

    # 锈斑与划痕
    a.poly(blob(cx - 60, cy + 52, 13, ((3, 4, 0.4), (5, 2.5, 1.1))), (118, 74, 62, 255), None, 0)
    a.poly(blob(cx + 70, cy - 54, 10, ((4, 3, 0.9),)), (118, 74, 62, 255), None, 0)
    a.line([(cx - 30, cy - 88), (cx - 12, cy - 74)], (60, 62, 88, 255), 3)
    return a


def draw_thief(size=320):
    """量子小偷：兜帽暗影脸、双青眼与相位重影。"""
    a = Art(size)
    cx, cy = size / 2, size / 2 + 4

    hood = [
        (cx, cy - 112), (cx + 46, cy - 84), (cx + 74, cy - 24), (cx + 78, cy + 40),
        (cx + 44, cy + 82), (cx - 44, cy + 82), (cx - 78, cy + 40), (cx - 74, cy - 24),
        (cx - 46, cy - 84),
    ]

    # 相位重影
    for dx, col, alpha in ((-26, CYAN, 78), (24, PINK, 66)):
        layer, draw, _ = a.overlay()
        draw.polygon([((x + dx) * a.ss, y * a.ss) for x, y in hood], fill=col)
        layer = layer.filter(ImageFilter.GaussianBlur(3 * a.ss))
        a.merge(layer, alpha)

    # 兜帽
    a.poly(hood, PANEL, INK, 5)
    a.poly([(cx, cy - 112), (cx + 46, cy - 84), (cx + 74, cy - 24), (cx + 78, cy + 40),
            (cx + 44, cy + 82), (cx + 16, cy + 82), (cx + 22, cy - 30)], (32, 20, 60, 255), None, 0)
    a.poly([(cx - 4, cy - 108), (cx - 44, cy - 82), (cx - 70, cy - 26), (cx - 54, cy - 20),
            (cx - 32, cy - 66)], PANEL_LIT, None, 0)

    # 帽檐
    a.poly([(cx - 70, cy - 28), (cx - 30, cy - 54), (cx + 32, cy - 54), (cx + 70, cy - 26),
            (cx + 58, cy - 8), (cx - 58, cy - 8)], (52, 34, 92, 255), INK, 4)

    # 兜帽内暗影
    a.poly([(cx - 58, cy - 12), (cx + 58, cy - 12), (cx + 50, cy + 56), (cx - 50, cy + 56)], VOID, None, 0)
    a.poly(blob(cx, cy + 18, 50, ((2, 6, 0.3), (4, 3, 1.4))), (8, 7, 24, 255), None, 0)

    # 双眼
    for sx in (-1, 1):
        ex, ey = cx + sx * 25, cy + 12
        a.glow(ex, ey, 24, CYAN, 130)
        a.poly([(ex - 17, ey - 3), (ex + 2, ey - 11), (ex + 16, ey - 1), (ex + 1, ey + 10)], CYAN, INK, 3)
        a.dot(ex + 3, ey - 4, 4.5, TEXT)

    # 能量裂纹
    for pts in (
        [(cx - 40, cy - 40), (cx - 30, cy - 24), (cx - 36, cy - 10)],
        [(cx + 42, cy - 34), (cx + 32, cy - 18), (cx + 38, cy - 4)],
        [(cx - 8, cy - 100), (cx - 2, cy - 82), (cx - 12, cy - 70)],
    ):
        a.line(pts, CYAN, 2.6)

    # 领口与扣带
    a.poly([(cx - 52, cy + 62), (cx + 52, cy + 62), (cx + 44, cy + 86), (cx - 44, cy + 86)], (52, 34, 92, 255), INK, 4)
    a.dot(cx, cy + 74, 8, GOLD, INK, 3)
    a.dot(cx - 2, cy + 71, 2.6, TEXT)

    # 悬浮量子点
    for px, py, r in ((cx - 88, cy - 60, 5), (cx + 92, cy + 18, 4), (cx + 70, cy - 88, 3.4)):
        a.glow(px, py, 12, CYAN, 110)
        a.dot(px, py, r, CYAN)
    return a


def draw_critic(size=320):
    """差评虫：巨大单眼、单片镜与吸食口器。"""
    a = Art(size)
    cx, cy = size / 2, size / 2 + 8

    # 触角
    for sx in (-1, 1):
        curve = bezier((cx + sx * 40, cy - 76), (cx + sx * 74, cy - 128), (cx + sx * 44, cy - 152))
        a.line(curve, INK, 9)
        a.line(curve, ORGANIC, 5)
        tip = curve[-1]
        a.dot(tip[0], tip[1], 8, GOLD, INK, 3)

    # 头部
    a.poly(blob(cx, cy, 92, ((2, 7, 0.5), (3, 5, 2.0), (5, 3, 0.9))), ORGANIC, INK, 5)

    # 暗部与亮部
    a.poly(blob(cx + 26, cy + 22, 66, ((2, 6, 1.2), (4, 4, 0.2))), ORGANIC_DARK, None, 0)
    a.poly(blob(cx - 34, cy - 34, 42, ((3, 5, 0.7),)), (236, 130, 176, 255), None, 0)

    # 皮肤斑点
    for px, py, r in ((cx - 62, cy + 34, 8), (cx + 58, cy - 52, 6.5), (cx - 20, cy + 68, 7),
                      (cx + 44, cy + 54, 5.5), (cx - 74, cy - 16, 5)):
        a.dot(px, py, r, ORGANIC_DARK, None)

    # 巨大单眼
    a.ell(cx - 4, cy - 16, 54, 50, TEXT, INK, 5)
    a.ell(cx + 2, cy - 14, 30, 30, ALERT, INK, 4)
    a.ell(cx + 2, cy - 14, 15, 15, VOID, None, 0)
    a.dot(cx + 14, cy - 26, 9, TEXT)
    a.dot(cx - 8, cy - 4, 3.4, (255, 200, 200, 255))
    # 血丝
    for pts in ([(cx - 48, cy - 30), (cx - 34, cy - 24)], [(cx - 44, cy + 6), (cx - 30, cy + 2)]):
        a.line(pts, (226, 120, 130, 255), 2)

    # 单片镜（只描边，填充留空以免擦掉眼睛）
    a.ell(cx - 4, cy - 16, 62, 58, None, GOLD, 5)
    a.ell(cx - 4, cy - 16, 65, 61, None, INK, 2)
    chain = bezier((cx + 52, cy + 18), (cx + 76, cy + 52), (cx + 58, cy + 84))
    a.line(chain, GOLD, 3.4)

    # 浓眉
    a.poly([(cx - 56, cy - 70), (cx - 18, cy - 86), (cx + 26, cy - 84), (cx + 20, cy - 70),
            (cx - 16, cy - 72), (cx - 48, cy - 58)], INK, None, 0)

    # 吸食口器
    a.poly([(cx - 18, cy + 56), (cx + 16, cy + 56), (cx + 12, cy + 104), (cx - 14, cy + 104)],
           ORGANIC_DARK, INK, 4)
    for i in range(3):
        y = cy + 68 + i * 13
        a.line([(cx - 15, y), (cx + 13, y)], (110, 36, 70, 255), 3)
    a.ell(cx - 1, cy + 106, 15, 8, (96, 30, 62, 255), INK, 4)

    # 差评星标
    star_c = (cx - 74, cy - 66)
    pts = []
    for i in range(10):
        ang = -pi / 2 + pi * i / 5
        rad = 22 if i % 2 == 0 else 9
        pts.append((star_c[0] + rad * cos(ang), star_c[1] + rad * sin(ang)))
    a.poly(pts, GOLD, INK, 4)
    a.line([(star_c[0] - 20, star_c[1] + 18), (star_c[0] + 20, star_c[1] - 18)], ALERT, 6)
    return a


def draw_worm(size=512):
    """虫洞蠕虫：环形口器、放射牙列与外圈触须。"""
    a = Art(size)
    cx, cy = size / 2, size / 2
    K = 0.84

    # 外圈触须
    for i in range(10):
        ang = 2 * pi * i / 10 + 0.22
        base = (cx + K * 150 * cos(ang), cy + K * 150 * sin(ang))
        mid = (cx + K * 208 * cos(ang + 0.16), cy + K * 208 * sin(ang + 0.16))
        tip = (cx + K * 236 * cos(ang - 0.10), cy + K * 236 * sin(ang - 0.10))
        curve = bezier(base, mid, tip)
        a.line(curve, INK, 20)
        a.line(curve, ORGANIC, 12)
        a.glow(tip[0], tip[1], 20, CYAN, 110)
        a.dot(tip[0], tip[1], 11, CYAN, INK, 4)

    # 外环肉体
    a.poly(blob(cx, cy, K * 168, ((3, 12, 0.4), (5, 7, 1.7), (7, 4, 0.6))), ORGANIC, INK, 8)
    # 环节纹理
    for i in range(16):
        ang = 2 * pi * i / 16
        p0 = (cx + K * 118 * cos(ang), cy + K * 118 * sin(ang))
        p1 = (cx + K * 166 * cos(ang), cy + K * 166 * sin(ang))
        a.line([p0, p1], ORGANIC_DARK, 5)

    # 中层
    a.poly(blob(cx, cy, K * 128, ((4, 8, 1.1), (6, 5, 0.3))), SAUCE, INK, 7)
    a.poly(blob(cx + 14, cy + 18, K * 110, ((3, 7, 0.9),)), (118, 62, 196, 255), None, 0)

    # 内层与深喉
    a.poly(blob(cx, cy, K * 92, ((5, 6, 0.5),)), PANEL, INK, 6)
    a.glow(cx, cy, K * 78, CYAN, 70)
    a.ell(cx, cy, K * 62, K * 62, VOID, VEIN, 4)
    a.ell(cx, cy, K * 34, K * 34, (4, 4, 14, 255), None, 0)

    # 放射牙列（两层交错）
    for layer_r, tooth_len, half, color in ((K * 92, K * 40, K * 15, DOUGH),
                                            (K * 66, K * 26, K * 10, (250, 240, 210, 255))):
        count = 12 if layer_r > K * 80 else 10
        phase = 0 if layer_r > K * 80 else pi / count
        for i in range(count):
            ang = 2 * pi * i / count + phase
            tipx = cx + (layer_r - tooth_len) * cos(ang)
            tipy = cy + (layer_r - tooth_len) * sin(ang)
            b1 = (cx + layer_r * cos(ang - half / layer_r * 2), cy + layer_r * sin(ang - half / layer_r * 2))
            b2 = (cx + layer_r * cos(ang + half / layer_r * 2), cy + layer_r * sin(ang + half / layer_r * 2))
            a.poly([b1, (tipx, tipy), b2], color, INK, 4)

    # 内壁发光环
    a.ell(cx, cy, K * 50, K * 50, None, CYAN, 3)

    # 黏液滴
    for px, py, rx, ry in ((cx - 82, cy + 100, 13, 20), (cx + 92, cy - 78, 10, 16), (cx + 54, cy + 120, 8, 13)):
        layer, draw, _ = a.overlay()
        draw.ellipse([(px - rx) * a.ss, (py - ry) * a.ss, (px + rx) * a.ss, (py + ry) * a.ss], fill=VEIN)
        a.merge(layer, 150)
        a.ell(px - rx * 0.3, py - ry * 0.3, rx * 0.3, ry * 0.25, TEXT, None, 0)
    return a


def draw_notepad(size=256):
    """谜语记事板：金属边框、发光屏与手写谜题。"""
    a = Art(size)
    cx, cy = size / 2, size / 2 - 4

    # 悬浮投影
    layer, draw, _ = a.overlay()
    draw.ellipse([(cx - 70) * a.ss, (cy + 88) * a.ss, (cx + 70) * a.ss, (cy + 108) * a.ss], fill=CYAN)
    layer = layer.filter(ImageFilter.GaussianBlur(4.5 * a.ss))
    a.merge(layer, 90)

    # 外框
    a.poly([(cx - 88, cy - 74), (cx + 88, cy - 78), (cx + 94, cy + 76), (cx - 92, cy + 80)], METAL, INK, 6)
    a.poly([(cx + 60, cy - 77), (cx + 88, cy - 78), (cx + 94, cy + 76), (cx + 64, cy + 78)],
           METAL_DARK, None, 0)

    # 屏幕
    a.poly([(cx - 74, cy - 60), (cx + 74, cy - 63), (cx + 79, cy + 60), (cx - 77, cy + 64)], PANEL, INK, 4)
    a.poly([(cx - 70, cy - 56), (cx + 70, cy - 59), (cx + 74, cy + 55), (cx - 73, cy + 59)],
           (36, 24, 70, 255), None, 0)

    # 扫描线
    for i in range(9):
        y = cy - 50 + i * 13
        a.line([(cx - 68, y), (cx + 70, y - 1)], (54, 44, 100, 200), 1.6)

    # 大问号
    q = bezier((cx - 20, cy - 30), (cx + 26, cy - 46), (cx + 12, cy - 6))
    a.line(q, INK, 13)
    a.line(q, GOLD, 8)
    a.line([(cx + 12, cy - 6), (cx + 6, cy + 12)], INK, 13)
    a.line([(cx + 12, cy - 6), (cx + 6, cy + 12)], GOLD, 8)
    a.dot(cx + 4, cy + 30, 8.5, INK)
    a.dot(cx + 4, cy + 30, 5.5, GOLD)

    # 手写谜题线
    for i, (x0, x1) in enumerate(((-58, -14), (-58, 30), (-58, -30))):
        y = cy + 20 + i * 15
        a.line([(cx + x0, y), (cx + x1, y - 2)], (196, 186, 226, 220), 3)

    # 四角螺丝
    for px, py in ((cx - 76, cy - 62), (cx + 78, cy - 65), (cx + 82, cy + 64), (cx - 80, cy + 67)):
        a.dot(px, py, 6.5, METAL_DARK, INK, 2.4)
        a.line([(px - 3, py - 3), (px + 3, py + 3)], INK, 2)

    # 顶部夹与指示灯
    a.poly([(cx - 26, cy - 88), (cx + 26, cy - 90), (cx + 28, cy - 72), (cx - 28, cy - 70)], METAL_DARK, INK, 4)
    a.glow(cx + 62, cy - 50, 14, CYAN, 120)
    a.dot(cx + 62, cy - 50, 6, CYAN, INK, 2.4)
    return a


JOBS = (
    ('head_scavenger.png', draw_scavenger, 320),
    ('head_thief.png', draw_thief, 320),
    ('head_critic.png', draw_critic, 320),
    ('head_worm.png', draw_worm, 512),
    ('prop_notepad.png', draw_notepad, 256),
)


def main():
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else 'assets/images')
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, fn, size in JOBS:
        art = fn(size)
        path = out_dir / name
        image = art.save(path)
        bbox = image.getbbox()
        print(f'{name:24s} {image.width}x{image.height} bbox={bbox} bytes={path.stat().st_size}')


if __name__ == '__main__':
    main()
