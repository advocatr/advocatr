import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportData() {
  console.log('Starting data export...');

  const exportDir = './migration/exported-data';
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  try {
    // Export users (excluding passwords for security)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });
    fs.writeFileSync(path.join(exportDir, 'users.json'), JSON.stringify(users, null, 2));
    console.log(`Exported ${users.length} users`);

    // Export exercises
    const exercises = await prisma.exercise.findMany();
    fs.writeFileSync(path.join(exportDir, 'exercises.json'), JSON.stringify(exercises, null, 2));
    console.log(`Exported ${exercises.length} exercises`);

    // Export user progress
    const userProgress = await prisma.userProgress.findMany();
    fs.writeFileSync(path.join(exportDir, 'userProgress.json'), JSON.stringify(userProgress, null, 2));
    console.log(`Exported ${userProgress.length} user progress records`);

    // Export feedback
    const feedback = await prisma.feedback.findMany();
    fs.writeFileSync(path.join(exportDir, 'feedback.json'), JSON.stringify(feedback, null, 2));
    console.log(`Exported ${feedback.length} feedback records`);

    // Export password reset tokens
    const passwordResetTokens = await prisma.passwordResetToken.findMany();
    fs.writeFileSync(path.join(exportDir, 'passwordResetTokens.json'), JSON.stringify(passwordResetTokens, null, 2));
    console.log(`Exported ${passwordResetTokens.length} password reset tokens`);

    // Export tools
    const tools = await prisma.tool.findMany();
    fs.writeFileSync(path.join(exportDir, 'tools.json'), JSON.stringify(tools, null, 2));
    console.log(`Exported ${tools.length} tools`);

    // Export AI models (excluding API keys for security)
    const aiModels = await prisma.aIModel.findMany({
      select: {
        id: true,
        name: true,
        provider: true,
        endpoint: true,
        model: true,
        temperature: true,
        maxTokens: true,
        systemPrompt: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true
      }
    });
    fs.writeFileSync(path.join(exportDir, 'aiModels.json'), JSON.stringify(aiModels, null, 2));
    console.log(`Exported ${aiModels.length} AI models`);

    // Create a combined export file
    const combinedData = {
      exportDate: new Date().toISOString(),
      tables: {
        users,
        exercises,
        userProgress,
        feedback,
        passwordResetTokens,
        tools,
        aiModels
      }
    };

    fs.writeFileSync(
      path.join(exportDir, 'complete-export.json'),
      JSON.stringify(combinedData, null, 2)
    );

    console.log('Data export completed successfully!');
    console.log('Exported data saved to:', exportDir);

  } catch (error) {
    console.error('Error exporting data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();