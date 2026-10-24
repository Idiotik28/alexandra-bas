#!/usr/bin/env python3
"""Качает шрифты-кандидаты для страницы сравнения и собирает fonts-preview.css."""
import re, os, sys, subprocess

OUT_DIR = sys.argv[1]
CSS_PATH = sys.argv[2]
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0 Safari/537.36")
WANT = {"cyrillic", "cyrillic-ext", "latin", "latin-ext"}

FAMILIES = [
    ("Manrope",         "Manrope:wght@400;500;700"),
    ("Playfair Display","Playfair+Display:ital,wght@0,400;0,500;1,400"),
    ("Golos Text",      "Golos+Text:wght@400;500;600"),
    ("Lora",            "Lora:ital,wght@0,400;0,500;1,400"),
    ("Unbounded",       "Unbounded:wght@400;600"),
]


def fetch(url):
    return subprocess.run(["curl", "-sSL", "-m", "40", "-A", UA, url],
                          check=True, capture_output=True).stdout


os.makedirs(OUT_DIR, exist_ok=True)
blocks = []
report = {}

for family, spec in FAMILIES:
    css = fetch(f"https://fonts.googleapis.com/css2?family={spec}&display=swap").decode()
    chunks = re.split(r"/\*\s*([a-z0-9\-]+)\s*\*/", css)
    subsets = set()
    for i in range(1, len(chunks), 2):
        subset, body = chunks[i], chunks[i + 1]
        if subset not in WANT:
            continue
        m = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", body)
        if not m:
            continue
        subsets.add(subset)
        weight = re.search(r"font-weight:\s*(\d+)", body).group(1)
        style = re.search(r"font-style:\s*(\w+)", body).group(1)
        slug = family.lower().replace(" ", "-")
        name = f"{slug}-{weight}{'-italic' if style == 'italic' else ''}-{subset}.woff2"
        path = os.path.join(OUT_DIR, name)
        if not os.path.exists(path):
            open(path, "wb").write(fetch(m.group(1)))
        urange = re.search(r"unicode-range:\s*([^;]+);", body).group(1)
        blocks.append(
            "@font-face{font-family:'%s';font-style:%s;font-weight:%s;font-display:swap;"
            "src:url('../fonts-preview/%s') format('woff2');unicode-range:%s;}"
            % (family, style, weight, name, urange))
    report[family] = "кириллица ЕСТЬ" if "cyrillic" in subsets else "КИРИЛЛИЦЫ НЕТ"

open(CSS_PATH, "w").write("\n".join(blocks) + "\n")
print("\n".join(f"  {k:18} {v}" for k, v in report.items()))
print(f"\nнаписано начертаний: {len(blocks)}")
