
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Dynamically import modules
async function setupDatabase() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log('DATABASE_URL is not set. Please create a PostgreSQL database.');
      process.exit(1);
    }

    console.log('Database URL is configured correctly.');

    // Create Prisma client
    const prisma = new PrismaClient();

    // Check if exercises exist
    const existingExercises = await prisma.exercise.findMany();
    
    // Only add exercises if none exist
    if (!existingExercises || existingExercises.length === 0) {
      console.log("No exercises found. Adding sample exercises...");
      
      try {
        await prisma.exercise.createMany({
          data: [
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
          ]
        });
        console.log("Successfully added sample exercises!");
      } catch (error) {
        console.error("Error adding exercises:", error);
      }
    } else {
      console.log(`Found ${existingExercises.length} existing exercises.`);
    }

    // Run database migrations
    console.log('Running database migrations...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('Database migrations completed successfully.');
    
    await prisma.$disconnect();
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
