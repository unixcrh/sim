# Sim Studio SDK

The official SDK for Sim Studio - build, deploy, and manage agentic workflows programmatically.

## Installation

```bash
npm install @sim-studio/sdk
```

## Quick Start

```typescript
import { SimStudio, AgentBlock } from '@sim-studio/sdk'

// Initialize the SDK
const simStudio = new SimStudio({
  apiKey: 'your-api-key',
})

// Create a simple workflow
const workflowBuilder = simStudio.createWorkflow('My First Workflow')

// Add an agent block
const agentBlock = new AgentBlock({
  model: 'claude-3-7-sonnet',
  prompt: 'Tell me about <input.topic>',
  systemPrompt: 'You are a helpful assistant.',
}).setName('Agent Response')

// Add the block to the workflow
workflowBuilder.addBlock(agentBlock)

// Connect the starter block to the agent block
const starterBlock = workflowBuilder.getStarterBlock()
workflowBuilder.connect(starterBlock.id, agentBlock.id)

// Save the workflow
simStudio.saveWorkflow(workflowBuilder.build())
  .then(workflow => {
    console.log('Workflow created:', workflow.id)
    
    // Execute the workflow
    return simStudio.executeWorkflow(workflow.id, {
      topic: 'artificial intelligence'
    })
  })
  .then(result => {
    console.log('Execution result:', result.output)
  })
  .catch(error => {
    console.error('Error:', error)
  })
```

## Features

- Create and manage workflows programmatically
- Build complex workflows with various block types
- Execute workflows and retrieve results
- Deploy workflows as API endpoints
- Schedule workflows for automatic execution

## Block Types

The SDK supports all Sim Studio block types:

- **Agent**: LLM-powered operations
- **Function**: Custom JavaScript code execution
- **Condition**: Branching based on logical expressions
- **Router**: Dynamic path selection
- **API**: HTTP requests
- **Evaluator**: LLM-based output assessment

## Documentation

For detailed documentation, visit [docs.simstudio.dev](https://docs.simstudio.dev)

## Examples

Check out the `examples` directory for more complex usage examples.

## License

MIT 