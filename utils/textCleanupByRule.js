const rulesByCountry = {
    "US": {
        minNumberOfTokens: 6,
        maxNumberOfTokens: 15,
        takeAmmountOfTokens: 10,
    },
    "UK": {
        minNumberOfTokens: 4,
        maxNumberOfTokens: 8,
        takeAmmountOfTokens: 5,
    },
    "GB": {
        minNumberOfTokens: 4,
        maxNumberOfTokens: 8,
        takeAmmountOfTokens: 5,
    },
    "DE": {
        minNumberOfTokens: 3,
        maxNumberOfTokens: 6,
        takeAmmountOfTokens: 3,
    },
}

function getTokenRules(country) {
    return rulesByCountry[country];
}

module.exports = {getTokenRules};