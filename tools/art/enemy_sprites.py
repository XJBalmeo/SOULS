"""Original pixel sprites for SOULS Famine enemies: The Starved, Hollow Archer and Death's Shadow.
Each material uses exactly four tones: highlight, main, shadow, deep shadow.
Pure black (#000000) is used only for voids (eye sockets, mouth), as on the knight."""
import math, os, sys
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
W = H = 100

RAMPS = {
    # name: (highlight, main, shadow, deep shadow)
    "skin":   ("#c9c29a", "#9a9473", "#6a664e", "#3a382b"),   # Starved: sick, pallid
    "rag":    ("#8a6c50", "#5f4a37", "#3f3025", "#221a14"),   # Starved loin rag
    "ash":    ("#d3cdb9", "#a39b84", "#6f6957", "#3e3a31"),   # Archer: dry bone-ash skin
    "cloth":  ("#7c8894", "#55606c", "#363e48", "#1c2128"),   # Archer: cold slate wraps
    "wood":   ("#a7804f", "#735535", "#4a3520", "#271b10"),   # bow, quiver
    "iron":   ("#9a958a", "#66625a", "#413e39", "#211f1c"),   # Archer: dented iron kettle helmet
    "glow":   ("#f4ffd2", "#b9e67e", "#7da94e", "#3f5a26"),   # Archer eyes
    "amber":  ("#ffe7a0", "#e8b04a", "#a8742a", "#5a3a14"),   # telegraph flash
}
VOID = "#000000"

def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)

