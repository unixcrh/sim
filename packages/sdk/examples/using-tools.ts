import { SimStudio } from '../src';
import { AgentBlock } from '../src/blocks/agent';
import { getToolRequiredParameters, isToolAvailable } from '../src/generated';
import { Tool } from '../src/tools';

/**
 * Example showing how to use tools with agent blocks
 */
async function usingToolsExample() {
  // Initialize Sim Studio SDK
  const simStudio = new SimStudio({
    apiKey: 'your-api-key', // Replace with your actual API key
  });

  // Create a workflow
  const workflow = simStudio.createWorkflow(
    'Research Assistant', 
    'Research a topic and summarize findings'
  );

  // Create the agent block
  const researchAgentBlock = new AgentBlock({
    model: 'claude-3-opus',
    prompt: 'Research the topic "{{input.topic}}" and provide a comprehensive summary. Use search tools to gather information.',
    systemPrompt: 'You are a research assistant that can search the web for information and compile comprehensive reports.',
    temperature: 0.5,
    tools: [], // We'll add tools to this later
  }).setName('Research Agent');

  // Add the agent to the workflow
  workflow.addBlock(researchAgentBlock);

  // Connect the starter block to the agent
  const starterBlock = workflow.getStarterBlock();
  workflow.connect(starterBlock.id, researchAgentBlock.id);
  
  // Add Tavily search tool if available
  if (isToolAvailable('tavily_search')) {
    
    // Get the required parameters for the tool
    const requiredParams = getToolRequiredParameters('tavily_search');
    
    // Create tool settings with required parameters
    researchAgentBlock.data.toolSettings = {
      tavily_search: {
        apiKey: 'your-tavily-api-key', // Required parameter for tavily_search
      }
    };
    
    // Create a tool object
    const tavilyTool: Tool = {
      id: 'tavily_search',
      name: 'Tavily Search',
      description: 'Search the web for information using Tavily API',
      schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 5
          }
        },
        required: ['query']
      },
      execute: async (params: any) => {
        // This is a mock implementation
        return { results: ['Mock result 1', 'Mock result 2'] };
      }
    };
    
    // Add the tool to the agent
    researchAgentBlock.addTool(tavilyTool);
  }
  
  // Add Serper search tool if available
  if (isToolAvailable('serper_search')) {
    // Get the required parameters for the tool
    const requiredParams = getToolRequiredParameters('serper_search');
    
    // Add the required parameters to tool settings
    researchAgentBlock.data.toolSettings = {
      ...researchAgentBlock.data.toolSettings,
      serper_search: {
        apiKey: 'your-serper-api-key', // Required parameter for serper_search
      }
    };
    
    // Create a tool object
    const serperTool: Tool = {
      id: 'serper_search',
      name: 'Serper Search',
      description: 'Search the web for information using Serper API',
      schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          num_results: {
            type: 'number',
            description: 'Number of results to return',
            default: 10
          }
        },
        required: ['query']
      },
      execute: async (params: any) => {
        // This is a mock implementation
        return { results: ['Mock result 1', 'Mock result 2'] };
      }
    };
    
    // Add the tool to the agent
    researchAgentBlock.addTool(serperTool);
  }
  
  // Build the workflow
  const builtWorkflow = workflow.build();
  
  return builtWorkflow;
}

// Run the example
if (require.main === module) {
  usingToolsExample().catch(console.error);
}

export default usingToolsExample; 