"""Export the existing Android vector mark to web sizes; do not distribute fonts."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
icons=root/'public'/'icons'
for size,name in [(32,'favicon-32.png'),(180,'apple-touch-icon.png'),(192,'icon-192.png'),(512,'icon-512.png')]:
    scale=4
    im=Image.new('RGB',(size*scale,size*scale),'#245D50')
    draw=ImageDraw.Draw(im)
    def points(coords):return [(x/48*size*scale,y/48*size*scale) for x,y in coords]
    for coords in [[(9,27),(17,17),(23,23),(29,12),(39,27)],[(10,33),(38,33)],[(15,38),(33,38)]]:
        draw.line(points(coords),fill='#F7F6F2',width=max(1,round(2/48*size*scale)),joint='curve')
    im.resize((size,size),Image.Resampling.LANCZOS).save(icons/name)
og=Image.new('RGB',(1200,630),'#F7F6F2')
d=ImageDraw.Draw(og)
fontpath=Path('C:/Windows/Fonts/msyh.ttc')
def f(size):return ImageFont.truetype(str(fontpath),size)
d.line((80,95,1120,95),fill='#D5DDD4',width=1)
d.text((80,144),'珞序',font=f(74),fill='#26352D')
d.text((276,179),'LUOXU',font=f(23),fill='#245D50')
d.text((80,285),'让消息各归其位，',font=f(42),fill='#26352D')
d.text((80,350),'让校园生活自成秩序。',font=f(42),fill='#26352D')
d.text((80,515),'本地优先的校园 AI 助手 · Android 内测',font=f(23),fill='#626F65')
d.line([(840,390),(880,325),(920,354),(975,285),(1050,390)],fill='#D5DDD4',width=2)
d.line((845,425,1050,425),fill='#D5DDD4',width=2)
d.line((875,445,1020,445),fill='#D5DDD4',width=2)
(root/'public'/'images').mkdir(exist_ok=True)
og.save(root/'public'/'images'/'og.png',optimize=True)
print('Exported Android brand mark: 32/180/192/512 and 1200x630 OpenGraph.')
