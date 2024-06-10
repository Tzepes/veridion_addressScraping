const rulesByCountry = {
    "US": (() => {
        const defaultVars = {
            min: 6,
            max: 12,
            take: 10,
        };
        
        return {
            defaultVars,
            minNumberOfTokens: defaultVars.min,
            maxNumberOfTokens: defaultVars.max,
            takeAmmountOfTokens: defaultVars.take,
        };
    })(),
    "AU": (() => {
        const defaultVars = {
            min: 6,
            max: 10,
            take: 7,
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
            max: 10,
            take: 8,
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
            max: 10,
            take: 7,
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
            min: 4,
            max: 10,
            take: 7,
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