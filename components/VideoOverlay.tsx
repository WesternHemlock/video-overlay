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

  // Handle video metadata loaded to get dimensions
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleMetadataLoaded = () => {
      setVideoDimensions({
        width: video.videoWidth,
        height: video.videoHeight,
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

    canvas.width = videoDimensions.width
    canvas.height = videoDimensions.height

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number

    const drawFrame = () => {
      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Draw text overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      const textBoxHeight = calculateTextHeight(ctx, overlayText, canvas.width - 40)
      ctx.fillRect(0, (canvas.height - textBoxHeight) / 2, canvas.width, textBoxHeight)

      // Text styling
      ctx.fillStyle = "white"
      ctx.font = "bold 32px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Draw wrapped text
      drawWrappedText(ctx, overlayText, canvas.width / 2, canvas.height / 2, canvas.width - 40, 40)

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
    const lineHeight = 40
    let lines = 1
    let currentLine = words[0]

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

    return lines * lineHeight + 40 // Add padding
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