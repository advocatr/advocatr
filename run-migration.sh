#!/bin/bash

# Standalone Database Migration Script
# This script runs the database migration using Cloud Run Jobs

set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="advocatr"
REGION="europe-west2"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🔄 Running database migration for $SERVICE_NAME..."
echo "📋 Project ID: $PROJECT_ID"
echo "🌍 Region: $REGION"

# Check if the service exists
if ! gcloud run services describe $SERVICE_NAME --region=$REGION >/dev/null 2>&1; then
    echo "❌ Service $SERVICE_NAME not found in region $REGION"
    echo "Please deploy the service first using ./deploy.sh"
    exit 1
fi

# Create a temporary migration job
echo "🔧 Creating migration job..."
gcloud run jobs create migrate-db-temp \
  --image $IMAGE_NAME \
  --region $REGION \
  --memory 1Gi \
  --cpu 1 \
  --max-retries 3 \
  --parallelism 1 \
  --task-count 1 \
  --set-env-vars NODE_ENV=production \
  --command node \
  --args migrate-db.js \
  --replace

# Execute the migration job
echo "🚀 Executing migration..."
gcloud run jobs execute migrate-db-temp \
  --region $REGION \
  --wait

# Clean up the temporary job
echo "🧹 Cleaning up migration job..."
gcloud run jobs delete migrate-db-temp \
  --region $REGION \
  --quiet

echo "✅ Database migration completed successfully!"
echo "🎉 Your video recording time limit feature is now live!"
