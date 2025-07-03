"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2, Download, Key } from "lucide-react"

interface GoogleTakeoutAuthProps {
  onDataReceived: (data: any[]) => void
}

export function GoogleTakeoutAuth({ onDataReceived }: GoogleTakeoutAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [authStatus, setAuthStatus] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Initialize Google OAuth
  const initializeGoogleAuth = () => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Google Auth can only be initialized in browser"))
        return
      }

      // Load Google Identity Services
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.onload = () => {
        if (window.google) {
          resolve(window.google)
        } else {
          reject(new Error("Failed to load Google Identity Services"))
        }
      }
      script.onerror = () => reject(new Error("Failed to load Google Identity Services"))
      document.head.appendChild(script)
    })
  }

  const authenticateWithGoogle = async () => {
    setIsAuthenticating(true)
    setAuthStatus(null)

    try {
      await initializeGoogleAuth()

      // Configure OAuth client
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/dataportability.myactivity.youtube",
        callback: (response: any) => {
          if (response.access_token) {
            setAccessToken(response.access_token)
            setAuthStatus({
              success: true,
              message: "Successfully authenticated with Google! You can now download your YouTube data.",
            })
          } else {
            setAuthStatus({
              success: false,
              message: "Authentication failed. Please try again.",
            })
          }
          setIsAuthenticating(false)
        },
        error_callback: (error: any) => {
          console.error("OAuth error:", error)
          setAuthStatus({
            success: false,
            message: `Authentication error: ${error.error || "Unknown error"}`,
          })
          setIsAuthenticating(false)
        },
      })

      // Request access token
      client.requestAccessToken()
    } catch (error) {
      console.error("Auth initialization error:", error)
      setAuthStatus({
        success: false,
        message: `Failed to initialize authentication: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      setIsAuthenticating(false)
    }
  }

  const downloadYouTubeData = async () => {
    if (!accessToken) {
      setAuthStatus({
        success: false,
        message: "No access token available. Please authenticate first.",
      })
      return
    }

    setIsDownloading(true)
    setAuthStatus(null)

    try {
      // Create a data portability job
      const createJobResponse = await fetch("https://dataportability.googleapis.com/v1/portabilityArchive:initiate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resources: ["YOUTUBE_VIDEOS"],
          archiveFormat: "JSON",
        }),
      })

      if (!createJobResponse.ok) {
        const errorData = await createJobResponse.json().catch(() => ({}))
        throw new Error(`Failed to create export job: ${errorData.error?.message || createJobResponse.statusText}`)
      }

      const jobData = await createJobResponse.json()
      const jobId = jobData.name

      setAuthStatus({
        success: true,
        message: "Export job created! Waiting for data to be prepared...",
      })

      // Poll for job completion
      let attempts = 0
      const maxAttempts = 30 // 5 minutes with 10-second intervals

      const pollJob = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          throw new Error("Export job timed out. Please try again later.")
        }

        const statusResponse = await fetch(`https://dataportability.googleapis.com/v1/${jobId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!statusResponse.ok) {
          throw new Error("Failed to check job status")
        }

        const statusData = await statusResponse.json()

        if (statusData.state === "COMPLETED") {
          // Download the archive
          const downloadResponse = await fetch(statusData.archiveUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })

          if (!downloadResponse.ok) {
            throw new Error("Failed to download archive")
          }

          const archiveData = await downloadResponse.json()

          // Extract YouTube watch history
          const youtubeHistory = archiveData.YouTube?.["My Activity"]?.["YouTube History"] || []

          setAuthStatus({
            success: true,
            message: `Successfully downloaded ${youtubeHistory.length} YouTube history entries!`,
          })

          onDataReceived(youtubeHistory)
        } else if (statusData.state === "FAILED") {
          throw new Error("Export job failed")
        } else {
          // Job still in progress, wait and try again
          attempts++
          setAuthStatus({
            success: true,
            message: `Preparing your data... (${attempts}/${maxAttempts})`,
          })

          await new Promise((resolve) => setTimeout(resolve, 10000)) // Wait 10 seconds
          await pollJob()
        }
      }

      await pollJob()
    } catch (error) {
      console.error("Download error:", error)
      setAuthStatus({
        success: false,
        message: `Download failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Google Integration (EU only)
        </CardTitle>
        <CardDescription>Automatically download your YouTube data using Google's Data Portability API</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!accessToken ? (
          <Button onClick={authenticateWithGoogle} disabled={isAuthenticating} className="w-full" size="lg">
            {isAuthenticating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Connect to Google Account
              </>
            )}
          </Button>
        ) : (
          <Button onClick={downloadYouTubeData} disabled={isDownloading} className="w-full" size="lg">
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Downloading Data...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download YouTube Data
              </>
            )}
          </Button>
        )}

        {authStatus && (
          <Alert variant={authStatus.success ? "default" : "destructive"}>
            {authStatus.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertDescription>
              <div className="space-y-2">
                <div>{authStatus.message}</div>
                {!authStatus.success && (
                  <div className="text-sm">
                    <strong>Setup Requirements:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>
                        Go to{" "}
                        <a
                          href="https://console.developers.google.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          Google Cloud Console
                        </a>
                      </li>
                      <li>Create a new project or select an existing one</li>
                      <li>Enable the "Data Portability API"</li>
                      <li>Create OAuth 2.0 credentials</li>
                      <li>Add your domain to authorized origins</li>
                      <li>Copy the Client ID to your .env.local file as NEXT_PUBLIC_GOOGLE_CLIENT_ID</li>
                    </ol>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>What this does:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Securely connects to your Google account</li>
            <li>Requests only YouTube watch history data</li>
            <li>Downloads data directly without manual export</li>
            <li>Processes data automatically for analysis</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// Add type declarations for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any
        }
      }
    }
  }
}
