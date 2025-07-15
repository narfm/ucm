import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface AppError {
  id: string;
  type: 'network' | 'server' | 'validation' | 'timeout' | 'unknown';
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
  dismissed?: boolean;
  retryable?: boolean;
}

export interface ErrorState {
  hasError: boolean;
  errors: AppError[];
  lastError?: AppError;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private _errorState = signal<ErrorState>({
    hasError: false,
    errors: [],
    lastError: undefined
  });

  errorState = this._errorState.asReadonly();

  private errorIdCounter = 0;

  constructor() {}

  /**
   * Handle an error and add it to the error state
   */
  handleError(error: any, context?: string): AppError {
    const appError = this.createAppError(error, context);
    const currentState = this._errorState();
    
    this._errorState.set({
      hasError: true,
      errors: [...currentState.errors, appError],
      lastError: appError
    });

    return appError;
  }

  /**
   * Create a structured error object from raw error
   */
  private createAppError(error: any, context?: string): AppError {
    const id = `error-${++this.errorIdCounter}`;
    const timestamp = new Date();
    
    // Determine error type and create appropriate message
    let type: AppError['type'] = 'unknown';
    let message = 'An unexpected error occurred';
    let userMessage = 'Something went wrong. Please try again.';
    let retryable = false;

    if (error?.status) {
      // HTTP errors
      switch (error.status) {
        case 0:
        case 504:
          type = 'network';
          message = 'Network connectivity issue';
          userMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
          type = 'server';
          message = 'Server error';
          userMessage = 'The server is experiencing issues. Please try again in a few moments.';
          retryable = true;
          break;
        case 408:
          type = 'timeout';
          message = 'Request timeout';
          userMessage = 'The request timed out. Please try again.';
          retryable = true;
          break;
        case 400:
        case 422:
          type = 'validation';
          message = 'Invalid request';
          userMessage = 'The request contains invalid data. Please check your input and try again.';
          retryable = false;
          break;
        case 401:
          type = 'validation';
          message = 'Authentication required';
          userMessage = 'Please log in to continue.';
          retryable = false;
          break;
        case 403:
          type = 'validation';
          message = 'Access denied';
          userMessage = 'You do not have permission to perform this action.';
          retryable = false;
          break;
        case 404:
          type = 'validation';
          message = 'Resource not found';
          userMessage = 'The requested data could not be found.';
          retryable = false;
          break;
        default:
          type = 'server';
          message = `HTTP ${error.status} error`;
          userMessage = 'An error occurred while processing your request. Please try again.';
          retryable = true;
      }
    } else if (error?.message) {
      // JavaScript errors
      if (error.message.includes('timeout')) {
        type = 'timeout';
        message = 'Operation timeout';
        userMessage = 'The operation took too long to complete. Please try again.';
        retryable = true;
      } else if (error.message.includes('network')) {
        type = 'network';
        message = 'Network error';
        userMessage = 'Network connection issue. Please check your internet connection.';
        retryable = true;
      } else {
        message = error.message;
      }
    }

    // Add context if provided
    if (context) {
      message = `${context}: ${message}`;
    }

    return {
      id,
      type,
      message,
      userMessage,
      details: error,
      timestamp,
      dismissed: false,
      retryable
    };
  }

  /**
   * Dismiss a specific error
   */
  dismissError(errorId: string): void {
    const currentState = this._errorState();
    const updatedErrors = currentState.errors.map(error => 
      error.id === errorId ? { ...error, dismissed: true } : error
    );
    
    this._errorState.set({
      hasError: updatedErrors.some(e => !e.dismissed),
      errors: updatedErrors,
      lastError: currentState.lastError?.id === errorId ? undefined : currentState.lastError
    });
  }

  /**
   * Clear all errors
   */
  clearAllErrors(): void {
    this._errorState.set({
      hasError: false,
      errors: [],
      lastError: undefined
    });
  }

  /**
   * Get only active (non-dismissed) errors
   */
  getActiveErrors(): AppError[] {
    return this._errorState().errors.filter(error => !error.dismissed);
  }

  /**
   * Check if there are any retryable errors
   */
  hasRetryableErrors(): boolean {
    return this.getActiveErrors().some(error => error.retryable);
  }

  /**
   * Simulate network errors for testing (development only)
   */
  simulateError(type: 'network' | 'server' | 'timeout' = 'network'): Observable<never> {
    let error: any;
    
    switch (type) {
      case 'network':
        error = { status: 0, message: 'Network error' };
        break;
      case 'server':
        error = { status: 500, message: 'Internal server error' };
        break;
      case 'timeout':
        error = { status: 408, message: 'Request timeout' };
        break;
    }

    return throwError(() => error).pipe(delay(1000));
  }
}