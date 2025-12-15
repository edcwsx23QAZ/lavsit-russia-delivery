import { NextRequest, NextResponse } from 'next/server';
import { enhancedApiRequest } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // NordWheel API endpoint
    const apiUrl = 'https://api.nordw.orog.ru/api/v1/calculate';
    
    // Get API key from environment variables or use default
    const apiKey = process.env.NORDWHEEL_API_KEY || '5|WYpV9f788Y2ASobpv3xy6N5qxtIUaKhxFF4yWETOfc398950';
    
    console.log('🚛 NordWheel API Route: Forwarding request to:', apiUrl);
    console.log('🚛 NordWheel API Route: Request body:', JSON.stringify(body, null, 2));
    
    // Use enhanced API request with longer timeout for NordWheel
    const result = await enhancedApiRequest(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'DeliveryCalculator/1.0',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      },
      { operation: 'calculate', company: 'NordWheel API' },
      { maxRetries: 2, baseDelay: 2000 } // Reduced retries, increased delay
    );
    
    // Handle error result from enhancedApiRequest
    if (result && typeof result === 'object' && 'success' in result && !result.success) {
      console.error('🚛 NordWheel API Route: Enhanced API error:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: result.error.userMessage || result.error.message,
            details: result.error.technicalDetails,
            type: result.error.type
          }
        },
        { status: 500 }
      );
    }
    
    // Get the response object
    const response = result as Response;
    const responseText = await response.text();
    console.log('🚛 NordWheel API Route: Response status:', response.status, response.statusText);
    console.log('🚛 NordWheel API Route: Response body:', responseText.substring(0, 1000));
    
    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('🚛 NordWheel API Route: JSON parse error:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid JSON response from NordWheel API',
            details: responseText.substring(0, 500)
          }
        },
        { status: 500 }
      );
    }
    
    // Return the response with the same status code
    if (response.ok) {
      return NextResponse.json(data, { status: 200 });
    } else {
      // Handle API errors
      const errorMessage = data?.message || data?.error || `HTTP ${response.status}`;
      const errorDetails = data?.errors || data?.details || null;
      
      return NextResponse.json(
        {
          success: false,
          error: {
            message: errorMessage,
            details: errorDetails,
            status: response.status
          }
        },
        { status: response.status }
      );
    }
    
  } catch (error: any) {
    console.error('🚛 NordWheel API Route: Critical error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Internal server error',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}