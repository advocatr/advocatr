
# Environment Variables for Cloud Run

## Required Variables
These environment variables must be set in your Cloud Run service:

### Database
```
DATABASE_URL=postgresql://username:password@host:port/database
```

### Application Settings
```
NODE_ENV=production
PORT=8080
```

### Session Configuration (if using sessions)
```
SESSION_SECRET=your-secure-random-string
```

### Email Configuration (if using email features)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### AI Model Configuration (if using AI features)
```
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
```

## Setting Environment Variables in Cloud Run

### Via Google Cloud Console:
1. Go to Cloud Run service
2. Click "Edit & Deploy New Revision"
3. Go to "Variables & Secrets" tab
4. Add environment variables

### Via gcloud CLI:
```bash
gcloud run services update advocatr-app \
  --set-env-vars DATABASE_URL="your-connection-string" \
  --set-env-vars NODE_ENV="production" \
  --region us-central1
```

### Via cloudbuild.yaml:
Add to the deploy step:
```yaml
- '--set-env-vars'
- 'DATABASE_URL=your-connection-string,NODE_ENV=production'
```
