from fastapi import FastAPI
from routers.address_extraction import router as extract_street
from routers.location_extraction import router as extract_gpe_org

app = FastAPI()

# Include routers
app.include_router(extract_street)
app.include_router(extract_gpe_org)
