"""Scan LinkedIn draft text for AI-writing markers (see MARKERS.md).

Usage: python3 check_markers.py <file> [<file> ...]
Each file is plain text (post body, first comment, or slide text dumped from a spec).
Prints every hit with its line. Exit code 1 if anything was found, 0 if clean.
This catches words and formatting only; the reviewer pass in RUNBOOK.md covers the rest.
"""
import re
import sys
import unicodedata

PHRASES = [
    # 1 inflated significance
    "stands as", "serves as", "is a testament", "testament to", "is a reminder of", "vital role", "crucial role",
    "pivotal role", "key role", "pivotal moment", "turning point", "marks a shift", "represents a shift",
    "underscores", "highlights the importance", "broader trend", "broader movement", "setting the stage",
    "shaping the future", "evolving landscape", "enduring legacy", "indelible mark", "deeply rooted",
    "rich heritage", "more than just",
    # 2 promotional
    "boasts", "vibrant", "profound", "groundbreaking", "game-changer", "game changer", "renowned", "showcasing",
    "exemplifies", "commitment to", "nestled", "in the heart of", "diverse array", "seamless", "hassle-free",
    "hassle free", "unlock", "harness", "empower", "elevate", "transform your", "excited to announce",
    "book now",
    # 3 tacked-on analysis
    "highlighting its", "reflecting its", "contributing to", "further enhancing", "demonstrating the",
    "creating a more", "sparked debate", "prompted wider reflection", "prompted broader reflection",
    # 4 vague attribution
    "experts say", "studies show", "research suggests", "some argue", "critics argue", "industry reports",
    "observers note", "it is widely understood", "it is important to note", "it's important to note",
    "several sources",
    # 5 false balance
    "on the one hand", "on the other hand",
    # 6 formula endings
    "in conclusion", "in summary", "overall,", "ultimately,", "at the end of the day", "despite these challenges",
    "lies in its ability", "only time will tell",
    # 7 knowledge gaps
    "specific details are limited", "based on available information", "not widely documented",
    "as of my last",
    # 8 vocabulary
    "additionally", "align with", "aligns with", "bolster", "crucial", "delve", "demystify", "enduring",
    "enhance", "foster", "garner", "interplay", "intricate", "landscape", "masterclass", "meticulous",
    "navigate", "navigating", "pivotal", "realm", "resonate", "robust", "showcase", "tailored", "tapestry",
    "testament", "valuable", "multifaceted", "nuanced", "moreover", "furthermore", "fast-paced world",
    # 9 copula avoidance
    "functions as",
    # 10 negative parallelism
    "not only", "but also", "isn't about", "is not about", "it's not just", "it is not just",
    # 13/14 false ranges and forced numbering
    "pillars of", "key strategies",
    # 16 chatbot leftovers
    "here's a draft", "i hope this helps", "certainly!", "feel free to", "as an ai", "[insert",
    # 17 LinkedIn tells
    "here's the thing", "let that sink in", "read that again", "unpopular opinion", "i'll say it louder",
    "nobody talks about", "agree?", "thoughts?", "drop a comment", "repost if", "humbled to", "thrilled to",
    "here's why",
]

WORD_ONLY = {"rich", "key", "highlight", "highlights", "highlighted", "features", "offers", "represents"}

EMOJI_RANGES = [(0x1F300, 0x1FAFF), (0x2600, 0x27BF), (0x1F000, 0x1F2FF)]


def is_emoji(ch):
    cp = ord(ch)
    return any(a <= cp <= b for a, b in EMOJI_RANGES)


def scan(text):
    hits = []
    for n, raw in enumerate(text.splitlines(), 1):
        line = re.sub(r"https?://\S+", "", raw)  # links are checked by eye, not scanned
        low = line.lower()
        for p in PHRASES:
            if p in low:
                hits.append((n, f'phrase "{p}"', line))
        for w in WORD_ONLY:
            if re.search(rf"\b{re.escape(w)}\b", low):
                hits.append((n, f'word "{w}" (check: AI usage?)', line))
        if "—" in line:
            hits.append((n, "em dash", line))
        for m in re.finditer(r"(?<=\d)-(?=\d)", line):
            hits.append((n, "hyphen in a number range (use an en dash)", line))
            break
        if any(c in line for c in "“”‘’"):
            hits.append((n, "curly quotes (use straight quotes)", line))
        if any(is_emoji(c) for c in line):
            hits.append((n, "emoji", line))
        if any(unicodedata.name(c, "").startswith("MATHEMATICAL BOLD") for c in line):
            hits.append((n, "unicode bold", line))
        if "**" in line:
            hits.append((n, "markdown bold", line))
    tags = re.findall(r"(?<!\w)#\w+", text)
    if len(tags) > 3:
        hits.append((0, f"{len(tags)} hashtags (max 3)", " ".join(tags)))
    return hits


def main(paths):
    total = 0
    for p in paths:
        with open(p, encoding="utf-8") as f:
            hits = scan(f.read())
        for n, what, line in hits:
            print(f"{p}:{n}: {what}: {line.strip()[:120]}")
        total += len(hits)
    print("CLEAN" if total == 0 else f"{total} marker hit(s)")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
