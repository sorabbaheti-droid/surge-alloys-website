"""Surge Alloys catalogue: grades and products. Facts only from SB, the Wix site and the group profile deck."""

GRADES = {
    'mn14':  dict(name='Mn 14', what='Standard austenitic manganese steel, about 12 to 14% Mn.', where='General crushing: jaws, cones and impact parts in most rock.'),
    'mn18':  dict(name='Mn 18', what='Higher manganese for faster, deeper work hardening.', where='Harder, more abrasive rock and heavier impact.'),
    'mn22':  dict(name='Mn 22', what='The highest manganese type, for the toughest duty.', where='Severe impact and heavy sections.'),
    'mnxtra': dict(name='MNxtra', what='Our own manganese grade, custom developed by our metallurgists.', where='High wear zones where conventional manganese grades reach their limits.'),
}
GRADE_ORDER = ['mn14', 'mn18', 'mn22', 'mnxtra']
STANDARDS = 'ASTM A128, IS 276, EN 10349 or your specification'

FAMILIES = {
    'cone':   'Cone crushers',
    'jaw':    'Jaw crushers',
    'impact': 'Impact crushers',
    'roll':   'Roll crushers',
}

PRODUCTS = [
    dict(slug='concaves-and-mantles', name='Concaves and mantles', fam='cone', img='concave-mantle',
         what='The two liners of a cone crusher: the mantle on the moving head, the concave fixed in the bowl around it.',
         where='Secondary and tertiary cone crushers.', grades=['mn18', 'mn22', 'mnxtra']),
    dict(slug='bowl-liners', name='Bowl liners', fam='cone', img='bowl-liner',
         what='The stationary liner seated in the bowl of a cone crusher.',
         where='Cone crushers, opposite the mantle.', grades=['mn18', 'mn22', 'mnxtra']),
    dict(slug='jaw-plates', name='Jaw plates', fam='jaw', img='jaw-plate',
         what='Fixed and swing jaw plates in your tooth profile.',
         where='Primary jaw crushers.', grades=['mn14', 'mn18', 'mnxtra']),
    dict(slug='side-plates', name='Side and cheek plates', fam='jaw', img='side-plates',
         what='The plates either side of the jaws that protect the crusher frame.',
         where='Jaw crushers.', grades=['mn14', 'mn18']),
    dict(slug='jaw-wedges', name='Jaw wedges', fam='jaw', img='jaw-wedges',
         what='The wedges that clamp the jaw plates in place.',
         where='Jaw crushers.', grades=['mn14', 'mn18']),
    dict(slug='blow-bars', name='Blow bars', fam='impact', img='blow-bars',
         what='The bars on the rotor of a horizontal shaft impactor that strike the feed.',
         where='Impact crushers where heavy impact keeps manganese hardening.', grades=['mn14', 'mn18']),
    dict(slug='impact-plates', name='Impact plates', fam='impact', img='impact-plates',
         what='The breaker plates and aprons the feed is thrown against inside an impact crusher.',
         where='Horizontal shaft impact crushers.', grades=['mn14', 'mn18']),
    dict(slug='roll-crusher-shells', name='Roll crusher shells', fam='roll', img='roll-crusher-shells',
         what='The replaceable shells on the rolls of a roll crusher.',
         where='Single and double roll crushers.', grades=['mn14', 'mn18']),
]
BY_SLUG = {p['slug']: p for p in PRODUCTS}
