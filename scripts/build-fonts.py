#!/usr/bin/env python3
"""Subset Noto Serif SC (SIL OFL 1.1) to the display glyphs used by the site and write a woff2 file.

Usage: python3 scripts/build-fonts.py <NotoSerifSC-VF.otf> [dist-dir]
Source font: https://github.com/notofonts/noto-cjk (Serif/Variable/OTF/Subset/NotoSerifSC-VF.otf).
Glyphs are collected from the built HTML (h1, hero, poster, brand, .disp), so run `npm run build` first.
Needs: pip install fonttools brotli
"""
import re, sys, pathlib
from html.parser import HTMLParser
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

src = pathlib.Path(sys.argv[1])
dist = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else 'dist')
out = pathlib.Path(__file__).resolve().parent.parent / 'src/assets/fonts'
DISPLAY_TAGS = {'h1'}
DISPLAY_CLASS = re.compile(r'(mega-layer|poster-line|disp|hero-em|story-cap|lane-title|brand)')
INLINE = {'span', 'em', 'strong', 'b', 'i'}
VOID = {'br', 'img', 'meta', 'link', 'input', 'path', 'svg', 'canvas', 'source', 'hr'}

class Collector(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack = []; self.chars = set()
    def handle_starttag(self, tag, attrs):
        if tag in VOID: return
        cls = dict(attrs).get('class') or ''
        own = tag in DISPLAY_TAGS or bool(DISPLAY_CLASS.search(cls))
        self.stack.append(own or (tag in INLINE and bool(self.stack) and self.stack[-1]))
    def handle_endtag(self, tag):
        if tag in VOID: return
        if self.stack: self.stack.pop()
    def handle_data(self, d):
        if self.stack and self.stack[-1]:
            self.chars.update(c for c in d if ord(c) > 127 or c.isdigit())

chars = set('珞序，。、：；！？“”‘’（）《》·—…0123456789')
for page in dist.rglob('*.html'):
    c = Collector(); c.feed(page.read_text(encoding='utf-8')); chars |= c.chars
text = ''.join(sorted(chars))
print(len(text), 'glyphs')
font = TTFont(src)
sub = subset.Subsetter(opts_ := subset.Options()); 
opts_.layout_features = ['kern', 'vert', 'palt']; opts_.notdef_outline = True
sub.populate(text=text); sub.subset(font)
# Variable-font outlines overlap; flatten them so text-stroke and blend modes render cleanly.
font = instancer.instantiateVariableFont(font, {'wght': 900}, overlap=instancer.OverlapMode.REMOVE)
font.flavor = 'woff2'; font.save(out / 'lx-serif-900.woff2')
print((out / 'lx-serif-900.woff2').stat().st_size, 'bytes')
