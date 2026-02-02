"""
FHIR Bridge for OpenEMR - Canvas Medical Integration
Uses FHIRStarter framework to expose FHIR R4B endpoints
"""

import os
from pathlib import Path
from typing import Dict, Optional
from uuid import uuid4

import httpx
from fhir.resources.R4B.patient import Patient
from fhir.resources.R4B.practitioner import Practitioner
from fhir.resources.R4B.organization import Organization
from fhir.resources.R4B.encounter import Encounter
from fhir.resources.R4B.condition import Condition
from fhir.resources.R4B.observation import Observation
from fhir.resources.R4B.bundle import Bundle

from fhirstarter import FHIRProvider, FHIRStarter, InteractionContext
from fhirstarter.exceptions import FHIRResourceNotFoundError

# OpenEMR connection settings
OPENEMR_BASE_URL = os.getenv("OPENEMR_BASE_URL", "http://localhost:8084")
OPENEMR_CLIENT_ID = os.getenv("OPENEMR_CLIENT_ID", "Nfybm690bxyc47n5P5q5xqLkwWdQcvP4V3fzSmIX9eM")
OPENEMR_CLIENT_SECRET = os.getenv("OPENEMR_CLIENT_SECRET", "dT1Y9g-D2t7_eI4mtiTHYPbjOjZkN4HRDiWa2tcFSH8daWm2M-Yy_iHPtYNyvpfI2uLxfC6hvGWjhmgppV6mVw")

# Create the FHIR app
app = FHIRStarter(
    title="Canvas-OpenEMR FHIR Bridge",
    version="1.0.0",
    summary="FHIR R4B bridge between Canvas Medical and OpenEMR",
)

# In-memory cache for demo (production would use Redis/DB)
CACHE: Dict[str, Dict[str, str]] = {
    "Patient": {},
    "Practitioner": {},
    "Organization": {},
    "Encounter": {},
    "Condition": {},
    "Observation": {},
}

# Create provider
provider = FHIRProvider()