class Sprite:
    def __init__(self, w=W, h=H, xf=None, swap_radii=False):
        """xf: optional point transform (x, y) -> (x, y) applied to every shape,
        used to tip a whole figure over (for example a falling corpse)."""
        self.w, self.h = w, h
        self.xf = xf or (lambda x, y: (x, y))
        self.swap = swap_radii
        self.part = [[None] * w for _ in range(h)]   # part index per pixel
        self.parts = []                               # (material, back)
        self.over = {}                                # manual (x,y) -> colour

    def _add(self, mat, back, test, box):
        idx = len(self.parts)
        self.parts.append((mat, back))
        x0, y0, x1, y1 = box
        for y in range(max(0, int(y0) - 2), min(self.h, int(y1) + 3)):
            for x in range(max(0, int(x0) - 2), min(self.w, int(x1) + 3)):
                if test(x + 0.5, y + 0.5):
                    self.part[y][x] = idx
        return idx

    def poly(self, mat, pts, back=False):
        pts = [self.xf(*p) for p in pts]
        def inside(px, py):
            c = False
            for i in range(len(pts)):
                (ax, ay), (bx, by) = pts[i], pts[i - 1]
                if (ay > py) != (by > py) and px < (bx - ax) * (py - ay) / (by - ay) + ax:
                    c = not c
            return c
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        return self._add(mat, back, inside, (min(xs), min(ys), max(xs), max(ys)))

    def limb(self, mat, pts, r0, r1=None, back=False):
        """Chain of capsules through pts, radius tapering r0 -> r1."""
        r1 = r0 if r1 is None else r1
        pts = [self.xf(*p) for p in pts]
        segs = list(zip(pts, pts[1:]))
        n = len(segs)
        def inside(px, py):
            for i, ((ax, ay), (bx, by)) in enumerate(segs):
                dx, dy = bx - ax, by - ay
                t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy or 1)))
                r = r0 + (r1 - r0) * (i + t) / n
                if (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2 <= r * r:
                    return True
            return False
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        m = max(r0, r1)
        return self._add(mat, back, inside, (min(xs) - m, min(ys) - m, max(xs) + m, max(ys) + m))

    def ell(self, mat, cx, cy, rx, ry, back=False):
        cx, cy = self.xf(cx, cy)
        if self.swap:
            rx, ry = ry, rx
        return self._add(mat, back, lambda px, py: ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1,
                         (cx - rx, cy - ry, cx + rx, cy + ry))

    def px(self, x, y, colour):
        x, y = self.xf(x, y)
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.over[(x, y)] = colour

    def tone(self, mat, i):
        return RAMPS[mat][i]

    def render(self):
        W, H = self.w, self.h
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        P = self.part
        get = lambda x, y: P[y][x] if 0 <= x < W and 0 <= y < H else None
        def run(x, y, dx, dy, p):
            n = 0
            while get(x + dx * (n + 1), y + dy * (n + 1)) == p:
                n += 1
            return n
        for y in range(H):
            for x in range(W):
                p = P[y][x]
                if p is None:
                    continue
                mat, back = self.parts[p]
                dl, dr, du, dd = run(x, y, -1, 0, p), run(x, y, 1, 0, p), run(x, y, 0, -1, p), run(x, y, 0, 1, p)
                width = dl + dr + 1
                # light comes from the upper left: lit band, main body, shaded band
                if width >= 5:
                    f = dl / (width - 1)
                    t = 0 if f < 0.2 else (2 if f > 0.66 else 1)
                elif width >= 3:
                    t = 0 if dl == 0 else (2 if dr == 0 else 1)
                else:
                    t = 1 if dl == 0 else 2
                up = get(x, y - 1)
                if du == 0 and (up is None or up < p):
                    t = max(0, t - 1)
                if dd == 0:
                    t = min(3, t + 1)
                if width >= 5 and dr == 0 and dd <= 2:
                    t = 3
                if up is not None and up > p and self.parts[up][0] != mat:
                    t = 3                                    # occluded under a part in front
                if back:
                    t = min(3, t + 1)
                img.putpixel((x, y), hexrgb(RAMPS[mat][t]))
        for (x, y), c in self.over.items():
            img.putpixel((x, y), hexrgb(c))
        return img

# ------------------------------------------------------------------ The Starved
def starved(pose):
    s = Sprite()
    S = lambda i: RAMPS["skin"][i]
    if pose == "idle":
        s.limb("skin", [(55, 58), (53, 70), (56, 82)], 1.6, 1.1, back=True)             # back arm
        s.poly("skin", [(53, 82), (57, 82), (58, 87), (56, 86), (55, 88), (54, 85)], back=True)
        s.limb("skin", [(47, 76), (43, 87), (42, 97)], 2.0, 1.3, back=True)             # back leg
        s.poly("skin", [(39, 96), (44, 96), (45, 99), (38, 99)], back=True)
        torso = s.poly("skin", [(43, 79), (42, 71), (44, 63), (48, 57), (53, 54), (58, 55), (60, 59),
                                (59, 64), (56, 69), (55, 74), (54, 79)])
        s.poly("rag", [(42, 75), (55, 75), (56, 80), (54, 85), (52, 82), (50, 86), (48, 82), (45, 85), (43, 81)])
        s.limb("skin", [(57, 57), (61, 55)], 1.8)                                       # neck
        s.ell("skin", 64, 52, 4.2, 4.6)                                                 # skull
        s.poly("skin", [(61, 55), (67, 54), (67, 58), (64, 60), (61, 58)])              # slack jaw
        s.limb("skin", [(51, 77), (55, 87), (54, 97)], 2.1, 1.4)                        # front leg
        s.poly("skin", [(52, 96), (57, 96), (59, 99), (51, 99)])
        s.limb("skin", [(58, 59), (61, 70), (63, 82)], 1.8, 1.2)                        # front arm
        s.poly("skin", [(61, 82), (65, 82), (66, 88), (65, 89), (64, 86), (63, 89), (62, 86), (61, 87)])
        # ribs, spine, sternum
        for ry, x0, x1 in [(60, 52, 58), (63, 51, 58), (66, 51, 56)]:
            for x in range(x0, x1):
                s.px(x, ry, S(2))
            for x in range(x0, x0 + 3):
                s.px(x, ry - 1, S(0))
        for sx, sy in [(44, 66), (45, 62), (47, 59), (50, 56)]:
            s.px(sx, sy, S(0))
        s.px(43, 70, S(2)); s.px(44, 73, S(2))                                           # hip bone
        s.px(56, 72, S(3)); s.px(55, 73, S(3))                                           # sunken belly
        # face: socket, pupil, mouth, sparse hair
        for x, y in [(64, 51), (65, 51), (64, 52), (65, 52)]:
            s.px(x, y, VOID)
        s.px(65, 52, RAMPS["amber"][3])
        for x, y in [(63, 57), (64, 57), (65, 57), (64, 58)]:
            s.px(x, y, VOID)
        s.px(66, 56, S(0)); s.px(66, 58, S(0))                                           # teeth
        for x, y in [(61, 48), (62, 47), (60, 50), (63, 47)]:
            s.px(x, y, RAMPS["rag"][3])
    else:  # lunge
        s.limb("skin", [(58, 73), (72, 74), (86, 78)], 1.6, 1.1, back=True)             # back arm
        s.poly("skin", [(84, 76), (88, 76), (88, 80), (84, 80)], back=True)
        line_px(s, (88, 77), (92, 76), S(2)); line_px(s, (88, 79), (92, 81), S(3))
        s.limb("skin", [(41, 84), (51, 91), (53, 97)], 2.0, 1.3, back=True)             # back leg (bent)
        s.poly("skin", [(51, 96), (56, 96), (57, 99), (50, 99)], back=True)
        s.poly("skin", [(36, 82), (42, 77), (50, 72), (58, 68), (63, 68), (65, 72), (64, 76), (57, 77),
                        (49, 80), (42, 86), (37, 87)])
        s.poly("rag", [(34, 80), (43, 79), (45, 86), (42, 91), (40, 88), (37, 92), (35, 87)])
        s.limb("skin", [(63, 70), (67, 69)], 1.8)
        s.ell("skin", 70, 68, 4.2, 4.4)
        s.poly("skin", [(67, 71), (74, 70), (74, 76), (69, 76)])                        # gaping jaw
        s.limb("skin", [(38, 85), (30, 91), (23, 97)], 2.1, 1.4)                        # front leg pushing off
        s.poly("skin", [(19, 96), (25, 96), (26, 99), (18, 99)])
        s.limb("skin", [(62, 72), (75, 70), (88, 70)], 1.8, 1.2)                        # front arm reaching
        s.poly("skin", [(86, 68), (90, 68), (90, 72), (86, 72)])
        line_px(s, (90, 68), (94, 66), S(1)); line_px(s, (90, 70), (95, 70), S(1)); line_px(s, (90, 72), (94, 74), S(2))
        s.px(95, 67, S(3)); s.px(96, 71, S(3)); s.px(95, 75, S(3))
        for rx in (51, 54, 57):
            for k in range(4):
                s.px(rx - k // 2, 71 + k, S(2))
            s.px(rx - 1, 70, S(0))
        for sx, sy in [(44, 77), (48, 74), (53, 70), (58, 68)]:
            s.px(sx, sy, S(0))
        for x, y in [(70, 67), (71, 67), (70, 68), (71, 68)]:
            s.px(x, y, VOID)
        s.px(71, 67, RAMPS["amber"][0]); s.px(70, 67, RAMPS["amber"][1])                # eye flash
        s.px(72, 64, RAMPS["amber"][1]); s.px(74, 66, RAMPS["amber"][2]); s.px(68, 64, RAMPS["amber"][2])
        for x, y in [(70, 73), (71, 73), (72, 73), (70, 74), (71, 74), (72, 74), (71, 75)]:
            s.px(x, y, VOID)
        s.px(73, 72, S(0)); s.px(73, 75, S(0))
        for x, y in [(67, 64), (68, 63), (66, 66)]:
            s.px(x, y, RAMPS["rag"][3])
    return s.render()

# ------------------------------------------------------------------ Hollow Archer
def bow(s, top, grip, bot, bulge):
    """Recurve bow from top tip through grip to bottom tip, bulging forward by `bulge`."""
    pts = []
    for i in range(13):
        t = i / 12
        y = top[1] + (bot[1] - top[1]) * t
        x = top[0] + (bot[0] - top[0]) * t + math.sin(math.pi * t) * bulge
        pts.append((x, y))
    s.limb("ash", pts[:5], 0.9, 1.3); s.limb("ash", pts[4:9], 1.4); s.limb("ash", pts[8:], 1.3, 0.9)
    return pts[0], pts[-1]

def line_px(s, a, b, colour):
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))) or 1
    for i in range(n + 1):
        s.px(round(a[0] + (b[0] - a[0]) * i / n), round(a[1] + (b[1] - a[1]) * i / n), colour)

