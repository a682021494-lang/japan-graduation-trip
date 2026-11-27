import concurrent.futures, io, json, re
from pathlib import Path
import requests
from PIL import Image, ImageOps, ImageDraw

root = 'https://www.env.go.jp/nature/nationalparks/'
course = root + 'list/kerama-shoto/course/07/'
media = root + 'list/kerama-shoto/images/course/07/'
out = Path('collected')
out.mkdir(exist_ok=True)
(out / 'course.html').write_text(requests.get(course,timeout=18).text)
(out / 'whale').mkdir(exist_ok=True)
canvas = Image.new('RGB',(920,580),'white')
draw = ImageDraw.Draw(canvas)
for i, key in enumerate(('main','highlights_01','highlights_02','highlights_03')):
    url = media+f'23_course_07_{key}.jpg'
    response = requests.get(url,timeout=18)
    response.raise_for_status()
    photo = ImageOps.exif_transpose(Image.open(io.BytesIO(response.content))).convert('RGB')
    photo.thumbnail((960,850))
    photo.save(out/'whale'/f'kerama-{i+1}.webp','WEBP',quality=78,method=6)
    photo.thumbnail((448,240))
    x=(i%2)*460;y=(i//2)*290
    canvas.paste(photo,(x,y));draw.text((x,y+242),key,fill='black')
canvas.save(out/'whale-preview.jpg',quality=88)
