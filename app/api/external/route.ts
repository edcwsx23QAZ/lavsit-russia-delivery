import { NextRequest, NextResponse } from 'next/server';
import { apiRequestWithTimeout } from '@/lib/api-utils';

// Supported transport companies
const SUPPORTED_COMPANIES = [
  'pek',
  'dellin',
  'vozovoz',
  'railcontinent',
  'nordwheel'
] as const;

type SupportedCompany = typeof SUPPORTED_COMPANIES[number];

interface FreightCalculationRequest {
  company: SupportedCompany;
  fromCity: string;
  toCity: string;
  cargo: Array<{
    length: number;
    width: number;
    height: number;
    weight: number;
    quantity?: number;
  }>;
  options?: {
    insurance?: boolean;
    packaging?: boolean;
    urgent?: boolean;
  };
}

interface FreightCalculationResponse {
  success: boolean;
  company: string;
  calculation: {
    totalCost: number;
    currency: string;
    deliveryTime: {
      min: number;
      max: number;
      unit: string;
    };
    breakdown?: {
      baseCost: number;
      insurance?: number;
      packaging?: number;
      urgent?: number;
    };
  };
  metadata: {
    requestId: string;
    timestamp: string;
    processingTime: number;
  };
  error?: string;
}

// Rate limiting (simple in-memory store - use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // requests per window

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  clientData.count++;
  return true;
}

