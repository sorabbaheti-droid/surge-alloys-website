"""Surge Alloys catalogue: grades and products. Facts only from SB, the Wix site and the group profile deck."""

GRADES = {
    'mn14':  dict(name='Mn 14', what='Standard austenitic manganese steel, about 12 to 14% Mn.', where='General crushing: jaws, cones and impact parts in most rock.'),
    'mn18':  dict(name='Mn 18', what='Higher manganese for faster, deeper work hardening.', where='Harder, more abrasive rock and heavier impact.'),
    'mn22':  dict(name='Mn 22', what='The highest-manganese type, for the toughest duty.', where='Severe impact and heavy sections.'),
    'crmo':  dict(name='Cr-Mo alloyed', what='Manganese steel with chromium and molybdenum additions.', where='Where liners spread or deform in service, and for abrasive feed.'),
    'mnxtra': dict(name='MNxtra', what='Our own manganese grade, custom-developed by our metallurgists.', where='High-wear zones where conventional manganese grades reach their limits.'),
}
GRADE_ORDER = ['mn14', 'mn18', 'mn22', 'crmo', 'mnxtra']
STANDARDS = 'ASTM A128, IS 276, EN 10349 or your specification'

FAMILIES = {
    'cone':   'Cone crushers',
    'jaw':    'Jaw crushers',
    'impact': 'Impact crushers and hammer mills',
    'other':  'Other wear parts',
}

PRODUCTS = [
    dict(slug='concaves-and-mantles', name='Concaves and mantles', fam='cone', img='concave-mantle',
         what='The two liners of a cone crusher: the mantle on the moving head, the concave fixed in the bowl around it.',
         where='Secondary and tertiary cone crushers.', grades=['mn18', 'mn22', 'mnxtra']),
    dict(slug='bowl-liners', name='Bowl liners', fam='cone', img='bowl-liner',
         what='The stationary liner seated in the bowl of a cone crusher.',
         where='Cone crushers, opposite the mantle.', grades=['mn18', 'mn22', 'mnxtra']),
    dict(slug='jaw-and-side-plates', name='Jaw and side plates', fam='jaw', img='jaw-plate',
         what='Fixed and swing jaw plates in your tooth profile, and the side or cheek plates that protect the frame.',
         where='Primary jaw crushers.', grades=['mn14', 'mn18', 'mnxtra']),
    dict(slug='blow-bars', name='Blow bars', fam='impact', img='blow-bars',
         what='The bars on the rotor of a horizontal shaft impactor that strike the feed.',
         where='Impact crushers where heavy impact keeps manganese hardening.', grades=['mn14', 'mn18', 'crmo']),
    dict(slug='hammers', name='Hammers', fam='impact', img='hammers',
         what='Swing hammers for hammer crushers and mills, cast to your drawing or sample.',
         where='Hammer crushers and hammer mills.', grades=['mn14', 'mn18', 'crmo']),
    dict(slug='wear-liners', name='Wear liners', fam='other', img='mill-liners',
         what='Liner plates for chutes, hoppers and mills.',
         where='Where impact keeps manganese working.', grades=['mn14', 'crmo']),
    dict(slug='rollers-and-rings', name='Rollers and rings', fam='other', img=None,
         what='Rollers and rings cast and machined to your drawing.',
         where='Crushing and handling equipment, to drawing.', grades=['mn14', 'mn18', 'crmo']),
]
BY_SLUG = {p['slug']: p for p in PRODUCTS}
