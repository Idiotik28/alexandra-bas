#!/usr/bin/env python3
"""
Локальный сервер для разработки.

Отличие от `python3 -m http.server`: к каждому ответу добавляются заголовки,
запрещающие кэширование. Браузер физически не может подсунуть старые
style.css или main.js, поэтому вёрстка никогда не «ломается наполовину».

Запуск из корня проекта:
    python3 scripts/serve.py          # порт 8899
    python3 scripts/serve.py 9000     # свой порт
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # не засоряем вывод успешными запросами, показываем только ошибки
        status = args[1] if len(args) > 1 else ""
        if str(status).startswith(("4", "5")):
            sys.stderr.write("%s %s\n" % (self.path, status))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    server = ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler)
    print("Сайт: http://localhost:%d" % port)
    print("Папка: %s" % ROOT)
    print("Кэширование отключено. Остановить — Ctrl+C.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nОстановлено.")


if __name__ == "__main__":
    main()
