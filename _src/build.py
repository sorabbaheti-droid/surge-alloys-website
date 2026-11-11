#!/usr/bin/env python3
"""Build surgealloys.com: wraps each _src/pages/*.html in the shared layout and generates one page per product.
Page files start with a JSON block in an HTML comment:  <!--{"path":"/","title":"...","desc":"...","nav":"home"}-->
Placeholders in pages: {{ARROW}}, {{CARDS}} (all product cards), {{GRADES_TABLE}}.
Run from the repo root:  python3 _src/build.py
"""
import json, re, pathlib, datetime, html, sys, hashlib
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from catalogue import GRADES, GRADE_ORDER, STANDARDS, FAMILIES, PRODUCTS

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / '_src' / 'pages'
SITE = 'https://www.surgealloys.com'
NAME = 'Surge Alloys'
GROUP = 'https://www.standardalloysindia.com/standard-alloys/'
# Site lives at a sub-path on github.io until surgealloys.com points here. A CNAME file switches the prefix off.
BASE = '' if (ROOT / 'CNAME').exists() else '/surge-alloys-website'
TEL, PHONE = 'tel:+911452970095', '+91 145 297 0095'
esc = lambda s: html.escape(s, quote=True)

NAV = [('mn', 'Manganese steel', '/manganese-steel/'), ('products', 'Products', '/products/'),
       ('plant', 'Plant', '/plant/'), ('esg', 'Sustainability', '/sustainability/'),
       ('careers', 'Careers', '/careers/'), ('about', 'About', GROUP + 'about/')]
ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.6"/></svg>'

def header(cur):
    links = ''.join(
        f'<a href="{u}"' + (' aria-current="page"' if k == cur else '') +
        (' target="_blank" rel="noopener"' if u.startswith('http') else '') + f'>{t}</a>' for k, t, u in NAV)
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="hdr"><div class="container">
  <a class="logo" href="/" aria-label="Surge Alloys home"><img src="/assets/img/logo-dark.png" alt="Surge Alloys Pvt. Ltd." width="1400" height="887"></a>
  <button class="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
  <nav class="nav" id="nav" aria-label="Main">{links}<a class="btn" href="/contact/">Get a quote</a></nav>
</div></header>'''

FOOTER = f'''<footer class="ftr"><div class="container">
  <a class="mast" href="/" aria-label="Surge Alloys home"><img src="/assets/img/logo-light.png" alt="Surge Alloys" width="1400" height="887" loading="lazy"></a>
  <div class="cols">
    <div><h2>Products</h2><ul>{''.join(f'<li><a href="/products/{p["slug"]}/">{p["name"]}</a></li>' for p in PRODUCTS)}</ul></div>
    <div><h2>Company</h2><ul><li><a href="/manganese-steel/">Manganese steel and MNxtra</a></li><li><a href="/plant/">Plant and quality</a></li><li><a href="/sustainability/">Sustainability</a></li><li><a href="/careers/">Careers</a></li><li><a href="{GROUP}" target="_blank" rel="noopener">Standard Alloys India</a></li></ul></div>
    <div><h2>Sales</h2><ul><li><a href="mailto:sales@surgealloys.com">sales@surgealloys.com</a></li><li><a href="{TEL}">{PHONE}</a></li><li><a href="tel:+919695763399">+91 96957 63399</a></li><li><a href="tel:+919352240003">+91 93522 40003</a></li></ul></div>
    <div><h2>Works</h2><p>F95 and F96, Ajaymeru Industrial Area, Palra, Ajmer 305025, Rajasthan, India</p><ul style="margin-top:var(--space-sm)"><li><a href="https://www.linkedin.com/company/surge-alloys-private-limited/" target="_blank" rel="noopener">LinkedIn</a></li></ul></div>
  </div>
  <div class="legal"><p>© <span data-year>{datetime.date.today().year}</span> Surge Alloys Pvt. Ltd., a group company of Standard Alloys India</p><p><a href="/privacy/">Privacy</a></p></div>
