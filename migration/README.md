
# Database Migration Guide

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
