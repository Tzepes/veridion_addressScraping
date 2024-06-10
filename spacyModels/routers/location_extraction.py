from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import spacy
from langdetect import detect
from utils.similarityScoring import sort_companies_and_locations
from urllib.parse import urlparse
from fuzzywuzzy import fuzz


router = APIRouter() 

# Define data models for incoming requests
class TextRequest(BaseModel):
    text: str
    domain: Optional[str] = None

model_map = {
    'en': 'en_core_web_trf',
    'de': 'de_core_news_lg',
}

companyExclusionList = [    "google", "facebook", "linkedin", "microsoft", "apple", "amazon", "twitter",
    "instagram", "youtube", "netflix", "snapchat", "pinterest", "spotify",
    "uber", "lyft", "airbnb", "dropbox", "salesforce", "adobe", "oracle", "ibm",
    "intel", "amd", "nvidia", "samsung", "sony", "lg", "dell", "hp", "cisco",
    "zoom", "slack", "shopify", "reddit", "tumblr", "flickr", "github", "bitbucket",
    "atlassian", "trello", "medium", "square", "stripe", "paypal", "venmo",
    "alibaba", "tencent", "baidu", "jd.com", "bytedance", "tiktok", "wechat",
    "whatsapp", "red hat", "vmware", "dell emc", "hpe", "huawei", "xiaomi",
    "oneplus", "motorola", "nokia", "ericsson", "qualcomm", "broadcom", "texas instruments",
    "western digital", "seagate", "kingston", "sandisk", "crucial", "corsair",
    "logitech", "razer", "steelseries", "alienware", "msi", "asus", "acer",
    "lenovo", "toshiba", "panasonic", "philips", "siemens", "bosch", "honeywell",
    "general electric", "tesla", "spacex", "boeing", "airbus", "ford", "general motors",
    "fiat chrysler", "volkswagen", "toyota", "honda", "bmw", "mercedes-benz",
    "audi", "porsche", "ferrari", "lamborghini", "maserati", "hyundai", "kia",
    "nissan", "subaru", "mazda", "mitsubishi", "suzuki", "volvo", "jaguar",
    "land rover", "rolls-royce", "bentley", "bugatti", "aston martin", "mclaren",
    "shell", "exxonmobil", "bp", "chevron", "total", "petrobras", "gazprom",
    "rosneft", "aramco", "sinopec", "cnpc", "cnooc", "eni", "equinor", "repsol",
    "conocophillips", "hess", "marathon oil", "anadarko", "apache", "devon energy",
    "noble energy", "occidental petroleum", "chesapeake energy", "halliburton",
    "schlumberger", "baker hughes", "weatherford", "transocean", "diamond offshore",
    "noble corporation", "ensco", "seadrill", "rowan companies", "nabors industries",
    "helmerich & payne", "patterson-uti energy", "precision drilling", "cameron",
    "national oilwell varco", "technipfmc", "subsea 7", "saipem", "mcdermott",
    "kbr", "bechtel", "fluor", "jacobs engineering", "aecom", "parsons",
    "ch2m hill", "amec foster wheeler", "wood group", "worleyparsons", "tetra tech",
    "stantec", "arcadis", "wsp global", "snc-lavalin", "kiewit", "turner construction",
    "skanska", "lendlease", "balfour beatty", "vinci", "bouygues", "eiffage",
    "hochtief", "strabag", "ferrovial", "acs group", "fluor corporation",
    "jacobs engineering group", "quanta services", "emcor group", "comfort systems usa",
    "mastec", "tutor perini", "granite construction", "the walsh group",
    "gilbane building company", "clark construction group", "mortenson construction",
    "mccarthy holdings", "structure tone", "swinerton", "hensel phelps",
    "brasfield & gorrie", "dpr construction", "je dunn construction", "whiting-turner",
    "skanska usa", "sundt construction", "webcor builders", "turner industries",
    "yates construction", "archer western contractors", "balfour beatty us",
    "walsh construction", "clark builders group", "layton construction",
    "pcl construction enterprises", "holder construction", "hoffman construction",
    "burns & mcdonnell", "kitchell", "pepper construction", "mckinstry",
    "gilbane", "structure tone", "clune construction", "build group",
    "xl construction", "mcshane construction", "mcgough construction", "power construction",
    "loopnet", "godaddy"
]

# todo: IF BIG COMPANY LIKE GOOGLE, FACEBOOK ETC. IGNORE THE GPE AND ORG EXTRACTION

def is_similar(company, exclusion_list, threshold):
    for excluded_company in exclusion_list:
        if fuzz.ratio(company.lower(), excluded_company.lower()) > threshold:
            return True
    return False


@router.post("/extract_gpe_org/")
async def extract_gpe_org(request: TextRequest):
    # Detect the language of the text
    lang = detect(request.text)
    print(lang)
    nlp_gpe_org = spacy.load(model_map.get(lang, 'en_core_web_trf'))

    doc = nlp_gpe_org(request.text)
    print(doc.ents)
    gpe = []
    org = []
    sorted_ORGs_GPEs = []
    for entity in doc.ents:
        if entity.label_ == 'GPE' or entity.label_ == 'LOC':
            gpe.append(entity.text)
        elif entity.label_ == 'ORG':
            org.append(entity.text)

    org = [company for company in org if not is_similar(company, companyExclusionList, 80)]

    print(lang)
    if request.domain and org:
        domain = urlparse(request.domain).netloc
        sorted_ORGs_GPEs, org, gpe = sort_companies_and_locations(domain, org, gpe)
        # print({"GPE": gpe, "ORG": org, "ORG_GPE_Sorted": sorted_ORGs_GPEs, "language": lang})
        return {"GPE": gpe, "ORG": org, "ORG_GPE_Sorted": sorted_ORGs_GPEs, "language": lang}
    else:
        # print({"GPE": gpe, "ORG": org, "ORG_GPE_Sorted": sorted_ORGs_GPEs, "language": lang})
        return {"GPE": gpe, "ORG": org, "ORG_GPE_Sorted": sorted_ORGs_GPEs, "language": lang}