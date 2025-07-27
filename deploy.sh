#!/bin/bash

# Deploy to Google Cloud Run
# This script builds and deploys the application to Google Cloud Run

set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="advocatr"
REGION="europe-west2"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying $SERVICE_NAME to Google Cloud Run..."
echo "📋 Project ID: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo "🐳 Image: $IMAGE_NAME"

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME .

# Push the image to Google Container Registry
echo "📤 Pushing image to Container Registry..."
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars NODE_ENV=production

echo "✅ Deployment complete!"
echo "🌐 Service URL: $(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')"
