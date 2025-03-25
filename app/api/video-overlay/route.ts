import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

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

    // Process video with ffmpeg
    const ffmpegCommand = `ffmpeg -i ${inputPath} -vf "drawtext=text='${text}':fontcolor=white:fontsize=72:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=(h-text_h)/2:font=Arial:enable='between(t,0,20)'" -codec:a copy ${outputPath}`;
    
    await execAsync(ffmpegCommand);

    // Upload to Vercel Blob with a more structured filename
    const outputBuffer = await readFile(outputPath);
    const filename = `videos/${Date.now()}-overlay.mp4`;
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