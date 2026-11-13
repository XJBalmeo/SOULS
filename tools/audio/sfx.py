"""Original procedural sound effects for SOULS (no samples, no external sources).
Usage: python tools/audio/sfx.py audio/sfx
Writes 22.05 kHz mono 16-bit WAV files. Seeds are fixed so output is reproducible."""
import os
import sys
import wave

import numpy as np

SR = 22050


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def env(n, attack=0.005, release=0.2, sec=None, curve=3.0):
    """Attack-decay envelope over n samples."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    total = n / SR
    d = np.clip(1 - (t - attack) / max(total - attack, 1e-4), 0, 1) ** curve
    return a * d


def noise(n, seed):
    return np.random.default_rng(seed).uniform(-1, 1, n)


def lowpass(x, cutoff):
    """One-pole low-pass; cutoff may be a scalar or a per-sample array."""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def bandnoise(n, lo, hi, seed):
    return lowpass(highpass(noise(n, seed), lo), hi)


def pluck(freq, sec, damping=0.996, seed=1):
    """Karplus-Strong plucked string."""
    n = int(SR * sec)
    period = int(SR / freq)
    buf = np.random.default_rng(seed).uniform(-1, 1, period)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = damping * 0.5 * (buf[i % period] + buf[(i + 1) % period])
    return out


def tone(freqs, sec, phase_mod=None):
    t = t_axis(sec)
    f = np.broadcast_to(np.asarray(freqs, dtype=float), t.shape)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if phase_mod is not None:
        ph = ph + phase_mod
    return np.sin(ph)


def bell(partials, sec, decay=3.0, seed=0):
    """Inharmonic metal: sum of decaying partials (freq, amp)."""
    t = t_axis(sec)
    out = np.zeros_like(t)
    for f, a in partials:
        out += a * np.sin(2 * np.pi * f * t) * np.exp(-t * decay * (f / partials[0][0]) ** 0.5)
    return out


def fit(x, sec):
    n = int(SR * sec)
    return np.pad(x, (0, max(0, n - len(x))))[:n]


def norm(x, peak=0.85):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def save(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


# ---------------------------------------------------------------- sounds
def bow_draw():
    sec = 0.7
    n = int(SR * sec)
    creak = np.sin(2 * np.pi * np.cumsum(70 + 40 * t_axis(sec) / sec + 8 * np.sin(2 * np.pi * 23 * t_axis(sec))) / SR)
    grain = (noise(n, 3) > 0.92) * noise(n, 4)                      # wood fibre ticks
    x = 0.5 * np.sign(creak) * np.abs(creak) ** 3 + 0.6 * lowpass(grain, 2500)
    return norm(x * np.clip(t_axis(sec) / 0.15, 0, 1) * np.clip((sec - t_axis(sec)) / 0.08, 0, 1), 0.55)


def bow_release():
    sec = 0.35
    s = pluck(98, sec, 0.993, seed=5) + 0.5 * pluck(196, sec, 0.99, seed=6)
    whoosh = bandnoise(int(SR * sec), 800, 4000, 7) * env(int(SR * sec), 0.01, sec, curve=2)
    return norm(s * env(len(s), 0.002, sec, curve=2) + 0.35 * whoosh, 0.8)


def arrow_hit():
    sec = 0.22
    n = int(SR * sec)
    thump = tone(np.linspace(180, 70, n), sec) * env(n, 0.001, sec, curve=4)
    crack = bandnoise(n, 1500, 6000, 9) * env(n, 0.0005, 0.05, curve=6)
    return norm(thump + 0.6 * crack, 0.8)


def enemy_hit():
    sec = 0.18
    n = int(SR * sec)
    body = tone(np.linspace(140, 60, n), sec) * env(n, 0.001, sec, curve=3)
    slap = bandnoise(n, 400, 3000, 11) * env(n, 0.0005, 0.06, curve=5)
    return norm(body + 0.8 * slap, 0.8)


def player_hurt():
    sec = 0.3
    n = int(SR * sec)
    body = tone(np.linspace(110, 45, n), sec) * env(n, 0.001, sec, curve=2.5)
    grit = bandnoise(n, 200, 1800, 12) * env(n, 0.001, 0.12, curve=4)
    return norm(np.tanh(2.5 * (body + 0.7 * grit)), 0.85)


def starved_rasp():
    sec = 0.75
    n = int(SR * sec)
    t = t_axis(sec)
    breath = bandnoise(n, 300, 2200, 13)
    formant = lowpass(breath * (1 + 0.8 * np.sin(2 * np.pi * 38 * t)), 900)   # throat flutter
    shape = np.clip(t / 0.25, 0, 1) * np.clip((sec - t) / 0.1, 0, 1)
    groan = 0.25 * tone(95 + 15 * t, sec) * shape
    return norm((formant + groan) * shape, 0.7)


def lunge_whoosh():
    sec = 0.35
    n = int(SR * sec)
    t = t_axis(sec)
    x = lowpass(noise(n, 14), 300 + 3500 * np.sin(np.pi * t / sec))
    return norm(x * np.sin(np.pi * t / sec) ** 2, 0.7)


def body_thud():
    sec = 0.4
    n = int(SR * sec)
    boom = tone(np.linspace(90, 38, n), sec) * env(n, 0.002, sec, curve=3)
    dirt = lowpass(noise(n, 15), 900) * env(n, 0.001, 0.15, curve=3)
    return norm(boom + 0.5 * dirt, 0.85)


def reaper_arrive():
    sec = 1.4
    n = int(SR * sec)
    t = t_axis(sec)
    swell = np.clip(t / 0.9, 0, 1) ** 2 * np.clip((sec - t) / 0.4, 0, 1)
    drone = sum(a * tone(f * (1 + 0.004 * np.sin(2 * np.pi * 0.7 * t)), sec) for f, a in ((55, 1), (82.4, 0.6), (110.6, 0.35)))
    air = lowpass(noise(n, 16), 600) * 0.6
    shimmer = bell([(880, 0.3), (1243, 0.2), (1661, 0.15)], sec, decay=1.5)[::-1]   # reversed bell
    return norm((drone + air) * swell + 0.6 * shimmer * swell, 0.75)


def reaper_telegraph():
    sec = 0.55
    t = t_axis(sec)
    ring = tone(600 + 900 * (t / sec) ** 2, sec) * 0.6 + tone(1200 + 1800 * (t / sec) ** 2, sec) * 0.25
    return norm(ring * np.clip(t / 0.05, 0, 1) * np.clip((sec - t) / 0.05, 0, 1), 0.6)


def scythe_swing():
    sec = 0.4
    n = int(SR * sec)
    t = t_axis(sec)
    x = bandnoise(n, 600, 7000, 17) * np.sin(np.pi * np.clip(t / 0.3, 0, 1)) ** 3
    return norm(x, 0.75)


def parry_clang():
    sec = 1.1
    n = int(SR * sec)
    metal = bell([(523, 1), (1397, 0.6), (2093, 0.45), (2987, 0.3), (3951, 0.2)], sec, decay=2.2)
    hit = bandnoise(n, 2000, 9000, 18) * env(n, 0.0005, 0.04, curve=6)
    return norm(metal + 0.7 * hit, 0.85)


def parry_fail():
    sec = 0.9
    n = int(SR * sec)
    slash = fit(scythe_swing(), 0.4)
    boom = tone(np.linspace(70, 30, n), sec) * env(n, 0.003, sec, curve=2)
    x = np.zeros(n)
    x[: len(slash)] += 0.6 * slash
    x += np.tanh(2 * boom)
    return norm(x, 0.85)


def revive():
    sec = 1.2
    t = t_axis(sec)
    x = np.zeros_like(t)
    for i, f in enumerate((392, 494, 587, 784)):                       # rising G major chime
        start = int(SR * 0.12 * i)
        seg = bell([(f, 1), (f * 2.01, 0.3)], sec - 0.12 * i, decay=2.5)
        x[start:start + len(seg)] += seg
    return norm(x, 0.7)


SOUNDS = {
    "bow_draw": bow_draw, "bow_release": bow_release, "arrow_hit": arrow_hit,
    "enemy_hit": enemy_hit, "player_hurt": player_hurt,
    "starved_rasp": starved_rasp, "lunge_whoosh": lunge_whoosh, "body_thud": body_thud,
    "reaper_arrive": reaper_arrive, "reaper_telegraph": reaper_telegraph, "scythe_swing": scythe_swing,
    "parry_clang": parry_clang, "parry_fail": parry_fail, "revive": revive,
}

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "audio/sfx"
    os.makedirs(out, exist_ok=True)
    for name, fn in SOUNDS.items():
        x = fn()
        save(os.path.join(out, name + ".wav"), x)
        print(f"{name:18s} {len(x) / SR:.2f}s peak {np.max(np.abs(x)):.2f}")
