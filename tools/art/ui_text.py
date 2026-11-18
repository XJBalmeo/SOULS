"""Renders every piece of UI text to one image atlas (owner 2026-11-18).

The game no longer loads the Knight Warrior font (personal-use licence, kept
out of git). Instead each UI string is drawn here, with the font file that
stays on the owner's machine, into sprites/UI_TEXT/ui_text.png plus a Phaser
atlas (ui_text.json). Frame names are "size|colour|text", which is what
UI.text() in js/UIScenes.js asks for. When a UI string changes, add it to
STRINGS below and run:

    python tools/art/ui_text.py

The game warns in the console ("UI text image missing") for any string it
cannot find. Characters the font lacks (the arrows) come from the fallback
fonts, as the browser did before.
"""
import json
import os

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT = os.path.join(ROOT, "sprites", "FONTS", "KnightWarrior.otf")
FALLBACKS = ["C:/Windows/Fonts/georgia.ttf", "C:/Windows/Fonts/seguisym.ttf"]
OUT_DIR = os.path.join(ROOT, "sprites", "UI_TEXT")

# UI.COLORS in js/UIScenes.js
BONE, ACCENT, DIM, DISABLED, SHADOW = "#ffffff", "#a8d672", "#7d8a6c", "#46503f", "#0a100c"


def menu(labels, size, disableable=()):
    """A menu label plain, and selected ("> label <" in the accent colour)."""
    out = []
    for label in labels:
        out += [(label, size, BONE), (f">  {label}  <", size, ACCENT)]
        if label in disableable:
            out += [(label, size, DISABLED), (f">  {label}  <", size, DISABLED)]
    return out


def strings():
    s = []
    # Main menu (MenuScene)
    s += menu(["New Game", "Continue", "Settings", "Credits"], 32, disableable=["Continue"])
    s += [("CHAPTER I  -  FAMINE", 24, ACCENT), ("build v0.3", 14, DISABLED)]
    s += [(h, 18, DIM) for h in [
        "No saved journey yet.",
        "Your saved journey could not be read. It is kept, not deleted.",
        "Saving is unavailable in this browser.",
    ]]
    # New Game confirmation (ConfirmScene)
    s += [(m, 32, BONE, 10) for m in [
        "Begin a new journey?\nYour saved progress will be lost.",
        "Begin a new journey?\nThe unreadable save will be set aside as a backup.",
    ]]
    s += menu(["Cancel", "Begin Anew"], 32)
    # Pause menu (PauseScene)
    s += [("PAUSED", 64, BONE)]
    s += menu(["Resume", "Settings", "Retry from Checkpoint", "Quit to Main Menu"], 32)
    s += [("Back to the last checkpoint with full health. Enemies return.", 18, DIM)]
    # Settings (SettingsScene)
    s += [("SETTINGS", 56, BONE)]
    labels = []
    for name in ["Master Volume", "Music Volume", "Effects Volume"]:
        labels += [f"{name}   \u25c2 {v}% \u25b8" for v in range(0, 101, 10)]
    labels += ["Show Hitboxes   On", "Show Hitboxes   Off", "Back"]
    s += menu(labels, 28)
    s += [(h, 18, DIM) for h in [
        "\u2190 \u2192 to adjust.",
        "Saved now; music is added in a later build.",
        "Enemy and Parry Death sounds. Menu sounds come later.",
        "Debug view of collision and sword hitboxes (Tab in game).",
    ]]
    # Credits (CreditsScene)
    s += [("CREDITS", 56, BONE)]
    s += [(
        "SOULS - an original dark-fantasy action platformer\n\n"
        "Game, art and level design: the SOULS team\n"
        "Engine: Phaser 3.80.1 (MIT License)\n"
        "Levels authored with LDtk\n\n"
        "Full credits roster to be confirmed by the owner.",
        22, BONE, 8,
    )]
    s += menu(["Back"], 32)
    # (size, colour, text) is the key; drop repeats such as "Settings" at 32.
    seen, unique = set(), []
    for entry in s:
        key = (entry[0], entry[1], entry[2])
        if key not in seen:
            seen.add(key)
            unique.append(entry)
    return unique


