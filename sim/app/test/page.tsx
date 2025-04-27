'use client'

import { KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  Clock,
  Home,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Users,
  XCircle,
  XOctagon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Message = {
  id: string
  content: string
  type: 'user' | 'assistant'
  timestamp: Date
}

type ErrorNotification = {
  id: string
  message: string
  position: {
    top: string
    left: string
  }
  visible: boolean
}

const errorMessages = [
  'Connection refused',
  'Failed to connect to server',
  'API timeout exceeded',
  'Neural network initialization failed',
  'Memory allocation error',
  'Shutting down servers...',
  'AI model crashed unexpectedly',
  'Security breach detected',
  'System overload',
  'Database connection lost',
  'Failed to load configuration',
  'Runtime error: undefined is not a function',
  'Failed to authenticate',
  'Permission denied',
  'Network connection lost',
  'Service unavailable',
  'Unexpected token in JSON',
  'Maximum call stack size exceeded',
  'File not found',
  'FATAL ERROR: Out of memory',
]

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState('dashboard')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello, I'm your AI assistant. How can I help you today?",
      type: 'assistant',
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Error simulation states
  const [isRunning, setIsRunning] = useState(false)
  const [showMainError, setShowMainError] = useState(false)
  const [errorNotifications, setErrorNotifications] = useState<ErrorNotification[]>([])

  const handleSendMessage = () => {
    if (!chatMessage.trim() || isLoading) return

    // Add user message
    const newMessage: Message = {
      id: Date.now().toString(),
      content: chatMessage,
      type: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setChatMessage('')

    // Simulate assistant response
    setIsLoading(true)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "I'm an AI agent ready to assist you with your simulation needs. What would you like to do today?",
        type: 'assistant',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)

      // Scroll to bottom after new message
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 1500)
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Reset all error states
  const resetErrorStates = () => {
    setIsRunning(false)
    setShowMainError(false)
    setErrorNotifications([])
  }

  // Create error notifications with deterministic but distributed positions
  const createErrorNotifications = () => {
    const notifications: ErrorNotification[] = []
    const totalErrors = 50

    // Use a seed-based approach for deterministic randomization
    const seedBasedRandom = (seed: number) => {
      // Simple deterministic pseudo-random number generator
      const a = 1664525
      const c = 1013904223
      const m = Math.pow(2, 32)
      let val = seed
      return () => {
        val = (a * val + c) % m
        return val / m
      }
    }

    // Generate errors with better distribution across the entire screen
    for (let i = 0; i < totalErrors; i++) {
      // Create a random generator seeded with the error index
      const rng = seedBasedRandom(i * 123456789)

      // Divide screen into 4 quadrants to ensure coverage
      // Each quadrant gets approximately equal number of errors
      const quadrant = i % 4

      // Calculate base position ranges for this quadrant
      let topMin = 0,
        topMax = 0,
        leftMin = 0,
        leftMax = 0

      switch (quadrant) {
        case 0: // Top-left
          topMin = 0
          topMax = 50
          leftMin = 0
          leftMax = 50
          break
        case 1: // Top-right
          topMin = 0
          topMax = 50
          leftMin = 50
          leftMax = 100
          break
        case 2: // Bottom-left
          topMin = 50
          topMax = 100
          leftMin = 0
          leftMax = 50
          break
        case 3: // Bottom-right
          topMin = 50
          topMax = 100
          leftMin = 50
          leftMax = 100
          break
      }

      // Add randomization within the quadrant
      const top = `${topMin + (topMax - topMin) * rng()}vh`
      const left = `${leftMin + (leftMax - leftMin) * rng()}vw`

      notifications.push({
        id: `error-${i}`,
        message: errorMessages[i % errorMessages.length],
        position: {
          top,
          left,
        },
        visible: false,
      })
    }

    // Reserve the first notification for the main error (will be positioned center)
    if (notifications.length > 0) {
      notifications[0] = {
        ...notifications[0],
        message: 'Error!',
        position: {
          top: '50vh',
          left: '50vw',
        },
        visible: false,
      }
    }

    return notifications
  }

  // Handle run button click
  const handleRunClick = () => {
    resetErrorStates()
    setIsRunning(true)

    // Create all error notifications but they start hidden
    const notifications = createErrorNotifications()
    setErrorNotifications(notifications)

    // Show main error after 2 seconds (make it the first error notification)
    setTimeout(() => {
      setShowMainError(true)

      // Make the first notification visible (main error)
      setErrorNotifications((prev) => {
        return prev.map((err, i) => {
          if (i === 0) {
            return {
              ...err,
              visible: true,
            }
          }
          return err
        })
      })

      // Create a distributed sequence for showing errors
      // This maps grid positions to their display order
      const createDisplaySequence = () => {
        // Skip index 0 (that's the main error)
        let sequence: number[] = []

        // Define screen regions
        type Region = {
          name: string
          indices: number[]
        }

        const regions: Region[] = [
          { name: 'top', indices: [] },
          { name: 'bottom-right', indices: [] },
          { name: 'bottom-left', indices: [] },
          { name: 'top-right', indices: [] },
          { name: 'top-left', indices: [] },
          { name: 'center', indices: [] },
          { name: 'middle-left', indices: [] },
          { name: 'middle-right', indices: [] },
        ]

        // Classify each error position into a region
        for (let i = 1; i < notifications.length; i++) {
          const position = notifications[i].position
          // Convert position strings to numbers for comparison
          const top = parseFloat(position.top)
          const left = parseFloat(position.left)

          if (top < 30) {
            if (left < 30)
              regions[4].indices.push(i) // top-left
            else if (left > 70)
              regions[3].indices.push(i) // top-right
            else regions[0].indices.push(i) // top
          } else if (top > 70) {
            if (left < 30)
              regions[2].indices.push(i) // bottom-left
            else if (left > 70)
              regions[1].indices.push(i) // bottom-right
            else regions[5].indices.push(i) // center-bottom (part of center)
          } else {
            if (left < 30)
              regions[6].indices.push(i) // middle-left
            else if (left > 70)
              regions[7].indices.push(i) // middle-right
            else regions[5].indices.push(i) // center
          }
        }

        // Create a rotating sequence through regions
        const maxErrorsPerRegion = Math.ceil((notifications.length - 1) / regions.length)

        for (let i = 0; i < maxErrorsPerRegion; i++) {
          for (let r = 0; r < regions.length; r++) {
            if (i < regions[r].indices.length) {
              sequence.push(regions[r].indices[i])
            }
          }
        }

        return sequence
      }

      const displaySequence = createDisplaySequence()

      // Show errors with staggered timing in the rotating sequence
      displaySequence.forEach((index, sequencePosition) => {
        setTimeout(
          () => {
            setErrorNotifications((prev) => {
              return prev.map((err, i) => {
                if (i === index) {
                  return { ...err, visible: true }
                }
                return err
              })
            })
          },
          500 + sequencePosition * 100
        ) // Start after 500ms, then add 100ms per error
      })
    }, 2000)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r shadow-sm hidden md:block">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">AI Studio</h1>
        </div>
        <nav className="p-2">
          <SidebarItem
            icon={<Home className="w-5 h-5" />}
            label="Dashboard"
            active={activeModule === 'dashboard'}
            onClick={() => setActiveModule('dashboard')}
          />
          <SidebarItem
            icon={<Bot className="w-5 h-5" />}
            label="AI Agents"
            active={activeModule === 'agents'}
            onClick={() => setActiveModule('agents')}
          />
          <SidebarItem
            icon={<MessageSquare className="w-5 h-5" />}
            label="Chat"
            active={activeModule === 'chat'}
            onClick={() => setActiveModule('chat')}
          />
          <SidebarItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            active={activeModule === 'settings'}
            onClick={() => setActiveModule('settings')}
          />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white p-4 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold md:hidden">AI Studio</h1>
          </div>
          <Button
            className="bg-green-600 hover:bg-green-600 gap-2 text-md px-4 py-4"
            onClick={handleRunClick}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : 'Run'}
          </Button>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto px-4">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <Card className="p-6">
                <h3 className="text-sm uppercase text-gray-500 mb-2">AI Agents</h3>
                <p className="text-3xl font-bold">Active</p>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm uppercase text-gray-500 mb-2">AI agent access</h3>
                <p className="text-3xl font-bold">All</p>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm uppercase text-gray-500 mb-2">Integrations</h3>
                <p className="text-3xl font-bold">40</p>
              </Card>
            </div>

            {/* Chat interface */}
            <Card className="p-0 flex flex-col h-[calc(100vh-280px)]">
              <div className="border-b p-4">
                <h3 className="text-lg font-medium">AI Assistant</h3>
              </div>

              {/* Messages container */}
              <div className="flex-1 overflow-y-auto p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`py-3 ${message.type === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] py-3 px-4 rounded-2xl ${
                        message.type === 'user'
                          ? 'bg-blue-100 text-gray-900'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-base leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="py-3 flex justify-start">
                    <div className="max-w-[80%] py-3 px-4 rounded-2xl bg-gray-100">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-0"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef}></div>
              </div>

              {/* Input area */}
              <div className="border-t p-4">
                <div className="relative rounded-xl border bg-background">
                  <Input
                    ref={inputRef}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Message..."
                    className="flex-1 border-0 focus-visible:ring-0 py-6 pr-16 pl-6 rounded-xl"
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    disabled={!chatMessage.trim() || isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-xl bg-black text-white hover:bg-gray-800"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>

      {/* Multiple error notifications positioned absolutely */}
      {errorNotifications
        .filter((err) => err.visible)
        .map((notification, index) => {
          // Main error (first one) should be bigger and more prominent
          const isMainError = index === 0 && showMainError

          return (
            <div
              key={notification.id}
              className={`fixed bg-red-600/90 text-white rounded-md shadow-lg border border-red-400 transition-opacity duration-300 ${
                isMainError ? 'w-[550px] p-8 z-50' : 'w-80 p-4 z-40'
              }`}
              style={{
                top: notification.position.top,
                left: notification.position.left,
                // Center the main error properly
                transform: isMainError ? 'translate(-50%, -50%)' : 'none',
              }}
            >
              <div className={`flex items-start gap-3 ${isMainError ? 'mb-2' : ''}`}>
                {isMainError ? (
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <XOctagon className="h-10 w-10 text-red-600" strokeWidth={2.5} />
                  </div>
                ) : (
                  <AlertTriangle className="h-6 w-6 flex-shrink-0 text-yellow-300" />
                )}
                <div>
                  <p className={`font-bold ${isMainError ? 'text-3xl mb-4' : 'text-base'}`}>
                    {notification.message}
                  </p>
                  {!isMainError && (
                    <p className="text-xs text-red-200">
                      Error code: {1000 + parseInt(notification.id.split('-')[1])}
                    </p>
                  )}
                  {isMainError && (
                    <div>
                      <p className="text-lg mb-5">
                        The system has encountered a critical error and cannot continue.
                      </p>
                      <Button
                        className="bg-white hover:bg-gray-100 text-red-600 font-medium px-4 py-2 text-lg w-full"
                        onClick={resetErrorStates}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}

// Sidebar Item Component
interface SidebarItemProps {
  icon: ReactNode
  label: string
  active: boolean
  onClick: () => void
}

function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      className={`flex items-center gap-3 w-full p-3 mb-1 rounded-md transition-colors ${
        active ? 'bg-gray-100 text-black' : 'text-gray-500 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
