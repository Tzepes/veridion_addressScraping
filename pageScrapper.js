const fs = require('fs');
const addressSelectors = [ 'address', 'p', 'font', 'span', 'div' ];
const {elementTextCleanUp, textCleanUp} = require('./dataCleanup.js');

function LoopTroughElements($){
    const filteredElements = $('body').find('*').not('script, link, meta, style, path, symbol, noscript, img');
    const reversedElements = $(filteredElements).get().reverse();

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
        
        let elementText = elementTextCleanUp(element, $);

        elementText = textCleanUp(elementText);

        //check element for postcode
            //save postcode's element text and the ones around
        //check element for street name
        //check element for street number


        
        // if (postcode && !road)
            // pass postcode saved elements text to local spacy API
                // if road
                    // return road

        fs.appendFile('element_text.txt', `${element.name}\n${elementText}\n\n\n`, (err) => {
            if (err) throw err;
        });
    }
}


module.exports = LoopTroughElements;