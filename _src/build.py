#!/usr/bin/env python3
"""Build surgealloys.com: wraps each _src/pages/*.html in the shared layout.
Page files start with a JSON block in an HTML comment:  <!--{"path":"/","title":"...","desc":"...","nav":"home"}-->
Run from the repo root:  python3 _src/build.py
"""
import json, re, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / '_src' / 'pages'
SITE = 'https://www.surgealloys.com'
NAME = 'Surge Alloys'
GROUP = 'https://www.standardalloysindia.com/standard-alloys/'
# Site lives at a sub-path on github.io until surgealloys.com points here. Set BASE = '' after the domain move.
BASE = '' if (ROOT / 'CNAME').exists() else '/surge-alloys-website'

NAV = [('mn', 'Manganese steel', '/manganese-steel/'), ('products', 'Products', '/products/'),
       ('plant', 'Plant', '/plant/'), ('esg', 'Sustainability', '/sustainability/'),
       ('careers', 'Careers', '/careers/'), ('about', 'About', GROUP + 'about/')]

ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.6"/></svg>'

def header(cur):
    links = ''.join(
        f'<a href="{u}"' + (' aria-current="page"' if k == cur else '') +
        (' target="_blank" rel="noopener"' if u.startswith('http') else '') + f'>{t}</a>' for k, t, u in NAV)
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="hdr"><div class="wrap">
  <a class="logo" href="/" aria-label="Surge Alloys home"><img src="/assets/img/logo-light.png" alt="Surge Alloys Pvt. Ltd." width="1400" height="887"></a>
  <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
  <nav class="nav" id="nav" aria-label="Main">{links}<a class="btn" href="/contact/">Get a quote</a></nav>
</div></header>'''

FOOTER = f'''<footer class="ftr"><div class="wrap">
  <div class="top">
    <div><img src="/assets/img/logo-light.png" alt="Surge Alloys" width="1400" height="887" loading="lazy">
      <p>Manganese steel castings for crushers, mining and aggregates. A group company of <a href="{GROUP}" target="_blank" rel="noopener" style="color:var(--tx)">Standard Alloys India</a>.</p></div>
    <div><h4>Explore</h4><ul>
      <li><a href="/manganese-steel/">Manganese steel &amp; MNX</a></li><li><a href="/products/">Products</a></li>
      <li><a href="/plant/">Plant &amp; quality</a></li><li><a href="/sustainability/">Sustainability</a></li><li><a href="/careers/">Careers</a></li></ul></div>
    <div><h4>Talk to us</h4><ul>
      <li><a href="mailto:sales@surgealloys.com">sales@surgealloys.com</a></li>
      <li><a href="tel:+911452970095">+91 145 297 0095</a></li>
      <li><a href="tel:+919695763399">+91 96957 63399</a></li>
      <li><a href="tel:+919352240003">+91 93522 40003</a></li></ul></div>
    <div><h4>Works</h4><p>F-95 &amp; 96, Ajaymeru Industrial Area,<br>Palra, Ajmer 305025,<br>Rajasthan, India</p>
      <p style="margin-top:14px"><a href="https://www.linkedin.com/company/surge-alloys-private-limited/" target="_blank" rel="noopener">LinkedIn</a></p></div>
  </div>
  <div class="bot"><span>© <span data-year>{datetime.date.today().year}</span> Surge Alloys Pvt. Ltd. ISO 9001 · ISO 14001 · ISO 45001 · ZED Bronze</span>
    <span><a href="/privacy/">Privacy</a> · <a href="{GROUP}" target="_blank" rel="noopener">Standard Alloys India</a></span></div>
</div></footer>'''

ORG = {"@context": "https://schema.org", "@type": "Organization", "name": "Surge Alloys Pvt. Ltd.", "url": SITE + "/",
       "logo": SITE + "/assets/img/logo-dark.png", "email": "sales@surgealloys.com", "telephone": "+91-145-297-0095",
       "address": {"@type": "PostalAddress", "streetAddress": "F-95 & 96, Ajaymeru Industrial Area, Palra", "addressLocality": "Ajmer",
                   "postalCode": "305025", "addressRegion": "Rajasthan", "addressCountry": "IN"},
       "parentOrganization": {"@type": "Organization", "name": "Standard Alloys India Pvt. Ltd.", "url": "https://www.standardalloysindia.com/"},
       "sameAs": ["https://www.linkedin.com/company/surge-alloys-private-limited/"]}

def page(meta, body):
    path = meta['path']; title = meta['title']
    full = title if meta.get('raw_title') else f'{title} · {NAME}'
    og = meta.get('og', '/assets/img/hero-furnace.webp')
    ld = json.dumps(ORG) if path == '/' else ''
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{full}</title>
<meta name="description" content="{meta['desc']}">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:type" content="website"><meta property="og:site_name" content="{NAME}">
<meta property="og:title" content="{full}"><meta property="og:description" content="{meta['desc']}">
<meta property="og:url" content="{SITE}{path}"><meta property="og:image" content="{SITE}{og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0d0d0e">
<link rel="icon" href="/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/surge.css">
{f'<script type="application/ld+json">{ld}</script>' if ld else ''}
</head><body>
{meta.get('pre', '')}{header(meta.get('nav'))}
<main id="main">
{body}
</main>
{FOOTER}
<script src="/assets/js/surge.js" defer></script>
</body></html>
'''

def main():
    urls = []
    for f in sorted(SRC.glob('*.html')):
        txt = f.read_text()
        m = re.match(r'\s*<!--(\{.*?\})-->\s*', txt, re.S)
        meta = json.loads(m.group(1)); body = txt[m.end():].replace('{{ARROW}}', ARROW)
        if meta.get('intro'):
            meta['pre'] = ('<div class="intro" aria-hidden="true"><video src="/assets/img/logo-anim.mp4" muted playsinline preload="auto" '
                           'poster="/assets/img/logo-anim-last.jpg"></video><button class="skipi" type="button">Skip</button></div>\n')
        out = ROOT / ('404.html' if meta['path'] == '/404' else meta['path'].strip('/') + '/index.html' if meta['path'] != '/' else 'index.html')
        out.parent.mkdir(parents=True, exist_ok=True)
        html = page(meta, body)
        if BASE:
            html = re.sub(r'((?:href|src|poster|srcset)=")/(?!/)', r'\1' + BASE + '/', html)
            html = re.sub(r', /assets/', ', ' + BASE + '/assets/', html)
        out.write_text(html)
        if meta['path'] != '/404': urls.append(meta['path'])
    today = datetime.date.today().isoformat()
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n')
    print('built', len(urls), 'pages')

if __name__ == '__main__':
    main()