LOW_BOW = dict(grip=(61, 73), top=(58, 54), bot=(58, 92), bulge=4)
UP_BOW = dict(grip=(70, 58), top=(66, 40), bot=(66, 76), bulge=5)

def archer_frame(bow_pose=LOW_BOW, hand=(50, 74), elbow=(48, 67), drawn=False, arrow=False,
                 glint=0, held_arrow=None, bob=0, xf=None, swap=False, dead=False):
    """One Hollow Archer frame. hand/elbow: the drawing (back) arm."""
    s = Sprite(xf=xf, swap_radii=swap)
    A, Cl, Wd, Ir = (lambda i: RAMPS["ash"][i]), (lambda i: RAMPS["cloth"][i]), (lambda i: RAMPS["wood"][i]), (lambda i: RAMPS["iron"][i])
    s.poly("cloth", [(48, 57), (52, 57), (50, 66), (48, 73), (46, 70), (45, 75), (43, 69), (44, 62)], back=True)
    s.limb("wood", [(51, 54), (43, 71)], 1.7, back=True)
    for x, y in [(50, 51), (52, 52), (53, 50)]:
        s.px(x, y, A(0))
    s.px(51, 52, Cl(1)); s.px(52, 53, Cl(2))
    s.limb("ash", [(50, 77), (48, 87), (47, 97)], 1.4, 1.1, back=True)
    s.poly("cloth", [(44, 96), (49, 96), (50, 99), (43, 99)], back=True)
    s.limb("ash", [(50, 59), elbow, hand], 1.2, 1.0, back=True)
    s.poly("cloth", [(48, 57), (56, 57), (57, 64), (55, 71), (56, 78), (47, 79), (46, 70), (46, 62)][:0] or
           [(48, 57), (56, 57), (57, 61), (55, 67), (54, 73), (49, 73), (48, 67), (47, 61)])
    s.poly("cloth", [(47, 73), (56, 73), (57, 79), (55, 83), (53, 80), (51, 84), (49, 80), (47, 82)])
    s.poly("wood", [(47, 72), (56, 72), (56, 74), (47, 74)])
    s.limb("ash", [(54, 77), (55, 87), (55, 97)], 1.5, 1.1)
    s.poly("cloth", [(53, 96), (58, 96), (60, 99), (52, 99)])
    for y in (88, 91, 94):
        s.px(54, y, Cl(2)); s.px(55, y, Cl(2)); s.px(56, y, Cl(3))
    s.ell("ash", 54, 50, 3.4, 4.4)
    s.limb("cloth", [(49, 56), (57, 56)], 1.7)
    s.poly("cloth", [(48, 56), (50, 57), (47, 64), (45, 63)])
    s.poly("iron", [(49.5, 47), (49.5, 43.5), (51, 41.3), (56, 41.3), (57.5, 43.5), (57.5, 47)])
    s.poly("iron", [(46, 46.5), (61, 46.5), (60, 48.6), (59, 49.6), (48, 49.6), (47, 48.6)])
    for x, y in [(49, 60), (50, 61), (51, 62), (52, 63), (53, 64), (48, 65), (49, 66), (50, 67)]:
        s.px(x, y, Cl(3))
    for x, y in [(50, 59), (51, 60), (52, 61)]:
        s.px(x, y, Cl(0))
    s.px(52, 44, Ir(0)); s.px(51, 45, Ir(0)); s.px(56, 45, Ir(3)); s.px(48, 48, Ir(0)); s.px(53, 73, A(0))
    for x, y in [(54, 51), (56, 51), (54, 52), (56, 52)]:
        s.px(x, y, VOID)
    if not dead:
        s.px(54, 51, RAMPS["glow"][1]); s.px(56, 51, RAMPS["glow"][0])
    s.px(55, 53, VOID)
    for x in range(53, 58):
        s.px(x, 55, A(0) if x % 2 else VOID)
    # bow arm, bow, string
    g = bow_pose["grip"]
    fe = ((55 + g[0]) / 2 + (2 if g[1] > 65 else 0), (59 + g[1]) / 2 + (1 if g[1] > 65 else -1))
    s.limb("ash", [(55, 59), fe, g], 1.2, 1.0)
    top, bot = bow(s, bow_pose["top"], g, bow_pose["bot"], bow_pose["bulge"])
    if drawn:
        line_px(s, (top[0] - 1, top[1] + 1), hand, A(1)); line_px(s, hand, (bot[0] - 1, bot[1] - 1), A(1))
    else:
        line_px(s, (top[0] - 1, top[1] + 1), (bot[0] - 1, bot[1] - 1), A(2))
    if arrow:
        hx, hy = hand
        line_px(s, (hx, hy), (hx + 21, hy), Wd(0))
        s.px(hx - 1, hy - 1, Cl(0)); s.px(hx - 1, hy + 1, Cl(0)); s.px(hx - 2, hy - 1, Cl(1)); s.px(hx - 2, hy + 1, Cl(1))
        s.px(hx + 21, hy, A(0)); s.px(hx + 22, hy, A(1))
        if glint:
            s.px(hx + 22, hy, RAMPS["amber"][1]); s.px(hx + 23, hy, RAMPS["amber"][0])
            s.px(hx + 22, hy - 1, RAMPS["amber"][2]); s.px(hx + 22, hy + 1, RAMPS["amber"][2])
        if glint == 2:
            s.px(hx + 25, hy - 3, RAMPS["amber"][1]); s.px(hx + 25, hy + 3, RAMPS["amber"][1]); s.px(hx + 26, hy, RAMPS["amber"][0])
            s.px(hx + 22, hy - 3, RAMPS["amber"][2]); s.px(hx + 22, hy + 3, RAMPS["amber"][2])
    if held_arrow:
        (x0, y0), (x1, y1) = held_arrow
        line_px(s, (x0, y0), (x1, y1), Wd(0)); s.px(x1, y1, A(0)); s.px(x0, y0, Cl(0))
    s.px(*hand, A(0))
    img = s.render()
    if bob:
        top_part = img.crop((0, 0, W, 72)); img.paste(top_part, (0, bob))
    return img

