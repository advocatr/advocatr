
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Load environment variables
dotenv.config();

// Dynamically import modules
async function setupDatabase() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log('DATABASE_URL is not set. Please create a PostgreSQL database in Replit.');
      console.log('Follow these steps:');
      console.log('1. Open a new tab in Replit and type "Database"');
      console.log('2. Click "create a database"');
      console.log('3. Once created, Replit will set up the DATABASE_URL environment variable');
      process.exit(1);
    }

    console.log('Database URL is configured correctly.');

    // Import schema and db modules
    const schema = await import('./db/schema.js');
    
    // Create database connection
    const client = postgres(process.env.DATABASE_URL);
    const db = drizzle(client, { schema });

    // Check if exercises exist
    const existingExercises = await db.query.exercises.findMany();
    
    // Only add exercises if none exist
    if (!existingExercises || existingExercises.length === 0) {
      console.log("No exercises found. Adding sample exercises...");
      
      try {
        await db.insert(schema.exercises).values([
          {
            title: "Introduction to Public Speaking",
            description: "Learn the basics of public speaking and how to structure a speech.",
            demoVideoUrl: "https://example.com/intro-demo",
            professionalAnswerUrl: "https://example.com/intro-pro",
            order: 1
          },
          {
            title: "Body Language and Posture",
            description: "Master the art of body language and professional posture.",
            demoVideoUrl: "https://example.com/body-language-demo",
            professionalAnswerUrl: "https://example.com/body-language-pro",
            order: 2
          },
          {
            title: "Voice Projection Techniques",
            description: "Learn techniques to improve your voice projection and clarity.",
            demoVideoUrl: "https://example.com/voice-demo",
            professionalAnswerUrl: "https://example.com/voice-pro",
            order: 3
          }
        ]);
        console.log("Successfully added sample exercises!");
      } catch (error) {
        console.error("Error adding exercises:", error);
      }
    } else {
      console.log(`Found ${existingExercises.length} existing exercises.`);
    }

    // Run database migrations
    console.log('Running database migrations...');
    execSync('npm run db:push', { stdio: 'inherit' });
    console.log('Database migrations completed successfully.');
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
