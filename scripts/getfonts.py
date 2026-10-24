#!/usr/bin/env python3
"""Скачивает woff2-сабсеты (cyrillic + latin) с Google Fonts и собирает локальный fonts.css."""
import re, os, sys, subprocess

OUT_DIR = sys.argv[1]
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
WANT = {"cyrillic", "cyrillic-ext", "latin", "latin-ext"}

FAMILIES = [
    ("Onest", "https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500;600;700&display=swap"),
    ("Cormorant", "https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap"),
]


def fetch(url):
    return subprocess.run(
        ["curl", "-sSL", "-m", "40", "-A", UA, url], check=True, capture_output=True
    ).stdout


os.makedirs(OUT_DIR, exist_ok=True)
blocks = []

for family, css_url in FAMILIES:
    css = fetch(css_url).decode("utf-8")
    # каждый блок предваряется комментарием с именем сабсета
    chunks = re.split(r"/\*\s*([a-z0-9\-]+)\s*\*/", css)
    for i in range(1, len(chunks), 2):
        subset, body = chunks[i], chunks[i + 1]
        if subset not in WANT:
            continue
        m = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", body)
        if not m:
            continue
        url = m.group(1)
        weight = re.search(r"font-weight:\s*(\d+)", body).group(1)
        style = re.search(r"font-style:\s*(\w+)", body).group(1)
        name = f"{family.lower()}-{weight}{'-italic' if style == 'italic' else ''}-{subset}.woff2"
        path = os.path.join(OUT_DIR, name)
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(fetch(url))
        urange = re.search(r"unicode-range:\s*([^;]+);", body).group(1)
        blocks.append(
            "@font-face {\n"
            f"  font-family: '{family}';\n"
            f"  font-style: {style};\n"
            f"  font-weight: {weight};\n"
            "  font-display: swap;\n"
            f"  src: url('../fonts/{name}') format('woff2');\n"
            f"  unicode-range: {urange};\n"
            "}"
        )
        print("ok", name)

with open(os.path.join(os.path.dirname(OUT_DIR), "css", "fonts.css"), "w") as f:
    f.write("/* Локальные шрифты — Onest (текст) + Cormorant (акценты). Кириллица включена. */\n\n")
    f.write("\n\n".join(blocks) + "\n")
print("fonts.css written:", len(blocks), "faces")
