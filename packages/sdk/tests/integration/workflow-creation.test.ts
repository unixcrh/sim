import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { SimStudio } from '../../src/core'
import { WorkflowBuilder } from '../../src/workflows/builder'
import { AgentBlock } from '../../src/blocks/agent'
import { FunctionBlock } from '../../src/blocks/function'
import dotenv from 'dotenv'

dotenv.config()

// Helper to conditionally skip tests
const hasApiKey = !!process.env.SIM_STUDIO_API_KEY

// This will cause the test suite to be marked as skipped if no API key is available
describe(hasApiKey ? 'Workflow Creation Integration Tests' : 'Workflow Creation Integration Tests (skipped - no API key)', () => {
  let sdk: SimStudio
  let createdWorkflowId: string

  beforeAll(() => {
    if (!hasApiKey) {
      return
    }

    // Create SDK instance using environment variables
    // Remove the 'www.' prefix from the URL if present
    const baseUrl = process.env.SIM_STUDIO_API_URL?.replace('www.', '') || 'https://simstudio.ai'
    
    sdk = new SimStudio({
      apiKey: process.env.SIM_STUDIO_API_KEY,
      baseUrl: baseUrl
    })
  })

  test('should create a new workflow using the builder', async () => {
    if (!hasApiKey) {
      return
    }

    // Create a workflow with the builder
    const builder = new WorkflowBuilder(
      'Integration Test Workflow',
      'A workflow created by integration tests'
    )
    
    // Get the starter block
    const starterBlock = builder.getStarterBlock()
    
    // Create an agent block
    const agentBlock = new AgentBlock({
      model: 'gpt-4-turbo',
      prompt: 'Analyze the following text: {{input}}',
      apiKey: '{{OPENAI_API_KEY}}'
    }).setName('Text Analyzer')
    
    // Create a function block
    const functionBlock = new FunctionBlock({
      code: 'return { wordCount: input.message.split(" ").length }'
    }).setName('Word Counter')
    
    // Add blocks to the workflow
    builder.addBlock(agentBlock)
    builder.addBlock(functionBlock)
    
    // Connect the blocks
    builder.connect(starterBlock.id, agentBlock.id)
    builder.connect(agentBlock.id, functionBlock.id)
    
    // Build the workflow
    const workflow = builder.build()
    
    // Save the workflow
    const result = await sdk.saveWorkflow(workflow)
    
    // Store the workflow ID for subsequent tests
    createdWorkflowId = result.id!
    
    // Verify the workflow was created successfully
    expect(result.id).toBeDefined()
    expect(result.name).toBe('Integration Test Workflow')
    expect(result.blocks.length).toBe(3) // starter + agent + function
    expect(result.connections.length).toBe(2) // starter->agent, agent->function
  })

  test('should retrieve a workflow by ID', async () => {
    // Skip if no API key or the workflow ID is not available
    if (!hasApiKey || !createdWorkflowId) {
      return
    }

    // Get the workflow
    const workflow = await sdk.getWorkflow(createdWorkflowId)
    
    // Verify the workflow data
    expect(workflow.id).toBe(createdWorkflowId)
    expect(workflow.name).toBe('Integration Test Workflow')
    expect(workflow.description).toBe('A workflow created by integration tests')
    expect(workflow.blocks.length).toBe(3)
    expect(workflow.connections.length).toBe(2)
  })

  test('should list workflows and include the created workflow', async () => {
    // Skip if no API key or the workflow ID is not available
    if (!hasApiKey || !createdWorkflowId) {
      return
    }

    // List workflows
    const workflows = await sdk.listWorkflows()
    
    // Verify the workflow is in the list
    const foundWorkflow = workflows.find(w => w.id === createdWorkflowId)
    expect(foundWorkflow).toBeDefined()
    expect(foundWorkflow?.name).toBe('Integration Test Workflow')
  })

  // Clean up the created workflow after tests
  afterAll(async () => {
    if (hasApiKey && createdWorkflowId) {
      try {
        await sdk.deleteWorkflow(createdWorkflowId)
        console.log(`Test workflow deleted: ${createdWorkflowId}`)
      } catch (error) {
        console.error(`Failed to delete test workflow: ${error}`)
      }
    }
  })
}) 