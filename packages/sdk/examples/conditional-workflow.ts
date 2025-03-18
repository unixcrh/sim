import { SimStudio } from '../src';
import { AgentBlock } from '../src/blocks/agent';
import { ConditionBlock } from '../src/blocks/condition';
import { FunctionBlock } from '../src/blocks/function';

/**
 * Example showing how to create a workflow with conditional branches
 * Customer service workflow that routes inquiries to different departments
 */
async function conditionalWorkflowExample() {
  try {
    // Initialize Sim Studio SDK
    const simStudio = new SimStudio({
      apiKey: 'your-api-key', // Replace with your actual API key
    });

    // Create a workflow for handling customer inquiries
    const workflow = simStudio.createWorkflow(
      'Customer Inquiry Router',
      'Routes customer inquiries to appropriate departments based on content'
    );

    // Create a classifier agent block
    const classifierBlock = new AgentBlock({
      model: 'claude-3-haiku',
      prompt: `
        Analyze the customer inquiry: "{{input.inquiry}}"
        Determine which category it belongs to:
        - technical: Technical support requests or product troubleshooting
        - billing: Questions about billing, subscriptions, or payments
        - general: General information requests
        
        Return ONLY the category name as a single word (technical, billing, or general).
      `,
      temperature: 0.1
    }).setName('Inquiry Classifier');

    // Create a condition block to route based on classification
    const routingConditionBlock = new ConditionBlock({
      conditions: [
        { expression: 'input.classification === "technical"', id: 'technical' },
        { expression: 'input.classification === "billing"', id: 'billing' },
        { expression: 'input.classification === "general"', id: 'general' }
      ]
    }).setName('Route Inquiry');

    // Create specialized agent blocks for each department
    const technicalSupportBlock = new AgentBlock({
      model: 'claude-3-sonnet',
      prompt: `
        You are a technical support specialist.
        Respond to the following technical support inquiry: "{{input.inquiry}}"
        Provide detailed troubleshooting steps and solutions.
      `,
      temperature: 0.3
    }).setName('Technical Support');

    const billingBlock = new AgentBlock({
      model: 'claude-3-sonnet',
      prompt: `
        You are a billing specialist.
        Respond to the following billing inquiry: "{{input.inquiry}}"
        Provide clear information about billing processes, payment options, or subscription details.
      `,
      temperature: 0.3
    }).setName('Billing Department');

    const generalInfoBlock = new AgentBlock({
      model: 'claude-3-sonnet',
      prompt: `
        You are a customer service representative.
        Respond to the following general inquiry: "{{input.inquiry}}"
        Provide helpful information about the company, products, or services.
      `,
      temperature: 0.3
    }).setName('General Information');

    // Create a response formatter block
    const formatterBlock = new FunctionBlock({
      code: `
        function formatResponse(input) {
          return {
            category: input.classification,
            response: input.response,
            timestamp: new Date().toISOString()
          };
        }
      `
    }).setName('Response Formatter');

    // Add all blocks to the workflow
    workflow.addBlock(classifierBlock);
    workflow.addBlock(routingConditionBlock);
    workflow.addBlock(technicalSupportBlock);
    workflow.addBlock(billingBlock);
    workflow.addBlock(generalInfoBlock);
    workflow.addBlock(formatterBlock);

    // Connect the starter block to the classifier
    const starterBlock = workflow.getStarterBlock();
    workflow.connect(starterBlock.id, classifierBlock.id);
    
    // Connect classifier to the condition block
    workflow.connect(classifierBlock.id, routingConditionBlock.id);
    
    // Connect condition block to department-specific blocks based on conditions
    workflow.connect(routingConditionBlock.id, technicalSupportBlock.id, { sourceHandle: 'condition-technical' });
    workflow.connect(routingConditionBlock.id, billingBlock.id, { sourceHandle: 'condition-billing' });
    workflow.connect(routingConditionBlock.id, generalInfoBlock.id, { sourceHandle: 'condition-general' });
    
    // Connect all department blocks to the formatter
    workflow.connect(technicalSupportBlock.id, formatterBlock.id);
    workflow.connect(billingBlock.id, formatterBlock.id);
    workflow.connect(generalInfoBlock.id, formatterBlock.id);

    // Build the workflow
    const builtWorkflow = workflow.build();
    
    return builtWorkflow;
  } catch (error) {
    console.error('Error in conditional workflow setup:', error);
    throw error;
  }
}

// Run the example
if (require.main === module) {
  conditionalWorkflowExample().catch(console.error);
}

export default conditionalWorkflowExample; 