# AI Resume Analyzer

A full-stack, production-ready microservices application that analyzes resumes using AI (NLP), calculates ATS scores, and provides skill gap analysis based on job descriptions.

## Architecture

This application follows a robust microservices architecture:

- **Frontend (`frontend/`)**: React + Vite application with modern glassmorphism UI.
- **API Gateway (`api-gateway/`)**: Spring Cloud Gateway routing requests.
- **Auth Service (`auth-service/`)**: Spring Boot application handling JWT authentication and user management.
- **Resume Service (`resume-service/`)**: Spring Boot application orchestrating resume uploads and storing analysis.
- **AI Service (`ai-service/`)**: Python Flask microservice using `spaCy` and `PyPDF2` for advanced NLP analysis.
- **PostgreSQL**: Relational database for storing users, resumes, and results.
- **Redis**: Caching layer.
- **Prometheus & Grafana (`monitoring/`)**: Comprehensive metrics collection and dashboarding.

## DevOps & CI/CD

- **Docker Compose**: Entire stack can be spun up using a single command.
- **GitHub Actions**: Fully configured CI/CD pipeline (`.github/workflows/ci.yml`) for:
  - Automated Maven builds for Java services (Maven cache enabled)
  - NPM builds for React frontend (Node cache enabled)
  - Python dependency installation for AI service (pip cache enabled)
  - Automated Docker image builds for all services
  - GHCR (GitHub Container Registry) push on main/master branches
  - Unit testing and security scanning (Trivy vulnerability scan)
- **Jenkins**: Declarative pipeline (`Jenkinsfile`) for continuous integration, SonarQube analysis, and automated deployments.

### GitHub Actions CI/CD Pipeline Details

The workflow (`.github/workflows/ci.yml`) includes:

1. **Build & Test Jobs (Parallel)**:
   - `build-and-test-java`: Builds and tests auth-service, resume-service, api-gateway with Maven caching
   - `build-and-test-python`: Sets up Python 3.10 and installs AI service dependencies
   - `build-and-test-frontend`: Builds React frontend with Node cache enabled

2. **Docker Build & Push**:
   - Triggered only on push to `main` or `master` branches
   - Builds images for: frontend, api-gateway, auth-service, resume-service, ai-service
   - Pushes to GitHub Container Registry (GHCR) with proper versioning
   - Uses Docker Buildx for efficient multi-platform builds
   - Implements layer caching for faster rebuilds

3. **Security Checks**:
   - Trivy vulnerability scanning on filesystem
   - Results uploaded to GitHub Security tab

**Badges**: You can add the following to your README for CI/CD status:
```markdown
![CI/CD Pipeline](https://github.com/YOUR_USERNAME/AI-Resume-Analyzer/actions/workflows/ci.yml/badge.svg)
```

**To push images to Docker Hub**, add this secret to GitHub:
- Repository Settings → Secrets → New repository secret
- `DOCKERHUB_USERNAME` and `DOCKERHUB_PASSWORD`
- Modify workflow to add Docker Hub login step

## Quick Start (Docker Compose)

Make sure you have Docker and Docker Compose installed.

1. Clone the repository.
2. Ensure you have the required ports free (`80`, `8080`, `8081`, `8082`, `5000`, `5432`, `6379`, `9090`, `3000`).
3. Run the following command from the root directory:

```bash
docker-compose up --build -d
```

4. Wait for all containers to start up and become healthy.
5. Access the services:
   - **Frontend UI**: http://localhost
   - **Grafana Dashboards**: http://localhost:3000 (admin/admin)
   - **Prometheus**: http://localhost:9090

## API Documentation

Requests should be routed through the API Gateway (port 8080).

- `POST /auth/login` - Authenticate and receive JWT
- `POST /auth/register` - Register a new user
- `POST /api/resumes/analyze` - Upload a PDF resume for analysis

## Development Setup

If you wish to run services individually:

- **Spring Boot Services**: Use Java 17 and Maven (`mvn spring-boot:run`).
- **React Frontend**: Navigate to `frontend/` and run `npm install && npm run dev`.
- **Python AI Service**:
  ```bash
  cd ai-service
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  python -m spacy download en_core_web_sm
  flask run
  ```

## Monitoring Setup (Prometheus & Grafana)

The application includes comprehensive monitoring with Prometheus and Grafana.

### Quick Access

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (default credentials: `admin/admin`)

### Grafana Dashboards

Two pre-configured dashboards are automatically provisioned:

1. **Microservices Metrics Dashboard** (`ai-resume-services`)
   - HTTP request rate and duration (p95)
   - Microservice health status
   - JVM memory usage (MB)
   - JVM thread count
   - Service uptime

2. **System Resources Dashboard** (`ai-resume-resources`)
   - Container memory usage trends
   - CPU time consumption
   - Memory usage gauges for each service
   - HTTP request count
   - HTTP 5xx error rates

### Monitored Services & Metrics

