# Multi-Vendor Data Fetch Service

A robust service that handles data fetching from multiple external vendors with different response patterns (sync/async) while managing rate limits and providing a unified API interface.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/divu777/enrich-assignmern
cd enrich-assignmern

# Start all services
docker-compose up --build

# The API will be available at http://localhost:3000
# Vendor mocks will be available at http://localhost:4000
```

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│  API Server │───▶│    Queue    │
└─────────────┘    │ (Port 3000) │    │   (Redis)   │
                   └─────────────┘    └─────────────┘
                          │                   │
                          ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │  Webhook    │    │   Worker    │
                   │  Endpoint   │◀───│  Process    │
                   └─────────────┘    └─────────────┘
                                             │
                                             ▼
                   ┌─────────────┐    ┌─────────────┐
                   │  MongoDB    │    │   Vendor    │
                   │ (Port 27017)│    │   Mocks     │
                   └─────────────┘    │ (Port 4000) │
                                      └─────────────┘
```

## API Endpoints

### 1. Submit Job
```bash
POST /jobs
Content-Type: application/json

{
  "data": "any json payload",
  "userId": 123
}

# Response
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2. Check Job Status
```bash
GET /jobs/{request_id}

# Response (Processing)
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING"
}

# Response (Completed)
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED"
}
```

### 3. Vendor Webhook (Internal)
```bash
POST /vendor-webhook/{vendor}
```

## Test Commands

```bash
# Submit a job
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"userId": 123, "data": "test payload"}'

# Check job status (replace with actual request_id)
curl http://localhost:3000/jobs/550e8400-e29b-41d4-a716-446655440000

# Health check
curl http://localhost:3000/
curl http://localhost:4000/
```


## Environment Variables

```env
PORT=3000          # main backend
PORT2=4000         # Vendor mock
```