</div></footer>'''

ORG = {"@context": "https://schema.org", "@type": "Organization", "name": "Surge Alloys Pvt. Ltd.", "url": SITE + "/",
       "logo": SITE + "/assets/img/logo-dark.png", "email": "sales@surgealloys.com", "telephone": "+91-145-297-0095",
       "address": {"@type": "PostalAddress", "streetAddress": "F95 and F96, Ajaymeru Industrial Area, Palra", "addressLocality": "Ajmer",
                   "postalCode": "305025", "addressRegion": "Rajasthan", "addressCountry": "IN"},
       "parentOrganization": {"@type": "Organization", "name": "Standard Alloys India Pvt. Ltd.", "url": "https://www.standardalloysindia.com/"},
       "sameAs": ["https://www.linkedin.com/company/surge-alloys-private-limited/"]}

def ver(rel):
    return rel + '?v=' + hashlib.md5((ROOT / rel.lstrip('/')).read_bytes()).hexdigest()[:8]

def og_image(src):
    """A 1200 x 630 JPG for link previews, made from any site image."""
    out = ROOT / 'assets' / 'og' / (pathlib.Path(src).stem + '.jpg'); out.parent.mkdir(exist_ok=True)
    im = Image.open(ROOT / src.lstrip('/'))
    if im.mode == 'RGBA':      # a part cutout: centre it on the page colour
        bg = Image.new('RGB', (1200, 630), (251, 248, 244)); im.thumbnail((900, 520)); bg.paste(im, ((1200 - im.width) // 2, (630 - im.height) // 2), im); im = bg
    else:
        im = im.convert('RGB'); k = max(1200 / im.width, 630 / im.height); im = im.resize((round(im.width * k) + 1, round(im.height * k) + 1))
        x, y = (im.width - 1200) // 2, (im.height - 630) // 2; im = im.crop((x, y, x + 1200, y + 630))
    im.save(out, quality=82, optimize=True)
    return '/assets/og/' + out.name

_dims = {}
def size_images(doc):
    """Give every local image its width and height so the page does not jump while loading."""
    def fix(m):
        tag = m.group(0)
        if ' width=' in tag: return tag
        src = re.search(r'src="(/assets/[^"?]+)', tag)
        if not src: return tag
        f = ROOT / src.group(1).lstrip('/')
        if not f.exists(): return tag
        if f not in _dims: _dims[f] = Image.open(f).size
        w, h = _dims[f]
        return tag[:-1] + f' width="{w}" height="{h}">'
    return re.sub(r'<img [^>]*>', fix, doc)

CTA = '''<section class="sec--s"><div class="container">
  <div class="close-band rv">
    <div style="display:grid;gap:18px;position:relative"><h2>Tell us what’s wearing out.</h2><p class="lead">Speak with our application specialist. We supply anywhere in the world.</p><div class="actions"><a class="btn" href="/contact/">Get a quote ''' + ARROW + '''</a></div></div>
    <dl>
      <div><dt>Email</dt><dd><a href="mailto:sales@surgealloys.com">sales@surgealloys.com</a></dd></div>
      <div><dt>Phone</dt><dd><a href="''' + TEL + '''">''' + PHONE + '''</a></dd></div>
      <div><dt>Works</dt><dd>Palra, Ajmer 305025, India</dd></div>
    </dl>
  </div>
