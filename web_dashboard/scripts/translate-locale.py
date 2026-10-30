#!/usr/bin/env python3
"""Translate en.json locale to fr.json preserving structure and placeholders."""

import json
import re
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
EN_PATH = ROOT / "src/locales/en.json"
FR_PATH = ROOT / "src/locales/fr.json"

PLACEHOLDER_RE = re.compile(r"\{[^}]+\}")
VUE_I18n_LITERAL_RE = re.compile(r"\{'@'\}")

translator = GoogleTranslator(source="en", target="fr")
cache: dict[str, str] = {}


def protect(text: str) -> tuple[str, list[str]]:
    """Replace placeholders with tokens so they are not translated."""
    tokens: list[str] = []

    def repl(m: re.Match) -> str:
        tokens.append(m.group(0))
        return f"__PH{len(tokens) - 1}__"

    protected = PLACEHOLDER_RE.sub(repl, text)
    protected = VUE_I18n_LITERAL_RE.sub(lambda _: "__AT__", protected)
    return protected, tokens


def restore(text: str, tokens: list[str]) -> str:
    for i, token in enumerate(tokens):
        text = text.replace(f"__PH{i}__", token)
    return text.replace("__AT__", "{'@'}")


def translate_text(text: str) -> str:
    if not text or not text.strip():
        return text
    if text in cache:
        return cache[text]

    protected, tokens = protect(text)

    for attempt in range(5):
        try:
            translated = translator.translate(protected)
            result = restore(translated, tokens)
            cache[text] = result
            return result
        except Exception as e:
            if attempt == 4:
                print(f"Failed to translate: {text!r} -> {e}", file=sys.stderr)
                cache[text] = text
                return text
            time.sleep(1.5 * (attempt + 1))

    return text


def translate_obj(value, translate_fn):
    if isinstance(value, dict):
        return {k: translate_obj(v, translate_fn) for k, v in value.items()}
    if isinstance(value, str):
        return translate_fn(value)
    return value


def main():
    with EN_PATH.open(encoding="utf-8") as f:
        en = json.load(f)

    # Collect unique strings first for progress reporting
    unique: set[str] = set()

    def collect(obj):
        if isinstance(obj, dict):
            for v in obj.values():
                collect(v)
        elif isinstance(obj, str) and obj.strip():
            unique.add(obj)

    collect(en)
    total = len(unique)
    print(f"Translating {total} unique strings...", flush=True)

    translated_count = 0

    def tracked_translate(text: str) -> str:
        nonlocal translated_count
        if text in cache:
            return cache[text]
        if not text or not text.strip():
            return text
        protected, tokens = protect(text)
        for attempt in range(5):
            try:
                result = restore(translator.translate(protected), tokens)
                cache[text] = result
                translated_count += 1
                if translated_count % 50 == 0 or translated_count == total:
                    print(f"  {translated_count}/{total}", flush=True)
                time.sleep(0.05)
                return result
            except Exception as e:
                if attempt == 4:
                    print(f"Failed: {text!r} -> {e}", file=sys.stderr)
                    cache[text] = text
                    return text
                time.sleep(1.5 * (attempt + 1))
        return text

    fr = translate_obj(en, tracked_translate)

    with FR_PATH.open("w", encoding="utf-8") as f:
        json.dump(fr, f, ensure_ascii=False, indent=4)
        f.write("\n")

    print(f"Wrote {FR_PATH}")


if __name__ == "__main__":
    main()