def archer(pose):
    return archer_frame() if pose == "idle" else archer_frame(UP_BOW, hand=(51, 58), elbow=(45, 56), drawn=True, arrow=True, glint=1)

def archer_sheets():
    mid = dict(grip=(64, 66), top=(61, 48), bot=(61, 84), bulge=4)
    rel = dict(grip=(69, 61), top=(65, 43), bot=(65, 79), bulge=5)
    sheets = {
        "ARCHER_IDLE": [archer_frame(bob=b) for b in (0, 0, 1, 1)],
        "ARCHER_DRAW": [
            archer_frame(mid, hand=(53, 66), elbow=(48, 64)),
            archer_frame(UP_BOW, hand=(63, 58), elbow=(54, 62), arrow=True),
            archer_frame(UP_BOW, hand=(57, 58), elbow=(50, 59), drawn=True, arrow=True),
            archer_frame(UP_BOW, hand=(51, 58), elbow=(45, 56), drawn=True, arrow=True, glint=1),
            archer_frame(UP_BOW, hand=(51, 58), elbow=(45, 56), drawn=True, arrow=True, glint=2),
        ],
        "ARCHER_RELEASE": [
            archer_frame(UP_BOW, hand=(45, 55), elbow=(46, 60)),
            archer_frame(rel, hand=(47, 61), elbow=(46, 63)),
        ],
        "ARCHER_RELOAD": [
            archer_frame(hand=(47, 50), elbow=(44, 58)),
            archer_frame(hand=(49, 47), elbow=(45, 55), held_arrow=((49, 47), (53, 36))),
            archer_frame(hand=(53, 60), elbow=(47, 62), held_arrow=((50, 63), (58, 54))),
            archer_frame(hand=(51, 72), elbow=(48, 66), held_arrow=((50, 76), (53, 64))),
        ],
    }
    arrow = Image.new("RGBA", (16, 3), (0, 0, 0, 0))
    for x in range(2, 14):
        arrow.putpixel((x, 1), hexrgb(RAMPS["wood"][0]))
    for x, y, c in [(0, 0, RAMPS["cloth"][1]), (1, 0, RAMPS["cloth"][0]), (0, 2, RAMPS["cloth"][1]), (1, 2, RAMPS["cloth"][0]),
                    (1, 1, RAMPS["cloth"][2]), (14, 1, RAMPS["ash"][0]), (15, 1, RAMPS["ash"][1]), (13, 0, RAMPS["ash"][2]), (13, 2, RAMPS["ash"][2])]:
        arrow.putpixel((x, y), hexrgb(c))
    return sheets, arrow

