const { Language } = require('node-nlp');

const language = new Language();

function getLanguage(text) {
  const detectedLanguage = language.guess(text, 1);
  return detectedLanguage[0].language;
}

module.exports = { getLanguage };