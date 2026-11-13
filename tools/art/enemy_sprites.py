"""Candidate pixel sprites for The Starved and Hollow Archer.
Each material uses exactly four tones: highlight, main, shadow, deep shadow.
Pure black (#000000) is used only for voids (eye sockets, mouth), as on the knight."""
import math, sys
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
    def __init__(self):
        self.part = [[None] * W for _ in range(H)]   # part index per pixel
        self.parts = []                               # (material, back)
        self.over = {}                                # manual (x,y) -> colour

    def _add(self, mat, back, test, box):
        idx = len(self.parts)
        self.parts.append((mat, back))
        x0, y0, x1, y1 = box
        for y in range(max(0, int(y0) - 2), min(H, int(y1) + 3)):
            for x in range(max(0, int(x0) - 2), min(W, int(x1) + 3)):
                if test(x + 0.5, y + 0.5):
                    self.part[y][x] = idx
        return idx

    def poly(self, mat, pts, back=False):
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
        return self._add(mat, back, lambda px, py: ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1,
                         (cx - rx, cy - ry, cx + rx, cy + ry))

    def px(self, x, y, colour):
        self.over[(x, y)] = colour

    def tone(self, mat, i):
        return RAMPS[mat][i]

    def render(self):
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
                 glint=0, held_arrow=None, bob=0):
    """One Hollow Archer frame. hand/elbow: the drawing (back) arm."""
    s = Sprite()
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

if __name__ == "__main__":
    frames = {"starved_idle": starved("idle"), "starved_lunge": starved("lunge"),
              "archer_idle": archer("idle"), "archer_draw": archer("draw")}
    sheets, arrow = archer_sheets()
    for k, fr in sheets.items():
        sheet = Image.new("RGBA", (W * len(fr), H), (0, 0, 0, 0))
        for i, f in enumerate(fr):
            sheet.paste(f, (i * W, 0))
        frames[k] = sheet
    frames["ARCHER_ARROW"] = arrow
    for k, im in frames.items():
        im.save(f"{OUT}/{k}.png")
    # palette audit: every opaque colour must belong to a declared ramp or be VOID
    allowed = {hexrgb(c) for r in RAMPS.values() for c in r} | {hexrgb(VOID)}
    for k, im in frames.items():
        used = {p for p in im.getdata() if p[3]}
        bad = used - allowed
        print(k, "colours", len(used), "outside ramps:", bad or "none")
