# OpenEMR Starlight FHIR Bridge

A FHIR R4B bridge for integrating OpenEMR with Canvas Medical and other healthcare systems.

## Overview

This project provides a FHIR-compliant API bridge that:
- Exposes OpenEMR patient data via standard FHIR R4B endpoints
- Supports US Core profiles for interoperability
- Includes demo patients for testing/demos
- Built on [FHIRStarter](https://github.com/canvas-medical/fhirstarter) framework

## Quick Start

### Using Docker/Podman

```bash
# Build the container
podman build -t fhir-bridge:latest .

# Run with OpenEMR connection
podman run -d --name fhir-bridge \
  -p 8085:8085 \
  -e OPENEMR_BASE_URL=http://your-openemr:8084 \
  fhir-bridge:latest
```

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
# or
uvicorn app:app --host 0.0.0.0 --port 8085 --reload
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/metadata` | FHIR CapabilityStatement |
| `/Patient` | Patient search |
| `/Patient/{id}` | Read patient by ID |
| `/Practitioner` | Practitioner resources |
| `/Organization` | Organization resources |
| `/Encounter` | Encounter resources |
| `/Condition` | Condition resources |
| `/Observation` | Observation resources |
| `/docs` | Swagger UI |
| `/health` | Health check |

## Demo Patients

On startup, 3 demo patients are loaded:

| ID | Name | Location |
|----|------|----------|
| demo-001 | John Smith | Alexandria, VA |
| demo-002 | Sarah Johnson | Arlington, VA |
| demo-003 | Robert Williams | Fairfax, VA |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENEMR_BASE_URL` | `http://localhost:8084` | OpenEMR server URL |
| `OPENEMR_CLIENT_ID` | - | OAuth2 client ID |
| `OPENEMR_CLIENT_SECRET` | - | OAuth2 client secret |

## OpenEMR Integration

### Enabling FHIR API in OpenEMR

1. Go to **Admin > Config > Connectors**
2. Check **Enable OpenEMR Standard FHIR REST API**
3. (Optional) Check **Enable OpenEMR FHIR System Scopes**
4. Click **Save**

### Registering OAuth2 Client

```bash
curl -X POST "http://your-openemr:8084/oauth2/default/registration" \
  -H "Content-Type: application/json" \
  -d '{
    "application_type": "private",
    "redirect_uris": ["http://your-bridge:8085/callback"],
    "client_name": "FHIR Bridge",
    "token_endpoint_auth_method": "client_secret_post",
    "scope": "openid api:fhir user/Patient.read"
  }'
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Canvas Medical │────▶│   FHIR Bridge   │────▶│    OpenEMR      │
│  (or any FHIR   │     │  (This project) │     │  FHIR R4 API    │
│   client)       │     │  Port 8085      │     │  Port 8084      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Deployment on Starlight

Part of the Starlight demo platform at `192.168.1.46`:

- FHIR Bridge: http://192.168.1.46:8085
- OpenEMR: http://192.168.1.46:8084

## License

MIT

## Credits

- [FHIRStarter](https://github.com/canvas-medical/fhirstarter) - FastAPI FHIR server framework
- [OpenEMR](https://www.open-emr.org/) - Open source EHR
- [Canvas Medical](https://www.canvasmedical.com/) - Healthcare platform
