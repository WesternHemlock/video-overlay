"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface VideoOverlayProps {
  videoUrl: string
  overlayText: string
}

export default function VideoOverlay({ videoUrl, overlayText }: VideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 })

  // Constants for target aspect ratio
  const TARGET_WIDTH = 1080
  const TARGET_HEIGHT = 1920
  const TARGET_ASPECT_RATIO = TARGET_HEIGHT / TARGET_WIDTH

  // Updated text constants for better vertical video display
  const TEXT_PADDING = 40
  const BASE_FONT_SIZE = Math.floor(TARGET_WIDTH / 20) // Responsive font size
  const LINE_HEIGHT = Math.floor(BASE_FONT_SIZE * 1.5) // Proportional line height

  // Handle video metadata loaded to get dimensions and calculate crop
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleMetadataLoaded = () => {
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight
      
      // Calculate dimensions that maintain aspect ratio
      let cropWidth = videoWidth
      let cropHeight = videoWidth * TARGET_ASPECT_RATIO
      
      if (cropHeight > videoHeight) {
        cropHeight = videoHeight
        cropWidth = videoHeight / TARGET_ASPECT_RATIO
      }

      setVideoDimensions({
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      })
      setVideoLoaded(true)
    }

    video.addEventListener("loadedmetadata", handleMetadataLoaded)

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadataLoaded)
    }
  }, [videoUrl])

  // Draw video and text on canvas
  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !videoLoaded) return

    canvas.width = TARGET_WIDTH
    canvas.height = TARGET_HEIGHT

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number

    const drawFrame = () => {
      // Calculate source dimensions for cropping
      const videoAspectRatio = video.videoWidth / video.videoHeight
      let sourceX = 0
      let sourceY = 0
      let sourceWidth = video.videoWidth
      let sourceHeight = video.videoHeight

      if (videoAspectRatio > 9/16) {
        // Video is wider than target ratio - crop sides
        sourceWidth = video.videoHeight * (9/16)
        sourceX = (video.videoWidth - sourceWidth) / 2
      } else {
        // Video is taller than target ratio - crop top/bottom
        sourceHeight = video.videoWidth * (16/9)
        sourceY = (video.videoHeight - sourceHeight) / 2
      }

      // Clear canvas and draw cropped video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(
        video,
        sourceX, sourceY, sourceWidth, sourceHeight,  // Source dimensions
        0, 0, TARGET_WIDTH, TARGET_HEIGHT             // Destination dimensions
      )

      // Draw text overlay with updated measurements
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      const textWidth = TARGET_WIDTH - (TEXT_PADDING * 2)
      const textBoxHeight = calculateTextHeight(ctx, overlayText, textWidth)
      
      // Position the text box in the lower third of the video
      const textBoxY = (TARGET_HEIGHT * 0.7) - (textBoxHeight / 2)
      ctx.fillRect(0, textBoxY, TARGET_WIDTH, textBoxHeight)

      // Text styling
      ctx.fillStyle = "white"
      ctx.font = `bold ${BASE_FONT_SIZE}px Arial`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Draw wrapped text
      drawWrappedText(
        ctx,
        overlayText,
        TARGET_WIDTH / 2,
        textBoxY + textBoxHeight / 2,
        textWidth,
        LINE_HEIGHT
      )

      animationId = requestAnimationFrame(drawFrame)
    }

    if (isPlaying) {
      animationId = requestAnimationFrame(drawFrame)
    } else {
      // Draw a single frame when paused
      drawFrame()
    }

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isPlaying, videoLoaded, videoDimensions, overlayText])

  // Handle play/pause
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Function to calculate text height based on wrapping
  const calculateTextHeight = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number => {
    const words = text.split(" ")
    let lines = 1
    let currentLine = words[0]

    // Set font here to ensure accurate measurements
    ctx.font = `bold ${BASE_FONT_SIZE}px Arial`

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const width = ctx.measureText(currentLine + " " + word).width

      if (width < maxWidth) {
        currentLine += " " + word
      } else {
        currentLine = word
        lines++
      }
    }

    return lines * LINE_HEIGHT + TEXT_PADDING * 2 // Padding top and bottom
  }

  // Function to draw wrapped text
  const drawWrappedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ) => {
    const words = text.split(" ")
    const lines: string[] = []
    let currentLine = words[0]

    // Set font here to ensure consistent rendering
    ctx.font = `bold ${BASE_FONT_SIZE}px Arial`

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const width = ctx.measureText(currentLine + " " + word).width

      if (width < maxWidth) {
        currentLine += " " + word
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    lines.push(currentLine)

    // Calculate starting y position to center text block
    const startY = y - (lines.length * lineHeight) / 2 + lineHeight / 2

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, startY + i * lineHeight)
    }
  }

  // Function to download the canvas as an image
  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement("a")
    link.download = "video-with-text.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Hidden video element for loading the video */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Canvas for displaying video with text overlay */}
      <div className="relative flex-1 overflow-hidden rounded-lg shadow-lg">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
      </div>

      <div className="flex gap-2 mt-2">
        <Button onClick={togglePlay}>
          {isPlaying ? "Pause" : "Play"}
        </Button>
      </div>
    </div>
  )
} 