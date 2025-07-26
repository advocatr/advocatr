
#!/bin/bash

# Google Cloud Run Deployment Script
# Make sure you have gcloud CLI installed and authenticated

PROJECT_ID="your-project-id"
SERVICE_NAME="advocatr-app"
REGION="us-central1"

echo "Building and deploying to Google Cloud Run..."

# Build and deploy using gcloud
gcloud run deploy $SERVICE_NAME \
  --source . \
  --project $PROJECT_ID \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production

echo "Deployment complete!"
echo "Your service URL:"
gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'