**API Gateway** (port 8080):
- `http_server_requests_seconds` - Request latency
- `jvm_memory_used_bytes` - Memory usage
- `jvm_threads_live` - Active threads

**Auth Service** (port 8081):
- JWT authentication metrics
- Database connection pool stats
- Security event metrics

**Resume Service** (port 8082):
- Resume upload metrics
- AI service call duration
- Analysis completion rates

**AI Service** (port 5000):
- `ai_service_requests_total` - Total requests by endpoint/status
- `ai_service_request_duration_seconds` - Request latency histogram
- `ai_service_analysis_errors_total` - Error counts by type
- `ai_service_health_status` - Service health (1=healthy, 0=unhealthy)

**Database & Cache**:
- PostgreSQL connection metrics
- Redis cache hit/miss rates

### Adding Custom Dashboards

1. Open Grafana at http://localhost:3000
2. Click `+` → "Create" → "Dashboard"
3. Add panels with Prometheus queries:

Example queries:
```
# Request rate (per second)
rate(http_server_requests_seconds_count[5m])

# Error rate
rate(http_server_requests_seconds_count{status=~"5.."}[5m])

# Memory usage percentage
jvm_memory_used_bytes / jvm_memory_max_bytes * 100

# AI service health
ai_service_health_status
```

### Prometheus Configuration

Metrics scraping is configured in `monitoring/prometheus/prometheus.yml`:
- 15s scrape interval
- 15s evaluation interval
- 10 retries for failed scrapes
- Service discovery via Docker network DNS

### Metrics Retention & Storage

- Default retention: 15 days in-container
- Storage location: `prometheus-data` volume
- To increase retention, modify docker-compose.yml:
  ```yaml
  prometheus:
    command:
      - '--storage.tsdb.retention.time=30d'
  ```

## Environment Variables & API Keys

To unlock the full potential of advanced AI analytics (Strengths, Weaknesses, Industry Detection, Career Suggestions), you can provide a Groq API key. If not provided, the system falls back to a locally-run NLP heuristic using `spaCy` and `scikit-learn`.

### `GROQ_API_KEY`
- **Purpose**: Used by the AI Service to generate deep semantic insights, suggestions, and advanced resume parsing using the `llama3-70b-8192` model.
- **Where to obtain**: https://console.groq.com/keys
- **Pricing**: Groq offers a generous free tier for developers.
- **Setup Instructions**:
  1. Copy `ai-service/.env.example` to `ai-service/.env`.
  2. Paste your API key into the local file.
  3. Make sure `ai-service/.env` is not committed to source control.

### Example `.env` Configuration
```env
GROQ_API_KEY=your_groq_api_key_here
```

## Verification & Troubleshooting

### Verify All Services Are Running

```bash
# Check container status
docker-compose ps

# Expected output:
# - frontend-ui       → Up (port 80)
# - api-gateway       → Up (port 8080)
# - auth-service      → Up (port 8081)
# - resume-service    → Up (port 8082)
# - ai-service        → Up (port 5000)
# - postgres-db       → Up (port 5432)
# - redis-cache       → Up (port 6379)
# - prometheus        → Up (port 9090)
# - grafana           → Up (port 3000)
```

### Verify Metrics Are Being Collected

1. **Check Prometheus targets**:
   - Open http://localhost:9090/targets
   - All services should show "UP" status

2. **Query metrics in Prometheus**:
   ```
   - Go to http://localhost:9090/graph
   - Enter: up{job="api-gateway"}
   - Should return value 1
   ```

3. **Check Grafana datasource**:
   - Grafana → Configuration → Data Sources
   - Click "Prometheus"
   - Click "Test" - should show "Data source is working"

4. **View dashboards**:
   - Grafana → Dashboards → Browse
   - Should see "AI Resume Analyzer - Microservices Metrics" and "System Resources"

### Common Issues & Solutions

**Issue**: No metrics in Prometheus
- **Solution**: 
  1. Verify services are running: `docker-compose logs prometheus`
  2. Check Prometheus config: `docker-compose exec prometheus cat /etc/prometheus/prometheus.yml`
  3. Restart Prometheus: `docker-compose restart prometheus`

**Issue**: Grafana dashboards are empty
- **Solution**:
  1. Ensure datasource is configured (Settings → Data Sources → Prometheus)
  2. Verify Prometheus has data: http://localhost:9090/graph → query `up`
  3. Update dashboard time range (try "Last 1 hour" or "Last 5 minutes")

**Issue**: AI service metrics not appearing
- **Solution**:
  1. Check AI service is running: `docker-compose logs ai-service`
  2. Verify /metrics endpoint: `curl http://localhost:5000/metrics`
  3. Check prometheus.yml includes ai-service job

**Issue**: Docker Compose fails to start
- **Solution**:
  1. Free up required ports: 80, 8080, 8081, 8082, 5000, 5432, 6379, 9090, 3000
  2. Ensure Docker daemon is running
  3. Check logs: `docker-compose logs`
  4. Rebuild containers: `docker-compose down && docker-compose up --build -d`