# ------------------------------------------------------------------ v0.3 production sheets
RAMPS.update({
    "shroud": ("#6b5a86", "#47395e", "#2c2340", "#161122"),   # Death's Shadow robe
    "blade":  ("#d8f6ff", "#8fc3d4", "#4f7f91", "#24404c"),   # scythe blade
    "wisp":   ("#e9dcff", "#b69cf0", "#7a5fc0", "#3e2f70"),   # spectral eyes, trails
})


def _v(a, b):
    return (b[0] - a[0], b[1] - a[1])


def _unit(v):
    n = math.hypot(*v) or 1
    return (v[0] / n, v[1] / n)


def _at(p, *terms):
    """p + sum(vector * k) for (vector, k) in terms."""
    x, y = p
    for v, k in terms:
        x += v[0] * k
        y += v[1] * k
    return (x, y)


def _claw(s, mat, elbow, hand, back=False):
    """Bony hand: a knuckle plus three fingers continuing the forearm."""
    e = _unit(_v(elbow, hand))
    q = (-e[1], e[0])
    s.limb(mat, [hand, _at(hand, (e, 1.5))], 1.3, back=back)
    tone = RAMPS[mat][3 if back else 2]
    for k in (-1.4, 0, 1.4):
        a = _at(hand, (e, 1.5), (q, k))
        b = _at(hand, (e, 4.5), (q, k * 1.6))
        line_px(s, (round(a[0]), round(a[1])), (round(b[0]), round(b[1])), tone)


def starved_frame(J):
    """The Starved, from a joint dictionary:
    hip, sh, head: points; legs: [(knee, foot) back, (knee, foot) front];
    arms: [(elbow, hand) back, (elbow, hand) front]; eye: dim | flash | dead."""
    s = Sprite()
    S = lambda i: RAMPS["skin"][i]
    hip, sh, head = J["hip"], J["sh"], J["head"]
    d = _v(hip, sh)
    u = _unit(d)
    n = (u[1], -u[0])                  # toward the back (left/up for a right-facing body)
    if n[0] > 0 and abs(u[0]) < 0.5:   # keep the back on the left for upright poses
        n = (-n[0], -n[1])
    (bk, bf), (fk, ff) = J["legs"]
    (be, bh), (fe, fh) = J["arms"]
    # far side
    s.limb("skin", [sh, be, bh], 1.6, 1.1, back=True)
    _claw(s, "skin", be, bh, back=True)
    s.limb("skin", [hip, bk, bf], 2.0, 1.3, back=True)
    s.poly("skin", [_at(bf, ((1, 0), -3), ((0, 1), -1)), _at(bf, ((1, 0), 2), ((0, 1), -1)),
                    _at(bf, ((1, 0), 3), ((0, 1), 2)), _at(bf, ((1, 0), -4), ((0, 1), 2))], back=True)
    # torso: hunched back, sunken belly
    L = math.hypot(*d)
    s.poly("skin", [_at(hip, (n, 4)), _at(hip, (u, L * 0.5), (n, 5.5)), _at(hip, (u, L * 0.85), (n, 5.5)),
                    _at(sh, (n, 3), (u, 1.5)), _at(sh, (n, -3), (u, 0.5)), _at(hip, (u, L * 0.7), (n, -3.2)),
                    _at(hip, (u, L * 0.4), (n, -2.2)), _at(hip, (n, -3.5))])
    rag = [(3, 5.5), (3, -5), (-3, -6), (-6, -4), (-4, -1.5), (-7, 0.5), (-4, 2.5), (-6, 5)]
    s.poly("rag", [_at(hip, (u, a), (n, -b)) for a, b in rag])
    # neck and head
    f = _unit(_v(sh, head))
    g = (-f[1], f[0]) if (-f[1]) * 0 + f[0] >= 0 else (f[1], -f[0])
    if g[1] < 0:
        g = (-g[0], -g[1])
    s.limb("skin", [_at(sh, (f, 1)), _at(head, (f, -2))], 1.8)
    s.ell("skin", head[0], head[1], 4.2, 4.6)
    jaw = _at(head, (f, 2.2), (g, 3.4))
    s.ell("skin", jaw[0], jaw[1], 2.6, 2.3)
    # near side
    s.limb("skin", [hip, fk, ff], 2.1, 1.4)
    s.poly("skin", [_at(ff, ((1, 0), -2), ((0, 1), -1)), _at(ff, ((1, 0), 3), ((0, 1), -1)),
                    _at(ff, ((1, 0), 5), ((0, 1), 2)), _at(ff, ((1, 0), -3), ((0, 1), 2))])
    s.limb("skin", [_at(sh, (u, -1)), fe, fh], 1.8, 1.2)
    _claw(s, "skin", fe, fh)
    # ribs, spine, details
    for t in (0.5, 0.64, 0.78):
        c = _at(hip, (u, L * t))
        a, b = _at(c, (n, 0.5)), _at(c, (n, -2.8))
        line_px(s, (round(a[0]), round(a[1])), (round(b[0]), round(b[1])), S(2))
        hl = _at(c, (n, 0.5), (u, 1))
        s.px(round(hl[0]), round(hl[1]), S(0))
    for t in (0.3, 0.5, 0.7, 0.9):
        c = _at(hip, (u, L * t), (n, 4.6))
        s.px(round(c[0]), round(c[1]), S(0))
    sock = _at(head, (f, 1.3), (g, -1.0))
    for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        s.px(round(sock[0]) + dx, round(sock[1]) + dy, VOID)
    mouth = _at(head, (f, 2.4), (g, 4.0))
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1)):
        s.px(round(mouth[0]) + dx, round(mouth[1]) + dy, VOID)
    tooth = _at(head, (f, 3.6), (g, 3.0))
    s.px(round(tooth[0]), round(tooth[1]), S(0))
    for k in (-3.2, -2.2, -1.2):
        h = _at(head, (f, k), (g, -3.6))
        s.px(round(h[0]), round(h[1]), RAMPS["rag"][3])
    ex, ey = round(sock[0]) + 1, round(sock[1])
    if J.get("eye") == "flash":
        s.px(ex, ey, RAMPS["amber"][0]); s.px(ex - 1, ey, RAMPS["amber"][1])
        for ox, oy, t in ((1, -4, 1), (4, -2, 2), (-3, -3, 2), (3, 2, 2)):
            s.px(ex + ox, ey + oy, RAMPS["amber"][t])
    elif J.get("eye") != "dead":
        s.px(ex, ey, RAMPS["amber"][3])
    return s.render()


