function getCountryFromURL(url) {
    const domainExtensionMap = {
        // European Countries
        'uk': 'United Kingdom',
        'de': 'Germany',
        'fr': 'France',
        'it': 'Italy',
        'es': 'Spain',
        'nl': 'Netherlands',
        'be': 'Belgium',
        'se': 'Sweden',
        'pl': 'Poland',
        'at': 'Austria',
        'ch': 'Switzerland',
        'no': 'Norway',
        'fi': 'Finland',
        'dk': 'Denmark',
        'pt': 'Portugal',
        'cz': 'Czech Republic',
        'hu': 'Hungary',
        'ro': 'Romania',
        'gr': 'Greece',
        'ie': 'Ireland',
        'sk': 'Slovakia',
        'bg': 'Bulgaria',
        'hr': 'Croatia',
        'lt': 'Lithuania',
        'si': 'Slovenia',
        'ee': 'Estonia',
        'lv': 'Latvia',
        'cy': 'Cyprus',
        'lu': 'Luxembourg',
        'mt': 'Malta',
        'al': 'Albania',
        'mk': 'North Macedonia',
        'rs': 'Serbia',
        'ba': 'Bosnia and Herzegovina',
        'me': 'Montenegro',
        'xk': 'Kosovo',

        // North American Countries
        'us': 'United States',
        'ca': 'Canada',
        'mx': 'Mexico',

        // South American Countries
        'br': 'Brazil',
        'ar': 'Argentina',
        'cl': 'Chile',
        'co': 'Colombia',
        'pe': 'Peru',
        've': 'Venezuela',
        'ec': 'Ecuador',
        'bo': 'Bolivia',
        'py': 'Paraguay',
        'uy': 'Uruguay',

        // Asian Countries
        'cn': 'China',
        'jp': 'Japan',
        'in': 'India',
        'id': 'Indonesia',
        'pk': 'Pakistan',
        'bd': 'Bangladesh',
        'vn': 'Vietnam',
        'ir': 'Iran',
        'th': 'Thailand',
        'ph': 'Philippines',
        'kr': 'South Korea',
        'my': 'Malaysia',
        'sa': 'Saudi Arabia',
        'tr': 'Turkey',
        'iq': 'Iraq',
        'kz': 'Kazakhstan',
        'ae': 'United Arab Emirates',

        // Australian Countries
        'au': 'Australia',
        'nz': 'New Zealand'
    };

    const domain = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/g)[0];
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];

    return domainExtensionMap[tld];
}

function findCountry(text, countries) {
    const countryRegex = new RegExp('\\b(' + countries.join('|') + ')\\b', 'i');
    const countryMatch = text.match(countryRegex);
    return countryMatch ? countryMatch[0] : null;
}

module.exports = {findCountry, getCountryFromURL};