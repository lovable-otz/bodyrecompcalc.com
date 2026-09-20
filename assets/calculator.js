/* calculator.js: bodyrecompcalc.com
 * Tools: "macros" (calories + protein/fat/carbs for maintain / recomp / cut / lean bulk) and "protein".
 *
 * METHOD: Mifflin-St Jeor resting energy (men 10W + 6.25H - 5A + 5; women ... - 161), x activity factor.
 *   Mifflin MD, St Jeor ST, et al. Am J Clin Nutr 1990;51(2):241-247. https://doi.org/10.1093/ajcn/51.2.241
 *   Goal adjustments (-10% recomp, -20% cut, +10% lean bulk) and the 25% fat share are STARTING-POINT
 *   CONVENTIONS, not clinical figures; the pages say so.
 *   Protein 1.6-2.2 g/kg: Morton RW et al., Br J Sports Med 2018;52(6):376-384, break-point in
 *   training-induced fat-free mass gains at 1.62 g/kg/d (95% CI 1.03-2.20).
 *   https://pmc.ncbi.nlm.nih.gov/articles/PMC5867436/   (cited on both tool pages; checked 2026-09-19)
 *   Cross-check: ISSN position stand on protein and exercise, Jager et al. 2017, 1.4-2.0 g/kg/d.
 *   https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/
 * YMYL: not for people who are pregnant, under 18, or managing a medical condition - said above each tool.
 */
