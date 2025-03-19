import { SimStudio, AgentBlock } from '../src'
import 'dotenv/config'

/**
 * Example showing how to build and execute a workflow in a single script
 */
async function buildAndExecuteWorkflow() {
  // Get API keys from environment
  const apiKey = process.env.SIM_STUDIO_API_KEY || 'your-api-key'
  const agentApiKey = process.env.AGENT_API_KEY || 'your-agent-api-key'
  
  try {
    // Initialize the SDK
    const simStudio = new SimStudio({
      apiKey,
    })
    
    // Create a simple workflow
    const workflowBuilder = simStudio.createWorkflow(
      'Quick Answer',
      'Simple Q&A workflow'
    )
    
    // Add an agent block
    const answerBlock = new AgentBlock({
      model: 'claude-3-haiku',
      prompt: '{{input.question}}',
      systemPrompt: 'You are a helpful AI assistant that provides brief, accurate answers.',
      temperature: 0.3,
      apiKey: agentApiKey,
    }).setName('Answer Generator')
    
    // Add the block to the workflow
    workflowBuilder.addBlock(answerBlock)
    
    // Connect the starter block to the agent block
    const starterBlock = workflowBuilder.getStarterBlock()
    workflowBuilder.connect(starterBlock.id, answerBlock.id)
    
    // Build the workflow
    const workflow = workflowBuilder.build()
    
    // Save the workflow to get an ID
    const savedWorkflow = await simStudio.saveWorkflow(workflow)
    
    if (!savedWorkflow.id) {
      throw new Error('Failed to save workflow: No ID returned')
    }
    
    console.log(`Workflow saved with ID: ${savedWorkflow.id}`)
    
    // Execute the workflow
    const result = await simStudio.execute(savedWorkflow.id, {
      question: 'What is the capital of France?'
    })
    
    if (result.success) {
      console.log('Execution successful')
      console.log('Answer:', result.output.response)
    } else {
      console.error('Execution failed:', result.error)
    }
    
    return {
      workflow: savedWorkflow,
      result
    }
  } catch (error: any) {
    console.error('Error:', error.message)
    if (error.status) {
      console.error(`API Error (${error.status}):`, error.message)
    }
    throw error
  }
}

// Run the example
if (require.main === module) {
  buildAndExecuteWorkflow().catch(() => process.exit(1))
}

export default buildAndExecuteWorkflow 