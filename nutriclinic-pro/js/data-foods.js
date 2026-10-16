/* ============================================================
   NutriClinix Pro — data-foods.js
   Food composition database.
   Primary source: the clinic course exchange list (each reference
   portion designed at ≈100 kcal, Egyptian foods, household units),
   supplemented with USDA-standard values for additional staples.
   Energy is recomputed deterministically from macros (4/4/9).
   ============================================================ */
'use strict';
(function () {
  const SRC_COURSE = 'Course exchange list';
  const SRC_USDA = 'USDA FoodData Central';
  const SRC_STD = 'Standard composition tables';

  const FOODS = [];
  function F(id, en, ar, group, ptext, grams, p, c, f, tags, o) {
    o = o || {};
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    FOODS.push({
      id: 'f-' + id, en, ar, group, ptext, grams,
      p: +p.toFixed(1), c: +c.toFixed(1), f: +f.toFixed(1), kcal,
      fiber: o.fl !== undefined ? o.fl : null,
      sodium: o.sd !== undefined ? o.sd : null,
      sugar: o.su !== undefined ? o.su : null,
      gi: o.gi || null,
      micros: o.mic || null,
      tags: (tags || '').split('|').filter(Boolean),
      source: o.src || SRC_COURSE,
      custom: !!o.custom
    });
  }

  /* ---------- Proteins: eggs & dairy-based ---------- */
  F('egg', 'Egg (whole)', 'بيض', 'protein', '1 large egg or 2 small (65 g)', 65, 7.9, 0.4, 6.3, 'egg|egyptian|affordable|highProtein', { gi: 'low', mic: 'Choline, vitamin D, B12', hh: '1 egg' });
  F('eggwhite', 'Egg whites', 'بياض بيض', 'protein', '200 g', 200, 22, 0, 0.7, 'egg|highProtein|affordable', { sd: 330, src: SRC_USDA });
  F('chickenbreast', 'Chicken breast (grilled)', 'صدور دجاج مشوى', 'protein', '60 g small fillet', 60, 18.5, 0.5, 2.2, 'egyptian|affordable|highProtein', { fl: 0, sd: 45, gi: 'low', mic: 'B3, B6, selenium' });
  F('chickenleg', 'Chicken thigh (grilled)', 'وراك دجاج مشوى', 'protein', '90 g', 90, 18, 0, 4, 'egyptian|affordable|highProtein', { sd: 80, mic: 'Iron, zinc, B12' });
  F('beef', 'Beef (lean, cooked)', 'لحم بقرى', 'protein', '55 g', 55, 11, 0, 6.5, 'egyptian|highProtein', { sd: 35, mic: 'Heme iron, B12, zinc' });
  F('beefmince', 'Beef mince (cooked, lean)', 'لحم مفروم', 'protein', '55 g', 55, 12, 0, 6, 'egyptian|highProtein', { sd: 40 });
  F('kofta', 'Kofta (grilled)', 'كفتة مشوية', 'protein', '40 g', 40, 8.5, 2, 7.2, 'egyptian', { sd: 120 });
  F('liver-beef', 'Beef liver (cooked)', 'كبدة بقرى', 'protein', '80 g', 80, 15, 3, 3, 'egyptian|highProtein', { mic: 'Very high vitamin A, iron, B12 — limit in pregnancy', sd: 60 });
  F('liver-chicken', 'Chicken liver (cooked)', 'كبدة دجاج', 'protein', '85 g', 85, 15, 2, 1.5, 'egyptian|highProtein', { mic: 'Vitamin A, iron, folate', sd: 60 });
  F('rabbit', 'Rabbit meat (cooked)', 'لحم أرنب', 'protein', '80 g', 80, 16.5, 0, 5, 'egyptian|highProtein', { sd: 35 });
  F('duck', 'Duck meat (roasted)', 'لحم بط', 'protein', '30 g', 30, 4.6, 0, 9, 'egyptian', {});
  F('pigeon', 'Pigeon (roasted)', 'حمام', 'protein', '30 g', 30, 7, 0, 6, 'egyptian', {});
  F('pastirma', 'Pastirma (basturma)', 'بسطرمة', 'protein', '50 g', 50, 13, 4, 3, 'egyptian|highSodium', { sd: 620 });
  F('lunchchicken', 'Chicken luncheon meat', 'لانشون دجاج', 'protein', '70 g', 70, 12.5, 4, 4, 'egyptian|highSodium|processed', { sd: 560 });
  F('sausage', 'Beef sausage', 'سجق بقرى', 'protein', '35 g', 35, 6, 5, 6, 'egyptian|highSodium|processed', { sd: 380 });
  F('burger', 'Beef burger patty', 'برجر بقرى', 'protein', '40 g', 40, 7.2, 0.5, 8, 'egyptian|processed|highSodium', { sd: 300 });
  F('turkey', 'Turkey breast (roasted)', 'صدور تركى', 'protein', '60 g', 60, 17, 0, 1.6, 'highProtein', { sd: 40, src: SRC_USDA });
  F('tuna', 'Tuna (canned in water)', 'سمك تونة', 'protein', '50 g', 50, 13, 1, 6, 'seafood|egyptian|highProtein', { sd: 180, mic: 'Omega-3, selenium' });
  F('fillet', 'White fish fillet (boiled)', 'سمك فيلية مسلوق', 'protein', '90 g piece', 90, 17, 6, 2.5, 'seafood|egyptian|highProtein', { sd: 90, mic: 'Omega-3, iodine' });
  F('tilapia', 'Tilapia (grilled)', 'سمك بلطى', 'protein', '90 g', 90, 20, 1, 2.3, 'seafood|egyptian|highProtein|affordable', { sd: 60 });
  F('bouri', 'Bouri (mullet, grilled)', 'سمك بورى مشوى', 'protein', '80 g', 80, 17.2, 2, 5, 'seafood|egyptian|highProtein', { mic: 'Omega-3' });
  F('mackerel', 'Mackerel', 'سمك ماكريل', 'protein', '50 g', 50, 9, 0, 7, 'seafood|highProtein', { mic: 'Very high omega-3, vitamin D' });
  F('sardine', 'Sardines (grilled)', 'سردين مشوى', 'protein', '60 g', 60, 13.5, 0, 5.5, 'seafood|highProtein', { mic: 'Omega-3, calcium (with bones), vitamin D' });
  F('herring', 'Herring (smoked, ringa)', 'رنجة', 'protein', '50 g', 50, 10, 0, 7.5, 'seafood|egyptian|highSodium', { sd: 500, mic: 'Omega-3, vitamin D' });
  F('salmon', 'Salmon (grilled)', 'سلمون مشوى', 'protein', '60 g', 60, 13, 0, 7, 'seafood|highProtein', { mic: 'Omega-3, vitamin D', src: SRC_USDA });
  F('shrimp', 'Shrimp (grilled)', 'جمبرى مشوى', 'protein', '110 g', 110, 26, 0, 1.5, 'seafood|egyptian|highProtein', { sd: 200, mic: 'Iodine, selenium' });
  F('smoked-salmon', 'Smoked salmon', 'سلمون مدخن', 'protein', '40 g', 40, 8, 0, 5, 'seafood|highSodium', { sd: 450, src: SRC_USDA });

  /* ---------- Cheeses & dairy ---------- */
  F('cheese-quresh', 'Quresh cheese (cottage)', 'جبن قريش', 'dairy', '100 g', 100, 11, 2, 4, 'dairy|egyptian|affordable|highProtein', { sd: 300, mic: 'Calcium, casein protein' });
  F('cheese-kiri', 'Kiri cheese squares', 'جبن كيرى', 'dairy', '3 squares (≈51 g)', 51, 4.1, 2, 10, 'dairy|egyptian|processed', { sd: 400 });
  F('cheese-triangle', 'Triangle spreadable cheese', 'جبن مثلثات', 'dairy', '2 triangles (≈32 g)', 32, 4, 2, 7, 'dairy|egyptian|processed', { sd: 420 });
  F('cheese-roumy', 'Roumy cheese (aged)', 'جبن رومى', 'dairy', '1 slice (≈30 g)', 30, 9, 1, 7.5, 'dairy|egyptian|highSodium', { sd: 470, mic: 'Calcium' });
  F('cheese-roumy-smoked', 'Smoked roumy cheese', 'رومى مدخن', 'dairy', '60 g', 60, 11, 1, 5, 'dairy|egyptian|highSodium', { sd: 640 });
  F('cheese-feta', 'Feta cheese', 'جبن فيتا', 'dairy', '2 tbsp (≈30 g)', 30, 1.3, 2, 9, 'dairy|egyptian|highSodium', { sd: 330 });
  F('cheese-cheddar', 'Cheddar cheese', 'شيدر', 'dairy', '25 g', 25, 6.5, 0.5, 9, 'dairy|imported', { sd: 155, mic: 'Calcium' });
  F('cheese-mozzarella', 'Mozzarella', 'جبن موزريلا', 'dairy', '40 g', 40, 10, 0.5, 7, 'dairy', { sd: 250, mic: 'Calcium' });
  F('cheese-gouda', 'Gouda cheese', 'جبن جودة', 'dairy', '25 g', 25, 6.2, 0.6, 7, 'dairy', { sd: 200, src: SRC_USDA });
  F('cheese-white-eg', 'Egyptian white cheese (damietta)', 'جبنة بيضاء دمياطي', 'dairy', '40 g', 40, 7, 1.5, 6, 'dairy|egyptian|highSodium', { sd: 500 });
  F('areesh', 'Areesh cheese', 'جبن قريش بلدى / اريش', 'dairy', '100 g', 100, 9, 3, 5, 'dairy|egyptian', { sd: 320 });
  F('milk-buffalo', 'Buffalo milk', 'لبن جاموسى', 'dairy', '100 g', 100, 4.2, 5.4, 7, 'dairy|egyptian', { sd: 50, mic: 'Calcium, B12' });
  F('milk-cow', 'Cow milk (full fat)', 'لبن بقرى', 'dairy', '150 g', 150, 5, 7, 5.5, 'dairy|egyptian', { sd: 60, mic: 'Calcium, B12' });
  F('milk-skim', 'Skimmed milk', 'لبن منزوع الدسم', 'dairy', '240 g cup', 240, 8, 12, 0.4, 'dairy|highProtein', { sd: 105, mic: 'Calcium, B12, iodine', src: SRC_USDA });
  F('yogurt', 'Plain yogurt (small cups)', 'زبادى', 'dairy', '2 small cups (≈210 g)', 210, 6, 7, 3.4, 'dairy|egyptian|affordable', { sd: 90, mic: 'Calcium, probiotics, B12' });
  F('yogurt-straw', 'Strawberry yogurt drink', 'زبادى فراولة', 'dairy', '1 small bottle (≈180 g)', 180, 6, 27, 3, 'dairy|egyptian|sweetened', { sd: 90, su: 24 });
  F('labneh', 'Labneh', 'لبنة', 'dairy', '60 g', 60, 5, 4, 4, 'dairy|egyptian', { sd: 210 });
  F('ricepudding', 'Rice pudding (rice with milk)', 'أرز بلبن', 'dairy', '80 g', 80, 2.6, 18.4, 2, 'dairy|egyptian|sweetened', { su: 10 });

  /* ---------- Legumes ---------- */
  F('foul', 'Foul medames (cooked)', 'فول', 'legume', '120 g', 120, 5.6, 17.2, 0.7, 'egyptian|affordable|highFiber|lowGI', { fl: 6.4, sd: 200, gi: 'low', mic: 'Folate, iron, potassium' });
  F('foul-harati', 'Foul harati (seasoned)', 'فول حراتى', 'legume', '120 g', 120, 7, 16, 1, 'egyptian|affordable|highFiber', { fl: 6 });
  F('taameya', 'Taameya (Egyptian falafel)', 'طعمية', 'legume', '2 pieces (≈35 g)', 35, 4.5, 10, 5.5, 'egyptian|affordable|fried', { fl: 2.5 });
  F('hummus', 'Hummus (chickpeas, boiled)', 'حمص', 'legume', '70 g', 70, 6, 16.7, 1.5, 'egyptian|affordable|highFiber|lowGI', { fl: 5, gi: 'low', mic: 'Folate, iron' });
  F('hummus-spread', 'Hummus dip (tahini blend)', 'حمص بالطحينة', 'legume', '40 g', 40, 3, 6, 5, 'egyptian', { fl: 2 });
  F('lupin', 'Lupin beans (soaked)', 'ترمس منقوع', 'legume', '90 g', 90, 8.6, 10, 2.4, 'egyptian|affordable|highFiber', { fl: 4.5 });
  F('lentils', 'Lentils (cooked)', 'عدس مطهى', 'legume', '70 g', 70, 4, 13.5, 4, 'egyptian|affordable|highFiber|lowGI', { fl: 5.5, gi: 'low', mic: 'Iron, folate, potassium' });
  F('lentil-soup', 'Lentil soup', 'شوربة عدس', 'legume', '150 g', 150, 7.2, 13.2, 2, 'egyptian|affordable|highFiber', { fl: 5 });
  F('kidney-beans', 'Kidney beans (cooked)', 'فاصوليا حمراء مطهية', 'legume', '80 g', 80, 6, 16, 0.5, 'highFiber|lowGI', { fl: 5.5, gi: 'low', src: SRC_USDA });
  F('white-beans', 'White beans (cooked)', 'فاصوليا بيضاء مطهية', 'legume', '80 g', 80, 7.2, 19.3, 1.3, 'egyptian|affordable|highFiber', { fl: 5 });
  F('lobia', 'Black-eyed peas (cooked)', 'لوبيا مطهية', 'legume', '80 g', 80, 6.8, 13.1, 2.8, 'egyptian|highFiber', { fl: 4.5 });
  F('green-peas', 'Green peas (cooked)', 'بسلة خضراء مطهية', 'legume', '120 g', 120, 6, 16, 0.5, 'highFiber', { fl: 5, src: SRC_USDA });
  F('chickpeas-dry', 'Chickpeas (dry, cooked)', 'حمص مسلوق', 'legume', '70 g', 70, 6, 17, 1.5, 'affordable|highFiber', { fl: 5 });

  /* ---------- Grains, breads & starches ---------- */
  F('rice-white', 'Egyptian white rice (cooked)', 'أرز أبيض مصرى مسلوق', 'carb', '30 g dry ≈ ½ cup cooked', 30, 2.1, 23.6, 0.2, 'egyptian|affordable|glutenFree', { fl: 0.6, sd: 2, gi: 'high' });
  F('rice-brown', 'Brown rice (cooked)', 'أرز بنى مسلوق', 'carb', '30 g dry ≈ ⅓ cup cooked', 30, 2.4, 23, 0.9, 'highFiber|glutenFree|lowGI', { fl: 1.8, gi: 'med', src: SRC_USDA });
  F('pasta', 'Pasta (cooked / dry weight)', 'معكرونة', 'carb', '30 g dry', 30, 3.6, 22.7, 0.5, 'egyptian|affordable|glutenFree_tag:no', { fl: 1.5, gi: 'med' });
  F('pasta-sauce', 'Pasta with tomato sauce', 'معكرونة بالصلصة', 'carb', '60 g cooked', 60, 2, 24.4, 1, 'egyptian|affordable', { fl: 1.5 });
  F('wholewheat-pasta', 'Whole-wheat pasta (dry)', 'مكرونة قمح كامل', 'carb', '30 g dry', 30, 4, 22, 0.7, 'highFiber|lowGI', { fl: 3, src: SRC_USDA });
  F('bulgur', 'Bulgur (dry)', 'برغل', 'carb', '30 g dry', 30, 3.7, 21.4, 0.4, 'egyptian|affordable|highFiber|lowGI', { fl: 4, gi: 'low' });
  F('freekeh', 'Freekeh (dry)', 'فريك', 'carb', '30 g dry', 30, 3.7, 21.4, 0.4, 'egyptian|highFiber|lowGI', { fl: 4 });
  F('couscous', 'Couscous (dry)', 'كسكس', 'carb', '30 g dry', 30, 4, 23, 0.3, 'affordable', { fl: 1.5, src: SRC_USDA });
  F('quinoa', 'Quinoa (dry)', 'كينوا', 'carb', '25 g dry', 25, 3.5, 16, 1.5, 'highFiber|glutenFree|lowGI', { fl: 2, gi: 'low', mic: 'Complete protein, magnesium', src: SRC_USDA });
  F('oats', 'Oats', 'شوفان', 'carb', '30 g dry', 30, 4, 19, 2, 'highFiber|lowGI|affordable', { fl: 3, gi: 'low', mic: 'Beta-glucan fiber' });
  F('cornflakes', 'Corn flakes (plain)', 'كورن فليكس', 'carb', '25 g', 25, 1.5, 20.5, 0.5, 'processed|glutenFree', { fl: 0.8, gi: 'high', su: 3 });
  F('bread-baladi', 'Baladi bread', 'عيش بلدى', 'carb', '¼ loaf (≈30 g)', 30, 2.5, 16, 0.5, 'egyptian|affordable|glutenFree_tag:no', { fl: 2.1, sd: 130 });
  F('bread-sun', 'Sun bread (shami)', 'عيش سن', 'carb', '½ loaf (≈45 g)', 45, 4, 18.4, 1, 'egyptian|affordable|glutenFree_tag:no', { fl: 2.5, sd: 180 });
  F('toast-brown', 'Brown toast', 'توست أسمر', 'carb', '2 slices (≈50 g)', 50, 7, 22, 2, 'highFiber|glutenFree_tag:no', { fl: 3.2, sd: 240 });
  F('corn', 'Corn on the cob (grilled)', 'كوز ذرة مشوى', 'carb', '60 g', 60, 2, 20, 1, 'egyptian|affordable|glutenFree', { fl: 2 });
  F('potato', 'Potato (boiled)', 'بطاطس', 'carb', '140 g', 140, 2, 19.6, 0.5, 'egyptian|affordable|glutenFree', { fl: 2, gi: 'med', mic: 'Potassium, vitamin C' });
  F('sweet-potato', 'Sweet potato (baked)', 'بطاطا', 'carb', '100 g', 100, 1.8, 25.5, 0.3, 'egyptian|affordable|glutenFree|highFiber', { fl: 3, gi: 'med', mic: 'Vitamin A, potassium' });
  F('taro', 'Taro (cooked)', 'قلقاس', 'carb', '120 g', 120, 2.5, 20, 0.5, 'egyptian|glutenFree', { fl: 2.5, mic: 'Potassium' });
  F('popcorn', 'Popcorn (air-popped, no additions)', 'فشار بدون إضافات', 'carb', '20 g (≈3 cups)', 20, 1.8, 13.2, 3.3, 'highFiber|glutenFree', { fl: 2.6 });

  /* ---------- Vegetables ---------- */
  F('molokhia', 'Molokhia (cooked, no chicken)', 'ملوخية مطهية', 'veg', '110 g', 110, 4, 6, 6.5, 'egyptian|highFiber', { fl: 3, mic: 'Vitamin A, calcium, iron' });
  F('salad-bowl', 'Mixed green salad bowl', 'طبق سلطة', 'veg', '600 g bowl', 600, 4.5, 16, 1, 'egyptian|highFiber', { fl: 8 });
  F('spinach', 'Spinach (cooked)', 'سبانخ', 'veg', '450 g', 450, 11, 10, 1, 'highFiber|lowGI', { fl: 10, gi: 'low', mic: 'Iron, folate, vitamin K, magnesium' });
  F('zucchini', 'Zucchini (cooked)', 'كوسة', 'veg', '420 g', 420, 5.4, 18, 0.5, 'egyptian|affordable|lowGI', { fl: 6, gi: 'low', mic: 'Potassium' });
  F('eggplant', 'Eggplant (cooked)', 'باذنجان', 'veg', '350 g', 350, 6, 17, 1.5, 'egyptian|highFiber', { fl: 8.5 });
  F('okra', 'Okra (cooked)', 'بامية', 'veg', '220 g', 220, 4.5, 20, 1, 'egyptian|highFiber', { fl: 7 });
  F('broccoli', 'Broccoli (cooked)', 'بروكلي', 'veg', '270 g', 270, 10, 14.5, 1, 'highFiber|lowGI', { fl: 8, gi: 'low', mic: 'Vitamin C, K, folate' });
  F('cauliflower', 'Cauliflower (cooked)', 'قرنبيط مطهى', 'veg', '200 g', 200, 3.8, 11, 1.2, 'lowGI|highFiber', { fl: 5, gi: 'low', mic: 'Vitamin C' });
  F('greenbeans', 'Green beans (cooked)', 'فاصوليا خضراء مطهية', 'veg', '170 g', 170, 3, 11, 5, 'egyptian|highFiber', { fl: 5.5 });
  F('mushroom', 'Mushrooms (cooked)', 'مشروم', 'veg', '380 g', 380, 12, 13, 0.5, 'lowGI', { fl: 6, gi: 'low', mic: 'Selenium, B vitamins' });
  F('tomato', 'Tomato', 'طماطم', 'veg', '300 g', 300, 2.7, 12, 0.6, 'egyptian|affordable|lowGI', { fl: 3.6, gi: 'low', mic: 'Lycopene, vitamin C, potassium' });
  F('cucumber', 'Cucumber', 'خيار', 'veg', '400 g', 400, 2.6, 14, 0.4, 'egyptian|affordable|lowGI', { fl: 2, gi: 'low' });
  F('lettuce', 'Lettuce / romaine', 'خس', 'veg', '300 g', 300, 4, 9, 0.5, 'lowGI', { fl: 4, gi: 'low' });
  F('carrot', 'Carrots', 'جزر', 'veg', '290 g', 290, 4.5, 21, 0.5, 'egyptian|affordable|lowGI', { fl: 8, gi: 'low', mic: 'Beta-carotene (vitamin A)' });
  F('beet', 'Beetroot', 'بنجر', 'veg', '220 g', 220, 3.2, 21, 0.5, 'egyptian|highFiber', { fl: 6, mic: 'Folate, nitrates' });
  F('pepper', 'Bell peppers', 'فلفل ألوان', 'veg', '300 g', 300, 3, 18, 0.6, 'lowGI', { fl: 6, gi: 'low', mic: 'Vitamin C (very high)' });
  F('onion', 'Onion', 'بصل', 'veg', '200 g', 200, 2.2, 18, 0.2, 'egyptian|affordable', { fl: 3.4 });
  F('cabbage', 'Cabbage (cooked)', 'كرنب مطهى', 'veg', '300 g', 300, 3.8, 16, 0.5, 'highFiber', { fl: 6, mic: 'Vitamin C, K' });
  F('turnip', 'Turnip (cooked)', 'لفت مطهى', 'veg', '300 g', 300, 3, 17, 0.3, 'egyptian|affordable', { fl: 5 });
  F('radish', 'Radish', 'فجل', 'veg', '300 g', 300, 2, 10, 0.3, 'egyptian|affordable', { fl: 5 });
  F('watercress', 'Watercress', 'جرجير', 'veg', '200 g', 200, 4.6, 5.2, 0.2, 'egyptian|lowGI', { fl: 3, mic: 'Iron, calcium, vitamin K' });
  F('arugula', 'Arugula (rocket)', 'روكا / جرجير برى', 'veg', '200 g', 200, 5, 7, 1.3, 'lowGI', { fl: 3.2, mic: 'Calcium, nitrates' });
  F('artichoke', 'Artichoke (cooked)', 'خرشوف مطهى', 'veg', '150 g', 150, 4.8, 16, 0.3, 'highFiber|lowGI', { fl: 8, gi: 'low' });
  F('asparagus', 'Asparagus (cooked)', 'هليون', 'veg', '300 g', 300, 6.6, 12, 0.6, 'lowGI', { fl: 6, gi: 'low' });

  /* ---------- Fruits ---------- */
  F('banana', 'Banana (medium)', 'موز', 'fruit', '1 medium (≈120 g)', 120, 1, 25, 0.3, 'egyptian|affordable|glutenFree', { fl: 3, gi: 'med', mic: 'Potassium, B6' });
  F('orange', 'Orange', 'برتقال', 'fruit', '200 g', 200, 2, 24, 1, 'egyptian|affordable|glutenFree|lowGI', { fl: 4.5, gi: 'low', mic: 'Vitamin C, folate' });
  F('mandarin', 'Mandarin', 'يوسفى', 'fruit', '200 g', 200, 1.4, 21, 1, 'egyptian|affordable|lowGI', { fl: 3.6, gi: 'low', mic: 'Vitamin C' });
  F('apple', 'Apple', 'تفاح', 'fruit', '180 g', 180, 0.5, 24, 0.5, 'affordable|glutenFree|lowGI', { fl: 4.5, gi: 'low', mic: 'Pectin fiber, quercetin' });
  F('pear', 'Pear', 'كمثرى', 'fruit', '200 g', 200, 0.5, 27, 0.5, 'lowGI', { fl: 5.5, gi: 'low' });
  F('peach', 'Peach', 'خوخ', 'fruit', '200 g', 200, 1, 22, 0.5, 'egyptian|lowGI', { fl: 3, gi: 'low' });
  F('plum', 'Plum', 'برقوق', 'fruit', '200 g', 200, 1, 23, 0.5, 'egyptian|lowGI', { fl: 3, gi: 'low' });
  F('apricot', 'Apricots', 'مشمش', 'fruit', '200 g', 200, 2.8, 22, 0.8, 'egyptian|lowGI', { fl: 4, gi: 'low', mic: 'Beta-carotene, potassium' });
  F('persimmon', 'Persimmon (kaka)', 'كاكا', 'fruit', '120 g', 120, 1, 23, 0.5, 'egyptian|highFiber', { fl: 4 });
  F('fig', 'Figs (fresh)', 'تين', 'fruit', '150 g', 150, 1.5, 29, 0.5, 'egyptian|highFiber', { fl: 4.5, mic: 'Calcium, potassium' });
  F('prickly-pear', 'Prickly pear (teen shoky)', 'تين شوكى', 'fruit', '340 g', 340, 3.5, 15, 3.5, 'egyptian|highFiber', { fl: 12 });
  F('grapes', 'Grapes', 'عنب', 'fruit', '150 g', 150, 1, 27, 0.3, 'egyptian', { fl: 1.3, gi: 'med' });
  F('mango', 'Mango', 'مانجو', 'fruit', '150 g', 150, 1.2, 22.5, 0.6, 'egyptian|highFiber', { fl: 2.4, mic: 'Vitamin A, C' });
  F('guava', 'Guava', 'جوافة', 'fruit', '150 g', 150, 3.8, 21, 1.5, 'egyptian|highFiber', { fl: 8, mic: 'Vitamin C (very high), potassium' });
  F('strawberry', 'Strawberries', 'فراولة', 'fruit', '300 g', 300, 2.4, 20, 1, 'egyptian|lowGI', { fl: 6, gi: 'low', mic: 'Vitamin C' });
  F('watermelon', 'Watermelon', 'بطيخ', 'fruit', '400 g', 400, 1.6, 23.6, 0.5, 'egyptian|affordable', { fl: 1.6, gi: 'high', mic: 'Lycopene, potassium' });
  F('melon', 'Melon (cantaloupe)', 'كنتالوب', 'fruit', '250 g', 250, 2, 20, 0.5, 'egyptian', { fl: 2.2, gi: 'med', mic: 'Vitamin A, C' });
  F('pomegranate', 'Pomegranate', 'رمان', 'fruit', '150 g', 150, 1, 23, 1, 'egyptian|highFiber', { fl: 3, mic: 'Antioxidants' });
  F('dates', 'Dates (dried)', 'تمر / بلح', 'fruit', '30 g (≈2 dates)', 30, 0.6, 22.5, 0.1, 'egyptian|affordable|highFiber', { fl: 2.4, gi: 'high', mic: 'Potassium, magnesium' });
  F('raisins', 'Raisins', 'زبيب', 'fruit', '30 g', 30, 0.7, 23, 0.1, 'egyptian|highFiber', { fl: 1.3, gi: 'high' });
  F('fig-dried', 'Dried figs', 'تين مجفف', 'fruit', '40 g', 40, 1.3, 25, 0.4, 'egyptian|highFiber', { fl: 4, mic: 'Calcium, potassium' });

  /* ---------- Fats, nuts & seeds ---------- */
  F('olive-oil', 'Olive oil', 'زيت زيتون', 'fat', '2 tsp (≈10 g)', 10, 0, 0, 10, 'mediterranean|heart-healthy', { mic: 'MUFA, vitamin E, polyphenols' });
  F('butter', 'Butter', 'زبدة', 'fat', '15 g', 15, 0, 0, 12, 'dairy', { sd: 90, mic: 'Vitamin A, saturated fat — limit' });
  F('ghee', 'Ghee (samna)', 'سمنة', 'fat', '8 g', 8, 0, 0, 6.5, 'egyptian', { sd: 0 });
  F('tahini', 'Tahini (sesame paste)', 'طحينة', 'fat', '15 g', 15, 2.5, 3, 8, 'egyptian|sesame', { fl: 1.4, mic: 'Calcium, iron, copper' });
  F('peanut-butter', 'Peanut butter', 'زبدة فول سوداني', 'fat', '15 g (1 tbsp)', 15, 5, 2, 7, 'peanut|highProtein', { fl: 1.2 });
  F('almonds', 'Almonds', 'لوز', 'fat', '15 g', 15, 2.6, 2.5, 8.3, 'nuts|heart-healthy', { fl: 1.9, mic: 'Vitamin E, magnesium, calcium' });
  F('walnuts', 'Walnuts', 'عين جمل', 'fat', '15 g', 15, 2.3, 2, 9.8, 'nuts|heart-healthy', { fl: 1, mic: 'Omega-3 ALA' });
  F('pistachios', 'Pistachios', 'فستق', 'fat', '15 g', 15, 3, 4, 6.8, 'nuts', { fl: 1.5, mic: 'Potassium, B6' });
  F('cashews', 'Cashews', 'كاجو', 'fat', '15 g', 15, 2.5, 4.5, 6.5, 'nuts', { fl: 0.5, mic: 'Iron, magnesium' });
  F('mixed-nuts', 'Mixed nuts', 'مكسرات مشكلة', 'fat', '15 g', 15, 3, 3, 8.5, 'nuts', { fl: 1.5 });
  F('sunflower-seeds', 'Sunflower seeds', 'لب عباد الشمس', 'fat', '20 g', 20, 4, 3, 9, 'seeds', { fl: 1.7, mic: 'Vitamin E, selenium' });
  F('pumpkin-seeds', 'Pumpkin seeds (superb)', 'اللب السوبر', 'fat', '20 g', 20, 8, 4, 7, 'seeds|highProtein', { fl: 1.2, mic: 'Magnesium, zinc, iron' });
  F('peanuts', 'Peanuts (roasted)', 'سودانى', 'fat', '20 g', 20, 5.2, 3.7, 9, 'peanut|highProtein', { fl: 1.7 });
  F('sesame', 'Sesame seeds', 'سمسم', 'fat', '10 g', 10, 1.8, 2.4, 4.9, 'sesame', { fl: 1.2, mic: 'Calcium, iron, copper' });

  /* ---------- Snacks & sweets (limited) ---------- */
  F('dark-chocolate', 'Dark chocolate (70%)', 'شوكولاتة دارك', 'snack', '20 g', 20, 1, 13, 6, 'treat', { fl: 1.5, su: 6, mic: 'Polyphenols' });
  F('kitkat-dark', 'KitKat dark', 'كيتكات دارك', 'snack', '20 g', 20, 1, 12, 5, 'treat|processed', { su: 10 });
  F('biscuit-tuc', 'Tuc biscuits', 'بسكوت توك', 'snack', '5 biscuits (≈23 g)', 23, 1.5, 14, 5.5, 'processed', { sd: 180, su: 2 });
  F('chips-baked', 'Baked potato chips (small bag)', 'شيبسى فورنوا', 'snack', '1 small bag (≈30 g)', 30, 3, 29, 5, 'processed|highSodium', { sd: 320 });
  F('breadcrumb-sesame', 'Sesame breadcrumbs (buksomat)', 'بقسماط بالسمسم', 'snack', '25 g', 25, 2.9, 19.1, 0.7, 'sesame|glutenFree_tag:no', { sd: 150 });
  F('halawa', 'Halawa (tahini sweet) — limited', 'حلاوة طحينية', 'snack', '15 g', 15, 2, 8, 8, 'sesame|treat', { su: 6 });
  F('basbousa', 'Basbousa (semolina sweet) — limited', 'بسبوسة', 'snack', '30 g', 30, 1.5, 17, 7, 'egyptian|treat', { su: 9 });

  /* ---------- Beverages & basics ---------- */
  F('water', 'Water', 'ماء', 'beverage', '250 ml', 250, 0, 0, 0, '', { sd: 0 });
  F('tea', 'Tea (unsweetened)', 'شاى بدون سكر', 'beverage', '1 cup (≈229 ml)', 229, 0, 0.5, 0, 'egyptian', { sd: 5 });
  F('coffee', 'Coffee (unsweetened)', 'قهوة بدون سكر', 'beverage', '1 cup', 240, 0.3, 0, 0, '', { sd: 5 });
  F('karkadeh', 'Hibiscus infusion (unsweetened)', 'كركديه بدون سكر', 'beverage', '1 cup', 240, 0, 1, 0, 'egyptian', {});
  F('orange-juice', 'Orange juice (fresh, no sugar)', 'عصير برتقال', 'beverage', '200 ml', 200, 1.4, 20.8, 0.4, 'treat', { fl: 0.4, su: 17 });

  /* Recipe-style mixed dishes (per portion, computed standard) */
  (function () {
    const R = [
      ['koshary', 'Koshary (home recipe)', 'كشرى', 9, 55, 7, 250, 'egyptian|affordable'],
      ['molokhia-chicken', 'Molokhia with chicken', 'ملوخية بالفراخ', 24, 12, 10, 300, 'egyptian|highProtein'],
      ['mahshi', 'Mahshi (stuffed vegetables)', 'محشى', 4.5, 38, 7, 200, 'egyptian|highFiber'],
      ['fattah', 'Fattah (festive dish)', 'فتة', 18, 35, 14, 250, 'egyptian|treat']
    ];
    R.forEach(r => {
      const kcal = Math.round(r[3] * 4 + r[4] * 4 + r[5] * 9);
      FOODS.push({
        id: 'f-' + r[0], en: r[1], ar: r[2], group: 'mixed', ptext: r[6] + ' g portion', grams: r[6],
        p: r[3], c: r[4], f: r[5], kcal, fiber: null, sodium: null, sugar: null, gi: null,
        micros: 'Composite dish — nutrients approximate.', tags: r[7].split('|'), source: 'Standard composition tables (composite)', custom: false
      });
    });
  })();

  /* Fix a few tags: store gluten/dairy flags cleanly for filters */
  FOODS.forEach(f => {
    f.tags = f.tags.filter(t => t !== 'glutenFree_tag:no');
    if (/معكرونة$|معكرونة بالصلصة|برغل|فريك|عيش|توست|كسكس|بقسماط|كورن فليكس|بسكوت/.test(f.ar) && !f.tags.includes('gluten')) f.tags.push('gluten');
    if (f.group === 'dairy' && !f.tags.includes('dairy')) f.tags.push('dairy');
    if (f.id === 'f-pasta' || f.id === 'f-pasta-sauce' || f.id === 'f-wholewheat-pasta') f.tags.push('gluten');
  });

  CN.FOODS = FOODS;
  CN.foodById = function (id) { return FOODS.find(f => f.id === id) || null; };
  CN.FOOD_GROUPS = [
    { id: 'protein', en: 'Protein foods', ar: 'أطعمة البروتين' },
    { id: 'dairy', en: 'Dairy & cheese', ar: 'الألبان والأجبان' },
    { id: 'legume', en: 'Legumes', ar: 'البقوليات' },
    { id: 'carb', en: 'Grains & starches', ar: 'الحبوب والنشويات' },
    { id: 'veg', en: 'Vegetables', ar: 'الخضروات' },
    { id: 'fruit', en: 'Fruits', ar: 'الفواكه' },
    { id: 'fat', en: 'Fats, nuts & seeds', ar: 'الدهون والمكسرات' },
    { id: 'snack', en: 'Snacks & treats', ar: 'السناكس والحلويات' },
    { id: 'beverage', en: 'Beverages', ar: 'المشروبات' },
    { id: 'mixed', en: 'Composite dishes', ar: 'أطباق مركبة' }
  ];

  /* clinical tag helpers used across views */
  CN.FOOD_TAGS = [
    'egyptian', 'affordable', 'highProtein', 'highFiber', 'lowGI', 'keto', 'gluten', 'dairy', 'egg', 'nuts', 'peanut', 'sesame', 'seafood', 'processed', 'highSodium', 'sweetened', 'treat', 'fried'
  ];

  console.log('NutriClinic data-foods.js loaded — ' + FOODS.length + ' foods');
})();
