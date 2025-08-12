# Deploy to Google Cloud Run
# This script builds and deploys the application to Google Cloud Run

# Stop on any error
$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = gcloud config get-value project
$SERVICE_NAME = "advocatr"
$REGION = "europe-west2"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host "Deploying $SERVICE_NAME to Google Cloud Run..." -ForegroundColor Green
Write-Host "Project ID: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan
Write-Host "Image: $IMAGE_NAME" -ForegroundColor Cyan

# Build the Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t $IMAGE_NAME .

# Push the image to Google Container Registry
Write-Host "Pushing image to Container Registry..." -ForegroundColor Yellow
docker push $IMAGE_NAME

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE_NAME `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 2Gi `
  --cpu 2 `
  --max-instances 10 `
  --timeout 300 `
  --concurrency 80 `
  --update-env-vars NODE_ENV=production

# Restore critical environment variables to prevent login issues
Write-Host "Restoring critical environment variables..." -ForegroundColor Yellow
gcloud run services update $SERVICE_NAME `
  --region $REGION `
  --set-env-vars "NODE_ENV=production,DATABASE_URL=postgresql://advocatr-cloudrun:Advocatr2024@35.230.134.172:5432/advocatr,SESSION_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678"

Write-Host "Deployment complete!" -ForegroundColor Green
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
Write-Host "Service URL: $SERVICE_URL" -ForegroundColor Green
Write-Host "Environment variables restored - login should continue working!" -ForegroundColor Green 