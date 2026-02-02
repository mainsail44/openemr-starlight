# OpenEMR Starlight

FHIR integration layer for OpenEMR on Starlight Platform.

## Components

### FHIR Bridge (`fhir-bridge/`)
FastAPI-based FHIR R4B server using [FHIRStarter](https://github.com/canvas-medical/fhirstarter) framework.

- **URL:** http://192.168.1.46:8085
- **Docs:** http://192.168.1.46:8085/docs
- **Metadata:** http://192.168.1.46:8085/metadata

#### Features
- FHIR R4B compliant endpoints
- US Core profiles support
- In-memory cache with demo patients
- OpenEMR FHIR API integration (OAuth2)

#### Deploy
```bash
cd fhir-bridge
podman build -t fhir-bridge:latest .
podman run -d --name fhir-bridge -p 8085:8085 fhir-bridge:latest
```

## Related Services

- **OpenEMR:** http://192.168.1.46:8084 (admin/pass)
- **OpenEMR FHIR:** http://192.168.1.46:8084/apis/default/fhir/

## License
MIT
