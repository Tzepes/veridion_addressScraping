const url = require('url');

async function getFirstPageLinks(domain, $) {
    let links = new Set();
    const aTags = $('a');
    const unwantedLinkRegex = /^#|javascript:|mailto:|tel:|ftp:|data:|\.(pdf|jpg|png|mp3|mp4)$/;
    const socialMediaRegex = /twitter\.com|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|pinterest\.com|patreon\.com|snapchat\.com/;
    const ignoredRoutes = ['shop', 'product', 'products', 'collection', 'collections', 'news', 'media', 'services'];
    let domainHostname = url.parse(domain).hostname;
    domainHostname = domainHostname.replace('www.', '');

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

            let linkHostname = url.parse(link).hostname;
            linkHostname = linkHostname.replace('www.', '');
            if (linkHostname !== domainHostname) {
                return;  // Skip this link if it's from a different domain
            }
            
            if (!ignoredRoutes.some(route => url.parse(link).pathname.includes(route))) {
                links.add(link);
            }
        }
    });

    const first10Links = Array.from(links).slice(0, 10);
    const last10Links = Array.from(links).slice(-10);
    const restOfLinks = Array.from(links).slice(10, -10);

    links = new Set([...first10Links, ...last10Links, ...restOfLinks]);

    console.log(links);
    return links;
}

module.exports = getFirstPageLinks;