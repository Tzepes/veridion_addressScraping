const url = require('url');

async function getFirstPageLinks(domain, htmlContent, $) {
    let links = [];
    const aTags = $('a');
    const unwantedLinkRegex = /^#|javascript:|mailto:|tel:|ftp:|data:|\.(pdf|jpg|png|mp3|mp4)$/;
    const socialMediaRegex = /twitter\.com|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|pinterest\.com|patreon\.com|snapchat\.com/;
    const ignoredRoutes = ['shop', 'product', 'products', 'collection', 'collections', 'news', 'media', 'services'];

    aTags.each((i, el) => {
        let link = $(el).attr('href');
        // console.log(link);
        if (link && !unwantedLinkRegex.test(link) && !socialMediaRegex.test(link)) {
            // If the link is a protocol-relative URL, add "https:"
            if (link.startsWith('//')) {
                link = 'https:' + link;
            }
            // Resolve all links against the domain, whether they're relative or absolute
            link = url.resolve(domain, link);

            if (!ignoredRoutes.some(route => url.parse(link).pathname.includes(route))) {
                links.push(link);
            }
        }
    });

    const first10Links = links.slice(0, 10);
    const last10Links = links.slice(-10);
    const restOfLinks = links.slice(10, -10);

    links = first10Links.concat(last10Links, restOfLinks);

    // console.log(links);
    return links;
}

module.exports = getFirstPageLinks;