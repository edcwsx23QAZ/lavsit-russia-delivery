'use client';

import { useReducer, useCallback } from 'react';

export interface DiagnosticResult {
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  details?: any;
  response?: any;
  requestData?: any;
  timing?: number;
}

export interface VehicleType {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
}

export interface TestProgress {
  currentTK: string;
  completedTests: number;
  totalPlannedTests: number;
  stage: string;
}

export interface FullTestResults {
  summary: {
    totalTests: number;
    successful: number;
    failed: number;
    skipped: number;
    errors: string[];
    averageResponseTime: number;
    successRate: number;
  };
  details: any[];
  progressInfo: TestProgress | null;
}

export interface DiagnosticState {
  // Test loading states
  isTestingPEK: boolean;
  isTestingDellin: boolean;
  isTestingRailContinent: boolean;
  isTestingVozovoz: boolean;
  isTestingNordWheel: boolean;
  isFullTesting: boolean;
  
  // Results
  diagnosticResults: { [key: string]: DiagnosticResult };
  fullTestResults: FullTestResults | null;
  testProgress: TestProgress & { progress: number } | null;
  
  // Vehicle management
  vehicleTypes: VehicleType[];
  newVehicle: { name: string; length: string; width: string; height: string };
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  
  // Data updating
  isUpdatingData: boolean;
  updateStatus: 'idle' | 'updating' | 'success' | 'error';
  lastUpdateTime: string | null;
}

type DiagnosticAction =
  | { type: 'SET_TESTING_STATE'; payload: { service: string; isLoading: boolean } }
  | { type: 'SET_FULL_TESTING'; payload: boolean }
  | { type: 'SET_DIAGNOSTIC_RESULT'; payload: { key: string; result: DiagnosticResult } }
  | { type: 'SET_FULL_TEST_RESULTS'; payload: FullTestResults | null }
  | { type: 'SET_TEST_PROGRESS'; payload: TestProgress & { progress: number } | null }
  | { type: 'SET_VEHICLE_TYPES'; payload: VehicleType[] }
  | { type: 'ADD_VEHICLE_TYPE'; payload: VehicleType }
  | { type: 'REMOVE_VEHICLE_TYPE'; payload: string }
  | { type: 'UPDATE_VEHICLE_TYPE'; payload: { id: string; field: string; value: string | number } }
  | { type: 'SET_NEW_VEHICLE'; payload: { name: string; length: string; width: string; height: string } }
  | { type: 'SET_SAVING_STATE'; payload: boolean }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'SET_SAVE_STATUS'; payload: 'idle' | 'saving' | 'success' | 'error' }
  | { type: 'SET_UPDATING_DATA'; payload: boolean }
  | { type: 'SET_UPDATE_STATUS'; payload: 'idle' | 'updating' | 'success' | 'error' }
  | { type: 'SET_LAST_UPDATE_TIME'; payload: string | null }
  | { type: 'RESET_DIAGNOSTIC_RESULTS' }
  | { type: 'INITIALIZE_VEHICLE_TYPES'; payload: { vehicleTypes: VehicleType[]; lastUpdateTime: string | null } };

const initialState: DiagnosticState = {
  isTestingPEK: false,
  isTestingDellin: false,
  isTestingRailContinent: false,
  isTestingVozovoz: false,
  isTestingNordWheel: false,
  isFullTesting: false,
  diagnosticResults: {},
  fullTestResults: null,
  testProgress: null,
  vehicleTypes: [
    { id: '1', name: 'Форд Транзит', length: 4200, width: 2025, height: 2025 },
    { id: '2', name: 'Фура 18м3', length: 4200, width: 2200, height: 2000 }
  ],
  newVehicle: { name: '', length: '', width: '', height: '' },
  isSaving: false,
  hasUnsavedChanges: false,
  saveStatus: 'idle',
  isUpdatingData: false,
  updateStatus: 'idle',
  lastUpdateTime: null,
};

