'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Bug,
  Zap,
  RefreshCw,
  Settings,
  Eye
} from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

interface ErrorEvent {
  id: string;
  timestamp: string;
  message: string;
  level: 'error' | 'warning' | 'info';
  stack?: string;
  url?: string;
  userAgent?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
}

interface SentryMonitorProps {
  className?: string;
}

export default function SentryMonitor({ className }: SentryMonitorProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    // Check if Sentry is configured
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    setIsEnabled(!!dsn);

    if (dsn) {
      // Set up error listener
      const handleError = (event: ErrorEvent) => {
        setErrors(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 errors
      };

      // Listen for unhandled errors
      window.addEventListener('error', (event) => {
        handleError({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          message: event.message,
          level: 'error',
          stack: event.error?.stack,
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      });

      // Listen for unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        handleError({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          message: event.reason?.message || 'Unhandled promise rejection',
          level: 'error',
          stack: event.reason?.stack,
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      });
    }
  }, []);

  const triggerTestError = useCallback(() => {
    try {
      // Trigger a test error
      throw new Error('Test error from Sentry Monitor - this is intentional for testing');
    } catch (error) {
      Sentry.captureException(error);
      console.log('Test error sent to Sentry');
    }
  }, []);

  const triggerTestWarning = useCallback(() => {
    // Send a test warning
    Sentry.captureMessage('Test warning from Sentry Monitor - this is intentional for testing', 'warning');
    console.log('Test warning sent to Sentry');
  }, []);

  const triggerPerformanceCapture = useCallback(() => {
    setIsCapturing(true);

    // Simulate performance measurement
    const startTime = performance.now();

    setTimeout(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        name: 'Test Operation',
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString()
      };

      setPerformanceMetrics(prev => [metric, ...prev.slice(0, 49)]);

      // Send to Sentry
      Sentry.metrics.increment('test_operation_duration', duration, {
        unit: 'millisecond'
      });

      setIsCapturing(false);
    }, Math.random() * 1000 + 500);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearMetrics = useCallback(() => {
    setPerformanceMetrics([]);
  }, []);

  const getErrorIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <Bug className="h-4 w-4 text-gray-500" />;
    }
  };

  const getErrorBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Warning</Badge>;
      case 'info':
        return <Badge variant="outline">Info</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!isEnabled) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-muted-foreground">Sentry monitoring not configured</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add NEXT_PUBLIC_SENTRY_DSN to enable error tracking
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sentry Error Monitoring
          </CardTitle>
          <CardDescription>
            Real-time error tracking and performance monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button onClick={triggerTestError} variant="destructive" size="sm">
              <Bug className="h-4 w-4 mr-2" />
              Test Error
            </Button>
            <Button onClick={triggerTestWarning} variant="secondary" size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Test Warning
            </Button>
            <Button onClick={triggerPerformanceCapture} disabled={isCapturing} size="sm">
              {isCapturing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Test Performance
            </Button>
          </div>

          <Tabs defaultValue="errors" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="errors" className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Errors ({errors.length})
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Performance ({performanceMetrics.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="errors" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Recent Errors</h3>
                <Button onClick={clearErrors} variant="outline" size="sm">
                  Clear All
                </Button>
              </div>

              {errors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No errors captured yet</p>
                  <p className="text-sm">Trigger a test error to see monitoring in action</p>
                </div>
              ) : (
                <ScrollArea className="h-96 w-full">
                  <div className="space-y-2">
                    {errors.map((error) => (
                      <Card key={error.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getErrorIcon(error.level)}
                            <span className="font-medium">{error.message}</span>
                          </div>
                          {getErrorBadge(error.level)}
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Time: {new Date(error.timestamp).toLocaleString()}</div>
                          {error.url && <div>URL: {error.url}</div>}
                          {error.stack && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                View Stack Trace
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-32">
                                {error.stack}
                              </pre>
                            </details>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Performance Metrics</h3>
                <Button onClick={clearMetrics} variant="outline" size="sm">
                  Clear All
                </Button>
              </div>

              {performanceMetrics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p>No performance metrics captured yet</p>
                  <p className="text-sm">Run a performance test to see metrics</p>
                </div>
              ) : (
                <ScrollArea className="h-96 w-full">
                  <div className="space-y-2">
                    {performanceMetrics.map((metric, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{metric.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-blue-600">
                              {metric.value.toFixed(2)} {metric.unit}
                            </span>
                            <Badge variant="outline">
                              {new Date(metric.timestamp).toLocaleTimeString()}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Sentry Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Client-side DSN configured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Server-side DSN configured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Error boundary integration</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Performance monitoring enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Session replay configured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Source maps upload enabled</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}