def _lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


STARVED_STAND = dict(hip=(48, 74), sh=(56, 55), head=(63, 52),
                     legs=[((43, 87), (42, 97)), ((55, 87), (54, 97))],
                     arms=[((53, 70), (56, 82)), ((61, 70), (63, 82))], eye="dim")
STARVED_FLAT = dict(hip=(34, 95), sh=(60, 95), head=(68, 95),
                    legs=[((25, 97), (15, 97)), ((27, 98), (17, 98))],
                    arms=[((74, 97), (84, 98)), ((71, 98), (80, 98))], eye="dim")


def starved_sheets():
    walk = []
    for i in range(6):
        ph = 2 * math.pi * i / 6
        sn, cs = math.sin(ph), math.cos(ph)
        bob = 1 if abs(sn) < 0.5 else 0
        hip, sh, head = (48, 74 + bob), (56, 55 + bob), (63, 52 + bob)
        ff = (50 + 6 * sn, 97 - 2 * max(0, cs))
        bf = (47 - 6 * sn, 97 - 2 * max(0, -cs))
        legs = [(_at(_lerp(hip, bf, 0.5), ((1, 0), 3)), bf), (_at(_lerp(hip, ff, 0.5), ((1, 0), 4)), ff)]
        arms = [((53, 70 + bob), (56 + 2 * sn, 82 + bob)), ((61, 70 + bob), (63 - 2 * sn, 82 + bob))]
        walk.append(starved_frame(dict(hip=hip, sh=sh, head=head, legs=legs, arms=arms, eye="dim")))
    windup = []
    for k, t in enumerate((0.25, 0.55, 0.85, 1.0)):
        windup.append(starved_frame(dict(
            hip=_lerp((48, 74), (46, 80), t), sh=_lerp((56, 55), (50, 63), t), head=_lerp((63, 52), (56, 61), t),
            legs=[(_lerp((43, 87), (40, 90), t), _lerp((42, 97), (36, 97), t)),
                  (_lerp((55, 87), (54, 90), t), _lerp((54, 97), (58, 97), t))],
            arms=[(_lerp((53, 70), (42, 62), t), _lerp((56, 82), (31, 57), t)),
                  (_lerp((61, 70), (44, 67), t), _lerp((63, 82), (33, 66), t))],
            eye="flash")))
    lunge = [starved_frame(J) for J in (
        dict(hip=(42, 80), sh=(58, 70), head=(66, 68), legs=[((34, 88), (26, 97)), ((50, 88), (52, 97))],
             arms=[((66, 68), (78, 64)), ((68, 72), (80, 70))], eye="flash"),
        dict(hip=(38, 82), sh=(60, 72), head=(69, 70), legs=[((30, 91), (21, 97)), ((51, 91), (55, 97))],
             arms=[((74, 71), (88, 70)), ((72, 76), (87, 77))], eye="flash"),
        dict(hip=(40, 86), sh=(62, 80), head=(70, 80), legs=[((30, 93), (22, 97)), ((52, 92), (56, 97))],
             arms=[((75, 84), (86, 92)), ((73, 87), (84, 95))], eye="flash"),
    )]
    ground = [starved_frame(J) for J in (
        STARVED_FLAT,
        dict(STARVED_FLAT, sh=(60, 94), head=(68, 92)),
        dict(hip=(38, 92), sh=(56, 84), head=(63, 81), legs=[((30, 96), (22, 97)), ((32, 97), (24, 97))],
             arms=[((60, 92), (62, 97)), ((58, 92), (60, 97))], eye="dim"),
        dict(hip=(45, 82), sh=(53, 66), head=(60, 62), legs=[((40, 90), (40, 97)), ((52, 90), (54, 97))],
             arms=[((52, 74), (55, 86)), ((55, 75), (58, 86))], eye="dim"),
    )]
    death = [starved_frame(J) for J in (
        dict(hip=(47, 75), sh=(52, 56), head=(55, 51), legs=STARVED_STAND["legs"],
             arms=[((48, 60), (44, 66)), ((58, 52), (62, 46))], eye="dim"),
        dict(hip=(46, 86), sh=(52, 70), head=(57, 66), legs=[((48, 96), (36, 97)), ((54, 96), (42, 97))],
             arms=[((52, 80), (53, 92)), ((55, 80), (57, 92))], eye="dim"),
        dict(hip=(44, 90), sh=(58, 84), head=(65, 84), legs=[((48, 96), (36, 97)), ((52, 96), (40, 97))],
             arms=[((63, 90), (69, 96)), ((66, 90), (72, 96))], eye="dead"),
        dict(STARVED_FLAT, eye="dead"),
    )]
    return {"STARVED_WALK": walk, "STARVED_WINDUP": windup, "STARVED_LUNGE": lunge,
            "STARVED_GROUND": ground, "STARVED_DEATH": death}


