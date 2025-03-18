import { SimStudio } from '../src';
import { Block } from '../src/blocks/base';
import { AgentBlock } from '../src/blocks/agent';
import { FunctionBlock } from '../src/blocks/function';

/**
 * Example showing how to create a basic workflow with Sim Studio SDK
 */
async function createBasicWorkflow() {
  // Initialize Sim Studio SDK
  const simStudio = new SimStudio({
    apiKey: 'your-api-key', // Replace with your actual API key
  });

  // Create a workflow
  const workflow = simStudio.createWorkflow(
    'Simple Content Creator', 
    'Generate blog posts from topics'
  );

  // Create blocks
  const contentGeneratorBlock = new AgentBlock({
    model: 'claude-3-sonnet',
    prompt: 'Write a blog post about {{input.topic}}',
    systemPrompt: 'You are a professional content writer.',
  }).setName('Generate Content');

  const formatterBlock = new FunctionBlock({
    code: `
      function formatContent(input) {
        const content = input.content;
        // Add H1 title
        let formatted = '# ' + input.topic + '\\n\\n';
        // Add the content
        formatted += content;
        // Add footer
        formatted += '\\n\\n---\\nGenerated with SimStudio';
        return { formattedContent: formatted };
      }
      return formatContent(input);
    `
  }).setName('Format Content');

  // Add blocks to workflow
  workflow.addBlock(contentGeneratorBlock);
  workflow.addBlock(formatterBlock);

  // Connect blocks
  // First get the starting block that's created by default
  const starterBlock = workflow.getStarterBlock();
  
  workflow
    .connect(starterBlock.id, contentGeneratorBlock.id)
    .connect(contentGeneratorBlock.id, formatterBlock.id);

  // Build the workflow
  const builtWorkflow = workflow.build();
  
  // Execute the workflow
  try {
    const workflowId = '123456'; // In a real scenario, this would be the ID returned from saveWorkflow
    const result = await simStudio.executeWorkflow(workflowId, {
      topic: 'The benefits of AI for content creation'
    });
    
  } catch (error) {
    console.error('Error executing workflow:', error);
  }
  
  return builtWorkflow;
}

// Run the example
if (require.main === module) {
  createBasicWorkflow().catch(console.error);
}

export default createBasicWorkflow; 