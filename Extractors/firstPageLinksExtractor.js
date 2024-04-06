const url = require('url');

async function getFirstPageLinks(domain, htmlContent, $) {
    let links = new Set();
    const aTags = $('a');
    const unwantedLinkRegex = /^#|javascript:|mailto:|tel:|ftp:|data:|\.pdf$/;

    aTags.each((i, el) => {
        if (links.size >= 15) {
            return false; // stop iteration
        }
        let link = $(el).attr('href');
        if (link && !unwantedLinkRegex.test(link)) {
            // If the link is a protocol-relative URL, add "https:"
            if (link.startsWith('//')) {
                link = 'https:' + link;
            }
            // Resolve all links against the domain, whether they're relative or absolute
            link = url.resolve(domain, link);
            links.add(link);
        }
    });

    console.log(Array.from(links));
    return Array.from(links);
}

module.exports = getFirstPageLinks;