import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console-logger'
import { db } from '@/db'
import { chat, workflow } from '@/db/schema'
import { createErrorResponse, createSuccessResponse } from '@/app/api/workflows/utils'
import { addCorsHeaders, validateChatAuth, setChatAuthCookie, validateAuthToken, executeWorkflowForChat } from '../utils'

const logger = createLogger('ChatSubdomainAPI')

// This endpoint handles chat interactions via the subdomain
export async function POST(request: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    logger.debug(`[${requestId}] Processing chat request for subdomain: ${subdomain}`)
    
    // Parse the request body once
    let parsedBody
    try {
      parsedBody = await request.json()
    } catch (error) {
      return addCorsHeaders(createErrorResponse('Invalid request body', 400), request)
    }
    
    // Find the chat deployment for this subdomain
    const deploymentResult = await db
      .select({
        id: chat.id,
        workflowId: chat.workflowId,
        userId: chat.userId,
        isActive: chat.isActive,
        authType: chat.authType,
        password: chat.password,
        allowedEmails: chat.allowedEmails,
        outputBlocks: chat.outputBlocks,
      })
      .from(chat)
      .where(eq(chat.subdomain, subdomain))
      .limit(1)
    
    if (deploymentResult.length === 0) {
      logger.warn(`[${requestId}] Chat not found for subdomain: ${subdomain}`)
      return addCorsHeaders(createErrorResponse('Chat not found', 404), request)
    }
    
    const deployment = deploymentResult[0]
    
    // Check if the chat is active
    if (!deployment.isActive) {
      logger.warn(`[${requestId}] Chat is not active: ${subdomain}`)
      return addCorsHeaders(createErrorResponse('This chat is currently unavailable', 403), request)
    }
    
    // Validate authentication with the parsed body
    const authResult = await validateChatAuth(requestId, deployment, request, parsedBody)
    if (!authResult.authorized) {
      return addCorsHeaders(createErrorResponse(authResult.error || 'Authentication required', 401), request)
    }
    
    // Use the already parsed body
    const { message, password, email } = parsedBody
    
    // If this is an authentication request (has password or email but no message), 
    // set auth cookie and return success
    if ((password || email) && !message) {
      const response = addCorsHeaders(createSuccessResponse({ authenticated: true }), request)
      
      // Set authentication cookie
      setChatAuthCookie(response, deployment.id, deployment.authType)
      
      return response
    }
    
    // For chat messages, create regular response
    if (!message) {
      return addCorsHeaders(createErrorResponse('No message provided', 400), request)
    }
    
    // Get the workflow for this chat
    const workflowResult = await db
      .select({
        isDeployed: workflow.isDeployed,
      })
      .from(workflow)
      .where(eq(workflow.id, deployment.workflowId))
      .limit(1)
    
    if (workflowResult.length === 0 || !workflowResult[0].isDeployed) {
      logger.warn(`[${requestId}] Workflow not found or not deployed: ${deployment.workflowId}`)
      return addCorsHeaders(createErrorResponse('Chat workflow is not available', 503), request)
    }
    
    try {
      // Execute the workflow using our helper function
      const result = await executeWorkflowForChat(deployment.id, message)
      
      // Format the result for the client
      // If result.content is an object, preserve it for structured handling
      // If it's text or another primitive, make sure it's accessible
      let formattedResult: any = { output: null }
      
      if (result && result.content) {
        if (typeof result.content === 'object') {
          // For objects like { text: "some content" }
          if (result.content.text) {
            formattedResult.output = result.content.text
          } else {
            // Keep the original structure but also add an output field
            formattedResult = {
              ...result,
              output: JSON.stringify(result.content)
            }
          }
        } else {
          // For direct string content
          formattedResult = {
            ...result,
            output: result.content
          }
        }
      } else {
        // Fallback if no content
        formattedResult = {
          ...result,
          output: "No output returned from workflow"
        }
      }
      
      logger.info(`[${requestId}] Returning formatted chat response:`, { 
        hasOutput: !!formattedResult.output,
        outputType: typeof formattedResult.output
      })
      
      // Add CORS headers before returning the response
      return addCorsHeaders(createSuccessResponse(formattedResult), request)
    } catch (error: any) {
      logger.error(`[${requestId}] Error processing chat request:`, error)
      return addCorsHeaders(createErrorResponse(error.message || 'Failed to process request', 500), request)
    }
  } catch (error: any) {
    logger.error(`[${requestId}] Error processing chat request:`, error)
    return addCorsHeaders(createErrorResponse(error.message || 'Failed to process request', 500), request)
  }
}

// This endpoint returns information about the chat
export async function GET(request: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params
  const requestId = crypto.randomUUID().slice(0, 8)
  
  try {
    logger.debug(`[${requestId}] Fetching chat info for subdomain: ${subdomain}`)
    
    // Find the chat deployment for this subdomain
    const deploymentResult = await db
      .select({
        id: chat.id,
        title: chat.title,
        description: chat.description,
        customizations: chat.customizations,
        isActive: chat.isActive,
        workflowId: chat.workflowId,
        authType: chat.authType,
        password: chat.password,
        allowedEmails: chat.allowedEmails,
        outputBlocks: chat.outputBlocks,
      })
      .from(chat)
      .where(eq(chat.subdomain, subdomain))
      .limit(1)
    
    if (deploymentResult.length === 0) {
      logger.warn(`[${requestId}] Chat not found for subdomain: ${subdomain}`)
      return addCorsHeaders(createErrorResponse('Chat not found', 404), request)
    }
    
    const deployment = deploymentResult[0]
    
    // Check if the chat is active
    if (!deployment.isActive) {
      logger.warn(`[${requestId}] Chat is not active: ${subdomain}`)
      return addCorsHeaders(createErrorResponse('This chat is currently unavailable', 403), request)
    }
    
    // Check for auth cookie first
    const cookieName = `chat_auth_${deployment.id}`
    const authCookie = request.cookies.get(cookieName)
    
    if (deployment.authType !== 'public' && authCookie && validateAuthToken(authCookie.value, deployment.id)) {
      // Cookie valid, return chat info
      return addCorsHeaders(createSuccessResponse({
        id: deployment.id,
        title: deployment.title,
        description: deployment.description, 
        customizations: deployment.customizations,
        authType: deployment.authType,
      }), request)
    }
    
    // If no valid cookie, proceed with standard auth check
    const authResult = await validateChatAuth(requestId, deployment, request)
    if (!authResult.authorized) {
      logger.info(`[${requestId}] Authentication required for chat: ${subdomain}, type: ${deployment.authType}`)
      return addCorsHeaders(createErrorResponse(authResult.error || 'Authentication required', 401), request)
    }
    
    // Return public information about the chat including auth type
    return addCorsHeaders(createSuccessResponse({
      id: deployment.id,
      title: deployment.title,
      description: deployment.description, 
      customizations: deployment.customizations,
      authType: deployment.authType,
    }), request)
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching chat info:`, error)
    return addCorsHeaders(createErrorResponse(error.message || 'Failed to fetch chat information', 500), request)
  }
} 