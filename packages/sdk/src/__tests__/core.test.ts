import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { SimStudio } from '../core'
import { AgentBlock } from '../blocks/agent'
import { FunctionBlock } from '../blocks/function'
import { StarterBlock } from '../blocks/starter'

// Setup global fetch mock
const originalFetch = global.fetch
let mockFetch: any

describe('SimStudio SDK', () => {
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

  describe('constructor', () => {
    test('should initialize with default values when no config is provided', () => {
      process.env.SIM_STUDIO_API_KEY = 'test-key-from-env'
      const sdk = new SimStudio()
      
      // There's no direct way to test this without triggering an API call
      // We'll verify the defaults by making an API call and inspecting the fetch arguments
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflows: [] })
      })
      
      return sdk.listWorkflows().then(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://simstudio.ai/api/workflows',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-key-from-env'
            }
          })
        )
      })
    })

    test('should use provided config values', () => {
      const sdk = new SimStudio({
        apiKey: 'test-api-key',
        baseUrl: 'https://test-url.com',
        timeout: 60000,
      })
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflows: [] })
      })
      
      return sdk.listWorkflows().then(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-url.com/api/workflows',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-api-key'
            }
          })
        )
      })
    })
  })

  describe('workflow operations', () => {
    let sdk: SimStudio
    
    beforeEach(() => {
      sdk = new SimStudio({ apiKey: 'test-api-key' })
    })
    
    describe('saveWorkflow', () => {
      test('should create a new workflow correctly', async () => {
        // Mock response for creating a new workflow
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
              },
              metadata: { author: 'Test User' }
            }
          })
        })
        
        const workflowToSave = {
          name: 'Test Workflow',
          description: 'A test workflow',
          blocks: [{ id: 'block1', type: 'starter', data: {} }],
          connections: [{ source: 'block1', target: 'block2' }],
          metadata: { author: 'Test User' }
        }
        
        const result = await sdk.saveWorkflow(workflowToSave)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://simstudio.ai/api/workflows',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-api-key'
            }),
            body: JSON.stringify({
              name: 'Test Workflow',
              description: 'A test workflow',
              state: {
                blocks: [{ id: 'block1', type: 'starter', data: {} }],
                edges: [{ source: 'block1', target: 'block2' }],
                loops: {}
              },
              metadata: { author: 'Test User' }
            })
          })
        )
        
        expect(result).toEqual({
          id: 'new-workflow-id',
          name: 'Test Workflow',
          description: 'A test workflow',
          blocks: [{ id: 'block1', type: 'starter' }],
          connections: [{ source: 'block1', target: 'block2' }],
          loops: {},
          metadata: { author: 'Test User' }
        })
      })
      
      test('should update an existing workflow correctly', async () => {
        // Mock response for updating an existing workflow
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            workflow: {
              id: 'existing-workflow-id',
              name: 'Updated Workflow',
              description: 'An updated workflow',
              state: {
                blocks: [{ id: 'block1', type: 'starter' }],
                edges: [{ source: 'block1', target: 'block3' }],
                loops: {}
              },
              metadata: { author: 'Test User', updated: true }
            }
          })
        })
        
        const workflowToUpdate = {
          id: 'existing-workflow-id',
          name: 'Updated Workflow',
          description: 'An updated workflow',
          blocks: [{ id: 'block1', type: 'starter', data: {} }],
          connections: [{ source: 'block1', target: 'block3' }],
          metadata: { author: 'Test User', updated: true }
        }
        
        const result = await sdk.saveWorkflow(workflowToUpdate)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://simstudio.ai/api/workflow/existing-workflow-id',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-api-key'
            }),
            body: JSON.stringify({
              name: 'Updated Workflow',
              description: 'An updated workflow',
              state: {
                blocks: [{ id: 'block1', type: 'starter', data: {} }],
                edges: [{ source: 'block1', target: 'block3' }],
                loops: {}
              },
              metadata: { author: 'Test User', updated: true }
            })
          })
        )
        
        expect(result).toEqual({
          id: 'existing-workflow-id',
          name: 'Updated Workflow',
          description: 'An updated workflow',
          blocks: [{ id: 'block1', type: 'starter' }],
          connections: [{ source: 'block1', target: 'block3' }],
          loops: {},
          metadata: { author: 'Test User', updated: true }
        })
      })
      
      test('should handle errors when saving a workflow', async () => {
        // Mock error response from the fetch request
        const errorResponse = {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => ({
            error: 'Invalid workflow data'
          })
        }
        mockFetch.mockImplementationOnce(async () => errorResponse)
        
        const workflowToSave = {
          name: 'Invalid Workflow',
          description: 'An invalid workflow',
          blocks: [],
          connections: []
        }
        
        try {
          await sdk.saveWorkflow(workflowToSave)
          // If we get here, the test should fail
          expect('This should not be reached').toBe('The promise should have rejected')
        } catch (error) {
          // Successfully caught the error
          expect(error.message).toContain('Invalid workflow data')
          // Don't check specific error properties as they might vary
        }
      })
    })
    
    describe('executeWorkflow', () => {
      test('should execute a workflow correctly', async () => {
        // Mock response for executing a workflow
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
        
        const workflowId = 'test-workflow-id'
        const input = {
          text: 'This is a test input'
        }
        
        const result = await sdk.execute(workflowId, input)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://simstudio.ai/api/workflow/test-workflow-id/execute',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-api-key'
            }),
            body: JSON.stringify(input)
          })
        )
        
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
      
      test('should handle execution failure correctly', async () => {
        // Mock a response where the execution is technically successful (HTTP 200)
        // but the workflow execution itself failed
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: false,
            output: {
              response: {}
            },
            error: 'Error in function block execution',
            logs: [
              {
                blockId: 'block2',
                blockName: 'Function',
                blockType: 'function',
                startedAt: '2023-01-01T00:00:00.000Z',
                endedAt: '2023-01-01T00:00:01.000Z',
                durationMs: 1000,
                success: false,
                error: 'Error in function execution'
              }
            ]
          })
        })
        
        const workflowId = 'test-workflow-id'
        
        const result = await sdk.execute(workflowId)
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://simstudio.ai/api/workflow/test-workflow-id/execute',
          expect.objectContaining({
            method: 'POST',
            body: '{}'
          })
        )
        
        expect(result).toEqual({
          success: false,
          output: {
            response: {}
          },
          error: 'Error in function block execution',
          logs: [
            {
              blockId: 'block2',
              blockName: 'Function',
              blockType: 'function',
              startedAt: '2023-01-01T00:00:00.000Z',
              endedAt: '2023-01-01T00:00:01.000Z',
              durationMs: 1000,
              success: false,
              error: 'Error in function execution'
            }
          ],
          metadata: {
            startTime: undefined,
            endTime: undefined,
            duration: undefined
          }
        })
      })
      
      test('should handle HTTP errors but extract execution details if available', async () => {
        // Mock a response where the HTTP request fails (HTTP 500),
        // but it contains execution details we can extract
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({
            success: false,
            output: {
              response: {}
            },
            error: 'Internal server error during execution',
            logs: [
              {
                blockId: 'block1',
                blockType: 'starter',
                startedAt: '2023-01-01T00:00:00.000Z',
                endedAt: '2023-01-01T00:00:01.000Z',
                durationMs: 1000,
                success: true
              }
            ]
          })
        })
        
        const workflowId = 'test-workflow-id'
        
        const result = await sdk.execute(workflowId)
        
        expect(result).toEqual({
          success: false,
          output: {
            response: {}
          },
          error: 'Internal server error during execution',
          logs: [
            {
              blockId: 'block1',
              blockType: 'starter',
              startedAt: '2023-01-01T00:00:00.000Z',
              endedAt: '2023-01-01T00:00:01.000Z',
              durationMs: 1000,
              success: true
            }
          ],
          metadata: {
            startTime: undefined,
            endTime: undefined,
            duration: undefined
          }
        })
      })
      
      test('should throw a proper error for HTTP errors without execution details', async () => {
        // Mock a response where the HTTP request fails (HTTP 403),
        // but it doesn't contain execution details
        const errorResponse = {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => ({
            error: 'Access denied'
          })
        }
        mockFetch.mockImplementationOnce(async () => errorResponse)
        
        const workflowId = 'test-workflow-id'
        
        // Use a try/catch to handle the rejection explicitly
        try {
          await sdk.execute(workflowId)
          // If we get here, the test should fail
          expect('This should not be reached').toBe('The promise should have rejected')
        } catch (error) {
          // Successfully caught the error
          expect(error.message).toContain('API error: 403 Forbidden')
          expect(error.status).toBe(403)
        }
      })
    })
  })
  
  describe('WorkflowBuilder integration', () => {
    test('should build and execute a workflow correctly', async () => {
      const sdk = new SimStudio({ apiKey: 'test-api-key' })
      
      // Mock saving the workflow
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflow: {
            id: 'new-workflow-id',
            name: 'Test Workflow',
            description: 'A test workflow',
            state: {
              blocks: [
                { id: 'starter-1', type: 'starter' },
                { id: 'agent-1', type: 'agent' },
                { id: 'function-1', type: 'function' }
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
      
      // Mock executing the workflow
      mockFetch.mockResolvedValueOnce({
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
      
      // Create a workflow using the builder
      const builder = sdk.createWorkflow('Test Workflow', 'A test workflow')
      
      // Get the starter block and add custom blocks
      const starterBlock = builder.getStarterBlock()
      
      const agentBlock = new AgentBlock({
        model: 'gpt-4',
        apiKey: '{{OPENAI_API_KEY}}',
        prompt: 'Summarize the following text: {{input}}'
      }).setName('Summarizer')
      
      const functionBlock = new FunctionBlock({
        code: 'return { length: input.message.length }'
      }).setName('Response Length')
      
      // Add blocks and connections
      builder.addBlock(agentBlock)
      builder.addBlock(functionBlock)
      
      // Connect blocks
      builder.connect(starterBlock.id, agentBlock.id)
      builder.connect(agentBlock.id, functionBlock.id)
      
      // Build and save the workflow
      const workflow = builder.build()
      const savedWorkflow = await sdk.saveWorkflow(workflow)
      
      // Execute the workflow with input
      const result = await sdk.execute(savedWorkflow.id!, { text: 'This is a test' })
      
      // Verify the workflow was built and executed correctly
      expect(savedWorkflow.id).toBe('new-workflow-id')
      expect(savedWorkflow.blocks.length).toBe(3)
      expect(savedWorkflow.connections.length).toBe(2)
      
      expect(result.success).toBe(true)
      expect(result.output.response.message).toBe('Workflow executed successfully')
    })
  })

  describe('execution integration', () => {
    let sdk: SimStudio
    
    beforeEach(() => {
      sdk = new SimStudio({ apiKey: 'test-api-key' })
    })
    
    test('should use the Executor to execute a workflow by ID', async () => {
      // Mock executor.execute method
      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        output: { response: 'Executed workflow' },
        logs: []
      })
      
      // Replace the executor's execute method with our mock
      const executorSpy = vi.spyOn(sdk, 'getExecutor').mockImplementation(() => ({
        execute: mockExecute,
        executeWorkflow: vi.fn()
      } as any))
      
      const result = await sdk.execute('test-workflow-id', { input: 'test' })
      
      expect(executorSpy).toHaveBeenCalled()
      expect(mockExecute).toHaveBeenCalledWith('test-workflow-id', { input: 'test' })
      expect(result).toEqual({
        success: true,
        output: { response: 'Executed workflow' },
        logs: []
      })
    })
    
    test('should use the Executor to execute a workflow definition', async () => {
      // Mock executor.executeWorkflow method
      const mockExecuteWorkflow = vi.fn().mockResolvedValue({
        success: true,
        output: { response: 'Executed workflow definition' },
        logs: []
      })
      
      // Replace the executor's executeWorkflow method with our mock
      const executorSpy = vi.spyOn(sdk, 'getExecutor').mockImplementation(() => ({
        execute: vi.fn(),
        executeWorkflow: mockExecuteWorkflow
      } as any))
      
      const workflow = {
        name: 'Test Workflow',
        blocks: [
          { id: 'test-block-1', type: 'starter', data: {} }
        ],
        connections: []
      }
      
      const result = await sdk.executeWorkflow(workflow, { input: 'test' })
      
      expect(executorSpy).toHaveBeenCalled()
      expect(mockExecuteWorkflow).toHaveBeenCalledWith(workflow, { input: 'test' })
      expect(result).toEqual({
        success: true,
        output: { response: 'Executed workflow definition' },
        logs: []
      })
    })
  })
}) 