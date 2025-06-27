
import { GoogleGenerativeAI } from '@google/generative-ai';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

interface FrameData {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export class VideoProcessor {
  private genai: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    // Clean and validate the API key
    const cleanApiKey = this.sanitizeApiKey(apiKey);
    this.genai = new GoogleGenerativeAI(cleanApiKey);
    this.model = this.genai.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  private sanitizeApiKey(apiKey: string): string {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key: must be a non-empty string');
    }

    // Remove any non-ASCII characters and whitespace
    const cleaned = apiKey.replace(/[^\x20-\x7E]/g, '').trim();
    
    if (!cleaned) {
      throw new Error('Invalid API key: contains only invalid characters');
    }

    // Basic format validation for Google API keys
    if (!cleaned.match(/^AIza[0-9A-Za-z_-]{35}$/)) {
      console.warn('API key does not match expected Google API key format');
    }

    return cleaned;
  }

  /**
   * Extract frames from video at specified intervals
   */
  async extractFrames(
    videoBuffer: Buffer, 
    intervalSec: number = 2, 
    maxFrames: number = 20
  ): Promise<FrameData[]> {
    const tempDir = path.join(process.cwd(), 'temp');
    await mkdir(tempDir, { recursive: true });

    const tempVideoPath = path.join(tempDir, `video_${Date.now()}.webm`);
    const framesDir = path.join(tempDir, `frames_${Date.now()}`);
    
    try {
      // Write video buffer to temporary file
      await writeFile(tempVideoPath, videoBuffer);
      await mkdir(framesDir, { recursive: true });

      console.log('Extracting frames from video...');

      // Extract frames using ffmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .output(path.join(framesDir, 'frame_%03d.jpg'))
          .outputOptions([
            '-vf', `fps=1/${intervalSec}`, // Extract one frame every intervalSec seconds
            '-frames:v', maxFrames.toString(), // Limit number of frames
            '-q:v', '2' // High quality JPEG
          ])
          .on('end', () => {
            console.log('Frame extraction completed');
            resolve();
          })
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            reject(err);
          })
          .run();
      });

      // Read extracted frames and convert to base64
      const frameFiles = fs.readdirSync(framesDir)
        .filter(file => file.endsWith('.jpg'))
        .sort()
        .slice(0, maxFrames);

      const frames: FrameData[] = [];

      for (const frameFile of frameFiles) {
        const framePath = path.join(framesDir, frameFile);
        
        // Use sharp to optimize the image and convert to base64
        const optimizedBuffer = await sharp(framePath)
          .jpeg({ quality: 80 })
          .resize(1024, null, { withoutEnlargement: true })
          .toBuffer();

        const base64Data = optimizedBuffer.toString('base64');

        frames.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        });

        // Clean up frame file
        await unlink(framePath);
      }

      console.log(`Extracted ${frames.length} frames for analysis`);
      return frames;

    } finally {
      // Clean up temporary files
      try {
        await unlink(tempVideoPath);
        fs.rmSync(framesDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Cleanup error:', cleanupError);
      }
    }
  }

  /**
   * Analyze video using Gemini
   */
  async analyzeVideo(
    videoBuffer: Buffer,
    prompt: string,
    intervalSec: number = 2,
    maxFrames: number = 15
  ): Promise<{ content: string; confidenceScore: number }> {
    try {
      console.log('Starting video analysis with Gemini...');

      // Extract frames from video
      const frames = await this.extractFrames(videoBuffer, intervalSec, maxFrames);

      if (frames.length === 0) {
        throw new Error('No frames could be extracted from the video');
      }

      // Prepare the prompt parts
      const promptParts = [
        prompt,
        `\n\nAnalyze the following ${frames.length} frames extracted from the video:`,
        ...frames
      ];

      // Make API call to Gemini
      console.log(`Sending ${frames.length} frames to Gemini for analysis...`);
      const result = await this.model.generateContent(promptParts);
      const response = await result.response;
      const content = response.text();

      if (!content) {
        throw new Error('No content received from Gemini API');
      }

      // Calculate confidence score based on response length and frame count
      const confidenceScore = Math.min(95, 60 + (frames.length * 2) + Math.min(content.length / 50, 20));

      console.log('Video analysis completed successfully');
      return {
        content,
        confidenceScore: Math.round(confidenceScore)
      };

    } catch (error) {
      console.error('Video analysis failed:', error);
      throw new Error(`Video analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test the Gemini API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Gemini API connection...');
      const result = await this.model.generateContent('Test message: please respond with "API connection successful"');
      const response = await result.response;
      const text = response.text();
      console.log('Gemini API test response:', text);
      return text.toLowerCase().includes('successful');
    } catch (error) {
      console.error('Gemini API test failed:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('ByteString')) {
          console.error('API key contains invalid characters. Please ensure your API key is clean ASCII text.');
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          console.error('API key is invalid or unauthorized.');
        } else if (error.message.includes('403') || error.message.includes('forbidden')) {
          console.error('API key does not have permission to access this service.');
        }
      }
      
      return false;
    }
  }
}