</div></section>'''

FONTS = ('<link rel="preload" href="/assets/fonts/inter-tight-500.woff2" as="font" type="font/woff2" crossorigin>'
         '<script>document.documentElement.classList.add("js")</script>')

def page(meta, body):
    path = meta['path']; title = meta['title']
    full = title if meta.get('raw_title') else f'{title} | {NAME}'
    og = og_image(meta.get('og', '/assets/img/pour.webp'))
    lds = list(meta.get('ld', []))
    if path == '/': lds = [ORG, {"@context": "https://schema.org", "@type": "WebSite", "name": NAME, "url": SITE + "/"}] + lds
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in lds)
    if meta.get('cta'): body += CTA
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(full)}</title>
<meta name="description" content="{esc(meta['desc'])}">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:type" content="website"><meta property="og:site_name" content="{NAME}">
<meta property="og:title" content="{esc(full)}"><meta property="og:description" content="{esc(meta['desc'])}">
<meta property="og:url" content="{SITE}{path}"><meta property="og:image" content="{SITE}{og}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(full)}">
<meta name="twitter:description" content="{esc(meta['desc'])}"><meta name="twitter:image" content="{SITE}{og}">
<meta name="theme-color" content="#fbf8f4">
<link rel="icon" href="/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
{FONTS}
<link rel="stylesheet" href="{ver('/assets/css/surge.css')}">
{ld}
</head><body>
{meta.get('pre', '')}{header(meta.get('nav'))}
<main id="main">
{body}
</main>
{FOOTER}
<script src="/assets/js/vendor/lenis.min.js" defer></script>
<script src="/assets/js/vendor/gsap.min.js" defer></script>
<script src="/assets/js/vendor/ScrollTrigger.min.js" defer></script>
<script src="{ver('/assets/js/surge.js')}" defer></script>
</body></html>
'''

# ------------------------------------------------------------- catalogue blocks
def card(p, compact=False):
    pic = (f'<div class="pic"><img src="/assets/img/parts/{p["img"]}.webp" alt="{esc(p["name"])}" loading="lazy"></div>' if p['img']
           else f'<div class="pic type" aria-hidden="true"><span>{p["name"]}</span></div>')
    gr = ', '.join(GRADES[g]['name'] for g in p['grades'])
    return (f'<a class="pcard" href="/products/{p["slug"]}/">{pic}<div class="b"><span class="fam">{FAMILIES[p["fam"]]}</span>'
            f'<h3>{p["name"]}</h3>' + ('' if compact else f'<p>{p["where"]}</p>') + f'<span class="g">{gr}</span></div></a>')

def cards(ps=None, compact=False):
    inner = ''.join(card(p, compact) for p in (ps or PRODUCTS))
    return '<div class="pcards">' + inner + '</div>'

def cards_by_family():
    out = ''
    for k in ['jaw', 'cone', 'impact', 'roll', 'track']:
        rows = ''
        for p in [p for p in PRODUCTS if p['fam'] == k]:
            gr = ', '.join(GRADES[g]['name'] for g in p['grades'])
            rows += (f'<a class="prow rv" href="/products/{p["slug"]}/"><div class="pic"><img src="/assets/img/parts/{p["img"]}.webp" alt="" loading="lazy"></div>'
                     f'<div class="t"><h3>{p["name"]}</h3><span>{p["what"]}</span></div><span class="g">{gr}</span><span class="go">{ARROW}</span></a>')
        out += f'<div class="fam-group"><h2 id="{k}">{FAMILIES[k]}</h2>{rows}</div>'
    return out

def showcase():
    out = ''
    for i, p in enumerate(PRODUCTS, 1):
        pic = (f'<img src="/assets/img/parts/{p["img"]}.webp" alt="{esc(p["name"])}" loading="lazy">' if p['img']
               else f'<span class="sp-type" aria-hidden="true">{p["name"]}</span>')
        gr = ', '.join(GRADES[g]['name'] for g in p['grades'])
        out += (f'<a class="sp" href="/products/{p["slug"]}/"><span class="sp-n">{i:02d}</span><div class="sp-pic">{pic}</div>'
                f'<div class="sp-b"><span class="fam">{FAMILIES[p["fam"]]}</span><h3>{p["name"]}</h3><p>{p["what"]}</p><span class="g">{gr}</span></div></a>')
    return out