function diagnosticReducer(state: DiagnosticState, action: DiagnosticAction): DiagnosticState {
  switch (action.type) {
    case 'SET_TESTING_STATE':
      const testingStateKey = `isTesting${action.payload.service}` as keyof DiagnosticState;
      return {
        ...state,
        [testingStateKey]: action.payload.isLoading,
      };
    
    case 'SET_FULL_TESTING':
      return { ...state, isFullTesting: action.payload };
    
    case 'SET_DIAGNOSTIC_RESULT':
      return {
        ...state,
        diagnosticResults: {
          ...state.diagnosticResults,
          [action.payload.key]: action.payload.result,
        },
      };
    
    case 'SET_FULL_TEST_RESULTS':
      return { ...state, fullTestResults: action.payload };
    
    case 'SET_TEST_PROGRESS':
      return { ...state, testProgress: action.payload };
    
    case 'SET_VEHICLE_TYPES':
      return { ...state, vehicleTypes: action.payload };
    
    case 'ADD_VEHICLE_TYPE':
      return {
        ...state,
        vehicleTypes: [...state.vehicleTypes, action.payload],
        newVehicle: { name: '', length: '', width: '', height: '' },
        hasUnsavedChanges: true,
      };
    
    case 'REMOVE_VEHICLE_TYPE':
      return {
        ...state,
        vehicleTypes: state.vehicleTypes.filter(vehicle => vehicle.id !== action.payload),
        hasUnsavedChanges: true,
      };
    
    case 'UPDATE_VEHICLE_TYPE':
      return {
        ...state,
        vehicleTypes: state.vehicleTypes.map(vehicle =>
          vehicle.id === action.payload.id
            ? { ...vehicle, [action.payload.field]: action.payload.value }
            : vehicle
        ),
        hasUnsavedChanges: true,
      };
    
    case 'SET_NEW_VEHICLE':
      return { ...state, newVehicle: action.payload };
    
    case 'SET_SAVING_STATE':
      return { ...state, isSaving: action.payload };
    
    case 'SET_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload };
    
    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.payload };
    
    case 'SET_UPDATING_DATA':
      return { ...state, isUpdatingData: action.payload };
    
    case 'SET_UPDATE_STATUS':
      return { ...state, updateStatus: action.payload };
    
    case 'SET_LAST_UPDATE_TIME':
      return { ...state, lastUpdateTime: action.payload };
    
    case 'RESET_DIAGNOSTIC_RESULTS':
      return { ...state, diagnosticResults: {} };
    
    case 'INITIALIZE_VEHICLE_TYPES':
      return {
        ...state,
        vehicleTypes: action.payload.vehicleTypes,
        lastUpdateTime: action.payload.lastUpdateTime,
      };
    
    default:
      return state;
  }
}

export function useDiagnosticState() {
  const [state, dispatch] = useReducer(diagnosticReducer, initialState);

  // Memoized action creators
  const setTestingState = useCallback((service: string, isLoading: boolean) => {
    dispatch({ type: 'SET_TESTING_STATE', payload: { service, isLoading } });
  }, []);

  const setFullTesting = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_FULL_TESTING', payload: isLoading });
  }, []);

  const setDiagnosticResult = useCallback((key: string, result: DiagnosticResult) => {
    dispatch({ type: 'SET_DIAGNOSTIC_RESULT', payload: { key, result } });
  }, []);

  const setFullTestResults = useCallback((results: FullTestResults | null) => {
    dispatch({ type: 'SET_FULL_TEST_RESULTS', payload: results });
  }, []);

  const setTestProgress = useCallback((progress: TestProgress & { progress: number } | null) => {
    dispatch({ type: 'SET_TEST_PROGRESS', payload: progress });
  }, []);

  const setVehicleTypes = useCallback((vehicleTypes: VehicleType[]) => {
    dispatch({ type: 'SET_VEHICLE_TYPES', payload: vehicleTypes });
  }, []);

  const addVehicleType = useCallback((vehicle: VehicleType) => {
    dispatch({ type: 'ADD_VEHICLE_TYPE', payload: vehicle });
  }, []);

  const removeVehicleType = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_VEHICLE_TYPE', payload: id });
  }, []);

  const updateVehicleType = useCallback((id: string, field: string, value: string | number) => {
    dispatch({ type: 'UPDATE_VEHICLE_TYPE', payload: { id, field, value } });
  }, []);

  const setNewVehicle = useCallback((vehicle: { name: string; length: string; width: string; height: string }) => {
    dispatch({ type: 'SET_NEW_VEHICLE', payload: vehicle });
  }, []);

  const setSavingState = useCallback((isSaving: boolean) => {
    dispatch({ type: 'SET_SAVING_STATE', payload: isSaving });
  }, []);

  const setUnsavedChanges = useCallback((hasChanges: boolean) => {
    dispatch({ type: 'SET_UNSAVED_CHANGES', payload: hasChanges });
  }, []);

  const setSaveStatus = useCallback((status: 'idle' | 'saving' | 'success' | 'error') => {
    dispatch({ type: 'SET_SAVE_STATUS', payload: status });
  }, []);

  const setUpdatingData = useCallback((isUpdating: boolean) => {
    dispatch({ type: 'SET_UPDATING_DATA', payload: isUpdating });
  }, []);

  const setUpdateStatus = useCallback((status: 'idle' | 'updating' | 'success' | 'error') => {
    dispatch({ type: 'SET_UPDATE_STATUS', payload: status });
  }, []);

  const setLastUpdateTime = useCallback((time: string | null) => {
    dispatch({ type: 'SET_LAST_UPDATE_TIME', payload: time });
  }, []);

  const resetDiagnosticResults = useCallback(() => {
    dispatch({ type: 'RESET_DIAGNOSTIC_RESULTS' });
  }, []);

  const initializeVehicleTypes = useCallback((vehicleTypes: VehicleType[], lastUpdateTime: string | null) => {
    dispatch({ type: 'INITIALIZE_VEHICLE_TYPES', payload: { vehicleTypes, lastUpdateTime } });
  }, []);

  return {
    state,
    actions: {
      setTestingState,
      setFullTesting,
      setDiagnosticResult,
      setFullTestResults,
      setTestProgress,
      setVehicleTypes,
      addVehicleType,
      removeVehicleType,
      updateVehicleType,
      setNewVehicle,
      setSavingState,
      setUnsavedChanges,
      setSaveStatus,
      setUpdatingData,
      setUpdateStatus,
      setLastUpdateTime,
      resetDiagnosticResults,
      initializeVehicleTypes,
    },
  };
}