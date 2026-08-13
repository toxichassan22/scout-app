/**
 * Builds geography questions dynamically from GeographyCountry records.
 * Shared between seed.js and runtime auto-generation in quizService.
 */

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makeOptions(correct, values) {
  const pool = [...new Set(values.filter(value => value && value !== correct))];
  const options = shuffle([correct, ...shuffle(pool).slice(0, 3)]);
  return { options, correctOption: options.indexOf(correct) };
}

function getBaseCurrency(currencyStr) {
  const str = String(currencyStr || '').trim();
  if (str.includes('جنيه')) return 'الجنيه';
  if (str.includes('ريال')) return 'الريال';
  if (str.includes('درهم')) return 'الدرهم';
  if (str.includes('دينار')) return 'الدينار';
  if (str.includes('ليرة')) return 'الليرة';
  if (str.includes('أوقية')) return 'الأوقية';
  if (str.includes('شلن')) return 'الشلن';
  if (str.includes('فرنك')) return 'الفرنك';
  return str.split(' ')[0] || str;
}

export function buildGeographyQuestions(countries) {
  const questions = [];
  const allCurrencies = ['الجنيه', 'الريال', 'الدرهم', 'الدينار', 'الليرة', 'الأوقية', 'الشلن', 'الفرنك'];

  // Capital questions
  const capitalValues = countries.map(c => c.capital);
  countries.forEach((country, index) => {
    const choice = makeOptions(country.capital, capitalValues);
    questions.push({ id: `geo_q_capital_${index + 1}`, text: `ما عاصمة ${country.name}؟`, options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: 'capital' });
  });

  // Currency questions (cleaned without country giveaway)
  countries.forEach((country, index) => {
    const correctCurrency = getBaseCurrency(country.currency);
    const choice = makeOptions(correctCurrency, allCurrencies);
    questions.push({ id: `geo_q_currency_${index + 1}`, text: `ما العملة الرسمية في دولة (${country.name})؟`, options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: 'currency' });
  });

  // Governance questions
  const governanceValues = countries.map(c => c.governance);
  countries.forEach((country, index) => {
    const choice = makeOptions(country.governance, governanceValues);
    questions.push({ id: `geo_q_governance_${index + 1}`, text: `ما نظام الحكم في ${country.name}؟`, options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: 'governance' });
  });

  // Flag questions
  const countryNames = countries.map(c => c.name);
  countries.forEach((country, index) => {
    const choice = makeOptions(country.name, countryNames);
    questions.push({ id: `geo_q_flag_${index + 1}`, text: 'هذا العلم يخص أي دولة؟', options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: 'flag', questionType: 'flag', mediaUrl: country.flag ? `emoji:${country.flag}` : null, mediaAlt: country.name });
  });

  // Map questions
  countries.forEach((country, index) => {
    const choice = makeOptions(country.name, countryNames);
    questions.push({ id: `geo_q_map_${index + 1}`, text: 'هذه خريطة أي دولة؟', options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: 'map', questionType: 'map', mediaUrl: country.mapUrl || null, mediaAlt: country.name });
  });

  // Reverse Capital questions
  countries.forEach((country, index) => {
    const choice = makeOptions(country.name, countryNames);
    questions.push({ id: `geo_q_capital_country_${index + 1}`, text: `أي دولة عاصمتها ${country.capital}؟`, options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: 'capital_country', mediaAlt: country.capital });
  });

  // Reverse Currency questions (filtered so distractors don't share the same base currency)
  countries.forEach((country, index) => {
    const targetCurrency = getBaseCurrency(country.currency);
    const validDistractors = countries.filter(c => getBaseCurrency(c.currency) !== targetCurrency).map(c => c.name);
    const choice = makeOptions(country.name, validDistractors);
    questions.push({ id: `geo_q_currency_country_${index + 1}`, text: `أي من الدول التالية تستخدم عملة (${targetCurrency})؟`, options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: 'currency_country', mediaAlt: targetCurrency });
  });

  // Reverse Governance questions
  countries.forEach((country, index) => {
    const choice = makeOptions(country.name, countryNames);
    questions.push({ id: `geo_q_governance_country_${index + 1}`, text: `أي دولة نظام حكمها ${country.governance}؟`, options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: 'governance_country', mediaAlt: country.governance });
  });

  return questions;
}
