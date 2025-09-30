'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export interface DiagnosticResult {
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  details?: any;
  response?: any;
  requestData?: any;
  timing?: number;
}

export interface TestResult {
  company: string;
  status: 'passed' | 'failed' | 'timeout' | 'skipped';
  message: string;
  details?: any;
  timing: number;
  timestamp: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  averageTime: number;
  successRate: number;
  errors: string[];
}

export const useDiagnostic = () => {
  const [diagnosticResults, setDiagnosticResults] = useState<{ [key: string]: DiagnosticResult }>({});
  const [fullTestResults, setFullTestResults] = useState<{
    summary: TestSummary;
    details: TestResult[];
  } | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  const [isFullTesting, setIsFullTesting] = useState(false);

  // Debounced update for diagnostic results
  const updateDiagnosticResult = useDebouncedCallback(
    (key: string, result: DiagnosticResult) => {
      setDiagnosticResults(prev => ({
        ...prev,
        [key]: result
      }));
    },
    100
  );

  const clearResults = useCallback(() => {
    setDiagnosticResults({});
    setFullTestResults(null);
    setTestProgress(0);
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setTestProgress(Math.min(100, Math.max(0, progress)));
  }, []);

  const setFullTestingState = useCallback((testing: boolean) => {
    setIsFullTesting(testing);
    if (!testing) {
      setTestProgress(0);
    }
  }, []);

  // Memoized calculated values
  const resultsStats = useMemo(() => {
    const results = Object.values(diagnosticResults);
    const total = results.length;
    const success = results.filter(r => r.status === 'success').length;
    const errors = results.filter(r => r.status === 'error').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    return {
      total,
      success,
      errors,
      warnings,
      successRate: total > 0 ? (success / total) * 100 : 0
    };
  }, [diagnosticResults]);

  return {
    diagnosticResults,
    fullTestResults,
    testProgress,
    isFullTesting,
    resultsStats,
    updateDiagnosticResult,
    setFullTestResults,
    updateProgress,
    setFullTestingState,
    clearResults
  };
};