function getClientId(request: NextRequest): string {
  // Use API key or IP address for rate limiting
  const apiKey = request.headers.get('x-api-key');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIp = forwardedFor || realIp || request.ip || 'unknown';

  return apiKey || clientIp;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Rate limiting
    const clientId = getClientId(request);
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        } as FreightCalculationResponse,
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + RATE_LIMIT_WINDOW).toString()
          }
        }
      );
    }

    // Parse request body
    const body: FreightCalculationRequest = await request.json();

    // Validate request
    if (!body.company || !SUPPORTED_COMPANIES.includes(body.company)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid company. Supported companies: ${SUPPORTED_COMPANIES.join(', ')}`,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        } as FreightCalculationResponse,
        { status: 400 }
      );
    }

    if (!body.fromCity || !body.toCity) {
      return NextResponse.json(
        {
          success: false,
          error: 'fromCity and toCity are required',
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        } as FreightCalculationResponse,
        { status: 400 }
      );
    }

    if (!body.cargo || !Array.isArray(body.cargo) || body.cargo.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'cargo array is required and must not be empty',
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        } as FreightCalculationResponse,
        { status: 400 }
      );
    }

    // Validate cargo items
    for (const item of body.cargo) {
      if (!item.length || !item.width || !item.height || !item.weight) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each cargo item must have length, width, height, and weight',
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime
            }
          } as FreightCalculationResponse,
          { status: 400 }
        );
      }

      if (item.length <= 0 || item.width <= 0 || item.height <= 0 || item.weight <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cargo dimensions and weight must be positive numbers',
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime
            }
          } as FreightCalculationResponse,
          { status: 400 }
        );
      }
    }

    // Route to appropriate API endpoint
    const apiEndpoint = getApiEndpoint(body.company);
    const apiPayload = transformPayload(body);

    console.log(`[External API] Routing request ${requestId} to ${body.company} API`);

    const response = await apiRequestWithTimeout(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      },
      body: JSON.stringify(apiPayload)
    }, { timeout: 30000 });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'API request failed',
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        } as FreightCalculationResponse,
        { status: response.status }
      );
    }

    // Transform response to standardized format
    const standardizedResponse = transformResponse(body.company, result, requestId, startTime);

    return NextResponse.json(standardizedResponse, {
      headers: {
        'X-Request-ID': requestId,
        'X-API-Version': '1.0.0'
      }
    });

  } catch (error: any) {
    console.error(`[External API] Error processing request ${requestId}:`, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      } as FreightCalculationResponse,
      { status: 500 }
    );
  }
}

function getApiEndpoint(company: SupportedCompany): string {
  const endpoints = {
    pek: '/api/pek',
    dellin: '/api/dellin-packages',
    vozovoz: '/api/vozovoz',
    railcontinent: '/api/rail-continent',
    nordwheel: '/api/test'
  };

  return endpoints[company];
}

function transformPayload(body: FreightCalculationRequest): any {
  // Transform to the format expected by each company's API
  const basePayload = {
    fromCity: body.fromCity,
    toCity: body.toCity,
    cargos: body.cargo.map(item => ({
      length: item.length,
      width: item.width,
      height: item.height,
      weight: item.weight,
      quantity: item.quantity || 1
    }))
  };

  // Add company-specific options
  switch (body.company) {
    case 'pek':
      return {
        ...basePayload,
        method: 'calculate'
      };

    case 'dellin':
      return {
        ...basePayload,
        method: 'calculate'
      };

    case 'vozovoz':
      return {
        ...basePayload,
        method: 'calculate'
      };

    case 'railcontinent':
      return {
        ...basePayload,
        method: 'calculate'
      };

    case 'nordwheel':
      return {
        ...basePayload,
        service: 'nordwheel'
      };

    default:
      return basePayload;
  }
}

function transformResponse(
  company: SupportedCompany,
  apiResponse: any,
  requestId: string,
  startTime: number
): FreightCalculationResponse {
  // Transform API response to standardized format
  // This would need to be customized based on each API's response format

  const processingTime = Date.now() - startTime;

  // Default transformation - would need specific logic for each company
  return {
    success: true,
    company,
    calculation: {
      totalCost: apiResponse.totalCost || apiResponse.cost || 0,
      currency: apiResponse.currency || 'RUB',
      deliveryTime: {
        min: apiResponse.deliveryTime?.min || apiResponse.minDays || 1,
        max: apiResponse.deliveryTime?.max || apiResponse.maxDays || 7,
        unit: 'days'
      },
      breakdown: apiResponse.breakdown || undefined
    },
    metadata: {
      requestId,
      timestamp: new Date().toISOString(),
      processingTime
    }
  };
}

// GET endpoint for API documentation
export async function GET() {
  return NextResponse.json({
    name: 'Freight Calculator External API',
    version: '1.0.0',
    description: 'REST API for freight cost calculations across Russian transport companies',
    baseUrl: '/api/external',
    endpoints: {
      'POST /api/external': {
        description: 'Calculate freight costs',
        authentication: 'API Key (X-API-Key header) or IP-based rate limiting',
        rateLimit: `${RATE_LIMIT_MAX_REQUESTS} requests per minute`,
        requestBody: {
          company: {
            type: 'string',
            required: true,
            enum: SUPPORTED_COMPANIES,
            description: 'Transport company to use for calculation'
          },
          fromCity: {
            type: 'string',
            required: true,
            description: 'Departure city'
          },
          toCity: {
            type: 'string',
            required: true,
            description: 'Destination city'
          },
          cargo: {
            type: 'array',
            required: true,
            description: 'Array of cargo items',
            items: {
              length: { type: 'number', required: true, description: 'Length in cm' },
              width: { type: 'number', required: true, description: 'Width in cm' },
              height: { type: 'number', required: true, description: 'Height in cm' },
              weight: { type: 'number', required: true, description: 'Weight in kg' },
              quantity: { type: 'number', optional: true, default: 1, description: 'Quantity of items' }
            }
          },
          options: {
            type: 'object',
            optional: true,
            description: 'Additional calculation options',
            properties: {
              insurance: { type: 'boolean', optional: true, description: 'Include insurance' },
              packaging: { type: 'boolean', optional: true, description: 'Include packaging' },
              urgent: { type: 'boolean', optional: true, description: 'Urgent delivery' }
            }
          }
        },
        responseBody: {
          success: { type: 'boolean', description: 'Request success status' },
          company: { type: 'string', description: 'Transport company used' },
          calculation: {
            type: 'object',
            properties: {
              totalCost: { type: 'number', description: 'Total cost in specified currency' },
              currency: { type: 'string', description: 'Currency code (RUB, USD, etc.)' },
              deliveryTime: {
                type: 'object',
                properties: {
                  min: { type: 'number', description: 'Minimum delivery time' },
                  max: { type: 'number', description: 'Maximum delivery time' },
                  unit: { type: 'string', description: 'Time unit (days, hours)' }
                }
              },
              breakdown: {
                type: 'object',
                optional: true,
                description: 'Cost breakdown by components'
              }
            }
          },
          metadata: {
            type: 'object',
            properties: {
              requestId: { type: 'string', description: 'Unique request identifier' },
              timestamp: { type: 'string', description: 'Request timestamp' },
              processingTime: { type: 'number', description: 'Processing time in milliseconds' }
            }
          },
          error: { type: 'string', optional: true, description: 'Error message if success is false' }
        },
        examples: {
          request: {
            company: 'pek',
            fromCity: 'Москва',
            toCity: 'Санкт-Петербург',
            cargo: [
              {
                length: 100,
                width: 50,
                height: 50,
                weight: 10,
                quantity: 2
              }
            ],
            options: {
              insurance: true
            }
          },
          response: {
            success: true,
            company: 'pek',
            calculation: {
              totalCost: 2500,
              currency: 'RUB',
              deliveryTime: {
                min: 2,
                max: 3,
                unit: 'days'
              },
              breakdown: {
                baseCost: 2000,
                insurance: 500
              }
            },
            metadata: {
              requestId: 'req_1234567890_abc123def',
              timestamp: '2024-01-15T10:30:00.000Z',
              processingTime: 1250
            }
          }
        }
      }
    },
    supportedCompanies: SUPPORTED_COMPANIES,
    rateLimit: {
      window: '1 minute',
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      headers: {
        'X-RateLimit-Limit': 'Maximum requests per window',
        'X-RateLimit-Remaining': 'Remaining requests in current window',
        'X-RateLimit-Reset': 'Time when the rate limit resets (Unix timestamp)'
      }
    },
    errorCodes: {
      400: 'Bad Request - Invalid input parameters',
      429: 'Too Many Requests - Rate limit exceeded',
      500: 'Internal Server Error - Server-side error'
    }
  });
}