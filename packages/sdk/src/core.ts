import { SimStudioConfig, Workflow, ExecutionResult, DeploymentOptions, DeploymentResult, ScheduleOptions, ScheduleResult } from './types'
import { WorkflowBuilder } from './workflows/builder'
import { BlockRegistry, BlockImport } from './blocks/registry'
import { Tool, ToolRegistry } from './tools'
import { Executor } from './executor'

/**
 * Main SDK class for Sim Studio
 */
export class SimStudio {
  private config: Required<SimStudioConfig>

  /**
   * Create a new Sim Studio SDK instance
   */
  constructor(config: SimStudioConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.SIM_STUDIO_API_KEY ?? '',
      baseUrl: config.baseUrl ?? process.env.SIM_STUDIO_API_URL ?? 'https://simstudio.ai',
      timeout: config.timeout ?? 30000,
    }
  }

  /**
   * Create a new workflow builder
   */
  createWorkflow(name: string, description?: string): WorkflowBuilder {
    return new WorkflowBuilder(name, description)
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/workflow/${id}`, {
        headers: this.getHeaders(),
      })
      
      this.checkResponse(response)
      const data = await response.json()
      
      // Transform from API format to SDK format
      return {
        id: data.workflow.id,
        name: data.workflow.name,
        description: data.workflow.description || '',
        blocks: data.workflow.state.blocks,
        connections: data.workflow.state.edges,
        loops: data.workflow.state.loops || {},
        metadata: data.workflow.metadata || {},
      }
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to retrieve workflow')
    }
  }

  /**
   * List all workflows
   */
  async listWorkflows(params: { limit?: number; offset?: number } = {}): Promise<Workflow[]> {
    try {
      // Add query parameters if they exist
      const queryParams = new URLSearchParams()
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.offset) queryParams.append('offset', params.offset.toString())
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
      
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/db/workflow${query}`, {
        headers: this.getHeaders(),
      })
      
      this.checkResponse(response)
      const data = await response.json()
      
      // Transform data format if needed
      const workflows = data.data ? data.data : data.workflows || []
      
      // Map to the format expected by the SDK
      return workflows.map((wf: any) => ({
        id: wf.id,
        name: wf.name,
        description: wf.description || '',
        blocks: wf.state?.blocks || {},
        connections: wf.state?.edges || [],
        loops: wf.state?.loops || {},
        metadata: {
          color: wf.color,
          createdAt: wf.createdAt,
          updatedAt: wf.updatedAt,
          ...wf.metadata
        }
      }))
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to list workflows')
    }
  }

  /**
   * Save a workflow
   */
  async saveWorkflow(workflow: Workflow): Promise<Workflow> {
    try {
      // The primary endpoint for saving workflows
      const url = `${this.config.baseUrl}/api/db/workflow`
      
      console.log(`Saving workflow to: ${url}`)
      
      // Create the payload that matches the platform's expected format
      const workflowPayload = {
        workflows: {
          [workflow.id || crypto.randomUUID()]: {
            id: workflow.id || crypto.randomUUID(),
            name: workflow.name,
            description: workflow.description || '',
            color: workflow.metadata?.color || '#3972F6',
            state: {
              blocks: workflow.blocks,
              edges: workflow.connections,
              loops: workflow.loops || {},
              lastSaved: Date.now(),
            }
          }
        }
      }
      
      // Log the payload for debugging
      console.log(`Sending payload with ${Object.keys(workflowPayload.workflows).length} workflows`)
      
      // Send the request to the API
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(workflowPayload),
      })
      
      // Log response status
      console.log(`Response status: ${response.status} ${response.statusText}`)
      
      await this.checkResponse(response)
      
      // After successful save, get the workflow details to return
      const savedWorkflowId = Object.keys(workflowPayload.workflows)[0]
      console.log(`Workflow saved successfully with ID: ${savedWorkflowId}`)
      
      // Fetch the workflow to get the latest state
      const savedWorkflow = await this.getWorkflow(savedWorkflowId)
      
      return savedWorkflow
    } catch (error: any) {
      console.error(`Error saving workflow: ${error.message}`)
      if (error.response) {
        console.error(`Response status: ${error.response.status}`)
        console.error(`Response data:`, error.response.data)
      }
      throw this.handleApiError(error, 'Failed to save workflow')
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/workflow/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })
      
      this.checkResponse(response)
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to delete workflow')
    }
  }

  /**
   * Get an Executor instance using the current SDK configuration
   */
  getExecutor(): Executor {
    return new Executor({
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout
    })
  }

  /**
   * Execute a workflow by ID
   */
  async execute(id: string, input?: Record<string, any>): Promise<ExecutionResult> {
    const executor = this.getExecutor()
    return executor.execute(id, input)
  }

  /**
   * Directly execute a workflow definition
   * This is a convenience method that uses the Executor under the hood
   */
  async executeWorkflow(workflow: Workflow, input?: Record<string, any>): Promise<ExecutionResult> {
    const executor = this.getExecutor()
    return executor.executeWorkflow(workflow, input)
  }

  /**
   * Deploy a workflow as an API endpoint
   */
  async deployWorkflow(id: string, options: DeploymentOptions = {}): Promise<DeploymentResult> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/workflow/${id}/deploy`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(options),
      })
      
      this.checkResponse(response)
      return await response.json()
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to deploy workflow')
    }
  }

  /**
   * Get deployment details
   */
  async getDeployment(workflowId: string): Promise<DeploymentResult> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/workflow/${workflowId}/deployment`, {
        headers: this.getHeaders(),
      })
      
      this.checkResponse(response)
      return await response.json()
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to get deployment details')
    }
  }

  /**
   * Remove a workflow deployment
   */
  async undeployWorkflow(workflowId: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/workflow/${workflowId}/deployment`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })
      
      this.checkResponse(response)
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to undeploy workflow')
    }
  }

  /**
   * Schedule a workflow
   */
  async scheduleWorkflow(workflowId: string, options: ScheduleOptions): Promise<ScheduleResult> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/scheduled/schedule`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          workflowId,
          ...options
        }),
      })
      
      this.checkResponse(response)
      return await response.json()
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to schedule workflow')
    }
  }

  /**
   * Get a workflow schedule
   */
  async getSchedule(scheduleId: string): Promise<ScheduleResult> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/scheduled/schedule/${scheduleId}`, {
        headers: this.getHeaders(),
      })
      
      this.checkResponse(response)
      return await response.json()
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to get schedule')
    }
  }

  /**
   * List schedules for a workflow
   */
  async listSchedules(workflowId: string): Promise<ScheduleResult[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/workflow/${workflowId}/schedules`, {
        headers: this.getHeaders(),
      })
      
      this.checkResponse(response)
      const data = await response.json()
      return data.schedules
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to list schedules')
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })
      
      this.checkResponse(response)
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to delete schedule')
    }
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    }
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const timeout = this.config.timeout
    
    if (timeout) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        return response
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    } else {
      return fetch(url, options)
    }
  }

  /**
   * Check response for errors
   */
  private async checkResponse(response: Response): Promise<void> {
    if (!response.ok) {
      let errorData: any = {}
      try {
        errorData = await response.json()
      } catch (e) {
        // If we can't parse JSON, just use the status text
      }
      
      const error: any = new Error(`API error: ${response.status} ${response.statusText}`)
      error.status = response.status
      error.apiResponse = errorData
      throw error
    }
  }

  /**
   * Handle API errors and provide more meaningful error messages
   */
  private handleApiError(error: any, defaultMessage: string): Error {
    // Handle AbortError from fetch timeout
    if (error.name === 'AbortError') {
      return new Error(`Request timeout: ${defaultMessage}`)
    }
    
    // If we have API response data
    if (error.apiResponse) {
      const message = error.apiResponse.error || error.apiResponse.message || defaultMessage
      const statusCode = error.status
      
      const errorMessage = `${message} (Status: ${statusCode})`
      const enhancedError = new Error(errorMessage)
      
      // Add properties to the error object for more context
      Object.assign(enhancedError, {
        status: statusCode,
        data: error.apiResponse,
      })
      
      return enhancedError
    }
    
    // For other types of errors (network etc.)
    return new Error(`${defaultMessage}: ${error.message || 'Unknown error'}`)
  }

  /**
   * Register blocks from the main application
   */
  static registerBlocks(blocks: BlockImport[]): void {
    blocks.forEach(block => {
      BlockRegistry.register(block.id, block.blockClass, block.options)
    })
  }

  /**
   * Register tools from the main application
   */
  static registerTools(tools: Tool[]): void {
    tools.forEach(tool => {
      ToolRegistry.register(tool)
    })
  }

  /**
   * Get all registered blocks
   */
  static getRegisteredBlocks(): string[] {
    return BlockRegistry.getAll()
  }

  /**
   * Get all registered tools
   */
  static getRegisteredTools(): Tool[] {
    return ToolRegistry.getAll()
  }
} 