def archer_death_sheet():
    """The archer topples backward stiffly, like a dropped scarecrow."""
    frames = []
    for deg in (12, 35, 62, 90):
        a = math.radians(deg)
        px, py = 50, 80 + 16 * math.sin(a)
        def xf(x, y, a=a, px=px, py=py):
            return (px + (x - 50) * math.cos(a) + (y - 80) * math.sin(a),
                    py - (x - 50) * math.sin(a) + (y - 80) * math.cos(a))
        frames.append(archer_frame(xf=xf, swap=deg > 45, dead=deg >= 35))
    return frames


# ---------------------------------------------------------------- Death's Shadow
RW = RH = 128


def _blade(s, h0, h1, side, glint=False):
    """Scythe: handle h0 (blade end) to h1 (butt); the blade curves to `side` (unit vector)."""
    hd = _unit(_v(h0, h1))
    s.limb("wood", [h0, h1], 1.3)
    tip = _at(h0, (side, 26), (hd, 9))
    ctrl = _at(h0, (side, 17), (hd, -5))
    pts = []
    for i in range(11):
        t = i / 10
        pts.append(((1 - t) ** 2 * h0[0] + 2 * (1 - t) * t * ctrl[0] + t * t * tip[0],
                    (1 - t) ** 2 * h0[1] + 2 * (1 - t) * t * ctrl[1] + t * t * tip[1]))
    s.limb("blade", pts[:6], 2.4, 2.0)
    s.limb("blade", pts[5:], 2.0, 0.7)
    s.limb("iron", [_at(h0, (hd, -1)), _at(h0, (hd, 3))], 1.8)        # collar
    if glint:
        for i in range(2, 10):                      # the whole cutting edge catches the light
            gx, gy = pts[i]
            s.px(round(gx), round(gy), RAMPS["amber"][0 if i in (5, 6) else 1])
        gx, gy = round(pts[5][0]), round(pts[5][1])
        for k in (2, 3, 4):                          # four-point star
            t = 1 if k == 2 else 2
            for ox, oy in ((0, -k), (k, 0), (-k, 0), (0, k)):
                s.px(gx + ox, gy + oy, RAMPS["amber"][t])
    return pts


def reaper_frame(h0, h1, side, bob=0, lean=0, glint=False, smear=None, xf=None):
    s = Sprite(RW, RH, xf=xf)
    up = lambda p: (p[0] + lean, p[1] + bob)
    # trailing robe and back sleeve
    s.poly("shroud", [up((52, 58)), (40, 80 + bob), (30, 104 + bob), (20, 118 + bob), (33, 111 + bob), (37, 121 + bob),
                      (46, 109 + bob), (54, 119 + bob), (58, 104 + bob)], back=True)
    hand_b = _lerp(h0, h1, 0.68)
    hand_f = _lerp(h0, h1, 0.42)
    s.limb("shroud", [up((61, 54)), _lerp(up((61, 54)), hand_b, 0.55), hand_b], 3.0, 2.4, back=True)
    s.ell("ash", hand_b[0], hand_b[1], 2.0, 2.0, back=True)
    # scythe behind the front arm
    _blade(s, h0, h1, side, glint)
    # robe
    s.poly("shroud", [up((58, 48)), up((72, 48)), up((78, 64)), (80, 84 + bob), (84, 102 + bob), (78, 108 + bob),
                      (80, 117 + bob), (72, 110 + bob), (68, 121 + bob), (62, 108 + bob), (56, 117 + bob),
                      (54, 104 + bob), (50, 92 + bob), up((52, 70))])
    # hood with a pointed back
    s.poly("shroud", [up((56, 30)), up((47, 34)), up((56, 37)), up((55, 44)), up((58, 52)), up((74, 52)),
                      up((78, 42)), up((76, 30)), up((70, 22)), up((62, 22))])
    # front sleeve and hand
    s.limb("shroud", [up((72, 52)), _lerp(up((72, 52)), hand_f, 0.55), hand_f], 3.0, 2.4)
    s.ell("ash", hand_f[0], hand_f[1], 2.1, 2.1)
    # face: a void with a skull hint and two spectral eyes
    fx, fy = up((70, 38))
    for y in range(-6, 7):
        for x in range(-4, 5):
            if (x / 4.6) ** 2 + (y / 6.2) ** 2 <= 1:
                s.px(fx + x, fy + y, VOID)
    for x in range(-2, 3):
        if x % 2 == 0:
            s.px(fx + x, fy + 5, RAMPS["ash"][1])
    s.px(fx - 2, fy + 2, RAMPS["ash"][2]); s.px(fx + 2, fy + 2, RAMPS["ash"][2])
    s.px(fx - 2, fy - 2, RAMPS["wisp"][0]); s.px(fx + 2, fy - 2, RAMPS["wisp"][1])
    s.px(fx - 2, fy - 3, RAMPS["wisp"][2]); s.px(fx + 2, fy - 3, RAMPS["wisp"][2])
    # hem wisps
    for x, y in ((24, 117), (35, 122), (55, 120), (69, 122), (81, 118)):
        s.px(x, y + bob, RAMPS["wisp"][3])
    if smear:
        for (x, y), t in smear:
            s.px(round(x), round(y), RAMPS["wisp"][t])
    return s.render()


