import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import { SimStudio } from '../core'
import { AgentBlock } from '../blocks/agent'
import { FunctionBlock } from '../blocks/function'
import { WorkflowBuilder } from '../workflows/builder'
import { Workflow } from '../types'

// Setup global fetch mock
const originalFetch = global.fetch
let mockFetch: any

/**
 * Tests that directly simulate how the platform executes workflows
 * to ensure the SDK works the same way as the platform
 */
describe('Direct Workflow Execution', () => {
  // Reset mocks between tests
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a mock fetch implementation
    mockFetch = vi.fn()
    global.fetch = mockFetch
    
    // Mock AbortController
    vi.stubGlobal('AbortController', class {
      signal = {}
      abort = vi.fn()
    })
  })
  
  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllGlobals()
  })

  test('should create, save, and execute a workflow in a single flow', async () => {
    // Setup SimStudio SDK
    const sdk = new SimStudio({
      apiKey: 'test-api-key',
      baseUrl: 'https://test-api.com'
    })
    
    // 1. Mock the workflow save response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow: {
          id: 'new-workflow-id',
          name: 'Test End-to-End Workflow',
          description: 'A workflow to test end-to-end execution',
          state: {
            blocks: [
              { id: 'starter-1', type: 'starter' },
              { id: 'agent-1', type: 'agent', data: { model: 'gpt-4' } },
              { id: 'function-1', type: 'function', data: { code: 'return { result: input.message.length };' } }
            ],
            edges: [
              { source: 'starter-1', target: 'agent-1' },
              { source: 'agent-1', target: 'function-1' }
            ],
            loops: {}
          }
        }
      })
    })
    
    // 2. Mock the workflow execution response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        output: {
          response: {
            result: 42
          }
        },
        logs: [
          {
            blockId: 'starter-1',
            blockName: 'Starter',
            blockType: 'starter',
            startedAt: '2023-01-01T00:00:00.000Z',
            endedAt: '2023-01-01T00:00:01.000Z',
            durationMs: 1000,
            success: true
          },
          {
            blockId: 'agent-1',
            blockName: 'Agent',
            blockType: 'agent',
            startedAt: '2023-01-01T00:00:01.000Z',
            endedAt: '2023-01-01T00:00:02.000Z',
            durationMs: 1000,
            success: true
          },
          {
            blockId: 'function-1',
            blockName: 'Function',
            blockType: 'function',
            startedAt: '2023-01-01T00:00:02.000Z',
            endedAt: '2023-01-01T00:00:03.000Z',
            durationMs: 1000,
            success: true
          }
        ],
        metadata: {
          startTime: '2023-01-01T00:00:00.000Z',
          endTime: '2023-01-01T00:00:03.000Z',
          duration: 3000
        }
      })
    })
    
    // Step 1: Create a workflow using the builder
    const builder = new WorkflowBuilder('Test End-to-End Workflow', 'A workflow to test end-to-end execution')
    
    // Step 2: Get blocks and connect them
    const starterBlock = builder.getStarterBlock()
    
    const agentBlock = new AgentBlock({
      model: 'gpt-4',
      apiKey: '{{OPENAI_API_KEY}}',
      prompt: 'Analyze the following text: {{input}}'
    }).setName('Analyzer')
    
    const functionBlock = new FunctionBlock({
      code: 'return { result: input.message.length };'
    }).setName('Result Processor')
    
    builder.addBlock(agentBlock)
    builder.addBlock(functionBlock)
    
    builder.connect(starterBlock.id, agentBlock.id)
    builder.connect(agentBlock.id, functionBlock.id)
    
    // Step 3: Build the workflow
    const workflow = builder.build()
    
    // Step 4: Execute the workflow directly
    const input = { text: 'This is a test input' }
    const result = await sdk.executeWorkflow(workflow, input)
    
    // Verify the API calls were made correctly
    expect(mockFetch).toHaveBeenCalledTimes(2)
    
    // First call should save the workflow
    expect(mockFetch.mock.calls[0][0]).toBe('https://test-api.com/api/workflows')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      name: 'Test End-to-End Workflow',
      description: 'A workflow to test end-to-end execution',
      state: {
        blocks: expect.any(Array),
        edges: expect.any(Array),
        loops: {}
      },
      metadata: undefined
    })
    
    // Second call should execute the workflow
    expect(mockFetch.mock.calls[1][0]).toBe('https://test-api.com/api/workflow/new-workflow-id/execute')
    expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual(input)
    
    // Verify the result includes the expected output
    expect(result).toEqual({
      success: true,
      output: {
        response: {
          result: 42
        }
      },
      logs: expect.any(Array),
      metadata: {
        startTime: '2023-01-01T00:00:00.000Z',
        endTime: '2023-01-01T00:00:03.000Z',
        duration: 3000
      }
    })
  })

  test('should execute a pre-built workflow definition', async () => {
    // Setup SimStudio SDK
    const sdk = new SimStudio({
      apiKey: 'test-api-key',
      baseUrl: 'https://test-api.com'
    })
    
    // 1. Mock the workflow save response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow: {
          id: 'new-workflow-id',
          name: 'Pre-built Workflow',
          description: 'A pre-built workflow definition',
          state: {
            blocks: [
              { id: 'starter-1', type: 'starter' },
              { id: 'agent-1', type: 'agent' }
            ],
            edges: [
              { source: 'starter-1', target: 'agent-1' }
            ],
            loops: {}
          }
        }
      })
    })
    
    // 2. Mock the workflow execution response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        output: {
          response: {
            message: 'Workflow executed successfully'
          }
        },
        logs: []
      })
    })
    
    // Define a workflow directly without using the builder
    const workflow: Workflow = {
      name: 'Pre-built Workflow',
      description: 'A pre-built workflow definition',
      blocks: [
        {
          id: 'starter-1',
          type: 'starter',
          data: {}
        },
        {
          id: 'agent-1',
          type: 'agent',
          data: {
            model: 'gpt-4',
            apiKey: '{{OPENAI_API_KEY}}',
            prompt: 'Process this: {{input}}'
          }
        }
      ],
      connections: [
        {
          source: 'starter-1',
          target: 'agent-1'
        }
      ]
    }
    
    // Execute the workflow
    const input = { data: 'Test data' }
    const result = await sdk.executeWorkflow(workflow, input)
    
    // Verify the API calls were made correctly
    expect(mockFetch).toHaveBeenCalledTimes(2)
    
    // First call should save the workflow
    expect(mockFetch.mock.calls[0][0]).toBe('https://test-api.com/api/workflows')
    
    // Second call should execute the workflow
    expect(mockFetch.mock.calls[1][0]).toBe('https://test-api.com/api/workflow/new-workflow-id/execute')
    expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual(input)
    
    // Verify the result
    expect(result.success).toBe(true)
    expect(result.output.response.message).toBe('Workflow executed successfully')
  })

  test('should handle errors in workflow execution', async () => {
    // Setup SimStudio SDK
    const sdk = new SimStudio({
      apiKey: 'test-api-key'
    })
    
    // Mock workflow save response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow: {
          id: 'new-workflow-id'
        }
      })
    })
    
    // Mock execution error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({
        error: 'Execution failed',
        success: false,
        output: {
          response: {}
        },
        logs: [
          {
            blockId: 'agent-1',
            blockType: 'agent',
            success: false,
            error: 'API key invalid'
          }
        ]
      })
    })
    
    // Create a simple workflow
    const workflow: Workflow = {
      name: 'Error Test Workflow',
      blocks: [
        { id: 'starter-1', type: 'starter', data: {} },
        { id: 'agent-1', type: 'agent', data: { model: 'gpt-4', prompt: 'Test prompt' } }
      ],
      connections: [
        { source: 'starter-1', target: 'agent-1' }
      ]
    }
    
    // Execute and expect error handling
    const result = await sdk.executeWorkflow(workflow)
    
    // Should still return a result object with error info
    expect(result.success).toBe(false)
    expect(result.logs).toHaveLength(1)
    expect(result.logs![0].blockId).toBe('agent-1')
    expect(result.logs![0].success).toBe(false)
  })
})