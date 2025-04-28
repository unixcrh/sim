import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'
import { getBlock } from '@/blocks'

interface OutputSelectProps {
  workflowId: string | null
  selectedOutputs: string[] | null
  onOutputSelect: (outputIds: string[]) => void
  disabled?: boolean
  placeholder?: string
  multiple?: boolean
}

export function OutputSelect({
  workflowId,
  selectedOutputs,
  onOutputSelect,
  disabled = false,
  placeholder = 'Select output source',
  multiple = true
}: OutputSelectProps) {
  const [isOutputDropdownOpen, setIsOutputDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const blocks = useWorkflowStore((state) => state.blocks)

  // Handle backward compatibility with single selection
  const normalizedSelectedOutputs = useMemo(() => {
    if (!selectedOutputs) return []
    return Array.isArray(selectedOutputs) ? selectedOutputs : [selectedOutputs]
  }, [selectedOutputs])

  // Get workflow outputs for the dropdown
  const workflowOutputs = useMemo(() => {
    const outputs: {
      id: string
      label: string
      blockId: string
      blockName: string
      blockType: string
      path: string
    }[] = []

    if (!workflowId) return outputs

    // Process blocks to extract outputs
    Object.values(blocks).forEach((block) => {
      // Skip starter/start blocks
      if (block.type === 'starter') return

      const blockName = block.name.replace(/\s+/g, '').toLowerCase()

      // Add response outputs
      if (block.outputs && typeof block.outputs === 'object') {
        const addOutput = (path: string, outputObj: any, prefix = '') => {
          const fullPath = prefix ? `${prefix}.${path}` : path

          if (typeof outputObj === 'object' && outputObj !== null) {
            // For objects, recursively add each property
            Object.entries(outputObj).forEach(([key, value]) => {
              addOutput(key, value, fullPath)
            })
          } else {
            // Add leaf node as output option
            outputs.push({
              id: `${block.id}_${fullPath}`,
              label: `${blockName}.${fullPath}`,
              blockId: block.id,
              blockName: block.name,
              blockType: block.type,
              path: fullPath,
            })
          }
        }

        // Start with the response object
        if (block.outputs.response) {
          addOutput('response', block.outputs.response)
        }
      }
    })

    return outputs
  }, [blocks, workflowId])

  // Get selected output display name for the button display
  const selectedOutputsDisplay = useMemo(() => {
    if (!normalizedSelectedOutputs.length) return placeholder
    
    // For single selection or display of one item
    if (normalizedSelectedOutputs.length === 1 || !multiple) {
      const output = workflowOutputs.find((o) => o.id === normalizedSelectedOutputs[0])
      return output
        ? `${output.blockName.replace(/\s+/g, '').toLowerCase()}.${output.path}`
        : placeholder
    }
    
    // For multiple selections
    return `${normalizedSelectedOutputs.length} ${normalizedSelectedOutputs.length === 1 ? 'output' : 'outputs'} selected`
  }, [normalizedSelectedOutputs, workflowOutputs, placeholder, multiple])

  // Get selected output block info for the first selected item (for display)
  const firstSelectedOutputInfo = useMemo(() => {
    if (!normalizedSelectedOutputs.length) return null
    const output = workflowOutputs.find((o) => o.id === normalizedSelectedOutputs[0])
    if (!output) return null

    return {
      blockName: output.blockName,
      blockId: output.blockId,
      blockType: output.blockType,
      path: output.path,
    }
  }, [normalizedSelectedOutputs, workflowOutputs])

  // Group output options by block
  const groupedOutputs = useMemo(() => {
    const groups: Record<string, typeof workflowOutputs> = {}
    const blockDistances: Record<string, number> = {}
    const edges = useWorkflowStore.getState().edges

    // Find the starter block
    const starterBlock = Object.values(blocks).find((block) => block.type === 'starter')
    const starterBlockId = starterBlock?.id

    // Calculate distances from starter block if it exists
    if (starterBlockId) {
      // Build an adjacency list for faster traversal
      const adjList: Record<string, string[]> = {}
      for (const edge of edges) {
        if (!adjList[edge.source]) {
          adjList[edge.source] = []
        }
        adjList[edge.source].push(edge.target)
      }

      // BFS to find distances from starter block
      const visited = new Set<string>()
      const queue: [string, number][] = [[starterBlockId, 0]] // [nodeId, distance]

      while (queue.length > 0) {
        const [currentNodeId, distance] = queue.shift()!

        if (visited.has(currentNodeId)) continue
        visited.add(currentNodeId)
        blockDistances[currentNodeId] = distance

        // Get all outgoing edges from the adjacency list
        const outgoingNodeIds = adjList[currentNodeId] || []

        // Add all target nodes to the queue with incremented distance
        for (const targetId of outgoingNodeIds) {
          queue.push([targetId, distance + 1])
        }
      }
    }

    // Group by block name
    workflowOutputs.forEach((output) => {
      if (!groups[output.blockName]) {
        groups[output.blockName] = []
      }
      groups[output.blockName].push(output)
    })

    // Convert to array of [blockName, outputs] for sorting
    const groupsArray = Object.entries(groups).map(([blockName, outputs]) => {
      // Find the blockId for this group (using the first output's blockId)
      const blockId = outputs[0]?.blockId
      // Get the distance for this block (or default to 0 if not found)
      const distance = blockId ? blockDistances[blockId] || 0 : 0
      return { blockName, outputs, distance }
    })

    // Sort by distance (descending - furthest first)
    groupsArray.sort((a, b) => b.distance - a.distance)

    // Convert back to record
    return groupsArray.reduce(
      (acc, { blockName, outputs }) => {
        acc[blockName] = outputs
        return acc
      },
      {} as Record<string, typeof workflowOutputs>
    )
  }, [workflowOutputs, blocks])

  // Get block color for an output
  const getOutputColor = (blockId: string, blockType: string) => {
    // Try to get the block's color from its configuration
    const blockConfig = getBlock(blockType)
    return blockConfig?.bgColor || '#2F55FF' // Default blue if not found
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOutputDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Simplified output selection handler
  const handleOutputSelection = (value: string) => {
    // Make a copy of the current selections
    const newSelectedOutputs = [...normalizedSelectedOutputs]
    
    if (multiple) {
      // For multiple selection mode
      const index = newSelectedOutputs.indexOf(value)
      
      if (index >= 0) {
        // Remove if already selected
        newSelectedOutputs.splice(index, 1)
      } else {
        // Add if not selected
        newSelectedOutputs.push(value)
      }
      
      onOutputSelect(newSelectedOutputs)
    } else {
      // For single selection mode, just select this one
      onOutputSelect([value])
      setIsOutputDropdownOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOutputDropdownOpen(!isOutputDropdownOpen)}
        className={`flex w-full items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors ${
          isOutputDropdownOpen
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
        }`}
        disabled={workflowOutputs.length === 0 || disabled}
      >
        {normalizedSelectedOutputs.length > 0 && firstSelectedOutputInfo ? (
          <div className="flex items-center gap-2 w-[calc(100%-24px)] overflow-hidden">
            <div
              className="flex items-center justify-center w-5 h-5 rounded flex-shrink-0"
              style={{
                backgroundColor: getOutputColor(
                  firstSelectedOutputInfo.blockId,
                  firstSelectedOutputInfo.blockType
                ),
              }}
            >
              <span className="w-3 h-3 text-white font-bold text-xs">
                {firstSelectedOutputInfo.blockName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="truncate">{selectedOutputsDisplay}</span>
          </div>
        ) : (
          <span className="truncate w-[calc(100%-24px)]">{selectedOutputsDisplay}</span>
        )}
        <ChevronDown
          className={`h-4 w-4 transition-transform ml-1 flex-shrink-0 ${
            isOutputDropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOutputDropdownOpen && workflowOutputs.length > 0 && (
        <div className="absolute z-50 mt-1 pt-1 w-full bg-popover rounded-md border shadow-md overflow-hidden">
          <div className="max-h-[240px] overflow-y-auto">
            {Object.entries(groupedOutputs).map(([blockName, outputs]) => (
              <div key={blockName}>
                <div className="px-2 pt-1.5 pb-0.5 text-xs font-medium text-muted-foreground border-t first:border-t-0">
                  {blockName}
                </div>
                <div>
                  {outputs.map((output) => {
                    const isSelected = normalizedSelectedOutputs.includes(output.id)
                    return (
                      <div
                        role="button"
                        key={output.id}
                        onClick={() => handleOutputSelection(output.id)}
                        className={cn(
                          'flex items-center gap-2 text-sm text-left w-full px-3 py-1.5',
                          'hover:bg-accent hover:text-accent-foreground',
                          'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                          'cursor-pointer',
                          !multiple && isSelected && 'bg-accent text-accent-foreground'
                        )}
                      >
                        {multiple && (
                          <div className="flex items-center justify-center mr-2">
                            {/* Simple checkbox implementation to avoid nested state updates */}
                            <div 
                              className={cn(
                                "h-4 w-4 shrink-0 rounded-sm border border-primary flex items-center justify-center",
                                isSelected && "bg-primary text-primary-foreground"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        )}
                        <div
                          className="flex items-center justify-center w-5 h-5 rounded flex-shrink-0"
                          style={{
                            backgroundColor: getOutputColor(output.blockId, output.blockType),
                          }}
                        >
                          <span className="w-3 h-3 text-white font-bold text-xs">
                            {blockName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="truncate max-w-[calc(100%-60px)]">{output.path}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          {multiple && normalizedSelectedOutputs.length > 0 && (
            <div className="p-2 border-t">
              <div
                role="button"
                onClick={() => {
                  onOutputSelect([])
                  setIsOutputDropdownOpen(false)
                }}
                className="text-xs text-destructive hover:underline cursor-pointer"
              >
                Clear all selections
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 