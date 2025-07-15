import { Component, inject, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { ErrorDisplayComponent } from '../error-display/error-display';

@Component({
  selector: 'app-global-error-display',
  standalone: true,
  imports: [CommonModule, ErrorDisplayComponent],
  templateUrl: './global-error-display.html',
  styleUrl: './global-error-display.scss'
})
export class GlobalErrorDisplayComponent implements OnDestroy {
  private errorHandlerService = inject(ErrorHandlerService);
  private autoDismissTimeouts = new Map<string, number>();
  
  errorState = this.errorHandlerService.errorState;
  
  activeErrors = computed(() => {
    const errors = this.errorState().errors.filter(error => !error.dismissed);
    
    // Set up auto-dismiss for new errors
    errors.forEach(error => {
      if (!this.autoDismissTimeouts.has(error.id)) {
        const timeoutId = setTimeout(() => {
          this.errorHandlerService.dismissError(error.id);
          this.autoDismissTimeouts.delete(error.id);
        }, 5000); // 5 seconds
        
        this.autoDismissTimeouts.set(error.id, timeoutId);
      }
    });
    
    return errors;
  });

  onRetry(errorId: string): void {
    // Clear the auto-dismiss timeout since user is interacting
    this.clearAutoDismissTimeout(errorId);
    // For global errors, we just dismiss them as retry logic is context-specific
    this.errorHandlerService.dismissError(errorId);
  }

  onDismiss(errorId: string): void {
    this.clearAutoDismissTimeout(errorId);
    this.errorHandlerService.dismissError(errorId);
  }

  clearAll(): void {
    // Clear all auto-dismiss timeouts
    this.autoDismissTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.autoDismissTimeouts.clear();
    
    this.errorHandlerService.clearAllErrors();
  }

  private clearAutoDismissTimeout(errorId: string): void {
    const timeoutId = this.autoDismissTimeouts.get(errorId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.autoDismissTimeouts.delete(errorId);
    }
  }

  trackByError(index: number, error: any): string {
    return error.id;
  }

  ngOnDestroy(): void {
    // Clear all timeouts when component is destroyed
    this.autoDismissTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.autoDismissTimeouts.clear();
  }
}