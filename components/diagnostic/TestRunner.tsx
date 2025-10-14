'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, CheckCircle, XCircle, Clock, Terminal } from 'lucide-react';
import { apiRequestWithTimeout } from '@/lib/api-utils';

interface TestResult {
  testType: string;
  success: boolean;
  output: string | null;
  errors: string | null;
  executionTime: number;
  timestamp: string;
}

interface TestRunnerProps {
  className?: string;
}

const availableTests = [
  {
    id: 'dellin-api',
    name: 'Dellin API Tests',
    description: 'Test Dellin API endpoints and validation',
    script: 'test-dellin-api.js'
  },
  {
    id: 'performance',
    name: 'Performance Tests',
    description: 'Comprehensive performance testing and metrics',
    script: 'performance-test.js'
  },
  {
    id: 'dellin-derival',
    name: 'Dellin Derival Tests',
    description: 'Test derival error handling fixes',
    script: 'test-dellin-derival.js'
  },
  {
    id: 'dellin-terminals',
    name: 'Dellin Terminals Tests',
    description: 'Test terminal data processing',
    script: 'test-dellin-terminals.js'
  },
  {
    id: 'dellin-terminals-simple',
    name: 'Simple Terminals Tests',
    description: 'Simplified terminal testing',
    script: 'test-dellin-terminals-simple.js'
  },
  {
    id: 'spb-terminals',
    name: 'SPB Terminals Tests',
    description: 'Saint Petersburg terminals testing',
    script: 'test-spb-terminals.js'
  }
];

export default function TestRunner({ className }: TestRunnerProps) {
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const runTest = useCallback(async (testId: string) => {
    setRunningTests(prev => new Set(prev).add(testId));
    setSelectedTest(testId);

    try {
      const response = await apiRequestWithTimeout('/api/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType: testId })
      }, { timeout: 35000 });

      const result: TestResult = await response.json();
      setTestResults(prev => new Map(prev).set(testId, result));
    } catch (error: any) {
      const errorResult: TestResult = {
        testType: testId,
        success: false,
        output: null,
        errors: error.message || 'Network error',
        executionTime: 0,
        timestamp: new Date().toISOString()
      };
      setTestResults(prev => new Map(prev).set(testId, errorResult));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
    }
  }, []);

  const runAllTests = useCallback(async () => {
    for (const test of availableTests) {
      await runTest(test.id);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, [runTest]);

  const getTestStatus = (testId: string) => {
    if (runningTests.has(testId)) return 'running';
    const result = testResults.get(testId);
    if (!result) return 'idle';
    return result.success ? 'success' : 'error';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Terminal className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">Passed</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Not Run</Badge>;
    }
  };

  const selectedResult = selectedTest ? testResults.get(selectedTest) : null;

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Test Runner
          </CardTitle>
          <CardDescription>
            Run standalone test scripts and view results in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              onClick={runAllTests}
              disabled={runningTests.size > 0}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Run All Tests
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableTests.map((test) => {
              const status = getTestStatus(test.id);
              const result = testResults.get(test.id);

              return (
                <Card key={test.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{test.name}</CardTitle>
                      {getStatusIcon(status)}
                    </div>
                    <CardDescription className="text-xs">
                      {test.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-2">
                      {getStatusBadge(status)}
                      {result && (
                        <span className="text-xs text-muted-foreground">
                          {result.executionTime}ms
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={selectedTest === test.id ? "default" : "outline"}
                      onClick={() => runTest(test.id)}
                      disabled={runningTests.has(test.id)}
                      className="w-full"
                    >
                      {runningTests.has(test.id) ? 'Running...' : 'Run Test'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(selectedResult.success ? 'success' : 'error')}
              Test Results: {availableTests.find(t => t.id === selectedTest)?.name}
            </CardTitle>
            <CardDescription>
              Executed at {new Date(selectedResult.timestamp).toLocaleString('ru-RU')} • {selectedResult.executionTime}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full rounded-md border p-4">
              {selectedResult.output && (
                <div className="mb-4">
                  <h4 className="font-semibold text-green-600 mb-2">Output:</h4>
                  <pre className="text-sm bg-green-50 p-3 rounded border overflow-x-auto">
                    {selectedResult.output}
                  </pre>
                </div>
              )}

              {selectedResult.errors && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Errors:</h4>
                  <pre className="text-sm bg-red-50 p-3 rounded border overflow-x-auto text-red-800">
                    {selectedResult.errors}
                  </pre>
                </div>
              )}

              {!selectedResult.output && !selectedResult.errors && (
                <div className="text-center text-muted-foreground py-8">
                  No output generated
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}