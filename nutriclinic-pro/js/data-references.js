/* ============================================================
   NutriClinic Pro — data-references.js
   Built-in clinical briefs (distilled from the clinic course
   reference set, cross-checked against standard guidance),
   evidence hierarchy and reputable external sources.
   ============================================================ */
'use strict';
(function () {

  const DISCLAIMER = 'Briefs summarize course reference material and standard clinical guidance for orientation within this tool. They are not a substitute for current guidelines or clinical judgment.';

  const REFS = [
    {
      id: 'intro-nutrition', title: 'Introduction to Clinical Nutrition & Energy Balance', titleAr: 'مقدمة في التغذية السريرية وتوازن الطاقة',
      src: 'Course lecture — Introduction (Dr. Omar)', tags: ['basics', 'energy'],
      summary: 'Core principles of clinical nutrition: energy sources (carbohydrate, fat, protein), the role of oxygen in fat oxidation, and realistic rates of weight change.',
      points: [
        'The three energy sources are carbohydrates, fats and protein; carbohydrate is the primary fast-energy source, with fats/protein shifting by availability and activity type.',
        'Fat cannot be oxidized without oxygen — activity type and fitness strongly influence fuel use.',
        'Reference rate of sustainable loss ≈ 2–4 kg per month (~1 kg/week), varying with genetics, activity and habits.',
        'Energy equivalent: approximately 7,700 kcal per 1 kg of fat mass — the basis of the platform’s rate estimates.',
        'Not every weight decrease equals fat loss (fluid/glycogen shifts matter), and not every effort yields proportional results.',
        'Clinical plans must be individualized — numbers are starting points for monitoring, not guarantees.'
      ]
    },
    {
      id: 'energy-bmr', title: 'BMR, RMR and TDEE — Energy Expenditure Foundations', titleAr: 'معدل الأيض الأساسي ومعدل الراحة وإجمالي الطاقة',
      src: 'Course lecture — Carbohydrates/BMR unit', tags: ['energy', 'calculation'],
      summary: 'Distinguishes basal metabolic rate (BMR), resting metabolic rate (RMR) and total daily energy expenditure (TDEE), with the activity-factor approach.',
      points: [
        'BMR = energy for essential functions at complete rest (circulation, respiration, brain, homeostasis).',
        'RMR is measured under less strict conditions and is typically slightly higher than BMR.',
        'TDEE = BMR (or RMR) × activity factor, plus the thermic effect of food in refined estimates.',
        'Activity factors commonly range 1.2 (sedentary) to 1.9 (extremely active).',
        'All equations are estimates (±10–15% typical); measured values (body-composition devices) take precedence when available.',
        'Reassess energy needs after meaningful weight change — the platform recalculates automatically.'
      ]
    },
    {
      id: 'protein', title: 'Protein — Functions, Requirements & Clinical Use', titleAr: 'البروتين — الوظائف والاحتياجات والاستخدام السريري',
      src: 'Course lecture — Protein', tags: ['macronutrient', 'protein'],
      summary: 'Protein functions across structure, contraction, transport, immunity and metabolism; requirements vary by goal and clinical state.',
      points: [
        'Functions: structural (muscle, collagen), contractile (actin/myosin), transport (hemoglobin, lipoproteins), storage (ferritin, casein), regulatory (enzymes, hormones), immune (antibodies).',
        'General adult requirement ≈ 0.8–1.0 g/kg; higher (1.2–2.0 g/kg) for weight loss (lean-mass preservation), rehabilitation, older adults and athletes.',
        'Distribute protein across meals (~20–40 g per meal) for optimal utilization.',
        'Chronic kidney disease requires individualized (often restricted) protein — nephrology coordination mandatory.',
        'High-protein intake should be paired with adequate fluid and fiber.',
        'Egyptian affordable sources: foul, lentils, eggs, quresh cheese, chicken, tilapia.'
      ]
    },
    {
      id: 'carbs', title: 'Carbohydrates — Classification and Clinical Role', titleAr: 'الكربوهيدرات — التصنيف والدور السريري',
      src: 'Course lecture — Carbohydrates/BMR unit', tags: ['macronutrient', 'glucose'],
      summary: 'Carbohydrate classification (simple vs complex, glycemic impact) and its practical role in diabetes, weight management and performance.',
      points: [
        'Digestion yields glucose — the primary fast fuel; excess is stored as glycogen (limited) then fat.',
        'Prefer complex carbohydrates with fiber (whole grains, legumes, vegetables) for glucose stability and satiety.',
        'Glycemic index/load helps rank foods for blood-glucose response — central to diabetes-oriented plans.',
        'Fiber target ≈ 25–30 g/day minimum (higher in DASH/heart patterns).',
        'Carbohydrate restriction protocols (low-carb, keto) should be clinician-supervised and individualized.',
        'For athletes, carbohydrate periodization around training optimizes performance (see Athletes brief).'
      ]
    },
    {
      id: 'lipids', title: 'Lipids & Cholesterol — Essential Roles and Limits', titleAr: 'الدهون والكوليسترول — الأدوار الأساسية والحدود',
      src: 'Course lecture — Lipids', tags: ['macronutrient', 'cardiac'],
      summary: 'Lipids: triglycerides, phospholipids and sterols — their roles, recommended intake ranges and cholesterol considerations.',
      points: [
        'Lipids are denser energy sources (9 kcal/g) and enable fat-soluble vitamin absorption.',
        'Functions include energy reserve, thermal insulation, organ protection, membrane integrity (phospholipids) and hormone synthesis (steroids).',
        'Recommended fat intake ≈ 20–35% of total calories; shift composition toward unsaturated fats (olive oil, nuts, fish).',
        'Saturated fat < 10% of energy (≈ < 7% in heart-healthy plans); avoid trans fats.',
        'Cholesterol is essential structurally (membranes, vitamin D, bile acids, steroid hormones) — dietary cholesterol matters most in hyper-responders.',
        'Omega-3 sources: fatty fish (mackerel, sardines, salmon), walnuts, algal oils.'
      ]
    },
    {
      id: 'vitamins', title: 'Vitamins — Function, Sources, Deficiency & Toxicity', titleAr: 'الفيتامينات — الوظائف والمصادر والنقص والسمية',
      src: 'Course lecture — Vitamins', tags: ['micronutrient'],
      summary: 'Fat-soluble (A, D, E, K) and water-soluble (B-complex, C) vitamins: functions, key sources, deficiency and toxicity patterns.',
      points: [
        'Vitamins act largely as coenzymes; they supply no energy but are essential for metabolism and antioxidant defense.',
        'Vitamin A: vision, immunity, epithelial integrity — sources: liver, eggs, dairy, carrots, sweet potato, spinach. Toxicity (including congenital defects in pregnancy with high doses) matters.',
        'Water-soluble vitamins require regular intake; fat-soluble vitamins accumulate — toxicity risk with over-supplementation.',
        'Common clinical concerns: vitamin D deficiency (test 25-OH-D), B12 (vegans, older adults, metformin users), folate in pregnancy.',
        'Supplement only documented deficiencies, at-risk groups, or fortified-food gaps — see Supplements brief.',
        'Food-first approach in Egypt: liver, eggs, leafy greens, carrots, citrus, legumes.'
      ]
    },
    {
      id: 'minerals', title: 'Minerals — Macro & Trace Elements in Practice', titleAr: 'المعادن — العناصر الكبرى والنزرة عمليًا',
      src: 'Course lecture — Minerals', tags: ['micronutrient'],
      summary: 'Major minerals (sodium, potassium, calcium, magnesium, phosphorus, chloride, sulfur) and trace elements (iron, zinc, iodine, selenium and others), with clinical notes.',
      points: [
        'Minerals ≈ 6% of body weight; calcium is the most abundant (~40% of mineral mass — bone/teeth structure).',
        'Sodium–potassium balance governs fluid and blood pressure — central to DASH/low-sodium plans.',
        'Iron: heme sources (liver, red meat) vs non-heme (legumes, spinach); pair with vitamin C, avoid with tea/coffee.',
        'Zinc and iron deficiencies impair immunity and cognition — key in children and pregnancy.',
        'Calcium + vitamin D for skeletal health; magnesium for neuromuscular function.',
        'Renal patients require potassium/phosphorus individualization (see Renal plan notes).'
      ]
    },
    {
      id: 'supplements', title: 'Dietary Supplements — Evidence-Based Use', titleAr: 'المكملات الغذائية — الاستخدام المبني على الأدلة',
      src: 'Course lecture — Supplement (sports)', tags: ['supplement', 'sports'],
      summary: 'When supplements are justified, key sports supplements with doses, and safety monitoring.',
      points: [
        'Supplement use should follow documented deficiency, at-risk status, or evidence of performance benefit — not routine use.',
        'Creatine monohydrate: 3–5 g/day (loading 4×5 g × 3–6 days optional); muscle and performance benefits; caution in renal disease.',
        'Sodium bicarbonate loading: 0.3 g/kg, 1–2 h before high-intensity efforts of 1–7 min — GI tolerance varies.',
        'Monitor: allergic reactions, GI upset, renal load, thermoregulation issues.',
        'Check interactions and contaminated-product risk; buy certified products.',
        'Food equivalents often suffice: milk/eggs for protein, legumes for iron, fish for omega-3.'
      ]
    },
    {
      id: 'obesity', title: 'Obesity — Identification and Management Principles', titleAr: 'السمنة — التشخيص ومبادئ العلاج',
      src: 'Course lecture — Obesity', tags: ['clinical', 'weight'],
      summary: 'Obesity as a chronic condition: BMI and waist-based identification, fat distribution, and structured management principles.',
      points: [
        'BMI classification: ≥30 = obesity (class I 30–34.9, II 35–39.9, III ≥40); waist and waist-to-hip ratio refine risk.',
        'Waist circumference predicts cardiometabolic risk more accurately than weight alone.',
        'Hyperplastic vs hypertrophic obesity (cells number vs size) shapes childhood vs adult patterns.',
        'Structured approach: energy deficit from TDEE (not BMR), protein preservation, fiber, activity, sleep and behavioral support.',
        'Monitor comorbidities: T2DM, hypertension, sleep apnea, osteoarthritis.',
        'Realistic goals: 5–10% body-weight loss yields major metabolic benefit; avoid crash approaches without supervision.'
      ]
    },
    {
      id: 'underweight', title: 'Underweight — Assessment and Refeeding Considerations', titleAr: 'نقص الوزن — التقييم واعتبارات الاستشفاء الغذائي',
      src: 'Course lecture — Underweight (part 1–2)', tags: ['clinical', 'weight'],
      summary: 'Underweight (BMI < 18.5) work-up, causes and cautious refeeding/energy-surplus planning, including the Egyptian context (~2.4% prevalence).',
      points: [
        'Rule out organic causes before prescribing weight gain: CBC, thyroid (TSH), glucose/HbA1c, kidney function, inflammatory markers, adrenals, urinalysis, stool studies.',
        'Assess dietary intake, appetite, mental health and eating-disorder risk — refeeding syndrome risk in severe cases.',
        'Energy surplus: start moderate (+250–500 kcal/day over TDEE), progression judged by weekly trend.',
        'Frequent small energy-dense meals; nutrient-dense additions (olive oil, tahini, nuts, dairy) in Egyptian diets.',
        'Protein ≈ 1.2–1.5 g/kg during rehabilitation; resistance exercise improves lean-mass gain.',
        'Monitor closely: rapid gain, edema, electrolyte shifts.'
      ]
    },
    {
      id: 'diabetes', title: 'Diabetes & Insulin Resistance — Nutrition Foundations', titleAr: 'السكري ومقاومة الأنسولين — أسس التغذية',
      src: 'Course lecture — Diabetes (insulin resistance)', tags: ['clinical', 'glucose'],
      summary: 'Insulin resistance pathophysiology, consequences and nutrition principles for type 2 diabetes and metabolic syndrome.',
      points: [
        'Insulin resistance precedes T2DM; compensatory hyperinsulinemia drives metabolic syndrome features.',
        'Nutrition priorities: consistent carbohydrate amounts, low-GI choices, fiber ≥30 g, adequate protein, controlled energy.',
        'Weight loss of 5–10% improves glycemia substantially; 3–6% fasting glucose reduction from lifestyle changes.',
        'Coordinate with medication: insulin and sulfonylureas raise hypoglycemia risk when intake is reduced or irregular (fasting!).',
        'Monitor HbA1c, fasting glucose, lipids and BP as an integrated cardiometabolic risk profile.',
        'Prefer whole foods over "diabetic products"; do not fear judicious fruit intake.'
      ]
    },
    {
      id: 'hypertension', title: 'Hypertension — Sodium, DASH and Lifestyle', titleAr: 'ارتفاع ضغط الدم — الصوديوم ونظام DASH ونمط الحياة',
      src: 'Course lecture — Hypertension', tags: ['clinical', 'cardiac'],
      summary: 'Blood-pressure categories, risk relationships and the central nutrition levers: sodium, potassium, weight, alcohol and DASH pattern.',
      points: [
        'Definition ≥140/90 mmHg (clinic); stages escalate from high-normal through stage 3.',
        'Dietary sodium target ≈ < 2,000 mg/day (ideally 1,500 mg in DASH trials); most Egyptian intake excess comes from bread, cheeses and processed meats.',
        'Potassium-rich foods (vegetables, legumes, fruits) lower BP in most patients (caution in CKD).',
        'The DASH pattern improves BP independent of weight change; weight loss adds further benefit.',
        'Limit caffeine excess and alcohol; encourage activity and sleep hygiene.',
        'Note masked sources: pickles, luncheon meats, bouillon, restaurant food.'
      ]
    },
    {
      id: 'gi-disorders', title: 'Lower GI Disorders — Clinical Nutrition Care', titleAr: 'اضطرابات الجهاز الهضمي السفلى — الرعاية الغذائية',
      src: 'Course lecture — Lower GI disorders', tags: ['clinical', 'gi'],
      summary: 'Nutrition care principles for constipation, diarrhea, gas/bloating, celiac disease, IBS and related lower-GI problems.',
      points: [
        'Goals: symptom relief, deficiency correction, managing the underlying condition, individualization.',
        'Constipation: fiber step-up (with fluid!), physical activity, bowel training; bulking agents (psyllium) judiciously; review opioids and other causes.',
        'Diarrhea/steatorrhea: treat cause; temporary low-residue if needed; replace fluids/electrolytes; monitor for fat-soluble vitamin loss in steatorrhea.',
        'Celiac disease: strict lifelong gluten-free diet — verify composite foods and contamination.',
        'IBS: individualize; consider low-FODMAP trial with structured reintroduction and dietitian supervision.',
        'Gas/bloating: identify culprits (legumes, carbonated drinks, sweeteners) and modify preparation methods.'
      ]
    },
    {
      id: 'if', title: 'Intermittent Fasting — Patterns and Cautions', titleAr: 'الصيام المتقطع — الأنماط والاحتياطات',
      src: 'Course lecture — Intermittent fasting', tags: ['pattern', 'weight'],
      summary: 'Fasting patterns (e.g., 16:8), metabolic effects (insulin, HGH, autophagy) and clinical cautions.',
      points: [
        'Fasting windows reduce intake opportunities — effective primarily via total energy reduction, with possible abdominal fat benefit.',
        'Metabolic shifts: improved insulin sensitivity, lower fasting insulin, increased HGH; autophagy proposed from cellular studies.',
        'Fit the window to medication timing and sleep; hydration during fasting is essential.',
        'Avoid/supervise carefully: pregnancy, underweight, eating-disorder history, type 1 diabetes, advanced CKD.',
        'Break the fast with balanced meals (protein + fiber + fats) rather than high-sugar foods.',
        'Monitor adherence and hypoglycemia risk with glucose-lowering medications.'
      ]
    },
    {
      id: 'keto-ref', title: 'Ketogenic Diet — Practical Framework', titleAr: 'النظام الكيتوني — إطار عملي',
      src: 'Course lecture — Ketogenic', tags: ['pattern', 'metabolic'],
      summary: 'Ketosis principles, macronutrient distribution (net carbs 20–30 g; protein 20–25%; fat 70–75%) and monitoring.',
      points: [
        'Goal: nutritional ketosis — fat-adaptation with very low carbohydrate intake.',
        'Protein moderate (20–25% of energy) — excess may push glucose/insulin and dampen ketosis.',
        'Fat 70–75% of energy from whole-food sources; avoid trans fats.',
        'Manage electrolyte shifts and "keto flu" (sodium, potassium, magnesium, fluids).',
        'Contraindications/cautions: pregnancy, eating disorders, kidney disease, gallstones, thyroid/autoimmune conditions without supervision.',
        'Monitor lipids, renal function and adherence; plan exit/transition strategy with the clinician.'
      ]
    },
    {
      id: 'lowcarb-ref', title: 'Low-Carbohydrate Diets — Evidence and Use', titleAr: 'الأنظمة قليلة الكربوهيدرات — الأدلة والاستخدام',
      src: 'Course lecture — Low carb', tags: ['pattern', 'weight'],
      summary: 'Low-carbohydrate principles for weight and glucose control, practical food selection and monitoring.',
      points: [
        'Reduce sugars/starches; prioritize protein, unsaturated fats, vegetables and fruit control.',
        'Weight-loss benefit is largely energy-intake driven, with appetite advantages for many patients.',
        'Carbohydrate reductions stabilize glucose profiles — useful in insulin resistance.',
        'Practical Egyptian low-carb swaps: reduce bread/rice portions, keep foul/lentils moderate, use vegetables and lean proteins freely.',
        'Monitor: fiber adequacy, micronutrients, lipids, bowel regularity, adherence.',
        'Pair with resistance activity to preserve lean mass during loss.'
      ]
    },
    {
      id: 'carbcycle', title: 'Carbohydrate Cycling', titleAr: 'تدوير الكربوهيدرات',
      src: 'Course lecture — Carb cycle', tags: ['pattern', 'sports'],
      summary: 'Alternating higher- and lower-carbohydrate days to break plateaus while supporting training.',
      points: [
        'Structure: low-carb days on rest days, moderate on cardio days, higher on strength days.',
        'Benefits claimed: fat loss with muscle preservation, plateau-breaking, hormonal balance support.',
        'Keep protein constant across days; adjust carbohydrate around training demand.',
        'Eliminate processed carbohydrates; do not drink calories.',
        'Best suited to physically active patients with clinician oversight.',
        'Monitor performance, sleep, hunger and glucose where relevant.'
      ]
    },
    {
      id: 'psmf', title: 'Protein-Sparing Modified Fast (PSMF) — High-Acuity Protocol', titleAr: 'الصيام المعدل الموفر للبروتين',
      src: 'Course lecture — PSMF', tags: ['pattern', 'supervision'],
      summary: 'Very-low-calorie protocol (<800 kcal) that must only run under strict medical supervision; two phases with structured refeeding.',
      points: [
        'Phase 1 (intensive): < 800 kcal/day; lean protein-based; strong medical supervision; up to ~6 months maximum.',
        'Protein 1.5–2 g/kg target body weight; carbohydrate 20–30 g; fat limited to that naturally present in protein foods.',
        'Phase 2 (refeeding): gradual carbohydrate reintroduction (≈45 g → 90 g over months) while calories normalize.',
        'Mandatory monitoring: electrolytes, uric acid, heart rhythm concerns, micronutrient support, constipation.',
        'Not for pregnancy, eating-disorder risk, significant comorbidity without specialist direction.',
        'This platform flags PSMF-level targets for clinician review, never auto-approves.'
      ]
    },
    {
      id: 'athletes', title: 'Sports Nutrition — Energy Systems and Requirements', titleAr: 'تغذية الرياضيين — أنظمة الطاقة والاحتياجات',
      src: 'Course lecture — Nutrition for athletes', tags: ['sports'],
      summary: 'Energy system demands (ATP-PC, glycolytic, oxidative), macronutrient timing and hydration for athletic performance.',
      points: [
        'ATP-PC system: 0–15 s efforts (sprints, throws); glycolytic: ~15 s–2 min (relay swim, boxing); oxidative: 2 min–hours (marathon).',
        'Carbohydrate availability is performance-critical for moderate–high intensity work; periodize around training.',
        'Protein 1.4–2.0 g/kg for adaptation; distribute across meals and post-exercise.',
        'Hydration: match losses (typically 500–1,000+ ml/h depending on conditions); sodium for heavy sweaters.',
        'Physical activity guidance: 30 min/day risk reduction; 60 min/day weight management; 90 min/day maintenance of major loss — progression individualized.',
        'Supplements only with evidence and anti-doping awareness.'
      ]
    },
    {
      id: 'kids', title: 'Child Nutrition — Growth and Development', titleAr: 'تغذية الأطفال — النمو والتطور',
      src: 'Course lecture — Kids nutrition', tags: ['pediatric'],
      summary: 'Children’s energy and nutrient needs through growth stages; BMI-for-age interpretation and family-based habits.',
      points: [
        'Nutrition drives physical growth, bone/muscle development, immunity, and academic performance.',
        'Iron, zinc, iodine, folate deficiencies impair cognition and immunity — screen when indicated.',
        'Use WHO/CDC BMI-for-age growth charts — never adult BMI categories for children.',
        'Energy needs rise with age and activity; boys typically > girls for the same age/activity.',
        'Structure: family meals, regular snacks, limiting sugary drinks, adequate dairy/calcium and vitamin D.',
        'Avoid restrictive dieting in children without specialist care.'
      ]
    },
    {
      id: 'hormones', title: 'Foods and Hormonal Balance — Clinical Overview', titleAr: 'الغذاء والتوازن الهرموني — نظرة سريرية',
      src: 'Course lecture — Food to balance hormones', tags: ['endocrine'],
      summary: 'How nutrition interacts with anabolic/catabolic hormones (insulin, GH, cortisol, thyroid, sex hormones) with practical food patterns.',
      points: [
        'Anabolic hormones (insulin, GH, testosterone, estrogen) build tissue; catabolic ones (cortisol, glucagon, adrenaline) mobilize energy — nutrition modulates both.',
        'Protein and resistance exercise support GH/testosterone environment; adequate energy intake is prerequisite (low energy availability impairs hormones).',
        'Thyroid function depends on iodine, selenium, iron and adequate energy.',
        'Blood-sugar stability reduces cortisol swings; minimize very-high-sugar, very-low-fiber meals.',
        'Sleep and stress management are endocrine interventions — combine with nutrition.',
        'No single "hormone-balancing food"; patterns (Mediterranean-style) and deficiencies correction matter most.'
      ]
    },
    {
      id: 'assess-lab', title: 'Physical Measurements & Biochemical Assessment', titleAr: 'القياسات البدنية والتقييم البيوكيميائي',
      src: 'Course lecture — Physical measurements 2–3', tags: ['assessment'],
      summary: 'Anthropometry (body types, measurements) and core laboratory panels: lipid profile, vitamin D, H. pylori, CBC, stool analysis — with interpretation principles.',
      points: [
        'Somatotypes: ectomorph, mesomorph, endomorph — framing only; individualize plans by measurements.',
        'Anthropometry: weight, height, BMI, waist, hip, WHR; waist best single obesity predictor.',
        'Lipid profile: total cholesterol, LDL, HDL, triglycerides — fasting status and lab ranges vary.',
        'Vitamin D (25-OH): deficiency common; interpret with calcium/PTH and sun exposure.',
        'H. pylori and stool analysis: investigate GI symptoms before nutritional escalation.',
        'CBC: anemia and infection screens feed directly into nutrition planning (iron, B12, folate).',
        'Laboratory flags orient — they never diagnose by themselves.'
      ]
    }
  ];

  const HIERARCHY = [
    'Patient-specific clinical information and clinician-defined restrictions',
    'Current authoritative clinical guidelines',
    'Validated food composition databases',
    'Clinician-uploaded reference materials',
    'Additional reliable scientific sources'
  ];

  const EXTERNAL = [
    { name: 'WHO — Healthy diet fact sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet', note: 'Global dietary guidance' },
    { name: 'USDA FoodData Central', url: 'https://fdc.nal.usda.gov/', note: 'Food composition database' },
    { name: 'NIH Office of Dietary Supplements', url: 'https://ods.od.nih.gov/', note: 'Vitamin/mineral fact sheets' },
    { name: 'ESPEN', url: 'https://www.espen.org/', note: 'Clinical nutrition guidelines' },
    { name: 'ASPEN', url: 'https://www.nutritioncare.org/', note: 'Clinical nutrition practice' },
    { name: 'American Heart Association', url: 'https://www.heart.org/', note: 'Cardiovascular nutrition' },
    { name: 'American Diabetes Association', url: 'https://diabetes.org/', note: 'Diabetes nutrition standards' },
    { name: 'Academy of Nutrition and Dietetics', url: 'https://www.eatright.org/', note: 'Evidence-based practice resources' },
    { name: 'PubMed (NIH)', url: 'https://pubmed.ncbi.nlm.nih.gov/', note: 'Peer-reviewed literature search' }
  ];

  CN.REFS = REFS;
  CN.KB_HIERARCHY = HIERARCHY;
  CN.KB_DISCLAIMER = DISCLAIMER;
  CN.EXTERNAL_SOURCES = EXTERNAL;

  console.log('NutriClinic data-references.js loaded — ' + REFS.length + ' briefs');
})();
