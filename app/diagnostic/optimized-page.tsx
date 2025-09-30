'use client';

import React, { useEffect, useCallback } from 'react';
import { useDiagnosticState } from '@/hooks/useDiagnosticState';
import DiagnosticHeader from '@/components/diagnostic/DiagnosticHeader';
import ApiTestingSection from '@/components/diagnostic/ApiTestingSection';
import { LazyFullTestingResults, LazyVehicleManagement } from '@/components/diagnostic/LazyLoadedComponents';
import { apiRequestWithTimeout, PerformanceMonitor } from '@/lib/api-utils';

export default function OptimizedDiagnosticPage() {
  const { state, actions } = useDiagnosticState();

  // Initialize data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vehicleTypes');
      if (saved) {
        const parsedVehicleTypes = JSON.parse(saved);
        actions.initializeVehicleTypes(parsedVehicleTypes, null);
      }
      
      const lastUpdate = localStorage.getItem('lastProductDataUpdate');
      if (lastUpdate) {
        actions.setLastUpdateTime(new Date(lastUpdate).toLocaleString('ru-RU'));
      }
    } catch (error) {
      console.error('Ошибка загрузки сохранённых данных:', error);
    }
  }, [actions]);

  // API testing functions with performance monitoring
  const testAPI = useCallback(async (service: string, endpoint: string, data: any = {}) => {
    const endTiming = PerformanceMonitor.startMeasurement(`diagnostic_${service}`);
    actions.setTestingState(service, true);
    
    try {
      const response = await apiRequestWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }, { timeout: 15000, retries: 1 });

      const result = await response.json();
      const timing = endTiming();

      if (response.ok) {
        actions.setDiagnosticResult(service.toLowerCase(), {
          status: 'success',
          message: `✅ ${service} API работает корректно`,
          details: result,
          timing
        });
      } else {
        actions.setDiagnosticResult(service.toLowerCase(), {
          status: 'error',
          message: `❌ Ошибка ${service} API: ${result.error || 'Неизвестная ошибка'}`,
          details: result,
          timing
        });
      }
    } catch (error) {
      endTiming();
      actions.setDiagnosticResult(service.toLowerCase(), {
        status: 'error',
        message: `❌ Сетевая ошибка ${service} API`,
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    } finally {
      actions.setTestingState(service, false);
    }
  }, [actions]);

  const testPEK = useCallback(() => {
    testAPI('PEK', '/api/pek', { method: 'test' });
  }, [testAPI]);

  const testDellin = useCallback(() => {
    testAPI('Dellin', '/api/dellin-packages', { method: 'test' });
  }, [testAPI]);

  const testRailContinent = useCallback(() => {
    testAPI('RailContinent', '/api/rail-continent', { method: 'test' });
  }, [testAPI]);

  const testVozovoz = useCallback(() => {
    testAPI('Vozovoz', '/api/vozovoz', { method: 'test' });
  }, [testAPI]);

  const testNordWheel = useCallback(() => {
    testAPI('NordWheel', '/api/test', { service: 'nordwheel' });
  }, [testAPI]);

  const testAllAPIs = useCallback(async () => {
    actions.resetDiagnosticResults();
    
    const tests = [
      () => testPEK(),
      () => testDellin(), 
      () => testRailContinent(),
      () => testVozovoz(),
      () => testNordWheel()
    ];

    // Run tests in parallel for better performance
    await Promise.allSettled(tests.map(test => test()));
  }, [actions, testPEK, testDellin, testRailContinent, testVozovoz, testNordWheel]);

  const runFullTesting = useCallback(async () => {
    actions.setFullTesting(true);
    actions.setTestProgress({ 
      currentTK: 'Начинаем тестирование...', 
      completedTests: 0, 
      totalPlannedTests: 25, 
      stage: 'Инициализация',
      progress: 0 
    });

    const startTime = Date.now();
    const results: any[] = [];
    const errors: string[] = [];

    const testCases = [
      { service: 'ПЭК', endpoint: '/api/pek', data: { method: 'test' } },
      { service: 'Деловые Линии', endpoint: '/api/dellin-packages', data: { method: 'test' } },
      { service: 'Rail Continent', endpoint: '/api/rail-continent', data: { method: 'test' } },
      { service: 'Возовоз', endpoint: '/api/vozovoz', data: { method: 'test' } },
      { service: 'Nord Wheel', endpoint: '/api/test', data: { service: 'nordwheel' } }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const progress = Math.round(((i + 1) / testCases.length) * 100);
      
      actions.setTestProgress({
        currentTK: testCase.service,
        completedTests: i,
        totalPlannedTests: testCases.length,
        stage: 'Тестирование API',
        progress
      });

      try {
        const response = await apiRequestWithTimeout(testCase.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCase.data)
        }, { timeout: 10000 });

        const result = await response.json();
        
        results.push({
          company: testCase.service,
          status: response.ok ? 'passed' : 'failed',
          message: response.ok ? 'Тест пройден успешно' : result.error || 'Ошибка теста',
          details: result,
          timing: result.timing || 0,
          timestamp: new Date().toISOString()
        });

        if (!response.ok) {
          errors.push(`${testCase.service}: ${result.error || 'Неизвестная ошибка'}`);
        }
      } catch (error) {
        results.push({
          company: testCase.service,
          status: 'failed',
          message: 'Сетевая ошибка или таймаут',
          details: error instanceof Error ? error.message : 'Неизвестная ошибка',
          timing: 0,
          timestamp: new Date().toISOString()
        });
        errors.push(`${testCase.service}: Сетевая ошибка`);
      }

      // Small delay for UI updates
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const successful = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const averageTime = results.reduce((sum, r) => sum + r.timing, 0) / results.length;

    actions.setFullTestResults({
      summary: {
        totalTests: results.length,
        successful,
        failed,
        skipped: 0,
        errors,
        averageResponseTime: Math.round(averageTime),
        successRate: (successful / results.length) * 100
      },
      details: results,
      progressInfo: null
    });

    actions.setTestProgress(null);
    actions.setFullTesting(false);
  }, [actions]);

  // Vehicle management functions
  const addVehicleType = useCallback(() => {
    const { name, length, width, height } = state.newVehicle;
    
    if (!name || !length || !width || !height) {
      alert('Пожалуйста, заполните все поля');
      return;
    }
    
    const newId = (state.vehicleTypes.length + 1).toString();
    const vehicleToAdd = {
      id: newId,
      name,
      length: parseInt(length),
      width: parseInt(width),
      height: parseInt(height)
    };
    
    actions.addVehicleType(vehicleToAdd);
  }, [state.newVehicle, state.vehicleTypes.length, actions]);

  const saveVehicleTypes = useCallback(async () => {
    actions.setSavingState(true);
    actions.setSaveStatus('saving');
    
    try {
      localStorage.setItem('vehicleTypes', JSON.stringify(state.vehicleTypes));
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      actions.setUnsavedChanges(false);
      actions.setSaveStatus('success');
      setTimeout(() => actions.setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      actions.setSaveStatus('error');
      setTimeout(() => actions.setSaveStatus('idle'), 5000);
    } finally {
      actions.setSavingState(false);
    }
  }, [state.vehicleTypes, actions]);

  const updateProductData = useCallback(async () => {
    actions.setUpdatingData(true);
    actions.setUpdateStatus('updating');
    
    try {
      const response = await apiRequestWithTimeout('/api/furniture-products?update=true&force=true&timestamp=' + Date.now(), {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }, { timeout: 30000 });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка обновления данных');
      }

      const updateTime = new Date().toLocaleString('ru-RU');
      localStorage.setItem('lastProductDataUpdate', new Date().toISOString());
      actions.setLastUpdateTime(updateTime);
      actions.setUpdateStatus('success');
      
      setTimeout(() => actions.setUpdateStatus('idle'), 3000);
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
      actions.setUpdateStatus('error');
      setTimeout(() => actions.setUpdateStatus('idle'), 5000);
    } finally {
      actions.setUpdatingData(false);
    }
  }, [actions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <DiagnosticHeader
          onTestAllAPIs={testAllAPIs}
          onRunFullTesting={runFullTesting}
          onUpdateProductData={updateProductData}
          isFullTesting={state.isFullTesting}
          isUpdatingData={state.isUpdatingData}
          updateStatus={state.updateStatus}
        />

        <ApiTestingSection
          diagnosticResults={state.diagnosticResults}
          testStates={{
            isTestingPEK: state.isTestingPEK,
            isTestingDellin: state.isTestingDellin,
            isTestingRailContinent: state.isTestingRailContinent,
            isTestingVozovoz: state.isTestingVozovoz,
            isTestingNordWheel: state.isTestingNordWheel,
          }}
          onTestPEK={testPEK}
          onTestDellin={testDellin}
          onTestRailContinent={testRailContinent}
          onTestVozovoz={testVozovoz}
          onTestNordWheel={testNordWheel}
        />

        <LazyFullTestingResults
          fullTestResults={state.fullTestResults}
          testProgress={state.testProgress?.progress || 0}
          isFullTesting={state.isFullTesting}
        />

        <LazyVehicleManagement
          vehicleTypes={state.vehicleTypes}
          newVehicle={state.newVehicle}
          hasUnsavedChanges={state.hasUnsavedChanges}
          saveStatus={state.saveStatus}
          isSaving={state.isSaving}
          lastUpdateTime={state.lastUpdateTime}
          onAddVehicleType={addVehicleType}
          onRemoveVehicleType={actions.removeVehicleType}
          onUpdateVehicleType={actions.updateVehicleType}
          onSaveVehicleTypes={saveVehicleTypes}
          onSetNewVehicle={actions.setNewVehicle}
        />
      </div>
    </div>
  );
}