"use client"

import type React from "react"

import { useState } from "react"
import { Upload, BarChart3, Clock, Music, Video, AlertCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GoogleTakeoutAuth } from "@/components/google-takeout-auth"
import Aurora from "@/components/aurora"

import Link from "next/link"

interface YouTubeEntry {
  header: string
  title: string
  titleUrl: string
  subtitles: Array<{
    name: string
    url: string
  }>
  time: string
  products: string[]
  activityControls: string[]
}

interface ChannelRegularStats {
  name: string
  videoCount: number
  url: string
}

interface ChannelShortsStats {
  name: string
  shortCount: number
  url: string
}

interface DayStats {
  date: string
  count: number
}

interface HourStats {
  hour: number
  count: number
}

interface VideoDetails {
  id: string
  duration: number // in seconds
  isShort: boolean
  title: string
}

interface ChannelWatchTime {
  name: string
  totalWatchTime: number // in seconds
  videoCount: number
  shortCount: number
  url: string
}

export default function YouTubeStatsParser() {
  const [data, setData] = useState<YouTubeEntry[]>([])
  const [videoDetails, setVideoDetails] = useState<Map<string, VideoDetails>>(new Map())
  const [channelDetails, setChannelDetails] = useState<Map<string, { name: string; thumbnail: string; id: string }>>(
    new Map(),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingVideos, setIsProcessingVideos] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [videoProgress, setVideoProgress] = useState(0)

  // Extract video ID from YouTube URL with better validation
  const extractVideoId = (url: string | undefined): string | null => {
    if (!url || typeof url !== "string") return null

    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /(?:music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1] && match[1].length === 11) {
        return match[1]
      }
    }

    return null
  }

  // Extract channel ID from YouTube channel URL
  const extractChannelId = (url: string | undefined): string | null => {
    if (!url || typeof url !== "string") return null

    // Handle different YouTube channel URL formats
    const patterns = [
      /(?:youtube\.com\/channel\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/c\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/user\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/@)([a-zA-Z0-9_-]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  }

  // Parse ISO 8601 duration to seconds
  const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    const hours = Number.parseInt(match?.[1] || "0")
    const minutes = Number.parseInt(match?.[2] || "0")
    const seconds = Number.parseInt(match?.[3] || "0")
    return hours * 3600 + minutes * 60 + seconds
  }

  // Format seconds to readable time
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  // Validate YouTube API key with better error handling
  const validateApiKey = async (apiKey: string): Promise<{ isValid: boolean; error?: string }> => {
    try {
      // Use a simple quota-efficient endpoint for validation
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=test&type=video&key=${apiKey}`,
      )

      if (response.ok) {
        return { isValid: true }
      } else {
        const errorData = await response.json().catch(() => ({}))
        return {
          isValid: false,
          error: `API returned ${response.status}: ${errorData.error?.message || response.statusText}`,
        }
      }
    } catch (error) {
      return {
        isValid: false,
        error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  // Fetch video details from YouTube API
  const fetchVideoDetails = async (videoIds: string[]): Promise<VideoDetails[]> => {
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

    // Debug logging
    console.log("Environment check:", {
      hasApiKey: !!API_KEY,
      apiKeyLength: API_KEY?.length || 0,
      apiKeyStart: API_KEY?.substring(0, 10) || "undefined",
      allEnvVars: Object.keys(process.env).filter((key) => key.startsWith("NEXT_PUBLIC")),
    })

    if (!API_KEY) {
      throw new Error(
        "YouTube API key not found. Please add NEXT_PUBLIC_YOUTUBE_API_KEY to your .env.local file and restart the development server.",
      )
    }

    if (API_KEY === "your_youtube_api_key_here" || API_KEY === "IzaSyCry3fAQSeG4HUtR7V-fo5c51t_6TVQvKQ") {
      throw new Error(
        "Please replace the placeholder API key with your actual YouTube API key in .env.local and restart the server.",
      )
    }

    // Validate API key first with detailed error reporting
    console.log("Validating API key...")
    const validation = await validateApiKey(API_KEY)
    if (!validation.isValid) {
      console.error("API key validation failed:", validation.error)
      throw new Error(
        `API Key Validation Failed: ${validation.error}\n\nTroubleshooting:\n1. Verify your API key is correct\n2. Ensure YouTube Data API v3 is enabled\n3. Check API key restrictions (if any)\n4. Verify billing is enabled for your Google Cloud project`,
      )
    }
    console.log("API key validated successfully")

    // Rest of the function remains the same...
    const validVideoIds = videoIds.filter((id) => {
      return id && typeof id === "string" && id.length === 11 && /^[a-zA-Z0-9_-]+$/.test(id)
    })

    console.log(`Processing ${validVideoIds.length} valid video IDs out of ${videoIds.length} total`)

    const details: VideoDetails[] = []

    // Process in batches of 50 (API limit)
    for (let i = 0; i < validVideoIds.length; i += 50) {
      const batch = validVideoIds.slice(i, i + 50)
      const ids = batch.join(",")

      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?id=${ids}&part=contentDetails,snippet&key=${API_KEY}`
        console.log(`Fetching batch ${i}-${Math.min(i + 50, validVideoIds.length)}`)

        const response = await fetch(url)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API Error Response:`, errorText)
          throw new Error(`API request failed: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        if (data.error) {
          console.error(`YouTube API Error:`, data.error)
          throw new Error(`YouTube API Error: ${data.error.message}`)
        }

        console.log(`Successfully fetched ${data.items?.length || 0} video details`)

        for (const item of data.items || []) {
          try {
            const duration = parseDuration(item.contentDetails.duration)
            // const isShort = await checkIfShort(item.id)
            const isShort = duration < 60

            details.push({
              id: item.id,
              duration,
              isShort,
              title: item.snippet.title,
            })
          } catch (itemError) {
            console.error(`Error processing video ${item.id}:`, itemError)
          }
        }

        // Add delay to respect rate limits
        if (i + 50 < validVideoIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      } catch (error) {
        console.error(`Error fetching batch ${i}-${Math.min(i + 50, validVideoIds.length)}:`, error)
        // Continue with next batch instead of failing completely
      }
      setVideoProgress(((i + 50) / validVideoIds.length) * 100)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    return details
  }

  // Fetch channel details from YouTube API
  const fetchChannelDetails = async (channels: (ChannelRegularStats | ChannelShortsStats)[]): Promise<void> => {
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
    if (!API_KEY) return

    // Extract unique channel IDs
    const channelIds = channels
      .map((channel) => extractChannelId(channel.url))
      .filter((id): id is string => id !== null)
      .filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates

    console.log(`Fetching details for ${channelIds.length} channels`)

    const details = new Map<string, { name: string; thumbnail: string; id: string }>()

    // Process in batches of 50 (API limit)
    for (let i = 0; i < channelIds.length; i += 50) {
      const batch = channelIds.slice(i, i + 50)
      const ids = batch.join(",")

      try {
        const url = `https://www.googleapis.com/youtube/v3/channels?id=${ids}&part=snippet&key=${API_KEY}`
        console.log(`Fetching channel batch ${i}-${Math.min(i + 50, channelIds.length)}`)

        const response = await fetch(url)

        if (!response.ok) {
          console.error(`Channel API Error: ${response.status}`)
          continue
        }

        const data = await response.json()

        if (data.error) {
          console.error(`YouTube Channel API Error:`, data.error)
          continue
        }

        for (const item of data.items || []) {
          details.set(item.id, {
            name: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
            id: item.id,
          })
        }

        // Add delay to respect rate limits
        if (i + 50 < channelIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      } catch (error) {
        console.error(`Error fetching channel batch:`, error)
      }
    }

    setChannelDetails(details)
    console.log(`Successfully fetched ${details.size} channel details`)
  }

  // Handle data from Google Takeout API
  const handleGoogleTakeoutData = async (takeoutData: any[]) => {
    setIsLoading(true)
    setError(null)
    setApiError(null)
    setVideoProgress(0)

    try {
      console.log(`Loaded ${takeoutData.length} entries from Google Takeout API`)
      setData(takeoutData)

      // Process the data same as file upload
      await processVideoData(takeoutData)
    } catch (err) {
      console.error("Google Takeout data processing error:", err)
      setError(err instanceof Error ? err.message : "Failed to process Google Takeout data")
    } finally {
      setIsLoading(false)
      setIsProcessingVideos(false)
      setVideoProgress(0)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)
    setApiError(null)
    setVideoProgress(0)

    try {
      const text = await file.text()
      const jsonData = JSON.parse(text)

      if (!Array.isArray(jsonData)) {
        throw new Error("Invalid JSON format. Expected an array of YouTube entries.")
      }

      console.log(`Loaded ${jsonData.length} entries from JSON file`)
      setData(jsonData)

      await processVideoData(jsonData)
    } catch (err) {
      console.error("File processing error:", err)
      setError(err instanceof Error ? err.message : "Failed to parse JSON file")
    } finally {
      setIsLoading(false)
      setIsProcessingVideos(false)
      setVideoProgress(0)
    }
  }

  // Helper function to calculate stats for channel fetching
  const calculateTempStats = (jsonData: any[], videoDetailsMap: Map<string, VideoDetails>) => {
    const regularChannelStats: Record<string, ChannelRegularStats> = {}
    const shortsChannelStats: Record<string, ChannelShortsStats> = {}

    jsonData.forEach((entry) => {
      if (!entry.titleUrl) return

      const videoId = extractVideoId(entry.titleUrl)
      const videoDetail = videoId ? videoDetailsMap.get(videoId) : null
      const isShort = videoDetail?.isShort || false

      if (entry.subtitles?.[0]) {
        const channelName = entry.subtitles[0].name
        const channelUrl = entry.subtitles[0].url

        if (isShort) {
          if (!shortsChannelStats[channelName]) {
            shortsChannelStats[channelName] = {
              name: channelName,
              shortCount: 0,
              url: channelUrl,
            }
          }
          shortsChannelStats[channelName].shortCount++
        } else {
          if (!regularChannelStats[channelName]) {
            regularChannelStats[channelName] = {
              name: channelName,
              videoCount: 0,
              url: channelUrl,
            }
          }
          regularChannelStats[channelName].videoCount++
        }
      }
    })

    const topRegularChannels = Object.values(regularChannelStats)
      .sort((a, b) => b.videoCount - a.videoCount)
      .slice(0, 10)

    const topShortsChannels = Object.values(shortsChannelStats)
      .sort((a, b) => b.shortCount - a.shortCount)
      .slice(0, 10)

    return { topRegularChannels, topShortsChannels }
  }

  const processVideoData = async (jsonData: any[]) => {
    // Extract video IDs and fetch details
    setIsProcessingVideos(true)
    const videoIds = jsonData
      .map((entry) => (entry.titleUrl ? extractVideoId(entry.titleUrl) : null))
      .filter((id): id is string => id !== null)

    console.log(`Extracted ${videoIds.length} video IDs from ${jsonData.length} entries`)

    if (videoIds.length > 0) {
      try {
        const details = await fetchVideoDetails(videoIds)
        const detailsMap = new Map(details.map((detail) => [detail.id, detail]))
        setVideoDetails(detailsMap)
        console.log(`Successfully processed ${details.length} video details`)

        // Calculate top channels and fetch their details
        const tempStats = calculateTempStats(jsonData, detailsMap)
        const allTopChannels = [...tempStats.topRegularChannels, ...tempStats.topShortsChannels]

        if (allTopChannels.length > 0) {
          await fetchChannelDetails(allTopChannels)
        }
      } catch (apiErr) {
        console.error("API Error:", apiErr)
        setApiError(apiErr instanceof Error ? apiErr.message : "Failed to fetch video details")
      }
    } else {
      setApiError("No valid YouTube video IDs found in the data")
    }
  }

  const getStats = () => {
    if (data.length === 0) return null

    // Basic stats
    const totalVideos = data.length
    const youtubeVideos = data.filter((entry) => entry.header === "YouTube").length
    const youtubeMusicVideos = data.filter((entry) => entry.header === "YouTube Music").length

    // Enhanced stats with video details
    let totalWatchTime = 0
    let totalShorts = 0
    let totalRegularVideos = 0
    let totalShortsTime = 0
    let totalRegularTime = 0

    // Channel stats separated by type
    const regularChannelStats: Record<string, ChannelRegularStats> = {}
    const shortsChannelStats: Record<string, ChannelShortsStats> = {}

    data.forEach((entry) => {
      // Add null check for titleUrl
      if (!entry.titleUrl) return

      const videoId = extractVideoId(entry.titleUrl)
      const videoDetail = videoId ? videoDetails.get(videoId) : null
      const duration = videoDetail?.duration || 0
      const isShort = videoDetail?.isShort || false

      totalWatchTime += duration

      if (entry.subtitles?.[0]) {
        const channelName = entry.subtitles[0].name
        const channelUrl = entry.subtitles[0].url

        if (isShort) {
          totalShorts++
          totalShortsTime += duration

          if (!shortsChannelStats[channelName]) {
            shortsChannelStats[channelName] = {
              name: channelName,
              shortCount: 0,
              url: channelUrl,
            }
          }
          shortsChannelStats[channelName].shortCount++
        } else {
          totalRegularVideos++
          totalRegularTime += duration

          if (!regularChannelStats[channelName]) {
            regularChannelStats[channelName] = {
              name: channelName,
              videoCount: 0,
              url: channelUrl,
            }
          }
          regularChannelStats[channelName].videoCount++
        }
      }
    })

    const topRegularChannels = Object.values(regularChannelStats)
      .sort((a, b) => b.videoCount - a.videoCount)
      .slice(0, 10)

    const topShortsChannels = Object.values(shortsChannelStats)
      .sort((a, b) => b.shortCount - a.shortCount)
      .slice(0, 10)

    // Rest of the existing stats logic...
    const dates = data.map((entry) => new Date(entry.time).toDateString())
    const dateCounts: Record<string, number> = {}
    dates.forEach((date) => {
      dateCounts[date] = (dateCounts[date] || 0) + 1
    })

    const dailyStats: DayStats[] = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7)

    const hours = data.map((entry) => new Date(entry.time).getHours())
    const hourCounts: Record<number, number> = {}
    hours.forEach((hour) => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    const hourlyStats: HourStats[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCounts[hour] || 0,
    }))

    const mostActiveHour = hourlyStats.reduce((max, current) => (current.count > max.count ? current : max))

    // Determine most active time period
    const getTimeframeName = (hour: number): string => {
      if (hour >= 0 && hour < 3) return "Midnight"
      if (hour >= 3 && hour < 6) return "Late Night"
      if (hour >= 6 && hour < 9) return "Early Morning"
      if (hour >= 9 && hour < 12) return "Morning"
      if (hour >= 12 && hour < 13) return "Midday"
      if (hour >= 13 && hour < 17) return "Afternoon"
      if (hour >= 17 && hour < 20) return "Evening"
      if (hour >= 20 && hour < 24) return "Night"
      return "Unknown"
    }

    const timeframeStats: Record<string, number> = {}
    hours.forEach((hour) => {
      const timeframe = getTimeframeName(hour)
      timeframeStats[timeframe] = (timeframeStats[timeframe] || 0) + 1
    })

    const mostActiveTimeframe = Object.entries(timeframeStats).sort(([, a], [, b]) => b - a)[0]

    const sortedDates = data.map((entry) => new Date(entry.time)).sort((a, b) => a.getTime() - b.getTime())
    const dateRange = {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1],
    }

    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))

    return {
      totalVideos,
      youtubeVideos,
      youtubeMusicVideos,
      totalWatchTime,
      totalShorts,
      totalRegularVideos,
      totalRegularTime,
      totalShortsTime,
      topRegularChannels,
      topShortsChannels,
      dailyStats,
      hourlyStats,
      mostActiveHour,
      dateRange,
      daysDiff,
      avgPerDay: Math.round((totalVideos / daysDiff) * 10) / 10,
      mostActiveTimeframe,
    }
  }

  const stats = getStats()

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM"
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return "12 PM"
    return `${hour - 12} PM`
  }

  return (
    <div className="min-h-screen p-4 relative">
      {/* Aurora Background Effect */}
      <div className="fixed inset-0 z-0 opacity-100 pointer-events-none">
        <Aurora 
          colorStops={["#ff295e", "#f5ff66", "#d47216"]} 
          amplitude={stats ? 1.5 : 1.2} 
          blend={0.4} 
          speed={stats ? 0.4 : 0.3} 
        />
      </div>
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        <div className="text-center space-y-2 mt-6 mb-8">
          <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-2">
                                            <Video className="w-8 h-8 text-primary" />
            YouTube Stat Tracker
          </h1>
          <p className="text-muted-foreground">Analyze your YouTube viewing habits with automatic data import</p>
        </div>

                {data.length === 0 || isLoading || isProcessingVideos ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Your Data
                </CardTitle>
                <CardDescription>Upload the JSON file from your YouTube data export (Google Takeout)</CardDescription>
              </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  disabled={isLoading || isProcessingVideos}
                />
                {isLoading && (
                  <div className="flex items-center gap-2 text-center text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing your data...
                  </div>
                )}
                {isProcessingVideos && (
                  <div className="flex items-center gap-2 text-center text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching video details from YouTube API...
                  </div>
                )}
                {isProcessingVideos && videoProgress > 0 && <Progress value={videoProgress} className="h-2" />}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {apiError && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div>API Error: {apiError}</div>
                        <div className="text-sm">
                          <strong>Setup Instructions:</strong>
                          <ol className="list-decimal list-inside mt-1 space-y-1">
                            <li>
                              Go to{" "}
                              <a
                                href="https://console.developers.google.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline hover:text-primary/80"
                              >
                                Google Cloud Console
                              </a>
                            </li>
                            <li>Create a new project or select an existing one</li>
                            <li>Enable the "YouTube Data API v3"</li>
                            <li>Create credentials → API Key</li>
                            <li>Copy the API key to your .env.local file</li>
                          </ol>
                        </div>
                        <div className="body-text text-sm">
                          Stats will show video counts instead of watch time without API access.
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="body-text text-sm text-left">
                  <p className="font-bold">To get your data:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to Google Takeout (<a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">takeout.google.com</a>)</li>
                    <li>Deselect everything, then select only "YouTube and YouTube Music"</li>
                    <li>Choose "history" in the options</li>
                    <li>Download and extract the JSON file</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
          <GoogleTakeoutAuth onDataReceived={handleGoogleTakeoutData} />
          <div className="text-center pt-4">
            <p className="body-text text-xs">
              Your privacy is protected. Read our{" "}
              <Link href="/privacy" className="text-primary hover:text-primary/80 underline">
                Privacy Policy
              </Link>
              {" "}to learn how your data is handled.
            </p>
            <p className="body-text text-xs mt-2">made by catt. check {" "}
              <Link href="https://github.com/vn-nthh" className="text-primary hover:text-primary/80 underline">
                github
              </Link>
              {" "} for other projects.</p>
          </div>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Data Overview
              </CardTitle>
              <CardDescription>Summary of your YouTube viewing habits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">{stats?.totalVideos.toLocaleString()}</div>
                  <div className="text-sm text-foreground">Total Videos Watched</div>
                  <div className="text-xs text-muted-foreground">
                    From {stats?.dateRange.start.toLocaleDateString()} to {stats?.dateRange.end.toLocaleDateString()}
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">{stats?.totalShorts.toLocaleString()}</div>
                  <div className="text-sm text-foreground">YouTube Shorts</div>
                  <div className="text-xs text-muted-foreground">
                    {stats?.totalShorts && stats?.totalVideos ? Math.round((stats.totalShorts / stats.totalVideos) * 100) : 0}% of total videos
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">{stats?.mostActiveTimeframe[0]}</div>
                  <div className="text-sm text-foreground">Most Active Time</div>
                  <div className="text-xs text-muted-foreground">{stats?.mostActiveTimeframe[1]} videos during this period</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="channels">Top Channels</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalVideos.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalWatchTime > 0
                        ? formatDuration(stats.totalWatchTime) + " total"
                        : stats.avgPerDay + " per day average"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Regular Videos</CardTitle>
                    <Video className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalRegularVideos.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalRegularTime > 0
                        ? formatDuration(stats.totalRegularTime)
                        : Math.round((stats.totalRegularVideos / stats.totalVideos) * 100) + "% of total"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">YouTube Shorts</CardTitle>
                    <Video className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{stats.totalShorts.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalShortsTime > 0
                        ? formatDuration(stats.totalShortsTime)
                        : Math.round((stats.totalShorts / stats.totalVideos) * 100) + "% of total"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">YouTube Music</CardTitle>
                    <Music className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.youtubeMusicVideos.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((stats.youtubeMusicVideos / stats.totalVideos) * 100)}% of total
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>YouTube</span>
                      <span>{stats.youtubeVideos} videos</span>
                    </div>
                    <Progress value={(stats.youtubeVideos / stats.totalVideos) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>YouTube Music</span>
                      <span>{stats.youtubeMusicVideos} videos</span>
                    </div>
                    <Progress value={(stats.youtubeMusicVideos / stats.totalVideos) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="channels" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-primary" />
                      Top Channels - Regular Videos
                    </CardTitle>
                    <CardDescription>Channels ranked by number of regular videos watched</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.topRegularChannels.map((channel, index) => (
                        <div key={channel.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">#{index + 1}</Badge>
                            <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center overflow-hidden">
                              {(() => {
                                const channelId = extractChannelId(channel.url)
                                const channelDetail = channelId ? channelDetails.get(channelId) : null

                                if (channelDetail?.thumbnail) {
                                  return (
                                    <img
                                      src={channelDetail.thumbnail || "/placeholder.svg"}
                                      alt={channel.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none"
                                        const sibling = e.currentTarget.nextElementSibling as HTMLElement
                                        if (sibling) sibling.style.display = "flex"
                                      }}
                                    />
                                  )
                                }

                                return null
                              })()}
                              <div
                                className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm border-2 border-primary/30"
                                style={{
                                  display: (() => {
                                    const channelId = extractChannelId(channel.url)
                                    const channelDetail = channelId ? channelDetails.get(channelId) : null
                                    return channelDetail?.thumbnail ? "none" : "flex"
                                  })(),
                                }}
                              >
                                {channel.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">{channel.name}</div>
                              <div className="text-sm text-muted-foreground">{channel.videoCount} videos</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {Math.round((channel.videoCount / stats.totalRegularVideos) * 100)}% of regular videos
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-accent" />
                      Top Channels - Shorts
                    </CardTitle>
                    <CardDescription>Channels ranked by number of shorts watched</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.topShortsChannels.map((channel, index) => (
                        <div key={channel.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">#{index + 1}</Badge>
                            <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center overflow-hidden">
                              {(() => {
                                const channelId = extractChannelId(channel.url)
                                const channelDetail = channelId ? channelDetails.get(channelId) : null

                                if (channelDetail?.thumbnail) {
                                  return (
                                    <img
                                      src={channelDetail.thumbnail || "/placeholder.svg"}
                                      alt={channel.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none"
                                        const sibling = e.currentTarget.nextElementSibling as HTMLElement
                                        if (sibling) sibling.style.display = "flex"
                                      }}
                                    />
                                  )
                                }

                                return null
                              })()}
                              <div
                                className="w-full h-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-sm border-2 border-accent/30"
                                style={{
                                  display: (() => {
                                    const channelId = extractChannelId(channel.url)
                                    const channelDetail = channelId ? channelDetails.get(channelId) : null
                                    return channelDetail?.thumbnail ? "none" : "flex"
                                  })(),
                                }}
                              >
                                {channel.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">{channel.name}</div>
                              <div className="text-sm text-muted-foreground">{channel.shortCount} shorts</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {Math.round((channel.shortCount / stats.totalShorts) * 100)}% of shorts
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Most Active Hour
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold text-primary">{formatHour(stats.mostActiveHour.hour)}</div>
                      <div className="text-sm text-muted-foreground">{stats.mostActiveHour.count} videos watched</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hourly Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.hourlyStats
                        .filter((stat) => stat.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 6)
                        .map((stat) => (
                          <div key={stat.hour} className="flex items-center justify-between">
                            <span className="text-sm">{formatHour(stat.hour)}</span>
                            <div className="flex items-center gap-2 flex-1 ml-4">
                              <Progress
                                value={(stat.count / stats.mostActiveHour.count) * 100}
                                className="h-2 flex-1"
                              />
                              <span className="text-sm text-muted-foreground w-8">{stat.count}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Viewing Patterns</CardTitle>
                  <CardDescription>When you typically watch YouTube videos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">You usually watch videos during the</p>
                    <div className="text-2xl font-bold text-primary">{stats.mostActiveTimeframe[0]}</div>
                    <p className="text-sm text-muted-foreground">
                      {stats.mostActiveTimeframe[1]} videos watched during this period
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Daily video counts for the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.dailyStats.map((day) => (
                      <div key={day.date} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="font-medium">{day.date}</div>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={(day.count / Math.max(...stats.dailyStats.map((d) => d.count))) * 100}
                            className="h-2 w-32"
                          />
                          <span className="text-sm text-muted-foreground w-12">{day.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">First Entry</div>
                      <div className="font-medium">{stats.dateRange.start.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Last Entry</div>
                      <div className="font-medium">{stats.dateRange.end.toLocaleDateString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
