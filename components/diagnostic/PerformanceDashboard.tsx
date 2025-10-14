'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  Clock,
  HardDrive,
  Zap,
  CheckCircle,
  AlertTriangle,
  Activity
} from 'lucide-react';

interface PerformanceReport {
  summary: {
    optimizationPlan: string;
    totalOptimizations: number;
    completedOptimizations: number;
    successRate: string;
    reportDate: string;
  };
  beforeAfterComparison: {
    diagnosticPageSize: {
      before: string;
      after: string;
      improvement: string;
    };
    bundleSize: {
      before: string;
      after: string;
      improvement: string;
    };
    stateManagement: {
      before: string;
      after: string;
      improvement: string;
    };
    apiReliability: {
      before: string;
      after: string;
      improvement: string;
    };
  };
  implementedOptimizations: string[];
  measuredImprovements: {
    bundleSize: string;
    codeComplexity: string;
    memoryUsage: string;
    loadTime: string;
    cacheEfficiency: string;
    apiReliability: string;
  };
  detailedMetrics: {
    build: {
      totalSize: number;
      fileCount: number;
      timestamp: string;
    };
    bundle: {
      routes: Record<string, { size: number; firstLoad: number }>;
      sharedSize: number;
      diagnosticPageOptimization: {
        before: number;
        after: number;
        improvement: string;
      };
    };
    api: {
      tests: Record<string, {
        duration: number;
        status: string;
        withTimeout: boolean;
        withValidation: boolean;
        withMonitoring: boolean;
      }>;
      averageResponseTime: number;
      optimizations: string[];
    };
    memory: {
      stateManagement: {
        before: string;
        after: string;
        benefit: string;
      };
      componentOptimizations: string[];
      estimatedMemoryReduction: string;
      caching: {
        serviceWorker: string;
        apiResponseCaching: string;
        staticAssetCaching: string;
        pageCaching: string;
      };
    };
    overall: {
      implementation: Record<string, {
        completed: boolean;
        items: string[];
        impact: string;
      }>;
      improvements: Record<string, any>;
      targets: Record<string, string>;
    };
  };
}

interface PerformanceDashboardProps {
  className?: string;
}

export default function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const response = await fetch('/performance-report.json');
        if (!response.ok) {
          throw new Error('Failed to load performance report');
        }
        const data: PerformanceReport = await response.json();
        setReport(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading performance metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !report) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load performance report</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Optimization Dashboard
          </CardTitle>
          <CardDescription>
            Comprehensive performance metrics and optimization results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold text-green-600">{report.summary.successRate}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bundle Reduction</p>
                    <p className="text-2xl font-bold text-blue-600">{report.measuredImprovements.bundleSize}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg API Response</p>
                    <p className="text-2xl font-bold text-purple-600">{report.detailedMetrics.api.averageResponseTime.toFixed(1)}ms</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Memory Reduction</p>
                    <p className="text-2xl font-bold text-orange-600">{report.measuredImprovements.memoryUsage}</p>
                  </div>
                  <HardDrive className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bundle">Bundle</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
              <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Before/After Comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Diagnostic Page Size</span>
                        <span className="text-green-600">{report.beforeAfterComparison.diagnosticPageSize.improvement}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {report.beforeAfterComparison.diagnosticPageSize.before} → {report.beforeAfterComparison.diagnosticPageSize.after}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Bundle Size</span>
                        <span className="text-green-600">{report.beforeAfterComparison.bundleSize.improvement}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {report.beforeAfterComparison.bundleSize.before} → {report.beforeAfterComparison.bundleSize.after}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>State Management</span>
                        <span className="text-green-600">Optimized</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {report.beforeAfterComparison.stateManagement.before} → {report.beforeAfterComparison.stateManagement.after}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>API Reliability</span>
                        <span className="text-green-600">Production Ready</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {report.beforeAfterComparison.apiReliability.before} → {report.beforeAfterComparison.apiReliability.after}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Implementation Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(report.detailedMetrics.overall.implementation).map(([phase, data]) => (
                      <div key={phase} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{phase}</span>
                          <Badge variant={data.completed ? "default" : "secondary"}>
                            {data.completed ? "Completed" : "Pending"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{data.impact}</div>
                        <ul className="text-xs space-y-1">
                          {data.items.map((item, index) => (
                            <li key={index} className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bundle" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bundle Size Analysis</CardTitle>
                  <CardDescription>Route-specific bundle sizes and optimizations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(report.detailedMetrics.bundle.routes).map(([route, data]) => (
                      <div key={route} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{route}</span>
                          <div className="text-right">
                            <div className="text-sm font-medium">{data.size} kB</div>
                            <div className="text-xs text-muted-foreground">{data.firstLoad} kB (with shared)</div>
                          </div>
                        </div>
                        <Progress value={(data.size / 100) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Shared Bundle Size</span>
                      <span className="text-sm">{report.detailedMetrics.bundle.sharedSize} kB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>API Performance Metrics</CardTitle>
                  <CardDescription>Response times and optimization status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(report.detailedMetrics.api.tests).map(([api, data]) => (
                      <div key={api} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${data.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="font-medium">{api}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{data.duration}ms</div>
                          <div className="flex gap-1 text-xs">
                            {data.withTimeout && <Badge variant="outline" className="text-xs">Timeout</Badge>}
                            {data.withValidation && <Badge variant="outline" className="text-xs">Validation</Badge>}
                            {data.withMonitoring && <Badge variant="outline" className="text-xs">Monitoring</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Average Response Time</div>
                        <div className="text-lg font-bold">{report.detailedMetrics.api.averageResponseTime.toFixed(1)}ms</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Optimizations Applied</div>
                        <div className="text-lg font-bold">{report.detailedMetrics.api.optimizations.length}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="optimizations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Implemented Optimizations</CardTitle>
                  <CardDescription>All performance improvements applied</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {report.implementedOptimizations.map((optimization, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{optimization}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Measured Improvements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(report.measuredImprovements).map(([metric, value]) => (
                      <div key={metric} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium capitalize">{metric.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-sm font-bold text-green-600">{value}</span>
                        </div>
                        <Progress value={parseFloat(value.replace('%', '').replace(/[^0-9.]/g, '')) || 0} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}