def grades_table(only=None):
    rows = ''
    for g in (only or GRADE_ORDER):
        G = GRADES[g]
        rows += f'<tr{" class=\"lead-row\"" if g == "mnxtra" else ""}><td>{G["name"]}</td><td data-l="What it is">{G["what"]}</td><td data-l="Where it works">{G["where"]}</td></tr>'
    return f'<div class="table-wrap"><table class="table table--stack"><thead><tr><th scope="col">Grade</th><th scope="col">What it is</th><th scope="col">Where it works</th></tr></thead><tbody>{rows}</tbody></table></div>'

def product_page(p):
    q = '/contact/?part=' + p['name'].replace(' ', '+')
    vis = (f'<figure class="pvis ticks"><img src="/assets/img/parts/{p["img"]}.webp" alt="{esc(p["name"])}"></figure>' if p['img'] else
           f'''<aside class="pvis qcard"><h2>Get a quote for {p["name"].lower()}</h2><ul class="facts"><li>A drawing, photographs or a worn sample</li><li>Grade recommended for your duty</li><li>As cast, or machined to drawing</li></ul><a class="btn btn--primary" href="{q}">Get a quote</a></aside>''')
    low = p['name'].lower()
    faq = [(f'Can you make {low} without a drawing?', 'Yes. Send a worn sample, or photographs with the main dimensions. We can also arrange a 3D scan and rebuild the geometry from it.'),
           ('Which grade should I choose?', f'It depends on your rock and how hard the crusher hits it. For {low} we pour ' + ', '.join(GRADES[g]['name'] for g in p['grades']) + ', or the grade you specify, and we confirm the choice with every quotation.'),
           ('How large can you cast?', 'Single pieces up to 4.5 tonnes.'),
           ('Do you machine the parts?', 'Yes. Parts are supplied as cast or machined to your drawing. Our plant has 7 vertical lathes, the largest turning 2,300 mm.'),
           ('How do you check quality?', 'The chemistry of every heat is tested on a spectrometer before pouring. Dimensions are checked with gauges, jigs and fixtures before dispatch.')]
    url = f'{SITE}/products/{p["slug"]}/'
    ld = [{"@context": "https://schema.org", "@type": "Product", "name": p['name'], "description": p['what'], "category": FAMILIES[p['fam']] + ' wear parts',
           "image": f'{SITE}/assets/img/parts/{p["img"]}.webp', "url": url, "material": "Austenitic manganese steel",
           "brand": {"@type": "Brand", "name": NAME}, "manufacturer": {"@type": "Organization", "name": "Surge Alloys Pvt. Ltd."}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
              {"@type": "ListItem", "position": 2, "name": "Products", "item": SITE + "/products/"},
              {"@type": "ListItem", "position": 3, "name": p['name'], "item": url}]},
          {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
              {"@type": "Question", "name": q_, "acceptedAnswer": {"@type": "Answer", "text": a_}} for q_, a_ in faq]}]
    rel = [x for x in PRODUCTS if x['slug'] != p['slug'] and x['fam'] == p['fam']] or []
    rel += [x for x in PRODUCTS if x['slug'] != p['slug'] and x not in rel]
    body = f'''<section class="phead"><div class="container"><div class="grid12 pg">
  <div class="ptext">
    <p class="crumbs"><a href="/products/">Products</a> <span aria-hidden="true">/</span> {FAMILIES[p['fam']]}</p>
    <h1>{p['name']}</h1>
    <p class="lead">{p['what']}</p>
    <dl class="pfacts">
      <div><dt>Works in</dt><dd>{p['where']}</dd></div>
      <div><dt>Grades</dt><dd>{', '.join(GRADES[g]['name'] for g in p['grades'])}, or as you specify</dd></div>
      <div><dt>Size</dt><dd>Single pieces up to <span class="m">4.5 t</span></dd></div>
      <div><dt>Supplied</dt><dd>As cast, or machined to drawing</dd></div>
      <div><dt>Checked</dt><dd>Chemistry of every heat before pouring; dimensions with gauges, jigs and fixtures</dd></div>
      <div><dt>From a worn part</dt><dd>Yes, from a sample or a 3D scan we arrange</dd></div>
    </dl>
    <div class="actions"><a class="btn btn--primary" href="{q}">Get a quote for this part</a><a class="btn btn--ghost" href="#grade">Choose the grade</a></div>
  </div>
  {vis}
</div></div></section>
<section class="sec" id="grade"><div class="container"><div class="grid12">
  <div class="head--split"><h2>Choosing the grade</h2><p class="lead">Poured to {STANDARDS}. We confirm the grade for your duty with every quotation.</p></div>
  {grades_table(p['grades'])}
</div></div></section>
<section class="sec tint"><div class="container"><div class="grid12">
  <div class="head--split"><h2>How to order</h2><p class="lead">Three steps from your worn part to a new set.</p></div>
  <ol class="steps">
    <li><h3>Send us the part</h3><p>A drawing, a worn sample, or photographs with the main dimensions. We can arrange a 3D scan.</p></li>
    <li><h3>We recommend and quote</h3><p>Our application specialist matches the grade to your rock and your crusher, then sends a quotation.</p></li>
    <li><h3>We cast, check and dispatch</h3><p>Poured, heat treated, machined where the drawing asks, and gauged before it leaves.</p></li>
  </ol>
</div></div></section>
<section class="sec"><div class="container"><div class="grid12">
  <div class="head--split"><h2>Questions buyers ask</h2></div>
  <div class="faq">{''.join(f'<details><summary>{q_}</summary><p>{a_}</p></details>' for q_, a_ in faq)}</div>
</div></div></section>
<section class="sec"><div class="container"><div class="grid12">
  <div class="head--split"><h2>More parts</h2><p class="lead"><a class="link" href="/products/">All products</a></p></div>
  <div class="c-full">{cards(rel[:3]).replace('class="pcards"', 'class="pcards pcards--3"', 1)}</div>
</div></div></section>'''
    meta = dict(path=f'/products/{p["slug"]}/', title=f'{p["name"]} in manganese steel',
                desc=f'{p["name"]} in manganese steel. {p["what"]} Cast up to 4.5 t, to drawing or sample.', nav='products', ld=ld, cta=True,
                og=f'/assets/img/parts/{p["img"]}.webp' if p['img'] else '/assets/img/mantles-row.webp')
    return meta, body

