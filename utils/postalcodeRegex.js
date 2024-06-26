const postalCodeRegex = {
    Albania: /\b\d{4}\b/,
    Andorra: /^AD\d{3}$/,
    Armenia: /^(37)?\d{4}$/,
    Austria: /\b\d{4}\b/,
    Australia: /\b(?:(?:ACT|New South Wales|NSW|Northern Territory|NT|Queensland|QLD|South Australia|SA|Tasmania|TAS|Victoria|VIC|Western Australia|WA),\s+)?(\d{4})(?=\s*,?\s*(?:Australia|AU|$))\b/i,
    Azerbaijan: /^(AZ)*(\d{4})$/,
    Belarus: /^\d{6}$/,
    Belgium: /\b\d{4}\b/,
    'Bosnia and Herzegovina': /\b\d{5}\b/,
    Bulgaria: /\b\d{4}\b/,
    Croatia: /\b\d{5}\b/,
    Cyprus: /\b\d{4}\b/,
    'Czech Republic': /^\d{3} \d{2}$/,
    Denmark: /\b\d{4}\b/,
    Estonia: /\b\d{5}\b/,
    Finland: /\b\d{5}\b/,
    France: /\b\d{5}\b/,
    Georgia: /\b\d{4}\b/,
    Germany: /\b\d{5}\b/,
    Greece: /\b\d{5}\b/,
    Hungary: /\b\d{4}\b/,
    Iceland: /\b\d{4}\b/,
    Ireland: /^(?!.*(?:O))[A-Z]\d{2}$/,
    Italy: /\b\d{5}\b/,
    Kazakhstan: /^\d{6}$/,
    Kosovo: /\b\d{5}\b/,
    Latvia: /^(LV-)?\d{4}$/,
    Liechtenstein: /^(FL-)?(948[5-9]|949[0-7])$/,
    Lithuania: /\b\d{5}\b/,
    Luxembourg: /^(L-)?\d{4}$/,
    Malta: /^[A-Z]{3} \d{4}$/,
    Moldova: /\b\d{4}\b/,
    Monaco: /^980\d{2}$/,
    Montenegro: /\b\d{5}\b/,
    Netherlands: /^\d{4} ?[A-Z]{2}$/,
    'North Macedonia': /\b\d{4}\b/,
    Norway: /\b\d{4}\b/,
    Poland: /^\d{2}-\d{3}$/,
    Portugal: /^\d{4}-\d{3}$/,
    Romania: /\b\d{5,6}\b/,
    Russia: /^\d{6}$/,
    'San Marino': /^(4789\d)$/,
    Serbia: /\b\d{5}\b/,
    Slovakia: /^\d{3} \d{2}$/,
    Slovenia: /\b\d{4}\b/,
    Spain: /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/,
    Sweden: /^\d{3} ?\d{2}$/,
    Switzerland: /\b\d{4}\b/,
    Turkey: /\b\d{5}\b/,
    Ukraine: /\b\d{5}\b/,
    'United Kingdom': /\b([A-PR-UWYZa-pr-uwyz][A-HK-Ya-hk-y]?[0-9][0-9]?[ABEHMNPRVWXYa-behmnprvwxy]? ?[0-9][ABD-HJLN-UW-Zabd-hjln-uw-z]{2})\b/,
    'Vatican City': /^00120$/,
    'Antigua and Barbuda': /^(?:ANT)?[0-9]{4}$/,
    Bahamas: /^(?:BAH)?[0-9]{5}$/,
    Barbados: /^(?:BRB)?[0-9]{5}$/,
    Belize: /^(?:BLZ)?[0-9]{4}$/,
    Canada: /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/,
    'Costa Rica': /^\d{4,5}$/,
    Cuba: /\b\d{5}\b/,
    Dominica: /^(?:DMA)?[0-9]{4}$/,
    'Dominican Republic': /\b\d{5}\b/,
    'El Salvador': /\b\d{4}\b/,
    Grenada: /^(?:GRD)?[0-9]{4}$/,
    Guatemala: /\b\d{5}\b/,
    Haiti: /\b\d{4}\b/,
    Honduras: /\b\d{5}\b/,
    Jamaica: /^(?:JAM)?[0-9]{2}$/,
    Mexico: /\b\d{5}\b/,
    Nicaragua: /^\d{7}$/,
    Panama: /^\d{6}$/,
    'Saint Kitts and Nevis': /^(?:KN)?[0-9]{4}$/,
    'Saint Lucia': /^(?:LCA)?[0-9]{4}$/,
    'Saint Vincent and the Grenadines': /^(?:VCT)?[0-9]{4}$/,
    'Trinidad and Tobago': /^(?:TTO)?[0-9]{6}$/,
    'United States': /\b(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s+(\d{5})\b/i,
    Argentina: /\b\d{4}\b/,
    Bolivia: /\b\d{4}\b/,
    Brazil: /^\d{5}-\d{3}$/,
    Chile: /^\d{7}$/,
    Colombia: /^\d{6}$/,
    Ecuador: /^\d{6}$/,
    Guyana: /^[a-zA-Z\d ]+$/,
    Paraguay: /\b\d{4}\b/,
    Peru: /\b\d{5}\b/,
    Suriname: /^[a-zA-Z\d ]+$/,
    Uruguay: /\b\d{5}\b/,
    Venezuela: /\b\d{4}\b/,
}

function getPostalCodeFormat(country) {
    return postalCodeRegex[country];
}

module.exports = getPostalCodeFormat;