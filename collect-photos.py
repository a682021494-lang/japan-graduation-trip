import concurrent.futures, html, io, json, re, time
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit
import requests
from PIL import Image, ImageOps
candidates=[line.split('\t') for line in Path('followup-photos.tsv').read_text().splitlines()]
output=Path('collected');(output/'images').mkdir(parents=True,exist_ok=True)
session_headers={'User-Agent':'JapanTrip2027PhotoReview/1.0 (https://github.com/a682021494-lang/japan-graduation-trip; attribution review)'}
def api(domain, **params):
    r=requests.get('https://'+domain+'/w/api.php',params={'format':'json','formatversion':2,**params},headers=session_headers,timeout=16)
    r.raise_for_status()
    return r.json()['query']['pages']
def clean(v):
    return html.unescape(re.sub('<[^>]*>','',v)).strip()
photos={}
def get(item):
    i,(name,filename)=item
    if not filename or not re.search(r'\.(jpe?g|webp|png)$',filename,re.I) or re.search(r'logo|locator|location.map|emblem|coat.of.arms',filename,re.I):return None
    try:
        page=api('commons.wikimedia.org',action='query',prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=960,titles='File:'+filename)[0]
        info=page['imageinfo'][0];meta=info.get('extmetadata',{})
        def value(k):return clean(meta.get(k,{}).get('value',''))
        license=value('LicenseShortName');artist=value('Artist') or value('Credit')
        license_url=value('LicenseUrl')
        if license_url.startswith('//'):license_url='https:'+license_url
        if license_url.startswith('http://creativecommons.org/'):license_url=license_url.replace('http://','https://',1)
        if license=='CC0':license_url='https://creativecommons.org/publicdomain/zero/1.0/'
        if not artist or not (re.fullmatch(r'CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0)',license) or license in ('Public domain','CC0')):
            print('License or credit skipped:',i,filename,license,bool(artist));return None
        if license.startswith('CC') and not license_url.startswith('https://creativecommons.org/'):
            print('License URL skipped:',i,filename,license,license_url);return None
        r=None
        for url in dict.fromkeys(filter(None,[info.get('thumburl'),info.get('url')])):
            if url.startswith('//'):url='https:'+url
            if url.startswith('http://upload.wikimedia.org/'):url=url.replace('http://','https://',1)
            if not url.startswith(('https://upload.wikimedia.org/','https://thumb.wikimedia.org/')):
                print('Unexpected image host:',i,url[:180]);continue
            response=requests.get(url.split('?',1)[0],headers=session_headers,timeout=18)
            if response.ok:
                r=response
                break
            print('Image unavailable:',i,response.status_code,url[:180])
        if r is None:return None
        img=ImageOps.exif_transpose(Image.open(io.BytesIO(r.content))).convert('RGB');img.thumbnail((1000,850))
        nameout=f'commons-{i:03d}.webp';img.save(output/'images'/nameout,'WEBP',quality=77,method=6)
        return i,{'name':name,'description':value('ImageDescription'),'file':nameout,'source':info['descriptionurl'],'artist':artist,'license':license,'licenseUrl':license_url,'filename':page['title']}
    except Exception as error:
        print(i,filename,str(error)[:200]);return None
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for result in pool.map(get,enumerate(candidates,601)):
        if result:photos[result[0]]=result[1]
(output/'candidates.json').write_text(json.dumps(photos,ensure_ascii=False,indent=2))
from PIL import ImageDraw
values=list(photos.items())
for page_n in range((len(values)+23)//24):
    sheet=Image.new('RGB',(840,840),'white');draw=ImageDraw.Draw(sheet)
    for j,(id,item) in enumerate(values[page_n*24:(page_n+1)*24]):
        img=Image.open(output/'images'/item['file']);img.thumbnail((205,112))
        x=(j%4)*210;y=(j//4)*140
        sheet.paste(img,(x+(210-img.width)//2,y));draw.text((x+5,y+116),str(id),fill='black')
    sheet.save(output/f'preview-{page_n}.jpg',quality=85)
print('Candidates:',len(photos))