async def get_openemr_token() -> Optional[str]:
    """Get OAuth2 token from OpenEMR using password grant"""
    if not OPENEMR_CLIENT_ID:
        return None
    
    async with httpx.AsyncClient() as client:
        try:
            # Use password grant flow (requires OAuth2 Password Grant enabled)
            response = await client.post(
                f"{OPENEMR_BASE_URL}/oauth2/default/token",
                data={
                    "grant_type": "password",
                    "client_id": OPENEMR_CLIENT_ID,
                    "client_secret": OPENEMR_CLIENT_SECRET,
                    "username": "admin",
                    "password": "pass",
                    "scope": "openid fhirUser offline_access api:fhir"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code == 200:
                return response.json().get("access_token")
            else:
                print(f"OpenEMR token error: {response.status_code} {response.text}")
        except Exception as e:
            print(f"OpenEMR auth error: {e}")
    return None


async def fetch_from_openemr(resource_type: str, resource_id: str) -> Optional[dict]:
    """Fetch a resource from OpenEMR FHIR API"""
    # Try unauthenticated first for public endpoints
    async with httpx.AsyncClient() as client:
        try:
            # OpenEMR requires site ID in URL path
            response = await client.get(
                f"{OPENEMR_BASE_URL}/apis/default/fhir/{resource_type}/{resource_id}"
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"OpenEMR fetch error: {e}")
    return None


# Patient interactions
@provider.read(Patient)
async def patient_read(context: InteractionContext, id_: str) -> Patient:
    """Read a patient by ID"""
    # Try cache first
    if id_ in CACHE["Patient"]:
        return Patient.model_validate_json(CACHE["Patient"][id_])
    
    # Try OpenEMR
    data = await fetch_from_openemr("Patient", id_)
    if data:
        patient = Patient.model_validate(data)
        CACHE["Patient"][id_] = patient.model_dump_json()
        return patient
    
    raise FHIRResourceNotFoundError


@provider.create(Patient)
async def patient_create(context: InteractionContext, resource: Patient) -> str:
    """Create a new patient"""
    id_ = str(uuid4())
    resource.id = id_
    CACHE["Patient"][id_] = resource.model_dump_json()
    return id_


@provider.search_type(Patient)
async def patient_search(
    context: InteractionContext,
    family: Optional[str] = None,
    given: Optional[str] = None,
    birthdate: Optional[str] = None,
) -> Bundle:
    """Search for patients"""
    results = []
    for patient_json in CACHE["Patient"].values():
        patient_data = Patient.model_validate_json(patient_json).model_dump()
        patient = Patient.model_validate_json(patient_json)
        # Simple filtering (production would be more sophisticated)
        match = True
        if family and patient.name:
            if not any(family.lower() in (n.family or "").lower() for n in patient.name):
                match = False
        if given and patient.name:
            if not any(given.lower() in " ".join(n.given or []).lower() for n in patient.name):
                match = False
        if match:
            results.append(patient_data)
    
    return Bundle(
        type="searchset",
        total=len(results),
        entry=[{"resource": r} for r in results] if results else None
    )


# Practitioner interactions
@provider.read(Practitioner)
async def practitioner_read(context: InteractionContext, id_: str) -> Practitioner:
    """Read a practitioner by ID"""
    if id_ in CACHE["Practitioner"]:
        return Practitioner.model_validate_json(CACHE["Practitioner"][id_])
    
    data = await fetch_from_openemr("Practitioner", id_)
    if data:
        practitioner = Practitioner.model_validate(data)
        CACHE["Practitioner"][id_] = practitioner.model_dump_json()
        return practitioner
    
    raise FHIRResourceNotFoundError


@provider.create(Practitioner)
async def practitioner_create(context: InteractionContext, resource: Practitioner) -> str:
    """Create a new practitioner"""
    id_ = str(uuid4())
    resource.id = id_
    CACHE["Practitioner"][id_] = resource.model_dump_json()
    return id_


# Organization interactions
@provider.read(Organization)
async def organization_read(context: InteractionContext, id_: str) -> Organization:
    """Read an organization by ID"""
    if id_ in CACHE["Organization"]:
        return Organization.model_validate_json(CACHE["Organization"][id_])
    raise FHIRResourceNotFoundError


@provider.create(Organization)
async def organization_create(context: InteractionContext, resource: Organization) -> str:
    """Create a new organization"""
    id_ = str(uuid4())
    resource.id = id_
    CACHE["Organization"][id_] = resource.model_dump_json()
    return id_


# Encounter interactions
@provider.read(Encounter)
async def encounter_read(context: InteractionContext, id_: str) -> Encounter:
    """Read an encounter by ID"""
    if id_ in CACHE["Encounter"]:
        return Encounter.model_validate_json(CACHE["Encounter"][id_])
    raise FHIRResourceNotFoundError


@provider.create(Encounter)
async def encounter_create(context: InteractionContext, resource: Encounter) -> str:
    """Create a new encounter"""
    id_ = str(uuid4())
    resource.id = id_
    CACHE["Encounter"][id_] = resource.model_dump_json()
    return id_


# Condition interactions
@provider.read(Condition)
async def condition_read(context: InteractionContext, id_: str) -> Condition:
    """Read a condition by ID"""
    if id_ in CACHE["Condition"]:
        return Condition.model_validate_json(CACHE["Condition"][id_])
    raise FHIRResourceNotFoundError


@provider.create(Condition)
async def condition_create(context: InteractionContext, resource: Condition) -> str:
    """Create a new condition"""
    id_ = str(uuid4())
    resource.id = id_
    CACHE["Condition"][id_] = resource.model_dump_json()
    return id_


# Observation interactions
@provider.read(Observation)
async def observation_read(context: InteractionContext, id_: str) -> Observation:
    """Read an observation by ID"""
    if id_ in CACHE["Observation"]:
        return Observation.model_validate_json(CACHE["Observation"][id_])
    raise FHIRResourceNotFoundError


@provider.create(Observation)
async def observation_create(context: InteractionContext, resource: Observation) -> str:
    """Create a new observation"""
    id_ = str(uuid4())
    resource.id = id_
    CACHE["Observation"][id_] = resource.model_dump_json()
    return id_


# Register provider with app
app.add_providers(provider)


# Health check endpoint
@app.get("/health")
async def health():
    return {"status": "healthy", "openemr_url": OPENEMR_BASE_URL}


# Startup event to populate demo data
@app.on_event("startup")
async def load_demo_data():
    """Pre-populate cache with demo patients"""
    demo_patients = [
        {
            "resourceType": "Patient",
            "id": "demo-001",
            "meta": {"profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]},
            "identifier": [{"system": "http://hospital.example.org", "value": "MRN-12345"}],
            "active": True,
            "name": [{"use": "official", "family": "Smith", "given": ["John", "William"]}],
            "telecom": [
                {"system": "phone", "value": "555-123-4567", "use": "home"},
                {"system": "email", "value": "john.smith@example.com"}
            ],
            "gender": "male",
            "birthDate": "1985-04-15",
            "address": [{"line": ["123 Main St"], "city": "Alexandria", "state": "VA", "postalCode": "22301"}]
        },
        {
            "resourceType": "Patient",
            "id": "demo-002",
            "meta": {"profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]},
            "identifier": [{"system": "http://hospital.example.org", "value": "MRN-67890"}],
            "active": True,
            "name": [{"use": "official", "family": "Johnson", "given": ["Sarah", "Marie"]}],
            "telecom": [
                {"system": "phone", "value": "555-987-6543", "use": "mobile"},
                {"system": "email", "value": "sarah.j@example.com"}
            ],
            "gender": "female",
            "birthDate": "1990-08-22",
            "address": [{"line": ["456 Oak Ave"], "city": "Arlington", "state": "VA", "postalCode": "22201"}]
        },
        {
            "resourceType": "Patient",
            "id": "demo-003",
            "meta": {"profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]},
            "identifier": [{"system": "http://hospital.example.org", "value": "MRN-11111"}],
            "active": True,
            "name": [{"use": "official", "family": "Williams", "given": ["Robert"]}],
            "telecom": [{"system": "phone", "value": "555-555-5555", "use": "work"}],
            "gender": "male",
            "birthDate": "1972-12-03",
            "address": [{"line": ["789 Elm St"], "city": "Fairfax", "state": "VA", "postalCode": "22030"}]
        }
    ]
    
    for patient_data in demo_patients:
        patient = Patient.model_validate(patient_data)
        CACHE["Patient"][patient.id] = patient.model_dump_json()
    
    print(f"Loaded {len(demo_patients)} demo patients into cache")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8085)