def _dissolve(img, amount, seed=7):
    """Removes `amount` (0..1) of the opaque pixels in a fixed ordered pattern."""
    bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            if px[x, y][3] and (bayer[(y + seed) % 4][(x + seed) % 4] + 0.5) / 16 < amount:
                px[x, y] = (0, 0, 0, 0)
    return out


def reaper_sheets():
    upright = dict(h0=(84, 18), h1=(76, 116), side=(1, 0))
    flt = [reaper_frame(bob=b, **upright) for b in (0, -1, -2, -1)]
    raise_ = [
        reaper_frame(h0=(68, 20), h1=(86, 104), side=(1, -0.3), lean=-1),
        reaper_frame(h0=(50, 24), h1=(92, 86), side=(0.75, -0.65), lean=-3),
        reaper_frame(h0=(50, 24), h1=(92, 86), side=(0.75, -0.65), lean=-3, glint=True),
    ]
    arc = []                                         # solid swing trail, bright at the leading edge
    for deg in range(-70, 56):
        a = math.radians(deg)
        lead = (deg + 70) / 126
        for r, t in ((37, 3), (38.5, 2), (40, 1 if lead < 0.7 else 0), (41.5, 2)):
            arc.append(((70 + r * math.cos(a), 60 + r * math.sin(a)), t))
    strike = [
        reaper_frame(h0=(110, 46), h1=(62, 66), side=(0.2, 1), lean=4),
        reaper_frame(h0=(106, 96), h1=(64, 58), side=(-0.9, 0.3), lean=6, smear=arc),
        reaper_frame(h0=(106, 96), h1=(64, 58), side=(-0.9, 0.3), lean=5),
    ]
    a = math.radians(-18)
    recoil_xf = lambda x, y: (64 + (x - 64) * math.cos(a) + (y - 90) * math.sin(a) - 6,
                              90 - (x - 64) * math.sin(a) + (y - 90) * math.cos(a))
    recoil = reaper_frame(h0=(70, 10), h1=(86, 100), side=(1, -0.2), xf=recoil_xf)
    fade = [_dissolve(flt[0], t) for t in (0.2, 0.45, 0.7, 0.9)]
    parried = [recoil] + [_dissolve(recoil, t) for t in (0.3, 0.6, 0.85)]
    return {"REAPER_FLOAT": flt, "REAPER_RAISE": raise_, "REAPER_STRIKE": strike,
            "REAPER_FADE": fade, "REAPER_PARRIED": parried}


def export(out_dir):
    sheets = {}
    sheets.update(starved_sheets())
    arch, arrow = archer_sheets()
    sheets.update(arch)
    sheets["ARCHER_DEATH"] = archer_death_sheet()
    sheets.update(reaper_sheets())
    files = {}
    for name, frames in sheets.items():
        fw, fh = frames[0].size
        sheet = Image.new("RGBA", (fw * len(frames), fh), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            sheet.paste(f, (i * fw, 0))
        files[name] = sheet
    files["ARCHER_ARROW"] = arrow
    allowed = {hexrgb(c) for r in RAMPS.values() for c in r} | {hexrgb(VOID)}
    ok = True
    for name, im in files.items():
        bad = {p for p in im.getdata() if p[3]} - allowed
        partial = {p for p in im.getdata() if 0 < p[3] < 255}
        ok &= not bad and not partial
        target = out_dir
        if name.startswith("REAPER"):   # Death's Shadow is shared by every chapter
            target = os.path.join(os.path.dirname(os.path.abspath(out_dir)), "DEATHS_SHADOW")
            os.makedirs(target, exist_ok=True)
        im.save(os.path.join(target, name + ".png"))
        print(f"{name:16s} {im.size[0]:4d}x{im.size[1]:<4d} frames {im.size[0] // (128 if name.startswith('REAPER') else 100 if name != 'ARCHER_ARROW' else 16):2d}  off-palette: {len(bad)}  semi-transparent: {len(partial)}")
    print("PALETTE AUDIT", "PASS" if ok else "FAIL")
    return ok


if __name__ == "__main__":
    # Usage: python tools/art/enemy_sprites.py sprites/ENEMIES/FAMINE
    sys.exit(0 if export(OUT) else 1)