(function (root, factory) {
  const C = factory();
  if (typeof module === 'object' && module.exports) module.exports = C; else root.CALCS = C;
})(typeof self !== 'undefined' ? self : this, function () {
  const ACTIVITY = [['1.2', 'Mostly sitting, little exercise'], ['1.375', 'Light exercise 1–3 days/week'], ['1.55', 'Moderate exercise 3–5 days/week'], ['1.725', 'Hard exercise 6–7 days/week'], ['1.9', 'Very hard training or physical job']];
  const GOALS = { maintain: [0, 'Maintain'], recomp: [-0.10, 'Body recomposition'], cut: [-0.20, 'Fat loss (cut)'], bulk: [0.10, 'Lean bulk'] };
  const LB = 0.45359237, IN = 2.54;

  const body = v => {
    const kg = v.units === 'imperial' ? (v.weight || 0) * LB : (v.weight || 0);
    const cm = v.units === 'imperial' ? ((v.feet || 0) * 12 + (v.inches || 0)) * IN : (v.height || 0);
    return { kg, cm };
  };
  const bmr = (sex, kg, cm, age) => 10 * kg + 6.25 * cm - 5 * age + (sex === 'female' ? -161 : 5);

  const shared = [
    { id: 'units', label: 'Units', type: 'radio', default: 'metric', options: [{ value: 'metric', label: 'kg / cm' }, { value: 'imperial', label: 'lb / ft-in' }] },
    { id: 'sex', label: 'Sex (used by the formula)', type: 'radio', default: 'male', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }] },
    { id: 'age', label: 'Age', type: 'number', default: 30, min: 18, max: 90 },
    { id: 'weight', label: 'Weight', type: 'number', default: 80, min: 30, suffix: '' },
    { id: 'height', label: 'Height (cm)', type: 'number', default: 180, min: 120, max: 230, showIf: s => s.units !== 'imperial' },
    { id: 'feet', label: 'Height (feet)', type: 'number', default: 5, min: 4, max: 7, showIf: s => s.units === 'imperial' },
    { id: 'inches', label: 'Height (inches)', type: 'number', default: 11, min: 0, max: 11, showIf: s => s.units === 'imperial' },
    { id: 'activity', label: 'Activity level', type: 'select', default: '1.55', options: ACTIVITY.map(([v, l]) => ({ value: v, label: l })) },
  ];

  const macros = {
    title: 'Body recomposition macro calculator',
    inputs: [
      ...shared,
      { id: 'goal', label: 'Goal', type: 'select', default: 'recomp', options: Object.entries(GOALS).map(([k, g]) => ({ value: k, label: g[1] })) },
      { id: 'protein', label: 'Protein', type: 'select', default: '2.0', options: ['1.6', '1.8', '2.0', '2.2'].map(g => ({ value: g, label: `${g} g per kg body weight` })) },
      { id: 'fatPct', label: 'Fat share of calories', type: 'number', suffix: '%', default: 25, min: 15, max: 45 },
    ],
    compute(v) {
      const { kg, cm } = body(v);
      const w = [];
      if (v.age < 18) w.push('This calculator is for adults.');
      const rest = bmr(v.sex, kg, cm, v.age || 0);
      const tdee = rest * Number(v.activity);
      const kcal = tdee * (1 + GOALS[v.goal][0]);
      const proteinG = kg * Number(v.protein);
      const fatG = kcal * (v.fatPct || 0) / 100 / 9;
      const carbsG = Math.max(0, (kcal - proteinG * 4 - fatG * 9) / 4);
      if (kcal - proteinG * 4 - fatG * 9 < 0) w.push('Protein and fat already exceed the calorie target; lower the fat share.');
      const R = Math.round;
      return {
        raw: { bmr: R(rest), tdee: R(tdee), kcal: R(kcal), protein: R(proteinG), fat: R(fatG), carbs: R(carbsG) },
        warnings: w,
        summary: [
          { label: 'Daily calories', value: `${R(kcal).toLocaleString()} kcal`, strong: true },
          { label: 'Protein', value: `${R(proteinG)} g` },
          { label: 'Fat', value: `${R(fatG)} g` },
          { label: 'Carbs', value: `${R(carbsG)} g` },
        ],
        rows: [
          { label: 'Resting energy (Mifflin-St Jeor)', value: `${R(rest)} kcal` },
          { label: 'Maintenance (× activity)', value: `${R(tdee)} kcal` },
          { label: `${GOALS[v.goal][1]} adjustment`, value: `${GOALS[v.goal][0] > 0 ? '+' : ''}${GOALS[v.goal][0] * 100}%` },
        ],
        notes: ['A starting estimate. Adjust after 2–3 weeks based on your weight and measurements. Not medical or dietary advice.'],
      };
    },
  };

  const protein = {
    title: 'Protein intake calculator',
    inputs: [
      { id: 'units', label: 'Units', type: 'radio', default: 'metric', options: [{ value: 'metric', label: 'kg' }, { value: 'imperial', label: 'lb' }] },
      { id: 'weight', label: 'Body weight', type: 'number', default: 80, min: 30 },
      { id: 'meals', label: 'Meals per day', type: 'number', default: 4, min: 1, max: 8 },
    ],
    compute(v) {
      const kg = v.units === 'imperial' ? (v.weight || 0) * LB : (v.weight || 0);
      const lo = Math.round(kg * 1.6), hi = Math.round(kg * 2.2);
      return {
        raw: { lo, hi, perMealLo: Math.round(lo / (v.meals || 1)), perMealHi: Math.round(hi / (v.meals || 1)) },
        summary: [
          { label: 'Daily protein range', value: `${lo}–${hi} g`, strong: true },
          { label: 'Per meal', value: `${Math.round(lo / (v.meals || 1))}–${Math.round(hi / (v.meals || 1))} g` },
        ],
        notes: ['1.6–2.2 g per kg is a range commonly used for people who strength train. Not medical advice.'],
      };
    },
  };

  return {
    macros, protein,
    __tests: [
      { calc: 'macros', name: 'male 30y 80kg 180cm moderate recomp',
        // BMR 800 + 1125 − 150 + 5 = 1780 · TDEE 2759 · kcal 2483.1 · protein 160 g · fat 620.775/9 = 69 g · carbs (2483.1 − 640 − 620.775)/4 = 305.6
        input: { units: 'metric', sex: 'male', age: 30, weight: 80, height: 180, activity: '1.55', goal: 'recomp', protein: '2.0', fatPct: 25 },
        expect: { bmr: 1780, tdee: 2759, kcal: 2483, protein: 160, fat: 69, carbs: 306 } },
      { calc: 'macros', name: 'female 40y 65kg 165cm light cut',
        // BMR 650 + 1031.25 − 200 − 161 = 1320.25 · × 1.375 = 1815.34 · × 0.8 = 1452.28
        input: { units: 'metric', sex: 'female', age: 40, weight: 65, height: 165, activity: '1.375', goal: 'cut', protein: '1.8', fatPct: 25 },
        expect: { bmr: 1320, tdee: 1815, kcal: 1452, protein: 117 } },
      { calc: 'macros', name: 'imperial 176 lb, 5 ft 11 in ≈ 79.8 kg / 180.3 cm',
        input: { units: 'imperial', sex: 'male', age: 30, weight: 176, feet: 5, inches: 11, activity: '1.2', goal: 'maintain', protein: '1.6', fatPct: 25 },
        // kg 79.832 · cm 180.34 · BMR 798.32 + 1127.13 − 150 + 5 = 1780.45 · × 1.2 = 2136.5
        expect: { bmr: 1780, tdee: 2137, protein: 128 } },
      { calc: 'protein', name: '80 kg → 128–176 g', input: { units: 'metric', weight: 80, meals: 4 }, expect: { lo: 128, hi: 176, perMealLo: 32, perMealHi: 44 } },
    ],
  };
});
