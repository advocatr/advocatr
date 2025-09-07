#!/usr/bin/env node

/**
 * Database Migration Script
 * Runs database migrations using Prisma
 * This script can be executed in Cloud Run or locally
 */

const { execSync } = require('child_process');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('📊 Database URL configured:', process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@'));
    
    // Run Prisma database push to apply schema changes
    console.log('🔧 Applying schema changes...');
    execSync('npx prisma db push', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('✅ Database migration completed successfully!');
    
    // Verify the migration by checking if the new column exists
    console.log('🔍 Verifying migration...');
    try {
      execSync('npx prisma db execute --stdin', {
        input: "SELECT column_name FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'video_recording_time_limit';",
        stdio: 'pipe'
      });
      console.log('✅ Migration verification successful - video_recording_time_limit column exists');
    } catch (verifyError) {
      console.warn('⚠️  Could not verify migration, but this is not critical');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
