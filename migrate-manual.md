# Manual Database Migration Guide

If you prefer to run the migration manually, here are several approaches:

## Option 1: Using Cloud Run Jobs (Recommended)

```bash
# Make the script executable
chmod +x run-migration.sh

# Run the migration
./run-migration.sh
```

## Option 2: Using Cloud SQL Proxy

### Step 1: Install Cloud SQL Proxy
```bash
# Download and install Cloud SQL Proxy
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
chmod +x cloud_sql_proxy
```

### Step 2: Get your Cloud SQL connection name
```bash
# Get the connection name for your Cloud SQL instance
gcloud sql instances describe YOUR_INSTANCE_NAME --format="value(connectionName)"
```

### Step 3: Run the proxy and migration
```bash
# Start the proxy (replace YOUR_CONNECTION_NAME)
./cloud_sql_proxy -instances=YOUR_CONNECTION_NAME=tcp:5432 &

# Set your local DATABASE_URL
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Run the migration
node migrate-db.js
```

## Option 3: Direct Cloud SQL Connection

### Step 1: Connect to Cloud SQL
```bash
# Connect to your Cloud SQL instance
gcloud sql connect YOUR_INSTANCE_NAME --user=postgres
```

### Step 2: Run the migration SQL
```sql
-- Run this SQL in your Cloud SQL instance
ALTER TABLE exercises 
ADD COLUMN video_recording_time_limit INTEGER DEFAULT 300;

-- Add comment to explain the field
COMMENT ON COLUMN exercises.video_recording_time_limit IS 'Maximum recording duration in seconds (default: 300 = 5 minutes)';
```

## Option 4: Using Cloud Shell

1. Go to [Google Cloud Shell](https://shell.cloud.google.com)
2. Clone your repository
3. Set up your environment variables
4. Run the migration script

```bash
# In Cloud Shell
git clone https://github.com/your-username/advocatr.git
cd advocatr
export DATABASE_URL="your-database-url"
node migrate-db.js
```

## Verification

After running any of these methods, verify the migration worked:

```sql
-- Check if the column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'exercises' 
AND column_name = 'video_recording_time_limit';
```

You should see:
- column_name: video_recording_time_limit
- data_type: integer
- column_default: 300
