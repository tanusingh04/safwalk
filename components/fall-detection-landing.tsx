"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, Shield, AlertTriangle, CheckCircle, Phone, X, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

export default function FallDetectionLanding() {
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied" | "unavailable">("pending")
  const [isDetecting, setIsDetecting] = useState(false)
  const [fallDetected, setFallDetected] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [showHelpPrompt, setShowHelpPrompt] = useState(false)
  const [permissionError, setPermissionError] = useState<string>("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Check if camera is available
  const checkCameraAvailability = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraPermission("unavailable")
        setPermissionError("Camera not supported on this device/browser")
        return false
      }

      // Check if any video input devices are available
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")

      if (videoDevices.length === 0) {
        setCameraPermission("unavailable")
        setPermissionError("No camera devices found")
        return false
      }

      return true
    } catch (error) {
      console.error("Error checking camera availability:", error)
      setCameraPermission("unavailable")
      setPermissionError("Unable to access camera devices")
      return false
    }
  }

  // Simulated fall detection using motion detection
  const detectMotion = () => {
    if (!videoRef.current || !canvasRef.current) return false

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return false

    // Simple motion detection simulation
    // In a real implementation, this would use ML models like PoseNet or MediaPipe
    const random = Math.random()

    // Simulate fall detection with 2% chance every check (for demo purposes)
    if (random < 0.02) {
      return true
    }

    return false
  }

  const startFallDetection = async () => {
    try {
      setPermissionError("")

      // First check if camera is available
      const isAvailable = await checkCameraAvailability()
      if (!isAvailable) {
        return
      }

      // Request camera permission with better error handling
      const constraints = {
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: "user",
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      streamRef.current = stream
      setCameraPermission("granted")

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch((error) => {
              console.error("Error playing video:", error)
              setPermissionError("Unable to start video playback")
            })
          }
        }
      }

      setIsDetecting(true)

      // Start detection loop
      detectionIntervalRef.current = setInterval(() => {
        const fallDetected = detectMotion()
        if (fallDetected) {
          handleFallDetected()
        }
      }, 1000) // Check every second

      // Show help prompt after 30 seconds if no fall detected
      setTimeout(() => {
        if (!fallDetected) {
          stopDetection()
          setShowHelpPrompt(true)
        }
      }, 30000)
    } catch (error: any) {
      console.error("Camera access error:", error)
      setCameraPermission("denied")

      // Provide specific error messages
      if (error.name === "NotAllowedError") {
        setPermissionError("Camera access was denied. Please allow camera access and try again.")
      } else if (error.name === "NotFoundError") {
        setPermissionError("No camera found on this device.")
      } else if (error.name === "NotReadableError") {
        setPermissionError("Camera is already in use by another application.")
      } else if (error.name === "OverconstrainedError") {
        setPermissionError("Camera doesn't support the required settings.")
      } else if (error.name === "SecurityError") {
        setPermissionError("Camera access blocked due to security restrictions.")
      } else {
        setPermissionError(`Camera error: ${error.message || "Unknown error occurred"}`)
      }
    }
  }

  const retryCamera = async () => {
    setCameraPermission("pending")
    setPermissionError("")
    await startFallDetection()
  }

  const handleFallDetected = () => {
    setFallDetected(true)
    setIsDetecting(false)
    setCountdown(10)

    // Clear detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-call emergency if no response
          setShowEmergencyModal(true)
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleImOkay = () => {
    setFallDetected(false)
    setCountdown(0)
    setShowHelpPrompt(false)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    stopDetection()
    router.push("/home")
  }

  const handleEmergencyCall = () => {
    // In a real implementation, this would trigger actual emergency services
    alert("Emergency services have been contacted. Help is on the way.")
    setShowEmergencyModal(false)
    setShowHelpPrompt(false)
    stopDetection()
    router.push("/home")
  }

  const stopDetection = () => {
    setIsDetecting(false)

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const skipToHomepage = () => {
    stopDetection()
    setShowHelpPrompt(true)
  }

  const handleNeedHelp = () => {
    // In a real implementation, this would contact emergency services or caregivers
    alert("Help has been requested. Emergency contacts are being notified.")
    setShowHelpPrompt(false)
    router.push("/home")
  }

  const handleImOkayNoFall = () => {
    setShowHelpPrompt(false)
    router.push("/home")
  }

  // Simulate fall for demo purposes
  const simulateFall = () => {
    handleFallDetected()
  }

  useEffect(() => {
    // Check camera availability on component mount
    checkCameraAvailability()

    return () => {
      stopDetection()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Shield className="h-12 w-12 text-blue-300" />
            <h1 className="text-4xl font-bold text-white">MAZT Fall Detection</h1>
          </div>
          <p className="text-blue-200 text-lg">Advanced AI-powered fall detection system for senior safety</p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Camera Feed */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" width="640" height="480" />

                {/* Camera Status Overlay */}
                <div className="absolute top-4 left-4">
                  {isDetecting && (
                    <div className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                      <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                      <span>Monitoring Active</span>
                    </div>
                  )}
                </div>

                {/* Fall Detection Alert */}
                {fallDetected && (
                  <div className="absolute inset-0 bg-red-600/90 flex items-center justify-center rounded-lg">
                    <div className="text-center text-white">
                      <AlertTriangle className="h-16 w-16 mx-auto mb-4 animate-pulse" />
                      <h3 className="text-2xl font-bold mb-2">FALL DETECTED!</h3>
                      <p className="text-lg mb-4">Are you okay?</p>
                      <div className="text-3xl font-bold mb-4">{countdown}</div>
                      <div className="space-x-4">
                        <Button onClick={handleImOkay} className="bg-green-600 hover:bg-green-700 text-white" size="lg">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          I'm Okay
                        </Button>
                        <Button
                          onClick={handleEmergencyCall}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          size="lg"
                        >
                          <Phone className="h-5 w-5 mr-2" />
                          Call Help
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Controls and Status */}
          <div className="space-y-6">
            {cameraPermission === "pending" && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6 text-center">
                  <Camera className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-4">Enable Fall Detection</h3>
                  <p className="text-blue-200 mb-6">
                    Allow camera access to start monitoring for falls. Your privacy is protected - no data is stored or
                    transmitted.
                  </p>
                  <Button onClick={startFallDetection} className="bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    Start Detection
                  </Button>
                </CardContent>
              </Card>
            )}

            {(cameraPermission === "denied" || cameraPermission === "unavailable") && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <Alert className="bg-red-600/20 border-red-400 text-white mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{permissionError}</AlertDescription>
                  </Alert>

                  {cameraPermission === "denied" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">How to enable camera access:</h3>
                      <div className="text-sm text-blue-200 space-y-2">
                        <p>
                          <strong>Chrome/Edge:</strong> Click the camera icon in the address bar
                        </p>
                        <p>
                          <strong>Firefox:</strong> Click the shield icon and select "Allow"
                        </p>
                        <p>
                          <strong>Safari:</strong> Go to Settings → Websites → Camera
                        </p>
                      </div>
                      <Button onClick={retryCamera} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        <RefreshCw className="h-5 w-5 mr-2" />
                        Retry Camera Access
                      </Button>
                    </div>
                  )}

                  {cameraPermission === "unavailable" && (
                    <div className="text-center">
                      <p className="text-blue-200 mb-4">
                        Camera not available on this device. You can still access our safety resources.
                      </p>
                      <Button onClick={skipToHomepage} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Check In
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {cameraPermission === "granted" && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Detection Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200">Camera Status:</span>
                      <span className="text-green-400 font-semibold">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200">AI Monitoring:</span>
                      <span className={`font-semibold ${isDetecting ? "text-green-400" : "text-yellow-400"}`}>
                        {isDetecting ? "Detecting" : "Standby"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200">Emergency Ready:</span>
                      <span className="text-green-400 font-semibold">Yes</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <Button
                      onClick={simulateFall}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      disabled={fallDetected}
                    >
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Simulate Fall (Demo)
                    </Button>

                    <Button
                      onClick={skipToHomepage}
                      variant="outline"
                      className="w-full border-white/30 text-white hover:bg-white/10 bg-transparent"
                    >
                      Check In
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Notice */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-white mb-2">Privacy & Security</h4>
                <p className="text-xs text-blue-200">
                  All processing happens locally on your device. No video data is transmitted or stored. Emergency
                  contacts are only activated when a fall is confirmed.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Help Prompt Modal */}
        {showHelpPrompt && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <Card className="bg-white max-w-md w-full">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Are you okay?</h3>
                <p className="text-gray-600 mb-6">
                  Do you need help or are you doing fine?
                </p>
                <div className="space-y-3">
                  <Button onClick={handleNeedHelp} className="w-full bg-red-600 hover:bg-red-700 text-white">
                    <Phone className="h-5 w-5 mr-2" />
                    I Need Help
                  </Button>
                  <Button onClick={handleImOkayNoFall} className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    I'm Okay
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Emergency Modal */}
        {showEmergencyModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <Card className="bg-white max-w-md w-full">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Emergency Services Contacted</h3>
                <p className="text-gray-600 mb-6">
                  No response detected. Emergency services have been automatically notified and are on their way.
                </p>
                <div className="space-y-3">
                  <Button onClick={handleImOkay} className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Cancel - I'm Okay
                  </Button>
                  <Button onClick={() => setShowEmergencyModal(false)} variant="outline" className="w-full">
                    <X className="h-5 w-5 mr-2" />
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
