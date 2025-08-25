# 🔒 SECURITY SETUP GUIDE

## **CRITICAL: Database Credentials Exposed**

Your database credentials were exposed in the `deploy.ps1` script. **IMMEDIATE ACTION REQUIRED:**

### **1. Change Database Password (URGENT)**
```sql
-- Connect to your PostgreSQL database and run:
ALTER USER "advocatr-cloudrun" WITH PASSWORD 'NEW_STRONG_PASSWORD_HERE';
```

### **2. Generate New Session Secret**
```bash
# Generate a new random session secret
openssl rand -hex 32
```

### **3. Set Environment Variables Securely**

#### **Option A: Google Cloud Console (Recommended)**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to Cloud Run → advocatr service
3. Click "EDIT & DEPLOY NEW REVISION"
4. Under "Variables & Secrets" → "Environment variables"
5. Add:
   - `DATABASE_URL` = `postgresql://advocatr-cloudrun:NEW_PASSWORD@35.230.134.172:5432/advocatr`
   - `SESSION_SECRET` = `NEW_GENERATED_SECRET`
   - `NODE_ENV` = `production`

#### **Option B: Command Line (Less Secure)**
```bash
gcloud run services update advocatr \
  --region=europe-west2 \
  --set-env-vars="DATABASE_URL=postgresql://advocatr-cloudrun:NEW_PASSWORD@35.230.134.172:5432/advocatr,SESSION_SECRET=NEW_GENERATED_SECRET,NODE_ENV=production"
```

### **4. Verify Security**
- [ ] Database password changed
- [ ] New session secret generated
- [ ] Environment variables set in Cloud Run
- [ ] Old credentials removed from code
- [ ] GitHub repository cleaned of secrets

## **Best Practices Going Forward**

### **Never Store Secrets in Code**
- ❌ Hardcoded passwords
- ❌ Database connection strings in scripts
- ❌ API keys in source code
- ❌ Session secrets in version control

### **Always Use Environment Variables**
- ✅ Store secrets in Cloud Run environment variables
- ✅ Use Google Secret Manager for sensitive data
- ✅ Reference environment variables in code
- ✅ Keep deployment scripts secret-free

### **Regular Security Audits**
- Monthly password rotation
- Quarterly secret review
- Annual security assessment
- Monitor for exposed credentials

## **Emergency Contacts**
If you suspect unauthorized access:
1. **Immediately** change all database passwords
2. **Review** database access logs
3. **Contact** your database administrator
4. **Consider** database backup restoration if compromised

---

**⚠️ REMEMBER: Once secrets are committed to a public repository, consider them compromised and change them immediately!**
