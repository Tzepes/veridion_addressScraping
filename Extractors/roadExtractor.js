const fs = require('fs');
const {elementTextCleanUp, textCleanUp} = require('../dataCleanup.js');
const { fetchStreetDetails } = require('../apis/spacyLocalAPI.js');
const addressSelectors = [
    'address', 'p', 'font', 'span', 'strong', 'div'
];

const roadMatches = new Set();

function findRoad($, targetTag = 'body') {
    let road = '';
    let roadNumber = '';
    // add google API to translate road name to country (if taken from URL or Postcode)
    const streetNameRegex = /\b(\d+)\s+(.{1,40})\b(?:\s+(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Lane|Ln\.|Boulevard|Blvd\.|Drive|Dr\.|Court|Ct\.|Place|Pl\.|Square|Sq\.|Trail|Tr\.|Parkway|Pkwy\.|Circle|Cir\.|Terrace|Ter\.|Way|W\.|Highway|Hwy\.|Route|Rte\.|Path|Pth\.|Expressway|Expy\.|Freeway|Fwy\.|Turnpike|Tpke\.|Interstate|I-(?:[0-9]+)|US(?: Route)?-[0-9]+)\b)(?!.*(?:Categories|Powered by))/
    const streetRegexNumBegin = /^\d+\s(?:[A-Za-zÀ-ÿ-]+\s?)+?\b/g;
    const streetRegexNumEnd = /\b[A-Za-zÀ-ÿ-]+\s+\d+(?!\w)/;

    const filteredElements = $(targetTag).find('*').filter(function() { return !/^(script|link|meta|style|path|symbol|noscript|img|code)$/i.test(this.nodeName) });
    const reversedElements = $(filteredElements).get().reverse();

    let elementTxtGlobalVar;

    for(let index = 0; index < reversedElements.length; index++) {
        const element = reversedElements[index];

        let isCorrectElement = false;
        
        for(let i = 0; i < addressSelectors.length; i++) {
            if ($(element).is(addressSelectors[i])) {
                isCorrectElement = true;
                break;
            }
        }

        if (!isCorrectElement) {
            continue;
        }
        
        let text = elementTextCleanUp(element, $);

        text = textCleanUp(text);

        //TO CONSIDER: if the text is too long, split it by \n or \t into an array and loop through it
        
        if(text.match(streetNameRegex)){
            // console.log(text);
            let matches = text.match(streetNameRegex);
            let addressLabled = fetchStreetDetails(text);
            road = addressLabled.Street_Name;
            roadNumber = addressLabled.Street_Num;
            roadMatches.add([roadNumber, road]);

            // Write the match to a file
            fs.appendFile('matchesFromStreet.txt', `${element.name}\n${text}\n\n`, (err) => {
                if (err) throw err;
            });
            elementTxtGlobalVar = text;
        }

        // pass trough geocoding API
            // if valid road
                // if same postcode with api postcode
                    // return road
                // if no postcode
                    // return postcode, city and region from geocoding API
            // else
                // continue search

        if (road) { 
            break;
        }
    }

    console.log('street array:', roadMatches);
    roadMatches.clear();
    return { roadNumber, road: road || null , elementTxtGlobalVar};
}

// get all possible matches for road name
    // pass in all matched to geocoding API till positive data is returned

module.exports = findRoad;