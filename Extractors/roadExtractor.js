const fs = require('fs');

const addressSelectors = [
    'address', 'p', 'font', 'span', 'div'
];

const roadMatches = new Set();

function findRoad($) {
    let road = '';
    let roadNumber = '';
    // add google API to translate road name to country (if taken from URL or Postcode)
    const streetNameRegex = /\b(\d+)\s+(.{1,40})\b(?:\s+(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Lane|Ln\.|Boulevard|Blvd\.|Drive|Dr\.|Court|Ct\.|Place|Pl\.|Square|Sq\.|Trail|Tr\.|Parkway|Pkwy\.|Circle|Cir\.|Terrace|Ter\.|Way|W\.|Highway|Hwy\.|Route|Rte\.|Path|Pth\.|Expressway|Expy\.|Freeway|Fwy\.|Turnpike|Tpke\.|Interstate|I-(?:[0-9]+)|US(?: Route)?-[0-9]+)\b)(?!.*(?:Categories|Powered by))/
    const streetRegexNumBegin = /^\d+\s(?:[A-Za-zÀ-ÿ-]+\s?)+?\b/g;
    const streetRegexNumEnd = /\b[A-Za-zÀ-ÿ-]+\s+\d+(?!\w)/;
    // const regex = /(\b\w+\b)\s+\d+[A-Z]*$/;
    let body = $('body');
    let html = '';
    // $('body').children().each((i, element) => {
    //     html += $(element).text() + ' ';
    // });
    // $('body').text(html);
    const filteredElements = $('body').find('*').not('script, link, meta, style, path, symbol, noscript, img');
    
    const reversedElements = $(filteredElements).get().reverse();
    // console.log(body.text())
    // console.log(body)
    for(let index = 0; index < reversedElements.length; index++) {
        const element = reversedElements[index];

        // fs.appendFile('bodyFilteredTextNoCleanup.txt', `${$(element)}\n\n\n`, (err) => {
        //     if (err) throw err;
        // });

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

        fs.appendFile('element_text.txt', `${element.name}\n${text}\n\n\n`, (err) => {
            if (err) throw err;
        });

        //TO CONSIDER: if the text is too long, split it by \n or \t into an array and loop through it
        
        // console.log(text);

        // console.log('Looking for match');
        // console.log('Num begin:', text.match(streetRegexNumBegin));
        // console.log('Num end:', text.match(streetRegexNumEnd));
        // take road
        if(text.match(streetNameRegex)){
            // console.log(text);
            let matches = text.match(streetNameRegex);
            console.log('matches:', matches);
            roadNumber = matches[1].trim();
            road = matches[2].trim();
            roadMatches.add([roadNumber, road]);

            // Write the match to a file
            fs.appendFile('matchesFromStreet.txt', `${element.name}\n${text}\n\n`, (err) => {
                if (err) throw err;
            });
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

function elementTextCleanUp(element, $) {
    let text = '';
    $(element).contents().each(function () {
        if (this.type === 'text') {
            // Add trimmed text and a space to separate from the next element
            text += this.data.trim() + ' ';
        } else {
            // Recursively clean up the inner text of child elements
            const childText = elementTextCleanUp(this, $);
            // Add the cleaned text and a space to separate from the next element
            text += childText + ' ';
        }
    });
    return textCleanUp(text);
}

function textCleanUp(text) {
    text = text.replace(/\n|\t/g, " ");      
    text = text.replace(/[\uE017©•"-*|]/g, '').replace(/\s+/g, ' ');
    text = text.replace(/[^\x20-\x7E]/g, '');
    return text;
}

// get all possible matches for road name
    // pass in all matched to geocoding API till positive data is returned

module.exports = findRoad;