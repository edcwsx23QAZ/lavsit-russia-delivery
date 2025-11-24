'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface CompanyProgress {
  name: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  progress?: number;
  error?: string;
  duration?: number;
}

interface CalculationProgressProps {
  companies: CompanyProgress[];
  totalDuration?: number;
  isVisible: boolean;
}

export default function CalculationProgress({ 
  companies, 
  totalDuration = 0, 
  isVisible 
}: CalculationProgressProps) {
  if (!isVisible) return null;

  const completedCount = companies.filter(c => c.status === 'completed').length;
  const errorCount = companies.filter(c => c.status === 'error').length;
  const loadingCount = companies.filter(c => c.status === 'loading').length;
  const totalCount = companies.length;
  const overallProgress = totalCount > 0 ? (completedCount + errorCount) / totalCount * 100 : 0;

  const getStatusIcon = (status: CompanyProgress['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: CompanyProgress['status']) => {
    switch (status) {
      case 'loading':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Расчет стоимости доставки
          </span>
          <div className="flex items-center gap-2 text-sm font-normal">
            {totalDuration > 0 && (
              <Badge variant="outline" className="text-xs">
                {totalDuration.toFixed(0)}мс
              </Badge>
            )}
            <Badge variant={errorCount > 0 ? "destructive" : "default"}>
              {completedCount}/{totalCount} завершено
            </Badge>
          </div>
        </CardTitle>
        <Progress value={overallProgress} className="w-full" />
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid gap-3">
          {companies.map((company, index) => (
            <div 
              key={company.name} 
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(company.status)}
                <div>
                  <div className="font-medium">{company.name}</div>
                  {company.error && (
                    <div className="text-xs text-red-600 mt-1 max-w-md">
                      {company.error}
                    </div>
                  )}
                  {company.duration && company.status === 'completed' && (
                    <div className="text-xs text-green-600 mt-1">
                      Выполнено за {company.duration.toFixed(0)}мс
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {company.status === 'loading' && company.progress !== undefined && (
                  <div className="w-20">
                    <Progress value={company.progress} className="h-2" />
                  </div>
                )}
                
                <Badge 
                  variant={company.status === 'error' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {company.status === 'pending' && 'Ожидание'}
                  {company.status === 'loading' && 'Выполняется'}
                  {company.status === 'completed' && 'Завершено'}
                  {company.status === 'error' && 'Ошибка'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        
        {/* Статистика */}
        <div className="flex justify-between items-center pt-3 border-t text-sm text-muted-foreground">
          <div className="flex gap-4">
            <span>Завершено: {completedCount}</span>
            {errorCount > 0 && <span className="text-red-600">Ошибок: {errorCount}</span>}
            {loadingCount > 0 && <span>Выполняется: {loadingCount}</span>}
          </div>
          <div>
            Общий прогресс: {overallProgress.toFixed(0)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}