const addressSelectors = [
    'address', 'p', 'br', 'span', 'div'
];

const roadMatches = new Set();

function findRoad(htmlContent, $) {
    let road = '';
    let roadNumber = '';
    // add google API to translate road name to country (if taken from URL or Postcode)
    const streetNameRegex = /\b(\d+)\s+(.{1,40})\b(?:\s+(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Lane|Ln\.|Boulevard|Blvd\.|Drive|Dr\.|Court|Ct\.|Place|Pl\.|Square|Sq\.|Trail|Tr\.|Parkway|Pkwy\.|Circle|Cir\.|Terrace|Ter\.|Way|W\.|Highway|Hwy\.|Route|Rte\.|Path|Pth\.|Expressway|Expy\.|Freeway|Fwy\.|Turnpike|Tpke\.|Interstate|I-(?:[0-9]+)|US(?: Route)?-[0-9]+)\b)(?!.*(?:Categories|Powered by))/
    const streetRegexNumBegin = /^\d+\s(?:[A-Za-zÀ-ÿ-]+\s?)+?\b/g;
    const streetRegexNumEnd = /\b[A-Za-zÀ-ÿ-]+\s+\d+(?!\w)/;
    // const regex = /(\b\w+\b)\s+\d+[A-Z]*$/;
    const body = $('body');
    body.find('script, style, link, meta, path, symbol, noscript').remove();
    // console.log(body.text())
    // console.log(body)
    for (const selector of addressSelectors) {
        const elements = body.find(selector);
        elements.each((index, element) => {
            let text = $(element).text().trim();
            text = text.replace(/\n|\t/g, " ");  
            console.log(text);
            // console.log('Looking for match');
            console.log(text);
            // console.log('Num begin:', text.match(streetRegexNumBegin));
            // console.log('Num end:', text.match(streetRegexNumEnd));
            // take road
            if(text.match(streetNameRegex)){
                let matches = text.match(streetNameRegex);
                roadNumber = matches[1].trim();
                road = matches[2].trim();
                roadMatches.add([roadNumber, road]);
            }
            // else if (text.match(streetRegexNumBegin)) 
            // {
            //     let matches = text.match(streetRegexNumBegin);
            //     let splitMatches = matches[0].split(' ');
            //     roadNumber = splitMatches[0].trim();
            //     road = splitMatches.slice(1).join(' ').trim();
            //     roadMatches.add([roadNumber, road]);
            // } 
            // else if (text.match(streetRegexNumEnd))
            // {
            //     let matches = text.match(streetRegexNumEnd);
            //     let splitMatches = matches[0].split(' ');
            //     road = splitMatches.slice(0, -1).join(' ').trim();
            //     roadNumber = splitMatches[splitMatches.length - 1].trim();
            //     roadMatches.add([roadNumber, road]);
            // }

            // console.log('done looking for match');

            // pass trough geocoding API
                // if valid road
                    // if same postcode with api postcode
                        // return road
                    // if no postcode
                        // return postcode, city and region from geocoding API
                // else
                    // continue search
        });

        // algorithm loops trough each element but stops the moment a match is found, which can be from the first element
            // if a match is found, store in a set with unique elements
            // conitnue looping till all elements are checked
        if (road) { 
            break;
        }
    }
    console.log('street array:', roadMatches);
    roadMatches.clear();
    return { roadNumber, road: road || null };
}

// get all possible matches for road name
    // pass in all matched to geocoding API till positive data is returned

module.exports = findRoad;