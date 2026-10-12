#!/usr/bin/env python3
"""Outline the two brand glyphs 珞 / 序 from Noto Serif SC (SIL OFL 1.1) as SVG paths aligned to the
Hanzi Writer stroke medians, so the handwriting animation keeps the true stroke order and direction while
the ink takes the shape of a designed serif instead of a Kai face.

Usage: python3 scripts/build-glyphs.py <NotoSerifSC-VF.otf>
"""
import json, sys, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

root = pathlib.Path(__file__).resolve().parent.parent
font = TTFont(sys.argv[1])
_sub = subset.Subsetter(); _sub.populate(text='珞序'); _sub.subset(font)
font = instancer.instantiateVariableFont(font, {'wght': 800}, overlap=instancer.OverlapMode.REMOVE)
gs = font.getGlyphSet(); cmap = font.getBestCmap()
out = {}
for ch in '珞序':
    med = json.loads((root / 'node_modules/hanzi-writer-data' / f'{ch}.json').read_text(encoding='utf-8'))['medians']
    pts = [p for stroke in med for p in stroke]
    mx0, mx1 = min(p[0] for p in pts), max(p[0] for p in pts)
    my0, my1 = min(p[1] for p in pts), max(p[1] for p in pts)
    g = gs[cmap[ord(ch)]]
    bp = BoundsPen(gs); g.draw(bp); gx0, gy0, gx1, gy1 = bp.bounds
    s = (((mx1 - mx0) + 70) / (gx1 - gx0) + ((my1 - my0) + 70) / (gy1 - gy0)) / 2
    cx, cy = (mx0 + mx1) / 2, (my0 + my1) / 2
    gcx, gcy = (gx0 + gx1) / 2, (gy0 + gy1) / 2
    pen = SVGPathPen(gs, ntos=lambda v: f'{v:.1f}')
    # font units (y up) -> hanzi coordinate system (y up, same as medians)
    g.draw(TransformPen(pen, (s, 0, 0, s, cx - gcx * s, cy - gcy * s)))
    out[ch] = pen.getCommands()
(root / 'src/assets/glyphs.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
print({k: len(v) for k, v in out.items()})
