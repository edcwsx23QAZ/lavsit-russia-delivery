'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Truck, CheckCircle, AlertCircle, XCircle, Activity } from 'lucide-react';

interface DiagnosticResult {
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  details?: any;
  response?: any;
  requestData?: any;
  timing?: number;
}

interface ApiTestingSectionProps {
  diagnosticResults: { [key: string]: DiagnosticResult };
  testStates: {
    isTestingPEK: boolean;
    isTestingDellin: boolean;
    isTestingRailContinent: boolean;
    isTestingVozovoz: boolean;
    isTestingNordWheel: boolean;
  };
  onTestPEK: () => void;
  onTestDellin: () => void;
  onTestRailContinent: () => void;
  onTestVozovoz: () => void;
  onTestNordWheel: () => void;
}

export default function ApiTestingSection({
  diagnosticResults,
  testStates,
  onTestPEK,
  onTestDellin,
  onTestRailContinent,
  onTestVozovoz,
  onTestNordWheel
}: ApiTestingSectionProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-500 bg-green-900/20';
      case 'warning': return 'border-yellow-500 bg-yellow-900/20';
      case 'error': return 'border-red-500 bg-red-900/20';
      default: return 'border-gray-500 bg-gray-900/20';
    }
  };

  const renderApiCard = (
    name: string,
    title: string,
    color: string,
    isLoading: boolean,
    onTest: () => void,
    resultKey: string
  ) => {
    const result = diagnosticResults[resultKey];
    
    return (
      <Card className="border-gray-700 bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className={`h-5 w-5 ${color}`} />
              {title}
            </div>
            <Button 
              onClick={onTest} 
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              {isLoading ? 'Тестирование...' : 'Тест'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <Alert className={getStatusColor(result.status)}>
              <div className="flex items-start gap-2">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <AlertDescription>
                    <div className="font-medium mb-2 text-white">{result.message}</div>
                    {result.timing && (
                      <Badge variant="outline" className="mb-2">
                        Время ответа: {result.timing}мс
                      </Badge>
                    )}
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-gray-300">Подробности</summary>
                        <pre className="text-xs mt-2 p-2 bg-gray-800 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ) : (
            <p className="text-gray-400">Нажмите "Тест" для проверки API {title}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {renderApiCard('pek', 'ПЭК', 'text-blue-400', testStates.isTestingPEK, onTestPEK, 'pek')}
      {renderApiCard('dellin', 'Деловые Линии', 'text-green-400', testStates.isTestingDellin, onTestDellin, 'dellin')}
      {renderApiCard('railcontinent', 'Rail Continent', 'text-purple-400', testStates.isTestingRailContinent, onTestRailContinent, 'railcontinent')}
      {renderApiCard('vozovoz', 'Возовоз', 'text-orange-400', testStates.isTestingVozovoz, onTestVozovoz, 'vozovoz')}
      {renderApiCard('nordwheel', 'Nord Wheel', 'text-cyan-400', testStates.isTestingNordWheel, onTestNordWheel, 'nordwheel')}
    </div>
  );
}