'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Activity, CheckCircle, XCircle, Clock, Target } from 'lucide-react';

interface TestResult {
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

interface FullTestingResultsProps {
  fullTestResults: {
    summary: TestSummary;
    details: TestResult[];
  } | null;
  testProgress: number;
  isFullTesting: boolean;
}

export default function FullTestingResults({
  fullTestResults,
  testProgress,
  isFullTesting
}: FullTestingResultsProps) {
  if (!fullTestResults && !isFullTesting) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'timeout': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'skipped': return <Target className="h-4 w-4 text-gray-400" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'timeout': return 'text-yellow-400';
      case 'skipped': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Card className="border-green-500 bg-green-900/20 mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-green-400" />
          <span className="text-white">Результаты полного тестирования</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isFullTesting && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white">Прогресс тестирования</span>
              <span className="text-gray-300">{testProgress}%</span>
            </div>
            <Progress value={testProgress} className="h-2" />
          </div>
        )}

        {fullTestResults && (
          <div className="space-y-6">
            {/* Статистика */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-gray-800 p-3 rounded text-center">
                <div className="text-2xl font-bold text-white">{fullTestResults.summary.total}</div>
                <div className="text-sm text-gray-400">Всего тестов</div>
              </div>
              <div className="bg-gray-800 p-3 rounded text-center">
                <div className="text-2xl font-bold text-green-400">{fullTestResults.summary.passed}</div>
                <div className="text-sm text-gray-400">Успешных</div>
              </div>
              <div className="bg-gray-800 p-3 rounded text-center">
                <div className="text-2xl font-bold text-red-400">{fullTestResults.summary.failed}</div>
                <div className="text-sm text-gray-400">Неудачных</div>
              </div>
              <div className="bg-gray-800 p-3 rounded text-center">
                <div className="text-2xl font-bold text-gray-400">{fullTestResults.summary.skipped}</div>
                <div className="text-sm text-gray-400">Пропущено</div>
              </div>
              <div className="bg-gray-800 p-3 rounded text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {fullTestResults.summary.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Успешность</div>
              </div>
              <div className="bg-gray-800 p-3 rounded text-center">
                <div className="text-2xl font-bold text-purple-400">{fullTestResults.summary.averageTime}мс</div>
                <div className="text-sm text-gray-400">Среднее время</div>
              </div>
            </div>

            {/* Статистика по компаниям */}
            <div>
              <h4 className="font-medium mb-2 text-white">Статистика по транспортным компаниям:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from(new Set(fullTestResults.details.map(d => d.company))).map(company => {
                  const companyResults = fullTestResults.details.filter(d => d.company === company);
                  const passed = companyResults.filter(r => r.status === 'passed').length;
                  const total = companyResults.length;
                  const rate = total > 0 ? (passed / total * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={company} className="bg-gray-800 p-3 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">{company}</span>
                        <Badge variant="outline" className={
                          rate === '100.0' ? 'border-green-400 text-green-400' :
                          parseFloat(rate.toString()) >= 80 ? 'border-yellow-400 text-yellow-400' :
                          'border-red-400 text-red-400'
                        }>
                          {rate}%
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-400">
                        {passed}/{total} тестов пройдено
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ошибки */}
            {fullTestResults.summary.errors.length > 0 && (
              <div>
                <div className="font-medium mb-2 text-white">Найденные ошибки ({fullTestResults.summary.errors.length}):</div>
                <div className="space-y-2">
                  {fullTestResults.summary.errors.map((error, index) => (
                    <div key={index} className="bg-red-900/20 border border-red-500 p-3 rounded">
                      <div className="text-red-400 text-sm">{error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Подробные результаты */}
            <details className="bg-gray-800 rounded p-4">
              <summary className="cursor-pointer text-sm font-medium text-white">Подробные результаты ({fullTestResults.details.length} записей)</summary>
              <div className="mt-4 space-y-3">
                {fullTestResults.details.map((result, index) => (
                  <div key={index} className="border border-gray-600 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium text-white">{result.company}</span>
                        <Badge variant="outline" className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-400">
                        {result.timing}мс | {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-300 mb-2">{result.message}</div>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-gray-300">Подробности</summary>
                        <pre className="text-xs mt-2 p-2 bg-gray-900 rounded overflow-auto text-gray-300">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}