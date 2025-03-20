# Sim Studio SDK

Official SDK for Sim Studio - build, deploy, and manage agentic workflows.

## Installation

```bash
npm install @sim-studio/sdk
```

## Getting Started

To use the Sim Studio SDK, you'll need an API key from your Sim Studio account.

```typescript
import { SimStudio } from '@sim-studio/sdk';

// Initialize the SDK with your API key
const simStudio = new SimStudio({
  apiKey: 'your-api-key',
  // Optional configurations:
  // baseUrl: 'https://your-custom-url.com', // Default is https://simstudio.ai
  // timeout: 60000, // Default is 30000ms
});
```

## Creating Workflows

You can create workflows programmatically using the WorkflowBuilder:

```typescript
import { SimStudio, AgentBlock, FunctionBlock } from '@sim-studio/sdk';

async function createWorkflow() {
  const simStudio = new SimStudio({ apiKey: 'your-api-key' });
  
  // Create a new workflow builder
  const builder = simStudio.createWorkflow('Content Generator', 'Generates and optimizes content');
  
  // Get the starter block (automatically added to new workflows)
  const starterBlock = builder.getStarterBlock();
  
  // Create an agent block for content generation
  const contentBlock = new AgentBlock({
    model: 'gpt-4',
    apiKey: '{{OPENAI_API_KEY}}', // Using environment variable
    prompt: 'Generate blog content about: {{input.topic}}',
    systemPrompt: 'You are a professional content writer specializing in blog posts.'
  }).setName('Content Generator');
  
  // Create a function block for formatting
  const formatterBlock = new FunctionBlock({
    code: `
      // Format the content
      return {
        title: input.response.substring(0, input.response.indexOf('\n')),
        content: input.response.substring(input.response.indexOf('\n') + 1),
        wordCount: input.response.split(' ').length
      };
    `
  }).setName('Content Formatter');
  
  // Add blocks to the workflow
  builder.addBlock(contentBlock);
  builder.addBlock(formatterBlock);
  
  // Connect blocks together
  builder.connect(starterBlock.id, contentBlock.id);
  builder.connect(contentBlock.id, formatterBlock.id);
  
  // Build the workflow definition
  const workflow = builder.build();
  
  // Save the workflow to Sim Studio
  const savedWorkflow = await simStudio.saveWorkflow(workflow);
  console.log(`Workflow saved with ID: ${savedWorkflow.id}`);
  
  return savedWorkflow;
}
```

## Executing Workflows

Execute a workflow by its ID:

```typescript
async function executeWorkflow(workflowId) {
  const simStudio = new SimStudio({ apiKey: 'your-api-key' });
  
  const input = {
    topic: 'Artificial Intelligence in Healthcare'
  };
  
  const result = await simStudio.executeWorkflow(workflowId, input);
  
  if (result.success) {
    console.log('Workflow executed successfully!');
    console.log('Output:', result.output.response);
  } else {
    console.error('Workflow execution failed:', result.error);
  }
  
  return result;
}
```

## Deploying Workflows

Deploy a workflow as an API endpoint:

```typescript
async function deployWorkflow(workflowId) {
  const simStudio = new SimStudio({ apiKey: 'your-api-key' });
  
  const deployment = await simStudio.deployWorkflow(workflowId, {
    isPublic: true,
    authentication: 'api_key',
    rateLimit: 100
  });
  
  console.log(`Workflow deployed at: ${deployment.url}`);
  return deployment;
}
```

## Scheduling Workflows

Schedule a workflow to run on a recurring basis:

```typescript
async function scheduleWorkflow(workflowId) {
  const simStudio = new SimStudio({ apiKey: 'your-api-key' });
  
  const schedule = await simStudio.scheduleWorkflow(workflowId, {
    cron: '0 9 * * 1-5', // Run at 9 AM on weekdays
    timezone: 'America/New_York',
    input: {
      topic: 'Daily AI News'
    }
  });
  
  console.log(`Workflow scheduled with ID: ${schedule.id}`);
  console.log(`Next run at: ${schedule.nextRunAt}`);
  
  return schedule;
}
```

## Direct Execution with Executor

For more control over workflow execution, you can use the Executor directly:

```typescript
import { Executor, WorkflowBuilder, AgentBlock } from '@sim-studio/sdk';

async function executeWorkflowDirectly() {
  // Create a workflow
  const builder = new WorkflowBuilder('Test Workflow');
  const starterBlock = builder.getStarterBlock();
  
  const agentBlock = new AgentBlock({
    model: 'gpt-4',
    apiKey: 'your-api-key',
    prompt: 'Hello {{input.name}}!'
  }).setName('Greeter');
  
  builder.addBlock(agentBlock);
  builder.connect(starterBlock.id, agentBlock.id);
  
  const workflow = builder.build();
  
  // Create executor with API key
  const executor = new Executor({
    apiKey: 'your-sim-studio-api-key'
  });
  
  // Execute the workflow directly
  // This will first save the workflow and then execute it
  const result = await executor.executeWorkflow(workflow, {
    name: 'World'
  });
  
  console.log(result.output.response); // Should output "Hello World!"
  return result;
}
```

## Available Block Types

The SDK includes several block types that you can use to build workflows:

- `StarterBlock`: Entry point for workflow execution
- `AgentBlock`: LLM-powered agent for generating content
- `FunctionBlock`: Custom JavaScript code execution
- `ConditionBlock`: Branch workflows based on conditions
- `RouterBlock`: Route execution based on predefined paths
- `ApiBlock`: Make API requests to external services
- `EvaluatorBlock`: Evaluate content against criteria

## Environment Variables

You can use environment variables in your workflows by using the `{{VARIABLE_NAME}}` syntax. These will be replaced with values from your Sim Studio environment settings at runtime.

- `SIM_STUDIO_API_KEY`: Your API key for authenticating with Sim Studio
- `SIM_STUDIO_API_URL`: Override the default API endpoint (defaults to https://simstudio.ai)

## Testing

The SDK includes both unit and integration tests.

### Running Tests

```bash
# Run only unit tests (default behavior)
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests (requires API key)
npm run test:integration
```

### Integration Tests

Integration tests make actual API calls to the Sim Studio platform and require a valid API key set in the `.env` file:

```
SIM_STUDIO_API_KEY=your_api_key
SIM_STUDIO_API_URL=https://simstudio.ai
```

These tests verify:
- Workflow creation and management
- Workflow execution
- Advanced features like conditions and loops

By default, integration tests are excluded from normal test runs to avoid failing CI/CD pipelines. Use the dedicated script to run them when needed.

## Contributing

## Error Handling

The SDK provides detailed error handling:

```typescript
try {
  const result = await simStudio.executeWorkflow('workflow-id', input);
  // Handle successful execution
} catch (error) {
  if (error.status) {
    console.error(`API Error (${error.status}):`, error.message);
  } else {
    console.error('Execution error:', error.message);
  }
}
```

## License

[MIT License](LICENSE) 