import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

// Constants for video dimensions
const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;

export async function POST(request: Request) {
  try {
    const { text, videoUrl } = await request.json();

    if (!text || !videoUrl) {
      return NextResponse.json(
        { error: 'Text and video URL are required' },
        { status: 400 }
      );
    }

    // Create temporary files for processing
    const inputPath = join(tmpdir(), `input-${Date.now()}.mp4`);
    const outputPath = join(tmpdir(), `output-${Date.now()}.mp4`);

    // Download the video
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = await videoResponse.arrayBuffer();
    await writeFile(inputPath, Buffer.from(videoBuffer));

    // First, get video dimensions
    const { stdout: videoInfo } = await execAsync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of json ${inputPath}`
    );
    const { streams: [{ width, height, duration }] } = JSON.parse(videoInfo);

    // Calculate crop parameters
    const videoAspectRatio = width / height;
    const targetAspectRatio = TARGET_HEIGHT / TARGET_WIDTH;
    let cropW, cropH, x, y;

    if (videoAspectRatio > targetAspectRatio) {
      // Video is wider than target - crop sides
      cropH = height;
      cropW = Math.round(height * (TARGET_WIDTH / TARGET_HEIGHT));
      x = Math.round((width - cropW) / 2);
      y = 0;
    } else {
      // Video is taller than target - crop top/bottom
      cropW = width;
      cropH = Math.round(width * (TARGET_HEIGHT / TARGET_WIDTH));
      x = 0;
      y = Math.round((height - cropH) / 2);
    }

    // Calculate font size based on video width
    const fontSize = Math.floor(TARGET_WIDTH / 20); // Responsive font size
    
    // Prepare text for FFmpeg (escape special characters)
    const escapedText = text.replace(/'/g, "'\\''");

    // Build FFmpeg command with crop and text overlay
    const ffmpegCommand = `ffmpeg -i ${inputPath} `
      + `-vf "`
      + `crop=${cropW}:${cropH}:${x}:${y},` // Crop to 9:16
      + `scale=${TARGET_WIDTH}:${TARGET_HEIGHT},` // Scale to target dimensions
      + `drawtext=`
      + `text='${escapedText}':`
      + `fontcolor=white:`
      + `fontsize=${fontSize}:`
      + `box=1:`
      + `boxcolor=black@0.5:`
      + `boxborderw=5:`
      + `x=(w-text_w)/2:`
      + `y=h-h/4:` // Position in lower third
      + `font=Arial:`
      + `line_spacing=10:`
      + `textfile_enable=0:` // Disable text file mode
      + `text_wrap=1:` // Enable text wrapping
      + `text_width=w-100" ` // Width for text wrapping (50px padding each side)
      + `-c:a copy `
      + outputPath;

    // Process the video
    await execAsync(ffmpegCommand);

    // Upload to Vercel Blob
    const outputBuffer = await readFile(outputPath);
    const filename = `videos/${Date.now()}-overlay-vertical.mp4`;
    const blob = await put(filename, outputBuffer, {
      access: 'public',
      contentType: 'video/mp4'
    });

    // Clean up temporary files
    await Promise.all([
      unlink(inputPath),
      unlink(outputPath),
    ]);

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500 }
    );
  }
} 