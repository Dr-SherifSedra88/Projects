/* ============================================================
   NutriClinic Pro — data-approaches.js
   20 therapeutic nutritional approaches, compatibility checks,
   meal-template skeletons and food-exclusion sets.
   ============================================================ */
'use strict';
(function () {

  /* Base meal template — shares of daily calories per meal.
     Slot.frac = share of that meal's calories. Units resolve to ≈100-kcal portions of the slot's groups. */
  const BASE_TEMPLATE = { meals: [
    { key: 'meal.breakfast', share: .25, slots: [
      { groups: ['protein', 'dairy'], frac: .30 },
      { groups: ['carb'], frac: .35 },
      { groups: ['fruit'], frac: .15 },
      { groups: ['fat'], frac: .20 }] },
    { key: 'meal.snack1', share: .075, slots: [ { groups: ['fruit', 'dairy'], frac: 1 } ] },
    { key: 'meal.lunch', share: .33, slots: [
      { groups: ['protein'], frac: .35 },
      { groups: ['carb'], frac: .28 },
      { groups: ['veg'], frac: .22 },
      { groups: ['fat'], frac: .15 }] },
    { key: 'meal.snack2', share: .075, slots: [ { groups: ['fat', 'dairy'], frac: 1 } ] },
    { key: 'meal.dinner', share: .27, slots: [
      { groups: ['protein', 'legume'], frac: .33 },
      { groups: ['veg'], frac: .36 },
      { groups: ['carb'], frac: .16 },
      { groups: ['fat'], frac: .15 }] }
  ] };

  function tpl(m) { const t = JSON.parse(JSON.stringify(BASE_TEMPLATE)); t.meals = m; return t; }

  const KETO_TPL = tpl([
    { key: 'meal.breakfast', share: .28, slots: [ { groups: ['protein'], frac: .32 }, { groups: ['fat'], frac: .38 }, { groups: ['veg'], frac: .18 }, { groups: ['dairy'], frac: .12 } ] },
    { key: 'meal.lunch', share: .36, slots: [ { groups: ['protein'], frac: .38 }, { groups: ['veg'], frac: .42 }, { groups: ['fat'], frac: .20 } ] },
    { key: 'meal.snack1', share: .10, slots: [ { groups: ['fat'], frac: .6 }, { groups: ['dairy'], frac: .4 } ] },
    { key: 'meal.dinner', share: .26, slots: [ { groups: ['protein'], frac: .40 }, { groups: ['veg'], frac: .30 }, { groups: ['fat'], frac: .30 } ] }
  ]);

  const LOWCARB_TPL = tpl([
    { key: 'meal.breakfast', share: .26, slots: [ { groups: ['protein'], frac: .40 }, { groups: ['dairy'], frac: .15 }, { groups: ['carb'], frac: .12 }, { groups: ['fat'], frac: .33 } ] },
    { key: 'meal.lunch', share: .34, slots: [ { groups: ['protein'], frac: .38 }, { groups: ['veg'], frac: .32 }, { groups: ['carb'], frac: .12 }, { groups: ['fat'], frac: .18 } ] },
    { key: 'meal.snack1', share: .10, slots: [ { groups: ['fruit', 'dairy'], frac: .5 }, { groups: ['fat'], frac: .5 } ] },
    { key: 'meal.dinner', share: .30, slots: [ { groups: ['protein'], frac: .40 }, { groups: ['veg'], frac: .40 }, { groups: ['fat'], frac: .20 } ] }
  ]);

  const LOWFAT_TPL = tpl([
    { key: 'meal.breakfast', share: .25, slots: [ { groups: ['dairy'], frac: .30 }, { groups: ['carb'], frac: .45 }, { groups: ['fruit'], frac: .25 } ] },
    { key: 'meal.snack1', share: .08, slots: [ { groups: ['fruit'], frac: 1 } ] },
    { key: 'meal.lunch', share: .33, slots: [ { groups: ['protein'], frac: .42 }, { groups: ['carb'], frac: .33 }, { groups: ['veg'], frac: .25 } ] },
    { key: 'meal.snack2', share: .08, slots: [ { groups: ['dairy', 'fruit'], frac: 1 } ] },
    { key: 'meal.dinner', share: .26, slots: [ { groups: ['protein'], frac: .38 }, { groups: ['veg'], frac: .40 }, { groups: ['carb'], frac: .22 } ] }
  ]);

  /* Food id exclusion sets used by specific approaches / clinical filters */
  const IDS = {
    meatPoultry: ['f-chickenbreast','f-chickenleg','f-beef','f-beefmince','f-kofta','f-liver-beef','f-liver-chicken','f-rabbit','f-duck','f-pigeon','f-pastirma','f-lunchchicken','f-sausage','f-burger','f-turkey'],
    seafood: ['f-tuna','f-fillet','f-tilapia','f-bouri','f-mackerel','f-sardine','f-herring','f-salmon','f-shrimp','f-smoked-salmon'],
    allAnimal: ['f-chickenbreast','f-chickenleg','f-beef','f-beefmince','f-kofta','f-liver-beef','f-liver-chicken','f-rabbit','f-duck','f-pigeon','f-pastirma','f-lunchchicken','f-sausage','f-burger','f-turkey','f-tuna','f-fillet','f-tilapia','f-bouri','f-mackerel','f-sardine','f-herring','f-salmon','f-shrimp','f-smoked-salmon','f-egg','f-eggwhite','f-milk-buffalo','f-milk-cow','f-milk-skim','f-yogurt','f-yogurt-straw','f-labneh','f-ricepudding','f-cheese-quresh','f-cheese-kiri','f-cheese-triangle','f-cheese-roumy','f-cheese-roumy-smoked','f-cheese-feta','f-cheese-cheddar','f-cheese-mozzarella','f-cheese-gouda','f-cheese-white-eg','f-areesh','f-butter','f-ghee'],
    lactose: ['f-milk-buffalo','f-milk-cow','f-milk-skim','f-yogurt','f-yogurt-straw','f-labneh','f-ricepudding','f-cheese-kiri','f-cheese-triangle','f-cheese-mozzarella','f-cheese-white-eg','f-cheese-feta','f-areesh'],
    gluten: ['f-pasta','f-pasta-sauce','f-wholewheat-pasta','f-bulgur','f-freekeh','f-couscous','f-bread-baladi','f-bread-sun','f-toast-brown','f-breadcrumb-sesame','f-koshary','f-basbousa','f-fattah'],
    highSodium: ['f-pastirma','f-lunchchicken','f-sausage','f-burger','f-herring','f-smoked-salmon','f-cheese-roumy','f-cheese-roumy-smoked','f-cheese-feta','f-cheese-white-eg','f-cheese-kiri','f-cheese-triangle','f-chips-baked','f-tuna'],
    processed: ['f-pastirma','f-lunchchicken','f-sausage','f-burger','f-cheese-kiri','f-cheese-triangle','f-chips-baked','f-kitkat-dark','f-biscuit-tuc','f-cornflakes','f-yogurt-straw'],
    highGI: ['f-rice-white','f-dates','f-raisins','f-watermelon','f-cornflakes','f-potato','f-bread-baladi','f-bread-sun','f-pasta-sauce'],
    highPotassium: ['f-banana','f-orange','f-mandarin','f-dates','f-fig','f-fig-dried','f-guava','f-watermelon','f-melon','f-tomato','f-potato','f-sweet-potato','f-spinach','f-artichoke','f-pumpkin-seeds','f-almonds','f-lentils','f-white-beans','f-kidney-beans','f-molokhia'],
    highPhosphorus: ['f-cheese-cheddar','f-cheese-gouda','f-cheese-roumy','f-liver-beef','f-liver-chicken','f-sardine','f-mackerel','f-yogurt','f-milk-cow','f-milk-buffalo']
  };

  const APP = [
    {
      id: 'mediterranean', en: 'Mediterranean Diet', ar: 'النظام المتوسطي', cat: 'balanced',
      desc: 'Olive oil, fish, legumes, vegetables and fruit as the foundation; limited red meat and processed foods.',
      descAr: 'زيت الزيتون والأسماك والبقوليات والخضروات والفواكه كأساس، مع تقليل اللحوم الحمراء والأطعمة المصنعة.',
      macro: { p: 18, c: 50, f: 32 }, template: 'base',
      favorTags: ['egyptian', 'affordable', 'highFiber'], excludeTags: [], excludeIds: [],
      sodiumLimit: 2300, fiberMin: 27,
      cautions: [], cites: 'Core principles consistent with WHO healthy-diet guidance and PREDIMED-type evidence.'
    },
    {
      id: 'dash', en: 'DASH Diet', ar: 'نظام DASH', cat: 'clinical',
      desc: 'Blood-pressure friendly pattern: vegetables, fruit, whole grains, low-fat dairy; sodium controlled.',
      descAr: 'نمط لخفض ضغط الدم: خضروات وفواكه وحبوب كاملة وألبان قليلة الدسم مع ضبط الصوديوم.',
      macro: { p: 18, c: 55, f: 27 }, template: 'base',
      favorTags: ['highFiber', 'lowGI'], excludeTags: [], excludeIds: IDS.processed.slice(),
      sodiumLimit: 1500, fiberMin: 30,
      cautions: [ { level: 'mid', text: 'Very low sodium targets require review in patients on diuretics or with adrenal/renal sodium-wasting conditions.' } ],
      cites: 'Pattern consistent with DASH trial evidence and AHA/ISH hypertension guidance.'
    },
    {
      id: 'lowcarb', en: 'Low-Carbohydrate Diet', ar: 'نظام قليل الكربوهيدرات', cat: 'macronutrient',
      desc: 'Reduced carbohydrate intake (typically 50–100 g/day) with higher protein and fat.',
      descAr: 'تقليل الكربوهيدرات (غالبًا 50–100 جم/يوم) مع زيادة البروتين والدهون.',
      macro: { p: 30, c: 25, f: 45 }, template: 'lowcarb',
      favorTags: ['highProtein', 'lowGI'], excludeTags: [], excludeIds: IDS.highGI.slice(),
      sodiumLimit: 2300, fiberMin: 20,
      cautions: [
        { level: 'mid', text: 'Pregnancy/lactation: avoid unsupervised restriction.' },
        { level: 'mid', text: 'High-intensity endurance athletes may need carbohydrate periodization.' },
        { level: 'mid', text: 'Diabetes on insulin/sulfonylureas: expect medication adjustment needs — physician coordination required.' } ],
      cites: 'Position consistent with current low-carbohydrate clinical literature (e.g., ADA nutrition consensus).'
    },
    {
      id: 'lowgi', en: 'Low-Glycemic-Index Diet', ar: 'نظام المؤشر الجلايسيمي المنخفض', cat: 'clinical',
      desc: 'Carbohydrates chosen for low glycemic impact to stabilize blood glucose.',
      descAr: 'اختيار كربوهيدرات ذات تأثير جلايسيمي منخفض لاستقرار سكر الدم.',
      macro: { p: 20, c: 50, f: 30 }, template: 'base',
      favorTags: ['lowGI', 'highFiber'], excludeTags: [], excludeIds: IDS.highGI.slice(),
      sodiumLimit: 2300, fiberMin: 30,
      cautions: [], cites: 'Consistent with diabetes nutrition guidance (low-GI pattern, fiber emphasis).'
    },
    {
      id: 'keto', en: 'Ketogenic Diet', ar: 'النظام الكيتوني', cat: 'macronutrient',
      desc: 'Very low carbohydrate (20–30 g net/day), moderate protein, high fat to induce nutritional ketosis.',
      descAr: 'كربوهيدرات منخفضة جدًا (20–30 جم صافي/يوم) وبروتين معتدل ودهون عالية لتحفيز الكيتوزية.',
      macro: { p: 25, c: 5, f: 70 }, template: 'keto', netCarbLimit: 30,
      favorTags: ['highProtein'], excludeTags: [], excludeIds: IDS.highGI.slice(),
      sodiumLimit: 2300, fiberMin: 15,
      cautions: [
        { level: 'high', text: 'Contraindicated in pregnancy/lactation and in eating-disorder history.' },
        { level: 'high', text: 'Requires medication review in diabetes (hypoglycemia risk) and close monitoring in kidney disease.' },
        { level: 'mid', text: 'Not compatible with high-intensity performance goals without periodization.' } ],
      cites: 'General principles consistent with ketogenic-diet clinical literature; requires medical supervision.'
    },
    {
      id: 'if', en: 'Intermittent Fasting (pattern)', ar: 'الصيام المتقطع (نمط)', cat: 'pattern',
      desc: 'Eating confined to a defined window (e.g., 16:8); meal composition follows the selected pattern.',
      descAr: 'تقييد الأكل داخل نافذة محددة (مثل 16:8)، مع تركيب وجبات حسب النظام المختار.',
      macro: { p: 25, c: 45, f: 30 }, template: 'base', isPattern: true,
      favorTags: [], excludeTags: [], excludeIds: [],
      sodiumLimit: 2300, fiberMin: 25,
      cautions: [
        { level: 'high', text: 'Avoid in pregnancy/lactation, underweight, eating-disorder history, type 1 diabetes.' },
        { level: 'mid', text: 'Adjust timing with medications (e.g., glucose-lowering, thyroid).' } ],
      cites: 'Pattern consistent with intermittent-fasting review literature; individualization essential.'
    },
    {
      id: 'glutenfree', en: 'Gluten-Free Diet', ar: 'نظام خالٍ من الجلوتين', cat: 'exclusion',
      desc: 'Excludes wheat, barley, rye and derivatives (gluten-related disorders).',
      descAr: 'استبعاد القمح والشعير والشوفان غير المأمون ومشتقاتها (لاضطرابات الجلوتين).',
      macro: { p: 19, c: 50, f: 31 }, template: 'base',
      favorTags: [], excludeTags: ['gluten'], excludeIds: IDS.gluten.slice(),
      sodiumLimit: 2300, fiberMin: 25,
      cautions: [ { level: 'mid', text: 'Ensure adequate fiber/iron/B-vitamins from naturally gluten-free grains and legumes.' } ],
      cites: 'Same evidence base as gluten-related disorder management (celiac disease diet).'
    },
    {
      id: 'dairyfree', en: 'Dairy-Free Diet', ar: 'نظام خالٍ من الألبان', cat: 'exclusion',
      desc: 'Excludes all dairy foods (allergy, intolerance or preference).',
      descAr: 'استبعاد كل منتجات الألبان (حساسية أو عدم تحمل أو تفضيل).',
      macro: { p: 20, c: 48, f: 32 }, template: 'base',
      favorTags: [], excludeTags: ['dairy'], excludeIds: IDS.allAnimal.filter(id => /milk|yogurt|cheese|labneh|butter|ghee|areesh|kiri|triangle|quresh|mozzarella|roumy|feta|cheddar|gouda|ricepudding/.test(id)),
      sodiumLimit: 2300, fiberMin: 25,
      cautions: [ { level: 'mid', text: 'Ensure calcium and vitamin D from fortified alternatives, legumes, sesame and leafy greens.' } ],
      cites: 'Standard allergy/intolerance management principles.'
    },
    {
      id: 'lactosefree', en: 'Lactose-Free Diet', ar: 'نظام خالٍ من اللاكتوز', cat: 'exclusion',
      desc: 'Excludes high-lactose foods but allows lactose-reduced/aged products as tolerated.',
      descAr: 'استبعاد الأطعمة عالية اللاكتوز مع السماح بمنتجات قليلة اللاكتوز أو المعتقة حسب التحمل.',
      macro: { p: 20, c: 48, f: 32 }, template: 'base',
      favorTags: [], excludeTags: [], excludeIds: IDS.lactose.slice(),
      sodiumLimit: 2300, fiberMin: 25,
      cautions: [ { level: 'mid', text: 'Aged cheeses and lactose-free milk usually tolerated — verify individually.' } ],
      cites: 'Standard lactose-intolerance management principles.'
    },
    {
      id: 'lowsodium', en: 'Low-Sodium Diet', ar: 'نظام قليل الصوديوم', cat: 'clinical',
      desc: 'Sodium-limited pattern (≈1.5–2 g/day) for hypertension, heart and kidney conditions.',
      descAr: 'تقييد الصوديوم (≈1.5–2 جم/يوم) لارتفاع الضغط وأمراض القلب والكلى.',
      macro: { p: 19, c: 52, f: 29 }, template: 'base',
      favorTags: ['lowGI'], excludeTags: [], excludeIds: IDS.highSodium.concat(IDS.processed).filter((v, i, a) => a.indexOf(v) === i),
      sodiumLimit: 1500, fiberMin: 28,
      cautions: [ { level: 'mid', text: 'Review in hyponatremia, adrenal insufficiency, heavy sweating occupations/athletes.' } ],
      cites: 'Consistent with WHO sodium guidance and hypertension management standards.'
    },
    {
      id: 'highprotein', en: 'High-Protein Diet', ar: 'نظام عالي البروتين', cat: 'macronutrient',
      desc: 'Protein emphasized (1.4–2.0 g/kg) with adequate energy — muscle preservation, satiety.',
      descAr: 'تركيز على البروتين (1.4–2.0 جم/كجم) مع طاقة كافية — للحفاظ على العضلات والشبع.',
      macro: { p: 35, c: 35, f: 30 }, template: 'base',
      favorTags: ['highProtein'], excludeTags: [], excludeIds: [],
      sodiumLimit: 2300, fiberMin: 25,
      cautions: [
        { level: 'high', text: 'Chronic kidney disease: protein target must follow nephrology guidance (may be contraindicated).' },
        { level: 'mid', text: 'Ensure fluid intake and monitor in hepatic disease.' } ],
      cites: 'Protein range consistent with sports-nutrition and obesity-management literature.'
    },
    {
      id: 'lowfat', en: 'Low-Fat Diet', ar: 'نظام قليل الدهون', cat: 'macronutrient',
      desc: 'Fat reduced (≈20–25% of energy), emphasizing lean protein and high-fiber carbohydrates.',
      descAr: 'تقليل الدهون (≈20–25% من الطاقة) مع بروتين قليل الدهن وكربوهيدرات غنية بالألياف.',
      macro: { p: 20, c: 57, f: 23 }, template: 'lowfat',
      favorTags: ['highFiber'], excludeTags: [], excludeIds: [],
      sodiumLimit: 2300, fiberMin: 28,
      cautions: [ { level: 'low', text: 'Monitor satiety and essential fatty acids (include nuts/seeds/olive oil in small amounts).' } ],
      cites: 'Consistent with traditional heart-healthy fat guidance.'
    },
    {
      id: 'caloriecontrol', en: 'Calorie-Controlled Diet', ar: 'نظام محدد السعرات', cat: 'pattern',
      desc: 'Balanced composition with strict adherence to the approved calorie target.',
      descAr: 'تركيب متوازن مع التزام دقيق بهدف السعرات المعتمد.',
      macro: { p: 25, c: 45, f: 30 }, template: 'base',
      favorTags: ['affordable'], excludeTags: [], excludeIds: [],
      sodiumLimit: 2300, fiberMin: 25, cautions: [], cites: 'General energy-balance principles.'
    },
    {
      id: 'vegetarian', en: 'Vegetarian Diet', ar: 'نظام نباتي (مع ألبان وبيض)', cat: 'exclusion',
      desc: 'Excludes meat, poultry and seafood; includes dairy and eggs.',
      descAr: 'استبعاد اللحوم والدواجن والأسماك مع السماح بالألبان والبيض.',
      macro: { p: 18, c: 50, f: 32 }, template: 'base',
      favorTags: ['highFiber', 'affordable'], excludeTags: [], excludeIds: IDS.meatPoultry.concat(IDS.seafood),
      sodiumLimit: 2300, fiberMin: 30,
      cautions: [ { level: 'mid', text: 'Monitor B12, iron, zinc, omega-3; combine plant proteins for amino acid adequacy.' } ],
      cites: 'Consistent with vegetarian nutrition position papers (ADA/AND).'
    },
    {
      id: 'vegan', en: 'Vegan Diet', ar: 'نظام نباتي صرف', cat: 'exclusion',
      desc: 'Excludes all animal-derived foods; requires B12 supplementation and careful planning.',
      descAr: 'استبعاد كل المنتجات الحيوانية مع ضرورة مكمل B12 وتخطيط دقيق.',
      macro: { p: 16, c: 55, f: 29 }, template: 'base',
      favorTags: ['highFiber', 'affordable'], excludeTags: [], excludeIds: IDS.allAnimal,
      sodiumLimit: 2300, fiberMin: 30,
      cautions: [
        { level: 'high', text: 'Vitamin B12 supplementation is mandatory.' },
        { level: 'mid', text: 'Monitor iron, zinc, calcium, iodine, omega-3 (algal) and protein adequacy.' } ],
      cites: 'Consistent with vegan nutrition position papers (ADA/AND).'
    },
    {
      id: 'renal', en: 'Renal-Specific Nutrition Plan', ar: 'خطة تغذية لأمراض الكلى', cat: 'clinical',
      desc: 'Controlled protein, sodium, potassium and phosphorus per nephrology guidance.',
      descAr: 'ضبط البروتين والصوديوم والبوتاسيوم والفوسفور وفق توجيهات أمراض الكلى.',
      macro: { p: 15, c: 55, f: 30 }, template: 'base',
      favorTags: [], excludeTags: [], excludeIds: IDS.highSodium.concat(IDS.processed).filter((v, i, a) => a.indexOf(v) === i),
      sodiumLimit: 2000, fiberMin: 25, renalFlags: true,
      cautions: [
        { level: 'high', text: 'Requires nephrology coordination; protein and mineral limits are stage-specific (non-dialysis vs dialysis).' },
        { level: 'mid', text: 'Potassium/phosphorus restrictions may apply — adjust with labs.' } ],
      cites: 'General principles consistent with KDOQI/ESPEN renal nutrition guidance — individualize by stage.'
    },
    {
      id: 'diabetes', en: 'Diabetes-Oriented Plan', ar: 'خطة موجهة للسكري', cat: 'clinical',
      desc: 'Consistent carbohydrate distribution, low GI choices, meal regularity.',
      descAr: 'توزيع ثابت للكربوهيدرات مع اختيارات منخفضة المؤشر الجلايسيمي وانتظام الوجبات.',
      macro: { p: 25, c: 40, f: 35 }, template: 'base',
      favorTags: ['lowGI', 'highFiber', 'highProtein'], excludeTags: [], excludeIds: IDS.highGI.slice(),
      sodiumLimit: 2300, fiberMin: 30,
      cautions: [
        { level: 'mid', text: 'Coordinate with glucose-lowering medications; monitor hypoglycemia risk.' },
        { level: 'mid', text: 'Individualize carbohydrate amount by glucose control (HbA1c, CGM data).' } ],
      cites: 'Consistent with ADA Standards of Care nutrition guidance.'
    },
    {
      id: 'heart', en: 'Heart-Healthy Diet', ar: 'نظام صحي للقلب', cat: 'clinical',
      desc: 'Saturated fat limited, fiber-rich, sodium-controlled cardioprotective pattern.',
      descAr: 'نمط واقٍ للقلب: دهون مشبعة محدودة وألياف مرتفعة وصوديوم مضبوط.',
      macro: { p: 20, c: 50, f: 30 }, template: 'base',
      favorTags: ['highFiber', 'lowGI'], excludeTags: [], excludeIds: IDS.processed.concat(['f-butter']),
      sodiumLimit: 2000, fiberMin: 30,
      cautions: [ { level: 'low', text: 'Omega-3 sources (fish, walnuts) encouraged; limit fried foods and trans fats.' } ],
      cites: 'Consistent with AHA/ESC cardiovascular nutrition guidance.'
    },
    {
      id: 'weightmgmt', en: 'Weight Management Diet', ar: 'نظام إدارة الوزن', cat: 'pattern',
      desc: 'Energy-deficit pattern with higher protein for lean-mass preservation and satiety.',
      descAr: 'نمط بعجز طاقة مع بروتين أعلى للحفاظ على الكتلة العضلية والشبع.',
      macro: { p: 30, c: 35, f: 35 }, template: 'base',
      favorTags: ['highProtein', 'highFiber', 'affordable'], excludeTags: [], excludeIds: [],
      sodiumLimit: 2300, fiberMin: 28, cautions: [], cites: 'Consistent with obesity-management nutrition literature.'
    },
    {
      id: 'custom', en: 'Custom Therapeutic Diet', ar: 'نظام علاجي مخصص', cat: 'custom',
      desc: 'Clinician-defined targets and rules; engine provides balanced structure only.',
      descAr: 'أهداف وقيود يحددها الطبيب؛ ويوفر المحرك هيكلًا متوازنًا فقط.',
      macro: { p: 25, c: 45, f: 30 }, template: 'base',
      favorTags: [], excludeTags: [], excludeIds: [],
      sodiumLimit: 2300, fiberMin: 25, cautions: [], cites: ''
    }
  ];

  /* ---------------- Compatibility ---------------- */
  const PAIRS = {
    'keto|lowfat': { level: 'avoid', en: 'Ketogenic and low-fat targets are contradictory.' },
    'keto|vegan': { level: 'caution', en: 'Very restrictive combination — requires careful protein/fat planning and B12 monitoring.' },
    'keto|vegetarian': { level: 'caution', en: 'Requires careful planning of protein and fat from non-meat sources.' },
    'keto|highprotein': { level: 'caution', en: 'Excess protein may reduce ketosis; keep protein moderate.' },
    'keto|diabetes': { level: 'caution', en: 'Possible with medical supervision — glucose-lowering medication adjustment likely.' },
    'keto|if': { level: 'caution', en: 'Combined fasting + ketosis magnifies risks; supervision mandatory.' },
    'if|diabetes': { level: 'caution', en: 'Hypoglycemia risk with glucose-lowering medication — coordinate timing.' },
    'renal|highprotein': { level: 'avoid', en: 'High protein conflicts with renal protein restriction.' },
    'renal|keto': { level: 'avoid', en: 'Ketogenic patterns are not appropriate in significant renal impairment without specialist direction.' },
    'renal|lowsodium': { level: 'ok', en: 'Compatible — renal plans typically lower sodium further as clinically directed.' },
    'dash|mediterranean': { level: 'ok', en: 'Highly compatible patterns.' },
    'dash|lowsodium': { level: 'ok', en: 'Compatible — strictest sodium limit applies (1,500 mg).' },
    'mediterranean|lowfat': { level: 'caution', en: 'Mediterranean pattern relies on olive oil; reduce rather than eliminate fats.' },
    'glutenfree|lowcarb': { level: 'ok', en: 'Compatible.' },
    'mediterranean|lowgi': { level: 'ok', en: 'Compatible.' },
    'dairyfree|highprotein': { level: 'ok', en: 'Compatible — use non-dairy protein sources.' },
    'diabetes|heart': { level: 'ok', en: 'Compatible.' },
    'vegan|glutenfree': { level: 'caution', en: 'Overlapping exclusions — plan fiber and micronutrients carefully.' },
    'vegetarian|vegan': { level: 'avoid', en: 'Vegan supersedes vegetarian; select one.' },
    'lactosefree|dairyfree': { level: 'avoid', en: 'Dairy-free supersedes lactose-free; select one.' },
    'weightmgmt|lowsodium': { level: 'ok', en: 'Compatible.' },
    'weightmgmt|highprotein': { level: 'ok', en: 'Commonly combined.' }
  };

  function compat(a, b) {
    if (a === b) return { level: 'ok', msg: '' };
    const k1 = a + '|' + b, k2 = b + '|' + a;
    const hit = PAIRS[k1] || PAIRS[k2];
    if (hit) return { level: hit.level, en: hit.en };
    const A = A0(a), B = A0(b);
    if (A && B && A.cat === 'exclusion' && B.cat === 'exclusion') {
      const conflicts = [['glutenfree', 'dash']];
      void conflicts;
    }
    return { level: 'ok', msg: '' };
  }
  function A0(id) { return APP.find(a => a.id === id) || null; }

  function checkCombo(ids) {
    const results = [];
    let worst = 'ok';
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const r = compat(ids[i], ids[j]);
      if (r.level !== 'ok') results.push({ pair: [ids[i], ids[j]], level: r.level, msg: r.en || r.msg });
      if (r.level === 'avoid') worst = 'avoid';
      else if (r.level === 'caution' && worst === 'ok') worst = 'caution';
    }
    return { worst, results };
  }

  CN.APPROACHES = APP;
  CN.approachById = id => APP.find(a => a.id === id) || null;
  CN.compat = compat;
  CN.checkCombo = checkCombo;
  CN.BASE_TEMPLATE = BASE_TEMPLATE;
  CN.approachTemplate = id => {
    const a = CN.approachById(id);
    if (!a) return BASE_TEMPLATE;
    if (a.template === 'keto') return KETO_TPL;
    if (a.template === 'lowcarb') return LOWCARB_TPL;
    if (a.template === 'lowfat') return LOWFAT_TPL;
    return BASE_TEMPLATE;
  };
  CN.EXCLUDE_IDSETS = IDS;

  /* Fasting windows */
  CN.FASTING_WINDOWS = {
    none: null,
    '16': { label: '16:8', start: 12 * 60, end: 20 * 60 },
    '14': { label: '14:10', start: 9 * 60, end: 19 * 60 },
    '18': { label: '18:6', start: 13 * 60, end: 19 * 60 }
  };

  console.log('NutriClinic data-approaches.js loaded — ' + APP.length + ' approaches');
})();
