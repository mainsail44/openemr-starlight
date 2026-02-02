FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Set FHIR sequence to R4B
ENV FHIR_SEQUENCE=R4B
ENV OPENEMR_BASE_URL=http://localhost:8084

# Copy application
COPY app.py .

EXPOSE 8085

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8085"]