# ------------------------------------------------------------- build
def write(meta, body, urls):
    out = ROOT / ('404.html' if meta['path'] == '/404' else (meta['path'].strip('/') + '/index.html' if meta['path'] != '/' else 'index.html'))
    out.parent.mkdir(parents=True, exist_ok=True)
    doc = size_images(page(meta, body))
    if BASE:
        doc = re.sub(r'((?:href|src|poster|srcset)=")/(?!/)', r'\1' + BASE + '/', doc)
        doc = re.sub(r', /assets/', ', ' + BASE + '/assets/', doc)
    out.write_text(doc)
    if meta['path'] != '/404': urls.append(meta['path'])

def main():
    urls = []
    for f in sorted(SRC.glob('*.html')):
        txt = f.read_text()
        m = re.match(r'\s*<!--(\{.*?\})-->\s*', txt, re.S)
        meta = json.loads(m.group(1))
        body = txt[m.end():].replace('{{ARROW}}', ARROW).replace('{{CARDS_COMPACT}}', cards(compact=True)).replace('{{CARDS}}', cards()).replace('{{SHOWCASE}}', showcase()).replace('{{CARDS_BY_FAMILY}}', cards_by_family()).replace('{{GRADES_TABLE}}', grades_table())
        if meta.get('intro'):
            meta['pre'] = ('<div class="intro" aria-hidden="true"><video src="/assets/img/logo-anim.mp4" muted playsinline preload="auto" '
                           'poster="/assets/img/logo-anim-last.jpg"></video><button class="skipi" type="button">Skip</button></div>\n')
        write(meta, body, urls)
    for p in PRODUCTS:
        write(*product_page(p), urls)
    today = datetime.date.today().isoformat()
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n')
    print('built', len(urls), 'pages')

if __name__ == '__main__':
    main()
