import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { SimStudio } from '../../src/core'
import { WorkflowBuilder } from '../../src/workflows/builder'
import { FunctionBlock } from '../../src/blocks/function'
import dotenv from 'dotenv'

dotenv.config()

// Helper to conditionally skip tests
const hasApiKey = !!process.env.SIM_STUDIO_API_KEY

// Log environment for debugging
console.log('API Key present:', !!process.env.SIM_STUDIO_API_KEY)
console.log('API URL:', process.env.SIM_STUDIO_API_URL || 'https://simstudio.ai')

// This will cause the test suite to be marked as skipped if no API key is available
describe(hasApiKey ? 'Workflow Execution Integration Tests' : 'Workflow Execution Integration Tests (skipped - no API key)', () => {
  let sdk: SimStudio
  let workflowId: string

  beforeAll(async () => {
    if (!hasApiKey) {
      return
    }

    // Create SDK instance using environment variables
    // Remove the 'www.' prefix from the URL if present
    const baseUrl = process.env.SIM_STUDIO_API_URL?.replace('www.', '') || 'https://simstudio.ai'
    console.log('Using baseUrl:', baseUrl)
    
    sdk = new SimStudio({
      apiKey: process.env.SIM_STUDIO_API_KEY,
      baseUrl: baseUrl
    })

    // Create a simple workflow for the execution tests
    const builder = new WorkflowBuilder(
      'Execution Test Workflow',
      'A workflow for testing execution'
    )
    
    const starterBlock = builder.getStarterBlock()
    
    // Create a simple function block that performs basic math
    const functionBlock = new FunctionBlock({
      code: `
        // Simple addition function
        const a = input.a || 0;
        const b = input.b || 0;
        return { 
          sum: a + b,
          product: a * b,
          timestamp: new Date().toISOString()
        };
      `
    }).setName('Math Function')
    
    builder.addBlock(functionBlock)
    builder.connect(starterBlock.id, functionBlock.id)
    
    const workflow = builder.build()
    const savedWorkflow = await sdk.saveWorkflow(workflow)
    
    workflowId = savedWorkflow.id!
    console.log(`Created test workflow for execution: ${workflowId}`)
  })

  test('should execute a workflow by ID with input', async () => {
    if (!hasApiKey || !workflowId) {
      return
    }

    // Execute the workflow with numeric input
    const input = { a: 5, b: 7 }
    const result = await sdk.execute(workflowId, input)
    
    // Verify the execution succeeded and returned the expected results
    expect(result.success).toBe(true)
    expect(result.output.response).toBeDefined()
    expect(result.output.response.sum).toBe(12) // 5 + 7
    expect(result.output.response.product).toBe(35) // 5 * 7
    expect(result.output.response.timestamp).toBeDefined()
    
    // Verify we have execution logs
    expect(result.logs).toBeDefined()
    expect(result.logs!.length).toBeGreaterThan(0)
    
    // Verify metadata
    expect(result.metadata).toBeDefined()
    expect(result.metadata!.startTime).toBeDefined()
    expect(result.metadata!.endTime).toBeDefined()
    expect(result.metadata!.duration).toBeGreaterThan(0)
  })

  test('should execute a direct workflow definition', async () => {
    if (!hasApiKey) {
      return
    }
    
    // Create a simple workflow definition directly
    const workflow = {
      name: 'Direct Execution Test',
      description: 'A workflow defined and executed directly',
      blocks: [
        {
          id: 'starter-1',
          type: 'starter',
          data: {}
        },
        {
          id: 'function-1',
          type: 'function',
          data: {
            code: 'return { text: input.text.toUpperCase() }'
          }
        }
      ],
      connections: [
        {
          source: 'starter-1',
          target: 'function-1'
        }
      ]
    }
    
    // Execute the workflow with input
    const input = { text: 'hello world' }
    const result = await sdk.executeWorkflow(workflow, input)
    
    // Verify the execution succeeded
    expect(result.success).toBe(true)
    expect(result.output.response).toBeDefined()
    expect(result.output.response.text).toBe('HELLO WORLD')
  })

  // Clean up the created workflow after tests
  afterAll(async () => {
    if (hasApiKey && workflowId) {
      try {
        await sdk.deleteWorkflow(workflowId)
        console.log(`Test workflow deleted: ${workflowId}`)
      } catch (error) {
        console.error(`Failed to delete test workflow: ${error}`)
      }
    }
  })
}) 