const rulesByCountry = {
    "US": {
        defaultVars: {
            min: 6,
            max: 12,
            take: 9,
        },
        minNumberOfTokens: defaultVars.min,
        maxNumberOfTokens: defaultVars.max,
        takeAmmountOfTokens: defaultVars.take,
    },
    "UK": {
        defaultVars: {
            min: 4,
            max: 8,
            take: 5,
        },
        minNumberOfTokens: defaultVars.min,
        maxNumberOfTokens: defaultVars.max,
        takeAmmountOfTokens: defaultVars.take,
    },
    "GB": {
        defaultVars: {
            min: 4,
            max: 8,
            take: 5,
        },
        minNumberOfTokens: defaultVars.min,
        maxNumberOfTokens: defaultVars.max,
        takeAmmountOfTokens: defaultVars.take,
    },
    "DE": {
        defaultVars: {
            min: 3,
            max: 6,
            take: 3,
        },
        minNumberOfTokens: defaultVars.min,
        maxNumberOfTokens: defaultVars.max,
        takeAmmountOfTokens: defaultVars.take,
    },
}

function getTokenRules(country) {
    resetTokenVars(country);
    return rulesByCountry[country];
}

function resetTokenVars(country) {
    rules[country].minNumberOfTokens = rules[country].defaultVars.min;
    rules[country].maxNumberOfTokens = rules[country].defaultVars.max;
    rules[country].takeAmmountOfTokens = rules[country].defaultVars.take;
}

module.exports = {getTokenRules};