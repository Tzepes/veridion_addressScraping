from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from langdetect import detect
import spacy

router = APIRouter()

class TextRequest(BaseModel):
    text: str
    country: Optional[str] = None

# Assuming you're running this from the root of your project where main.py is, adjust the path like this:

country_model_map = {
    'DE': 'output/models_de/model-best',
    'US': 'output/models_us/model-best',
    'UK': 'output/models_uk/model-best',
    'GB': 'output/models_uk/model-best',
    'AU': 'output/models_au/model-best',
}

@router.post("/extract_street/")
async def extract_street(request: TextRequest):
    country = None
    if request.country == None:
        lang = detect(request.text).upper()
        if lang == 'EN':
            country = 'US'
        else:
            country = lang
    else:
        country = request.country.upper()

    model_path = country_model_map.get(country, 'output/models/model-best')

    nlp_address = spacy.load(model_path)

    print(country)
    print('processing text: ', request.text)

    doc = nlp_address(request.text)
    city = None
    state = None
    street_name = None
    street_num = None
    zipcode = None
    for ent in doc.ents:
        if ent.label_ == 'CITY':
            city = ent.text.title()
        elif ent.label_ == 'STATE':
            state = ent.text.title()
        elif ent.label_ == 'STREET_NAME':
            street_name = ent.text.title()
        elif ent.label_ == 'STREET_NUM':
            street_num = ent.text
        elif ent.label_ == 'ZIP_CODE':
            zipcode = ent.text
    if street_name or street_num:
        print("City:", city, "| State:", state, "| Street_Name:", street_name, "| Street_Num:", street_num, "| Zipcode:", zipcode)
        return {"City": city, "State": state, "Street_Name": street_name, "Street_Num": street_num, "Zipcode": zipcode}
    else:
        return {"detail": "No street address found"}
