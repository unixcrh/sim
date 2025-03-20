import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { SimStudio } from '../../src/core'
import { WorkflowBuilder } from '../../src/workflows/builder'
import { FunctionBlock } from '../../src/blocks/function'
import { ConditionBlock } from '../../src/blocks/condition'
import dotenv from 'dotenv'

dotenv.config()

// Helper to conditionally skip tests
const hasApiKey = !!process.env.SIM_STUDIO_API_KEY

// This will cause the test suite to be marked as skipped if no API key is available
describe(hasApiKey ? 'Advanced Workflow Features Integration Tests' : 'Advanced Workflow Features Integration Tests (skipped - no API key)', () => {
  let sdk: SimStudio
  let workflowIds: string[] = []

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

  test('should create and execute a workflow with a conditional branch', async () => {
    if (!hasApiKey) {
      return
    }

    // Create a workflow with a conditional branch
    const builder = new WorkflowBuilder(
      'Conditional Branch Test',
      'A workflow that demonstrates conditional branching'
    )
    
    // Get the starter block
    const starterBlock = builder.getStarterBlock()
    
    // Create a function block that will generate data for the condition
    const inputProcessorBlock = new FunctionBlock({
      code: `
        // Process input and add metadata
        const number = input.number || 0;
        return { 
          number,
          isEven: number % 2 === 0,
          timestamp: new Date().toISOString()
        };
      `
    }).setName('Input Processor')
    
    // Create a condition block to check if the number is even
    const conditionBlock = new ConditionBlock({
      conditions: [
        { id: 'is-even', expression: 'input.isEven === true' },
        { id: 'is-odd', expression: 'input.isEven === false' }
      ]
    }).setName('Is Even Check')
    
    // Create two output function blocks for the different paths
    const evenPathBlock = new FunctionBlock({
      code: 'return { result: `${input.number} is even`, path: "even" }'
    }).setName('Even Handler')
    
    const oddPathBlock = new FunctionBlock({
      code: 'return { result: `${input.number} is odd`, path: "odd" }'
    }).setName('Odd Handler')
    
    // Add blocks to the workflow
    builder.addBlock(inputProcessorBlock)
    builder.addBlock(conditionBlock)
    builder.addBlock(evenPathBlock)
    builder.addBlock(oddPathBlock)
    
    // Connect the blocks
    builder.connect(starterBlock.id, inputProcessorBlock.id)
    builder.connect(inputProcessorBlock.id, conditionBlock.id)
    builder.connect(conditionBlock.id, evenPathBlock.id, { sourceHandle: 'condition-is-even' })
    builder.connect(conditionBlock.id, oddPathBlock.id, { sourceHandle: 'condition-is-odd' })
    
    // Build and save the workflow
    const workflow = builder.build()
    const savedWorkflow = await sdk.saveWorkflow(workflow)
    workflowIds.push(savedWorkflow.id!)
    
    // Test with an even number (10)
    const evenInput = { number: 10 }
    const evenResult = await sdk.execute(savedWorkflow.id!, evenInput)
    
    // Verify the even path
    expect(evenResult.success).toBe(true)
    expect(evenResult.output.response.result).toBe('10 is even')
    expect(evenResult.output.response.path).toBe('even')
    
    // Now test with an odd number (7)
    const oddInput = { number: 7 }
    const oddResult = await sdk.execute(savedWorkflow.id!, oddInput)
    
    // Verify the odd path
    expect(oddResult.success).toBe(true)
    expect(oddResult.output.response.result).toBe('7 is odd')
    expect(oddResult.output.response.path).toBe('odd')
  })

  test('should create and execute a workflow with a loop pattern', async () => {
    if (!hasApiKey) {
      return
    }

    // Create a workflow with a loop pattern using function blocks
    const builder = new WorkflowBuilder(
      'Loop Pattern Test',
      'A workflow that demonstrates a counting loop pattern'
    )
    
    // Get the starter block
    const starterBlock = builder.getStarterBlock()
    
    // Create a function block that will initialize the loop
    const initializerBlock = new FunctionBlock({
      code: `
        // Initialize the counter and limit
        const start = input.start || 0;
        const limit = input.limit || 5;
        
        return { 
          counter: start,
          limit: limit,
          results: [],
          shouldContinue: start < limit
        };
      `
    }).setName('Loop Initializer')
    
    // Create a condition block to check if we should continue looping
    const loopConditionBlock = new ConditionBlock({
      conditions: [
        { id: 'continue', expression: 'input.counter < input.limit' },
        { id: 'exit', expression: 'input.counter >= input.limit' }
      ]
    }).setName('Continue Loop?')
    
    // Create a processing block for the loop iteration
    const processBlock = new FunctionBlock({
      code: `
        // Process the current counter value
        const counter = input.counter;
        const squared = counter * counter;
        
        // Clone the results array and add the new value
        const results = [...input.results, squared];
        
        // Increment the counter
        const newCounter = counter + 1;
        
        // Return updated state
        return {
          counter: newCounter,
          limit: input.limit,
          results: results,
          shouldContinue: newCounter < input.limit
        };
      `
    }).setName('Process Iteration')
    
    // Create a results block for when the loop is done
    const resultBlock = new FunctionBlock({
      code: `
        // Format the final results
        return {
          finalCounter: input.counter,
          squaredValues: input.results,
          totalValues: input.results.length
        };
      `
    }).setName('Format Results')
    
    // Add blocks to the workflow
    builder.addBlock(initializerBlock)
    builder.addBlock(loopConditionBlock)
    builder.addBlock(processBlock)
    builder.addBlock(resultBlock)
    
    // Connect the blocks
    builder.connect(starterBlock.id, initializerBlock.id)
    builder.connect(initializerBlock.id, loopConditionBlock.id)
    builder.connect(loopConditionBlock.id, processBlock.id, { sourceHandle: 'condition-continue' })
    builder.connect(processBlock.id, loopConditionBlock.id)
    builder.connect(loopConditionBlock.id, resultBlock.id, { sourceHandle: 'condition-exit' })
    
    // Build and save the workflow
    const workflow = builder.build()
    const savedWorkflow = await sdk.saveWorkflow(workflow)
    workflowIds.push(savedWorkflow.id!)
    
    // Test with a loop from 0 to 5
    const input = { start: 0, limit: 5 }
    const result = await sdk.execute(savedWorkflow.id!, input)
    
    // Verify the loop results
    expect(result.success).toBe(true)
    expect(result.output.response.finalCounter).toBe(5)
    expect(result.output.response.squaredValues).toEqual([0, 1, 4, 9, 16])
    expect(result.output.response.totalValues).toBe(5)
  })

  // Clean up the created workflows after tests
  afterAll(async () => {
    if (hasApiKey) {
      for (const id of workflowIds) {
        try {
          await sdk.deleteWorkflow(id)
          console.log(`Test workflow deleted: ${id}`)
        } catch (error) {
          console.error(`Failed to delete test workflow ${id}: ${error}`)
        }
      }
    }
  })
}) 