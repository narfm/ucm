import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppError, ErrorHandlerService } from '../../services/error-handler.service';

@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-display.html',
  styleUrl: './error-display.scss'
})
export class ErrorDisplayComponent {
  @Input() error: AppError | null = null;
  @Input() showRetryButton: boolean = true;
  @Input() compact: boolean = false;
  @Output() retry = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<string>();

  private errorHandlerService = inject(ErrorHandlerService);

  onRetry(): void {
    this.retry.emit();
  }

  onDismiss(errorId: string): void {
    this.errorHandlerService.dismissError(errorId);
    this.dismiss.emit(errorId);
  }

  getErrorIcon(type: AppError['type']): string {
    switch (type) {
      case 'network':
        return 'wifi-off';
      case 'server':
        return 'server';
      case 'timeout':
        return 'clock';
      case 'validation':
        return 'alert-circle';
      default:
        return 'alert-triangle';
    }
  }

  getErrorClass(type: AppError['type']): string {
    switch (type) {
      case 'network':
        return 'error-network';
      case 'server':
        return 'error-server';
      case 'timeout':
        return 'error-timeout';
      case 'validation':
        return 'error-validation';
      default:
        return 'error-unknown';
    }
  }
}