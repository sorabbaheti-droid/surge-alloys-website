# surgealloys.com

Website for Surge Alloys Pvt. Ltd.: manganese steel crusher wear parts.

Static site, no framework. Pages are written in `_src/pages/*.html` and wrapped in the shared header and footer by the build:

```
python3 _src/build.py
```

Don't hand-edit the generated `index.html` files. Edit `_src/pages/` and rebuild.

- Styles: `assets/css/surge.css`. Script: `assets/js/surge.js` (intro, header, reveal, work-hardening story, quote form).
- Until `surgealloys.com` points at GitHub Pages, the site is served under `/surge-alloys-website/`, and the build prefixes all links with that. Adding a `CNAME` file switches the prefix off automatically.
- The quote form prepares an email to sales@surgealloys.com (Gmail, Outlook, email app or copy). Switch it to an ERPNext web form when one exists for Surge.
- Content rules: no customer names, logos or photos; no leadership section (that lives on standardalloysindia.com); 3D scanning is arranged for customers, not done with our own scanner.
