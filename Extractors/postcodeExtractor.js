function findPostcode(text, country) {
    //Things to check for: 
    // some states are spelled fully, such as Ohio instead of OH
    // could return country based on postal code in most cases
    let postalcodeFormat = new RegExp(country);
    // if(!country) {
    //     for(let zipFormat in countries){
    //         postalcodeFormat = postalcodeRegex[zipFormat];
    //         let postcodeMatch = text.match(postalcodeFormat);
    //         postcode = postcodeMatch ? postcodeMatch[1] : null;
    //         if(getDataFromPostalCode(postcode)){
    //             break;
    //         }
    //     }
    // } else {

        const postcodeWithLabelRegex = /Postcode\s*([A-Z]{2}\s*\d{4,10})\b/;
        const postcodeRegexWithState = /\b[A-Z]{2}\s*(\d{5})\b/; // capture only the postcode part
        
        let postcodeMatch = postalcodeFormat ? postalcodeFormat.exec(text) : null;
        postcode = postcodeMatch && postcodeMatch[1] ? postcodeMatch[1] : null;
    
        if(!postcode) {
            postcodeMatch = postcodeWithLabelRegex.exec(text);
            if (postcodeMatch && postcodeMatch[1]) {
                postcode = postcodeMatch[1];
            } else {
                postcodeMatch = postcodeRegexWithState.exec(text);
                if (postcodeMatch && postcodeMatch[1]) {
                    postcode = postcodeMatch[1].trim(); 
                }
                if (!postcode) {
                    const genericPostcodeRegex = /\b\d{5}\b/;
                    const genericPostcodeMatch = genericPostcodeRegex.exec(text);
                    if (genericPostcodeMatch && genericPostcodeMatch[0]) {
                        postcode = genericPostcodeMatch[0].trim();
                    }
                }
            }
        }
    // }

  return postcode;
}

module.exports = findPostcode;