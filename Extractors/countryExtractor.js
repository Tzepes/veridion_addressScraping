function findCountry(text, countries) {
    const countryRegex = new RegExp('\\b(' + countries.join('|') + ')\\b', 'i');
    const countryMatch = text.match(countryRegex);
    return countryMatch ? countryMatch[0] : null;
}

module.exports = findCountry;