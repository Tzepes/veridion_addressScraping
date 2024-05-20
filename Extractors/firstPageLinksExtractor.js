const url = require('url');

async function getFirstPageLinks(domain, $) {
    let sameDomainLinks = new Set();
    let differentDomainLinks = new Set();
    const aTags = $('a');
    const unwantedLinkRegex = /^#|javascript:|mailto:|tel:|ftp:|data:|\.(pdf|jpg|png|mp3|mp4)$/;
    const socialMediaRegex = /twitter\.com|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|pinterest\.com|patreon\.com|snapchat\.com|github\.com/;
    const ignoredRoutes = ['shop', 'product', 'products', 'collection', 'collections', 'news', 'media', 'services'];
    let domainHostname = url.parse(domain).hostname;
    domainHostname = domainHostname.replace('www.', '');

    aTags.each((i, el) => {
        let link = $(el).attr('href');
        if (link && !unwantedLinkRegex.test(link) && !socialMediaRegex.test(link)) {
            if (link.startsWith('//')) {
                link = 'https:' + link;
            }
            link = url.resolve(domain, link);

            let linkHostname = url.parse(link).hostname;
            linkHostname = linkHostname.replace('www.', '');
            if (linkHostname !== domainHostname) {
                differentDomainLinks.add(link);
                return;
            }
            
            if (!ignoredRoutes.some(route => url.parse(link).pathname.includes(route))) {
                sameDomainLinks.add(link);
            }
        }
    });

    const first10Links = Array.from(sameDomainLinks).slice(0, 10);
    const last10Links = Array.from(sameDomainLinks).slice(-10);
    const restOfLinks = Array.from(sameDomainLinks).slice(10, -10);

    const links = new Set([...first10Links, ...last10Links, ...restOfLinks, ...differentDomainLinks]);

    console.log(links);
    return links;
}

module.exports = getFirstPageLinks;