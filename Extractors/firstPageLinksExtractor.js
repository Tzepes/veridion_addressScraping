async function getFirstPageLinks(htmlContent, $) {
    let links = new Set();
    const aTags = $('a');
    const urlRegex = /^(http|https):\/\//;

    aTags.each((i, el) => {
        if (links.size >= 15) {
            return false; // stop iteration
        }
        const link = $(el).attr('href');
        if (link && urlRegex.test(link)) {
            links.add(link);
        }
    });

    console.log(Array.from(links));
    return Array.from(links);
}

module.exports = getFirstPageLinks;