import { ExecutionResult, Workflow } from '../types'

/**
 * Simplified executor for the SDK that uses the API to execute workflows
 * instead of executing them locally
 */
export class Executor {
  private apiKey: string
  private baseUrl: string
  private timeout: number

  /**
   * Create a new Executor instance
   * @param config Configuration for the executor
   * @throws Error if no API key is provided
   */
  constructor(
    config: {
      apiKey: string
      baseUrl?: string
      timeout?: number
    }
  ) {
    if (!config.apiKey) {
      throw new Error('API key is required for workflow execution')
    }
    
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://simstudio.ai'
    this.timeout = config.timeout || 30000
  }

  /**
   * Execute a workflow by ID
   */
  async execute(
    workflowId: string,
    input?: Record<string, any>
  ): Promise<ExecutionResult> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/workflow/${workflowId}/execute`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(input || {}),
      })
      
      if (!response.ok) {
        // For execution endpoints, even non-200 responses might contain valuable execution data
        // that we want to return instead of throwing an error
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (e) {
          // If we can't parse JSON, just throw the regular error
          await this.checkResponse(response) // This will throw
          throw new Error('Failed to execute workflow') // Fallback, should not reach here
        }
        
        // If we have execution data in the error response, return it as a failed execution result
        if (errorData && typeof errorData.output !== 'undefined') {
          return {
            success: false,
            output: errorData.output || { response: {} },
            error: errorData.error || 'Execution failed',
            logs: errorData.logs || [],
            metadata: {
              startTime: errorData.metadata?.startTime,
              endTime: errorData.metadata?.endTime,
              duration: errorData.metadata?.duration,
            }
          }
        }
        
        // If no execution data, throw the regular error
        const error: any = new Error(`API error: ${response.status} ${response.statusText}`)
        error.status = response.status
        error.apiResponse = errorData
        throw error
      }
      
      const result = await response.json()
      
      return {
        success: result.success,
        output: result.output || { response: {} },
        error: result.error,
        logs: result.logs || [],
        metadata: {
          startTime: result.metadata?.startTime,
          endTime: result.metadata?.endTime,
          duration: result.metadata?.duration,
        }
      }
    } catch (error: any) {
      // If the error has already been processed and formatted, just throw it
      if (error.status && error.apiResponse) {
        throw error
      }
      
      // Otherwise handle generic errors
      throw this.handleApiError(error, 'Failed to execute workflow')
    }
  }

  /**
   * Execute a workflow using a workflow definition directly
   * This uses the platform to handle serialization and execution
   */
  async executeWorkflow(
    workflow: Workflow,
    input?: Record<string, any>
  ): Promise<ExecutionResult> {
    try {
      // Create a UUID for the workflow if it doesn't have one
      const workflowId = workflow.id || crypto.randomUUID()
      
      // First, save the workflow using the correct payload format
      const workflowPayload = {
        workflows: {
          [workflowId]: {
            id: workflowId,
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
      
      // Save to the correct endpoint
      const saveResponse = await this.fetchWithTimeout(`${this.baseUrl}/api/db/workflow`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(workflowPayload),
      })
      
      await this.checkResponse(saveResponse)
      
      // Then execute it using the platform's execution endpoint
      return this.execute(workflowId, input)
    } catch (error: any) {
      throw this.handleApiError(error, 'Failed to execute workflow')
    }
  }

  /**
   * Get common headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)
    
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
} 