
# Google Cloud Run Migration Guide

## Overview
This guide provides step-by-step instructions for migrating your application from Replit to Google Cloud Run.

## Prerequisites
- Google Cloud Account with billing enabled
- Google Cloud CLI installed and configured
- Docker installed locally
- Access to your source code and database backup

## Migration Steps

### 1. Database Migration
Your PostgreSQL database needs to be migrated to Google Cloud SQL or another managed PostgreSQL service.

#### Option A: Google Cloud SQL (Recommended)
1. Create a Cloud SQL PostgreSQL instance
2. Import your schema and data using the provided migration files
3. Update your DATABASE_URL environment variable

#### Option B: External PostgreSQL (Supabase, etc.)
1. Keep your existing Supabase database
2. Ensure firewall rules allow Cloud Run connections

### 2. Environment Setup
Create a `.env.production` file with your production environment variables:

```bash
DATABASE_URL=your_cloud_sql_connection_string
NODE_ENV=production
PORT=8080
# Add other environment variables as needed
```

### 3. Application Configuration
The application is already configured for Cloud Run deployment:
- Uses port 8080 (Cloud Run default)
- Stateless design
- External database connectivity
- Proper error handling

### 4. Build and Deploy
Use the provided Dockerfile and deployment scripts to build and deploy to Cloud Run.

### 5. Domain and SSL
Configure custom domain and SSL certificates through Google Cloud Console.

## Files Included in Migration Package
- `Dockerfile` - Container configuration
- `cloudbuild.yaml` - Build configuration
- `.dockerignore` - Docker ignore rules
- `deploy.sh` - Deployment script
- Database migration files in `/migration` directory

## Cost Estimation
Cloud Run pricing is based on:
- CPU and memory allocation during request processing
- Number of requests
- Outbound network traffic

Estimated monthly cost for moderate traffic: $10-50/month

## Post-Migration Checklist
- [ ] Database migrated successfully
- [ ] Environment variables configured
- [ ] Application deployed and accessible
- [ ] Custom domain configured (if needed)
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented

## Support
For issues during migration, consult the Google Cloud Run documentation or contact Google Cloud Support.
# Google Cloud Run Migration Guide

This guide will help you migrate your application from Replit to Google Cloud Run with Cloud SQL PostgreSQL.

## Prerequisites

1. Google Cloud Platform account with billing enabled
2. Google Cloud CLI installed locally
3. Docker installed locally (or use Cloud Build)

## Step 1: Export Your Current Data

Run the data export script to backup all your data:

```bash
node migration/export-data.js
node migration/generate-sql-schema.js
node migration/generate-import-sql.js
```

This will create:
- `migration/exported-data/` - JSON files with all your data
- `migration/schema.sql` - Database schema
- `migration/import-data.sql` - Data import script

## Step 2: Set Up Google Cloud Services

### Enable Required APIs
```bash
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Create Cloud SQL Instance
```bash
gcloud sql instances create advocatr-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB
```

### Create Database
```bash
gcloud sql databases create advocatr --instance=advocatr-db
```

### Create Database User
```bash
gcloud sql users create app-user \
  --instance=advocatr-db \
  --password=your-secure-password
```

## Step 3: Import Your Database

### Connect to Cloud SQL
```bash
gcloud sql connect advocatr-db --user=postgres
```

### Import Schema and Data
```sql
-- In the psql prompt:
\i /path/to/migration/schema.sql
\i /path/to/migration/import-data.sql
```

## Step 4: Prepare Application for Cloud Run

### Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
```

### Update Environment Variables
Create a `.env.production` file:
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://app-user:your-secure-password@/advocatr?host=/cloudsql/your-project:us-central1:advocatr-db
# Add other environment variables as needed
```

### Update package.json Scripts
Make sure your start script is production-ready:
```json
{
  "scripts": {
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

## Step 5: Deploy to Cloud Run

### Build and Deploy with Cloud Build
```bash
gcloud run deploy advocatr-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances your-project:us-central1:advocatr-db \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --set-env-vars DATABASE_URL="postgresql://app-user:your-secure-password@/advocatr?host=/cloudsql/your-project:us-central1:advocatr-db"
```

### Alternative: Using cloudbuild.yaml
Create a `cloudbuild.yaml` file for more control:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/advocatr-app', '.']
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/advocatr-app']
  
  # Deploy container image to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
    - 'run'
    - 'deploy'
    - 'advocatr-app'
    - '--image'
    - 'gcr.io/$PROJECT_ID/advocatr-app'
    - '--region'
    - 'us-central1'
    - '--platform'
    - 'managed'
    - '--allow-unauthenticated'
    - '--add-cloudsql-instances'
    - '$PROJECT_ID:us-central1:advocatr-db'

images:
- gcr.io/$PROJECT_ID/advocatr-app
```

## Step 6: Configure Environment Variables

### Set Environment Variables in Cloud Run
```bash
gcloud run services update advocatr-app \
  --region us-central1 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars PORT=8080 \
  --set-env-vars DATABASE_URL="postgresql://app-user:your-secure-password@/advocatr?host=/cloudsql/your-project:us-central1:advocatr-db"
```

## Step 7: Set Up Domain and SSL

### Map Custom Domain
```bash
gcloud run domain-mappings create --service advocatr-app --domain your-domain.com --region us-central1
```

## Step 8: Configure CI/CD (Optional)

### GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

env:
  PROJECT_ID: your-project-id
  SERVICE: advocatr-app
  REGION: us-central1

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v2

    - name: Setup Cloud SDK
      uses: google-github-actions/setup-gcloud@v0
      with:
        project_id: ${{ env.PROJECT_ID }}
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        export_default_credentials: true

    - name: Build and Deploy
      run: |
        gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE
        gcloud run deploy $SERVICE \
          --image gcr.io/$PROJECT_ID/$SERVICE \
          --platform managed \
          --region $REGION \
          --allow-unauthenticated \
          --add-cloudsql-instances $PROJECT_ID:$REGION:advocatr-db
```

## Monitoring and Maintenance

### Set Up Monitoring
- Enable Cloud Monitoring for your Cloud Run service
- Set up alerts for error rates and latency
- Monitor Cloud SQL performance

### Backup Strategy
- Enable automated backups for Cloud SQL
- Consider implementing application-level data exports

### Security Considerations
- Use IAM roles and service accounts
- Enable VPC connector for private networking
- Regularly update dependencies
- Use secrets manager for sensitive configuration

## Cost Optimization

- Use Cloud Run's pay-per-use model
- Configure appropriate CPU and memory limits
- Set up scaling configuration to handle traffic efficiently
- Monitor and optimize Cloud SQL instance size

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure Cloud SQL instance is running and accessible
2. **Environment Variables**: Verify all required env vars are set
3. **Build Failures**: Check Dockerfile and build logs
4. **Cold Starts**: Configure min instances if needed

### Useful Commands
```bash
# View service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=advocatr-app" --limit 50

# Check service status
gcloud run services describe advocatr-app --region us-central1

# Update service
gcloud run services replace service.yaml --region us-central1
```

This migration will provide you with a scalable, production-ready deployment on Google Cloud Platform.
