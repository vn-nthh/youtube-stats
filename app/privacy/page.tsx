import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Shield className="w-8 h-8 text-red-600" />
            Privacy Policy
          </h1>
          <p className="text-gray-600">YouTube Stat Tracker Data Handling Policy</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data Processing & Privacy</CardTitle>
            <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">Overview</h2>
              <p className="text-gray-700 leading-relaxed">
                YouTube Stat Tracker is designed with privacy as a core principle. This application processes your YouTube viewing data locally in your browser to generate statistics and insights about your viewing habits. <strong>No data is collected, stored, or transmitted to external servers, unless explicitly stated below</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data Collection</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>We do not collect, store, or transmit any personal data.</strong> The application operates entirely within your browser environment and does not maintain any databases or servers that store user information.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>No personal information is collected or stored</li>
                <li>No user accounts or profiles are created</li>
                <li>No tracking cookies are used</li>
                <li>No analytics or monitoring services are integrated</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data Processing</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                When you use this application, your YouTube data is processed in the following manner:
              </p>
              <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Local Processing:</strong> All data analysis occurs within your browser's memory</li>
                <li><strong>Temporary Storage:</strong> Data is held only in browser memory during active use</li>
                <li><strong>Immediate Disposal:</strong> All data is automatically flushed when you close the browser tab or navigate away</li>
                <li><strong>No Persistence:</strong> No data is saved to your device's storage or sent to external servers</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Google API Usage</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                When using the Google Takeout integration feature:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>OAuth Authentication:</strong> Google's secure authentication system is used to access your data</li>
                <li><strong>Limited Scope:</strong> Only YouTube viewing history data is requested</li>
                <li><strong>Direct Transfer:</strong> Data flows directly from Google to your browser without intermediate storage</li>
                <li><strong>Temporary Access:</strong> Authentication tokens are used only for the duration of data retrieval</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Third-Party Services</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                The application may make API calls to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>YouTube Data API:</strong> To fetch video metadata for enhanced statistics (duration, thumbnails)</li>
                <li><strong>Google Data Portability API:</strong> To retrieve your YouTube viewing history</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                These API calls are made directly from your browser and are subject to Google's privacy policies. No data from these requests is stored or logged by our application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data Security</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>All data processing occurs in your browser's secure sandbox environment</li>
                <li>No data transmission to external servers (except Google APIs as described)</li>
                <li>HTTPS encryption is used for all external API communications</li>
                <li>No persistent storage of sensitive information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Since no data is collected or stored, you maintain complete control over your information:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>You can stop processing at any time by closing the browser</li>
                <li>No deletion requests are necessary as no data is retained</li>
                <li>You can revoke Google API access through your Google Account settings</li>
                <li>All processing is voluntary and user-initiated</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                This privacy policy may be updated to reflect changes in our data handling practices. Any updates will be posted on this page with a revised "Last updated" date. Given the nature of this application (no data collection), substantial changes to our privacy practices are unlikely.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Open Source Transparency</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                This project is completely open-sourced, ensuring full transparency in how your data is handled. You can review the entire codebase, verify our privacy claims, and even contribute to the project.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>GitHub Repository:</strong>
                </p>
                <a 
                  href="https://github.com/vn-nthh/youtube-stats" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-800 underline font-mono text-sm"
                >
                  https://github.com/vn-nthh/youtube-stats
                </a>
                <p className="text-gray-600 text-sm mt-2">
                  Feel free to examine the source code, report issues, or suggest improvements.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                This application is provided as-is for personal use. If you have questions about data handling, please review the open-source code on GitHub or contact the developer through the project repository's issue tracker.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/">
            <Button className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Return to YouTube Stat Tracker
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 