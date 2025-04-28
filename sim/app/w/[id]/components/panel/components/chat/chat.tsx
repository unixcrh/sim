'use client'

import { KeyboardEvent, useEffect, useMemo, useRef } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useExecutionStore } from '@/stores/execution/store'
import { useChatStore } from '@/stores/panel/chat/store'
import { useConsoleStore } from '@/stores/panel/console/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'
import { useWorkflowExecution } from '../../../../hooks/use-workflow-execution'
import { ChatMessage } from './components/chat-message/chat-message'
import { OutputSelect } from './components/output-select/output-select'

interface ChatProps {
  panelWidth: number
  chatMessage: string
  setChatMessage: (message: string) => void
}

export function Chat({ panelWidth, chatMessage, setChatMessage }: ChatProps) {
  const { activeWorkflowId } = useWorkflowRegistry()
  const { messages, addMessage, selectedWorkflowOutputs, setSelectedWorkflowOutput } =
    useChatStore()
  const { entries } = useConsoleStore()
  const blocks = useWorkflowStore((state) => state.blocks)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use the execution store state to track if a workflow is executing
  const { isExecuting } = useExecutionStore()

  // Get workflow execution functionality
  const { handleRunWorkflow } = useWorkflowExecution()

  // Get output entries from console for the dropdown
  const outputEntries = useMemo(() => {
    if (!activeWorkflowId) return []
    return entries.filter((entry) => entry.workflowId === activeWorkflowId && entry.output)
  }, [entries, activeWorkflowId])

  // Get filtered messages for current workflow
  const workflowMessages = useMemo(() => {
    if (!activeWorkflowId) return []
    return messages
      .filter((msg) => msg.workflowId === activeWorkflowId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [messages, activeWorkflowId])

  // Get selected workflow outputs
  const selectedOutputs = useMemo(() => {
    if (!activeWorkflowId) return []
    
    // Get the outputs array for the active workflow
    const outputs = selectedWorkflowOutputs[activeWorkflowId]
    
    // If no selection exists yet, return empty array
    if (!outputs || outputs.length === 0) {
      // Default to the first output if available
      const defaultOutput = outputEntries.length > 0 ? [outputEntries[0].id] : []
      return defaultOutput
    }
    
    // Filter out any stale outputs that no longer exist in the workflow
    const validOutputs = outputs.filter(outputId => {
      // Extract the blockId from the outputId format "blockId_path"
      const blockId = outputId.split('_')[0]
      return !!blocks[blockId] // Check if block still exists
    })
    
    // If filtering removed all outputs, default to the first available
    if (validOutputs.length === 0 && outputEntries.length > 0) {
      const defaultOutput = [outputEntries[0].id]
      return defaultOutput
    }
    
    return validOutputs
  }, [selectedWorkflowOutputs, activeWorkflowId, outputEntries, blocks])

  // Handle default output selection or cleanup via useEffect, not during render
  useEffect(() => {
    if (!activeWorkflowId) return
    
    const outputs = selectedWorkflowOutputs[activeWorkflowId]
    
    // If no selection exists yet, set the default
    if (!outputs || outputs.length === 0) {
      if (outputEntries.length > 0) {
        const defaultOutput = [outputEntries[0].id]
        setSelectedWorkflowOutput(activeWorkflowId, defaultOutput)
      }
      return
    }
    
    // Filter out any stale outputs that no longer exist in the workflow
    const validOutputs = outputs.filter(outputId => {
      const blockId = outputId.split('_')[0]
      return !!blocks[blockId]
    })
    
    // If filtering removed all outputs, default to the first available
    if (validOutputs.length === 0 && outputEntries.length > 0) {
      const defaultOutput = [outputEntries[0].id]
      setSelectedWorkflowOutput(activeWorkflowId, defaultOutput)
    } else if (validOutputs.length !== outputs.length) {
      // Update if some outputs were filtered out
      setSelectedWorkflowOutput(activeWorkflowId, validOutputs)
    }
  }, [selectedWorkflowOutputs, activeWorkflowId, outputEntries, blocks, setSelectedWorkflowOutput])

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [workflowMessages])

  // Handle send message
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !activeWorkflowId || isExecuting) return

    // Store the message being sent for reference
    const sentMessage = chatMessage.trim()

    // Add user message
    addMessage({
      content: sentMessage,
      workflowId: activeWorkflowId,
      type: 'user',
    })

    // Clear input
    setChatMessage('')

    // Execute the workflow to generate a response, passing the chat message as input
    // The workflow execution will trigger block executions which will add messages to the chat via the console store
    await handleRunWorkflow({ input: sentMessage })
  }

  // Handle key press
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle output selection - now receiving an array of outputs
  const handleOutputSelection = (values: string[]) => {
    if (activeWorkflowId) {
      setSelectedWorkflowOutput(activeWorkflowId, values)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Output Source Dropdown */}
      <div className="flex-none border-b px-4 py-2">
        <OutputSelect 
          workflowId={activeWorkflowId}
          selectedOutputs={selectedOutputs}
          onOutputSelect={(values) => {
            if (activeWorkflowId) {
              setSelectedWorkflowOutput(activeWorkflowId, values)
            }
          }}
          disabled={!activeWorkflowId}
          placeholder="Select output sources"
          multiple={true}
        />
      </div>

      {/* Main layout with fixed heights to ensure input stays visible */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Chat messages section - Scrollable area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div>
              {workflowMessages.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  No messages yet
                </div>
              ) : (
                workflowMessages.map((message) => (
                  <ChatMessage key={message.id} message={message} containerWidth={panelWidth} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input section - Fixed height */}
        <div className="flex-none border-t bg-background pt-4 px-4 pb-4 relative -mt-[1px]">
          <div className="flex gap-2">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
              disabled={!activeWorkflowId || isExecuting}
            />
            <Button
              onClick={handleSendMessage}
              size="icon"
              disabled={!chatMessage.trim() || !activeWorkflowId || isExecuting}
              className="h-10 w-10 bg-[#802FFF] hover:bg-[#7028E6] text-white"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
