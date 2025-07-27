
# Advocatr - Legal Advocacy Training Platform

A comprehensive platform for legal advocacy training with AI-powered feedback and video analysis.

## 🚀 Deployment to Google Cloud Run

This application is configured for deployment to Google Cloud Run in the `europe-west2` region.

### Prerequisites

1. **Google Cloud CLI** installed and authenticated
2. **Docker** installed and running
3. **Node.js 18+** for local development

### Quick Deployment

#### Option 1: Using PowerShell Script (Windows)
```powershell
.\deploy.ps1
```

#### Option 2: Using Bash Script (Linux/Mac)
```bash
./deploy.sh
```

#### Option 3: Manual Deployment
```bash
# Build and push the Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/advocatr .
docker push gcr.io/YOUR_PROJECT_ID/advocatr

# Deploy to Cloud Run
gcloud run deploy advocatr \
  --image gcr.io/YOUR_PROJECT_ID/advocatr \
  --region europe-west2 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars NODE_ENV=production
```

### Environment Variables

Set these environment variables in your Cloud Run service:

- `DATABASE_URL` - Your PostgreSQL connection string
- `NODE_ENV` - Set to "production"
- `PORT` - Set to 8080 (default)
- Any API keys for external services (Google AI, etc.)

### Configuration Files

- `Dockerfile` - Multi-stage Docker build for production
- `cloudbuild.yaml` - Automated CI/CD pipeline
- `service.yaml` - Cloud Run service configuration
- `.dockerignore` - Optimized Docker build context

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Database Migration Guide

This directory contains all the necessary files to migrate your database to another platform.

## Files Generated

1. **schema.sql** - Complete database schema with all tables and indexes
2. **exported-data/** - Directory containing JSON exports of all data
3. **import-data.sql** - SQL script to import all data into new database
4. **complete-export.json** - Combined export file with all data

## Migration Steps

### 1. Export Current Data
```bash
node migration/export-data.js
```

### 2. Generate SQL Schema and Import Scripts
```bash
node migration/generate-sql-schema.js
node migration/generate-import-sql.js
```

### 3. Set Up New Database
1. Create a new PostgreSQL database on your target platform
2. Run the schema.sql file to create all tables and indexes
3. Run the import-data.sql file to populate the data

### 4. Verify Migration
After importing, verify that:
- All tables have been created
- All data has been imported correctly
- All relationships and constraints are working
- Indexes are in place for performance

## Platform-Specific Notes

### For PostgreSQL (Recommended)
- Schema is already PostgreSQL compatible
- Use psql or pgAdmin to run the SQL files

### For MySQL
- Convert SERIAL to AUTO_INCREMENT
- Convert BOOLEAN to TINYINT(1)
- Adjust TIMESTAMP syntax if needed

### For SQLite
- Remove SERIAL and use INTEGER PRIMARY KEY AUTOINCREMENT
- Convert arrays to JSON or separate tables
- Adjust date/time handling

## Environment Variables Needed

Make sure to set up these environment variables in your new platform:
- DATABASE_URL
- Any API keys for external services
- Email configuration (if using email features)

## File Structure After Migration

Your new application will need:
- Database connection configuration
- Updated environment variables
- Any platform-specific deployment configurations
