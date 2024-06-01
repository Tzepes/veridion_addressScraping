const rulesByCountry = {
    "US": (() => {
        const defaultVars = {
            min: 6,
            max: 12,
            take: 9,
        };
        
        return {
            defaultVars,
            minNumberOfTokens: defaultVars.min,
            maxNumberOfTokens: defaultVars.max,
            takeAmmountOfTokens: defaultVars.take,
        };
    })(),
    "UK": (() => {
        const defaultVars = {
            min: 4,
            max: 8,
            take: 6,
        };
        
        return {
            defaultVars,
            minNumberOfTokens: defaultVars.min,
            maxNumberOfTokens: defaultVars.max,
            takeAmmountOfTokens: defaultVars.take,
        };
    })(),
    "GB": (() => {
        defaultVars = {
            min: 4,
            max: 8,
            take: 6,
        };

        return {
            defaultVars,
            minNumberOfTokens: defaultVars.min,
            maxNumberOfTokens: defaultVars.max,
            takeAmmountOfTokens: defaultVars.take,
        };
    })(),
    "DE": (() => {
        const defaultVars = {
            min: 3,
            max: 6,
            take: 4,
        };

        return {
            defaultVars,
            minNumberOfTokens: defaultVars.min,
            maxNumberOfTokens: defaultVars.max,
            takeAmmountOfTokens: defaultVars.take,
        };
    })(),
}

function getTokenRules(country) {
    resetTokenVars(country);
    return rulesByCountry[country];
}

function resetTokenVars(country) {
    rulesByCountry[country].minNumberOfTokens = rulesByCountry[country].defaultVars.min;
    rulesByCountry[country].maxNumberOfTokens = rulesByCountry[country].defaultVars.max;
    rulesByCountry[country].takeAmmountOfTokens = rulesByCountry[country].defaultVars.take;
}

module.exports = {getTokenRules};