class Renderer:
    def __init__(self):
        self.cmaps = [TTFont(FONT).getBestCmap()] + [TTFont(f).getBestCmap() for f in FALLBACKS]
        self.paths = [FONT] + FALLBACKS
        self.fonts = {}

    def font(self, i, size):
        if (i, size) not in self.fonts:
            self.fonts[(i, size)] = ImageFont.truetype(self.paths[i], size)
        return self.fonts[(i, size)]

    def runs(self, line):
        """Splits a line into runs that one font can draw."""
        out = []
        for ch in line:
            i = next((k for k, cmap in enumerate(self.cmaps) if ord(ch) in cmap or ch == " "), 0)
            if out and out[-1][0] == i:
                out[-1][1] += ch
            else:
                out.append([i, ch])
        return out

    def render(self, text, size, color, line_spacing=0):
        # Phaser Text: strokeThickness max(2, size / 8), drawn centred on the
        # outline, so half of it shows outside the letters.
        stroke = max(1, round(max(2, round(size / 8)) / 2))
        main = self.font(0, size)
        ascent, descent = main.getmetrics()
        line_h = ascent + descent
        lines = text.split("\n")
        widths = [sum(self.font(i, size).getlength(t) for i, t in self.runs(line)) for line in lines]
        pad = stroke + 2
        w = int(max(widths) + 2 * pad + 1)
        h = int(len(lines) * line_h + (len(lines) - 1) * line_spacing + 2 * pad)
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        for n, line in enumerate(lines):
            x = pad + (max(widths) - widths[n]) / 2  # align: center
            y = pad + n * (line_h + line_spacing)
            for i, t in self.runs(line):
                f = self.font(i, size)
                # Fallback glyphs sit on the main font's baseline.
                dy = ascent - f.getmetrics()[0]
                draw.text((x, y + dy), t, font=f, fill=color, stroke_width=stroke, stroke_fill=SHADOW)
                x += f.getlength(t)
        return img


def main():
    r = Renderer()
    images = []
    for entry in strings():
        text, size, color = entry[0], entry[1], entry[2]
        spacing = entry[3] if len(entry) > 3 else 0
        images.append((f"{size}|{color}|{text}", r.render(text, size, color, spacing)))
    # Shelf packing, tallest first.
    images.sort(key=lambda e: -e[1].height)
    atlas_w, x, y, shelf_h, placed = 2048, 0, 0, 0, []
    for name, img in images:
        if x + img.width > atlas_w:
            x, y, shelf_h = 0, y + shelf_h + 1, 0
        placed.append((name, img, x, y))
        x += img.width + 1
        shelf_h = max(shelf_h, img.height)
    atlas_h = y + shelf_h
    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    frames = {}
    for name, img, fx, fy in placed:
        atlas.paste(img, (fx, fy))
        w, h = img.size
        frames[name] = {
            "frame": {"x": fx, "y": fy, "w": w, "h": h}, "rotated": False, "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h},
        }
    os.makedirs(OUT_DIR, exist_ok=True)
    atlas.save(os.path.join(OUT_DIR, "ui_text.png"), optimize=True)
    with open(os.path.join(OUT_DIR, "ui_text.json"), "w", encoding="utf-8") as fh:
        json.dump({"frames": frames, "meta": {"image": "ui_text.png", "size": {"w": atlas_w, "h": atlas_h}, "scale": "1"}},
                  fh, ensure_ascii=False, indent=1)
    print(f"{len(frames)} strings -> sprites/UI_TEXT/ui_text.png ({atlas_w}x{atlas_h})")


if __name__ == "__main__":
    main()
