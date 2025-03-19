import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { Executor } from '../executor'
import { Workflow } from '../types'

// Setup global fetch mock
const originalFetch = global.fetch
let mockFetch: any

describe('Executor', () => {
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

  test('should execute a workflow by ID correctly', async () => {
    // Mock API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        output: {
          response: {
            message: 'Workflow executed successfully'
          }
        },
        logs: [
          {
            blockId: 'block1',
            blockName: 'Starter',
            blockType: 'starter',
            startedAt: '2023-01-01T00:00:00.000Z',
            endedAt: '2023-01-01T00:00:01.000Z',
            durationMs: 1000,
            success: true
          }
        ],
        metadata: {
          startTime: '2023-01-01T00:00:00.000Z',
          endTime: '2023-01-01T00:00:01.000Z',
          duration: 1000
        }
      })
    })

    const executor = new Executor({
      apiKey: 'test-api-key'
    })

    const workflowId = 'test-workflow-id'
    const input = { text: 'Test input' }

    const result = await executor.execute(workflowId, input)

    // Verify the request was made correctly
    expect(mockFetch).toHaveBeenCalledWith(
      'https://simstudio.ai/api/workflow/test-workflow-id/execute',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        body: JSON.stringify(input)
      })
    )

    // Verify the result is formatted correctly
    expect(result).toEqual({
      success: true,
      output: {
        response: {
          message: 'Workflow executed successfully'
        }
      },
      logs: [
        {
          blockId: 'block1',
          blockName: 'Starter',
          blockType: 'starter',
          startedAt: '2023-01-01T00:00:00.000Z',
          endedAt: '2023-01-01T00:00:01.000Z',
          durationMs: 1000,
          success: true
        }
      ],
      metadata: {
        startTime: '2023-01-01T00:00:00.000Z',
        endTime: '2023-01-01T00:00:01.000Z',
        duration: 1000
      }
    })
  })

  test('should handle execution errors', async () => {
    // Mock API failure response
    const errorResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({
        error: 'Internal server error'
      })
    }
    mockFetch.mockImplementationOnce(async () => errorResponse)

    const executor = new Executor({
      apiKey: 'test-api-key'
    })

    let caughtError
    try {
      await executor.execute('test-workflow-id')
    } catch (error) {
      caughtError = error
    }
    
    expect(caughtError).toBeDefined()
    expect(caughtError.message).toContain('API error: 500 Internal Server Error')
  })

  test('should execute a workflow definition directly', async () => {
    // Mock API responses for save and execute
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow: {
          id: 'new-workflow-id',
          name: 'Test Workflow',
          description: 'A test workflow',
          state: {
            blocks: [{ id: 'block1', type: 'starter' }],
            edges: [{ source: 'block1', target: 'block2' }],
            loops: {}
          }
        }
      })
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        output: {
          response: {
            message: 'Workflow executed successfully'
          }
        }
      })
    })

    const executor = new Executor({
      apiKey: 'test-api-key',
      baseUrl: 'https://custom-api.example.com',
      timeout: 60000
    })

    const workflow: Workflow = {
      name: 'Test Workflow',
      description: 'A test workflow',
      blocks: [
        { id: 'block1', type: 'starter', data: {} },
        { id: 'block2', type: 'agent', data: { model: 'gpt-4' } }
      ],
      connections: [
        { source: 'block1', target: 'block2' }
      ]
    }

    const input = { prompt: 'Test prompt' }
    const result = await executor.executeWorkflow(workflow, input)

    // Verify custom config was used
    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom-api.example.com/api/workflows',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        body: JSON.stringify({
          name: 'Test Workflow',
          description: 'A test workflow',
          state: {
            blocks: [
              { id: 'block1', type: 'starter', data: {} },
              { id: 'block2', type: 'agent', data: { model: 'gpt-4' } }
            ],
            edges: [
              { source: 'block1', target: 'block2' }
            ],
            loops: {}
          },
          metadata: undefined
        })
      })
    )

    // Verify workflow was executed with the given input
    expect(mockFetch.mock.calls[1][0]).toBe('https://custom-api.example.com/api/workflow/new-workflow-id/execute')
    expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual(input)

    // Verify the result
    expect(result).toEqual({
      success: true,
      output: {
        response: {
          message: 'Workflow executed successfully'
        }
      },
      logs: [],
      metadata: {
        startTime: undefined,
        endTime: undefined,
        duration: undefined
      }
    })
  })

  test('should extract execution details from HTTP errors when available', async () => {
    // Mock API response with execution details in error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({
        success: false,
        output: {
          response: {
            error: 'Runtime error in function block'
          }
        },
        error: 'Function execution failed',
        logs: [
          {
            blockId: 'function-1',
            blockName: 'Function',
            blockType: 'function',
            startedAt: '2023-01-01T00:00:00.000Z',
            endedAt: '2023-01-01T00:00:01.000Z',
            durationMs: 1000,
            success: false,
            error: 'Invalid syntax'
          }
        ]
      })
    })

    const executor = new Executor({
      apiKey: 'test-api-key'
    })

    const result = await executor.execute('test-workflow-id')

    // Should extract execution details from error response
    expect(result).toEqual({
      success: false,
      output: {
        response: {
          error: 'Runtime error in function block'
        }
      },
      error: 'Function execution failed',
      logs: [
        {
          blockId: 'function-1',
          blockName: 'Function',
          blockType: 'function',
          startedAt: '2023-01-01T00:00:00.000Z',
          endedAt: '2023-01-01T00:00:01.000Z',
          durationMs: 1000,
          success: false,
          error: 'Invalid syntax'
        }
      ],
      metadata: {
        startTime: undefined,
        endTime: undefined,
        duration: undefined
      }
    })
  })
}) 