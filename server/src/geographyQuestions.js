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

export function buildGeographyQuestions(countries) {
  const questions = [];
  const fields = [
    ['capital', country => `ما عاصمة ${country.name}؟`, country => country.capital],
    ['currency', country => `ما العملة المرتبطة بـ ${country.name}؟`, country => country.currency],
    ['governance', country => `ما نظام الحكم في ${country.name}؟`, country => country.governance],
  ];
  for (const [kind, prompt, answer] of fields) {
    const values = countries.map(answer);
    countries.forEach((country, index) => {
      const correct = answer(country);
      const choice = makeOptions(correct, values);
      questions.push({ id: `geo_q_${kind}_${index + 1}`, text: prompt(country), options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: kind });
    });
  }
  const flagValues = countries.map(country => country.name);
  countries.forEach((country, index) => {
    const choice = makeOptions(country.name, flagValues);
    questions.push({ id: `geo_q_flag_${index + 1}`, text: 'هذا العلم يخص أي دولة؟', options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: 'flag', questionType: 'flag', mediaUrl: country.flag ? `emoji:${country.flag}` : null, mediaAlt: country.name });
  });
  countries.forEach((country, index) => {
    const choice = makeOptions(country.name, flagValues);
    questions.push({ id: `geo_q_map_${index + 1}`, text: 'هذه خريطة أي دولة؟', options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: 'map', questionType: 'map', mediaUrl: country.mapUrl || null, mediaAlt: country.name });
  });
  const reverseFields = [
    ['capital_country', country => `أي دولة عاصمتها ${country.capital}؟`, country => country.name, country => country.capital],
    ['currency_country', country => `أي دولة تستخدم ${country.currency}؟`, country => country.name, country => country.currency],
    ['governance_country', country => `أي دولة نظام حكمها ${country.governance}؟`, country => country.name, country => country.governance],
  ];
  for (const [kind, prompt, answer, clue] of reverseFields) {
    const values = countries.map(answer);
    countries.forEach((country, index) => {
      const correct = answer(country);
      const choice = makeOptions(correct, values);
      questions.push({ id: `geo_q_${kind}_${index + 1}`, text: prompt(country), options: choice.options, correctOption: choice.correctOption, points: 1, sortOrder: questions.length + 1, category: kind, mediaAlt: String(clue(country)) });
    });
  }
  return questions;
}
