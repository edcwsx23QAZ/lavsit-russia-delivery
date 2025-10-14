import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react';
import { ErrorResult } from '@/lib/error-handling';

interface ErrorFallbackProps {
  error: ErrorResult;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export default function ErrorFallback({
  error,
  onRetry,
  showHomeButton = true
}: ErrorFallbackProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleContactSupport = () => {
    // This could open a support chat or email
    const subject = encodeURIComponent('Ошибка в приложении Freight Calculator');
    const body = encodeURIComponent(`
Ошибка: ${error.error.message}
Тип: ${error.error.type}
Время: ${error.error.context.timestamp}
Операция: ${error.error.context.operation}

Пожалуйста, опишите что вы делали когда произошла ошибка.
    `.trim());

    window.open(`mailto:support@freightcalc.com?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-red-200 bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-800 mb-2">
            Что-то пошло не так
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            {error.error.userMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Details */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-800 mb-2">Детали ошибки:</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div><strong>Тип:</strong> {error.error.type}</div>
              <div><strong>Операция:</strong> {error.error.context.operation}</div>
              {error.error.context.company && (
                <div><strong>Компания:</strong> {error.error.context.company}</div>
              )}
              <div><strong>Время:</strong> {new Date(error.error.context.timestamp).toLocaleString('ru-RU')}</div>
              {error.error.context.retryCount && error.error.context.retryCount > 0 && (
                <div><strong>Попыток:</strong> {error.error.context.retryCount + 1}</div>
              )}
            </div>
          </div>

          {/* Suggested Action */}
          {error.error.suggestedAction && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Рекомендуемое действие:</h4>
              <p className="text-blue-700">{error.error.suggestedAction}</p>
            </div>
          )}

          {/* Fallback Data Notice */}
          {error.fallbackData && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Показаны кешированные данные</h4>
              <p className="text-yellow-700 text-sm">
                Данные могут быть не актуальными. Попробуйте обновить страницу позже.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {error.error.retryable && (
              <Button
                onClick={handleRetry}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Попробовать снова
              </Button>
            )}

            {showHomeButton && (
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                На главную
              </Button>
            )}

            <Button
              onClick={handleContactSupport}
              variant="outline"
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Поддержка
            </Button>
          </div>

          {/* Technical Details (only in development) */}
          {process.env.NODE_ENV === 'development' && error.error.technicalDetails && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Технические детали (для разработчиков)
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                {JSON.stringify(error.error.technicalDetails, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}