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

    // Create a grid system for more deterministic placement
    const rows = 10
    const columns = 10
    const marginTop = 10 // Percentage from top
    const marginLeft = 10 // Percentage from left
    const availableHeight = 80 // 100 - 2*marginTop
    const availableWidth = 80 // 100 - 2*marginLeft

    // Cell dimensions
    const cellHeight = availableHeight / rows
    const cellWidth = availableWidth / columns

    // Generate errors in a grid pattern with slight randomization for natural appearance
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        // Only create up to totalErrors
        const index = r * columns + c
        if (index >= totalErrors) break

        // Calculate position with small offset for less rigid appearance
        // We'll use a deterministic offset based on the index
        const rowOffset = ((index * 17) % 10) / 10 // Deterministic offset between 0-1
        const colOffset = ((index * 23) % 10) / 10 // Different prime for column offset

        const top = `${marginTop + (r + rowOffset) * cellHeight}vh`
        const left = `${marginLeft + (c + colOffset) * cellWidth}vw`

        notifications.push({
          id: `error-${index}`,
          message: errorMessages[index % errorMessages.length],
          position: {
            top,
            left,
          },
          visible: false,
        })
      }
    }

    // Reserve the first notification for the main error (will be positioned center later)
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
              message: 'Error!',
              position: {
                // Center it in the viewport
                top: '50vh',
                left: '50vw',
              },
            }
          }
          return err
        })
      })

      // Start showing error notifications with cascading pattern
      // The notifications will appear in different parts of the screen,
      // starting from corners then moving inward
      const showSequence = [
        [0, 1], // Top left quadrant first
        [2, 3], // Top right quadrant second
        [4, 5], // Bottom left third
        [6, 7], // Bottom right fourth
        [8, 9, 10, 11], // Then middle areas
        [12, 13, 14, 15, 16, 17, 18, 19], // Then more errors
        // ... and so on with the remaining errors
      ]

      let delayBase = 500
      showSequence.forEach((group, groupIndex) => {
        group.forEach((indexInZone, posInGroup) => {
          // Calculate actual index in the full notifications array
          // Each zone has errorsPerZone items
          const errorsPerZone = Math.floor(notifications.length / 8)
          const actualIndex = Math.floor(indexInZone / 2) * errorsPerZone + (indexInZone % 2) + 1 // +1 to skip main error

          if (actualIndex < notifications.length) {
            const delay = delayBase + groupIndex * 300 + posInGroup * 150

            setTimeout(() => {
              setErrorNotifications((prev) => {
                return prev.map((err, i) => {
                  if (i === actualIndex) {
                    return { ...err, visible: true }
                  }
                  return err
                })
              })
            }, delay)
          }
        })
      })

      // Show all remaining errors with staggered timing
      setTimeout(() => {
        notifications.forEach((notification, index) => {
          if (index === 0) return // Skip the main error

          // Check if this error is already scheduled to be shown
          const alreadyScheduled = showSequence.some((group) =>
            group.some((indexInZone) => {
              const errorsPerZone = Math.floor(notifications.length / 8)
              const actualIndex =
                Math.floor(indexInZone / 2) * errorsPerZone + (indexInZone % 2) + 1
              return actualIndex === index
            })
          )

          if (!alreadyScheduled) {
            const delay = 2500 + index * 75 // Show remaining errors after the choreographed ones

            setTimeout(() => {
              setErrorNotifications((prev) => {
                return prev.map((err, i) => {
                  if (i === index) {
                    return { ...err, visible: true }
                  }
                  return err
                })
              })
            }, delay)
          }
        })
      }, delayBase + 2000)
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
