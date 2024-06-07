const url = require('url');
const fs = require('fs');

const knownSLDs = ['co.uk', 'ac.uk', 'gov.uk', 'co.jp', 'com.au', 'net.au', '.uk.com'];
const keywords = {
    'about': 1, 'contact': 1, 'location': 1, 'address': 1, 'visit': 1, 'find': 1, 'privacy': 1,
    'über': 1, 'info': 1, 'information': 1, 'impressum': 2, 'kontakt': 2, 'datenschutz': 1, 'datenschutzerklärung': 1,
    'kontaktiere': 1, 'kontaktieren': 1, 'standort': 1, 'lage': 1, 'anschrift': 1, 
    'adresse': 1, 'besuch': 1, 'besuchen': 1, 'finden': 1, 'auffinden': 1,
    'à propos': 1, 'info': 1, 'information': 1, 'contact': 1, 'contacter': 1, 'politique': 1,
    'emplacement': 1, 'lieu': 1, 'adresse': 1, 'visiter': 1, 'visite': 1, 'confidentialité': 1,
    'trouver': 1, 'rechercher': 1, 'confidentialité': 1, 'privacy': 1, 'politique de confidentialité': 1,
};

function getDomainName(url) {
    url = 'http://www.' + url + '/'; 
    try {
        const urlObj = new URL(url);
        let hostname = urlObj.hostname.replace(/^www\./, '');
        const parts = hostname.split('.');
        
        let domainName;
        
        if (parts.length > 2) {
            const potentialSLD = parts.slice(-2).join('.');
            if (knownSLDs.includes(potentialSLD)) {
                domainName = parts.slice(0, -2).join('.');
            } else {
                domainName = parts.slice(0, -1).join('.');
            }
        } else {
            domainName = parts[0];
        }

        console.log('Domain name:', domainName)
        return domainName;
    } catch (e) {
        console.error('Invalid URL:', e);
        return null;
    }
}

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
    sameDomainLinks = prioritizeUrls(Array.from(sameDomainLinks), keywords);
    differentDomainLinks = prioritizeUrls(Array.from(differentDomainLinks), keywords);
    console.log('sameDomainLinks:', sameDomainLinks);

    const first10Links = Array.from(sameDomainLinks).slice(0, 10);
    const last10Links = Array.from(sameDomainLinks).slice(-10);
    const restOfLinks = Array.from(sameDomainLinks).slice(10, -10);

    const links = new Set([...first10Links, ...last10Links, ...restOfLinks, ...differentDomainLinks]);

    const limitedLinks = new Set(Array.from(links).slice(0, 5));

    fs.appendFile('linksOfPages.txt', Array.from(limitedLinks).join('\n') + '\n', (err) => {
        if (err) throw err;
        console.log('Links have been saved!');
    });

    console.log(limitedLinks);
    return limitedLinks;
}


function prioritizeUrls(urls, keywords) {
    return urls
        .map(url => {
            const score = Object.keys(keywords).reduce((acc, keyword) => {
                return acc + (url.includes(keyword) ? keywords[keyword] : 0);
            }, 0);
            return { url, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(item => item.url);
}

module.exports = {getFirstPageLinks, getDomainName};