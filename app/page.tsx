'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import VideoOverlay from "@/components/VideoOverlay"

interface BlobResponse {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

export default function VideoOverlayPage() {
  const [videoUrl, setVideoUrl] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BlobResponse | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/video-overlay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          text,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process video')
      }

      const data = await response.json()
      setResult(data)
      toast.success("Video processed successfully")
    } catch (error) {
      console.error('Error:', error)
      toast.error("Failed to process video. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = () => {
    if (videoUrl && text) {
      setShowPreview(true)
    } else {
      toast.error("Please enter both video URL and text")
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Add Text Overlay to Video</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="Video URL (MP4)"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value)
                  setShowPreview(false)
                }}
                required
                pattern=".*\.mp4$"
                title="Please enter a valid MP4 video URL"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Text to overlay"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setShowPreview(false)
                }}
                required
                maxLength={100}
              />
            </div>
            <div className="flex gap-4">
              <Button 
                type="button"
                variant="secondary"
                onClick={handlePreview}
                disabled={loading || !videoUrl || !text}
              >
                Preview
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Process Video'}
              </Button>
            </div>
          </form>

          {showPreview && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Preview</h3>
              <VideoOverlay videoUrl={videoUrl} overlayText={text} />
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">Processed Video:</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => window.open(result.url, '_blank')}
                >
                  View Video
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(result.url)}
                >
                  Copy URL
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
