import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header';
import { HierarchyConfigModalComponent } from './components/hierarchy-config-modal/hierarchy-config-modal';
import { ThemeService } from './services/theme.service';
import { EmbedModeService } from './services/embed-mode.service';
import { GlobalErrorDisplayComponent } from './components/global-error-display/global-error-display';
import { MockDataService } from './services/mock-data.service';
import { ErrorHandlerService } from './services/error-handler.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, HierarchyConfigModalComponent, CommonModule, GlobalErrorDisplayComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'ucm';
  private themeService = inject(ThemeService);
  protected embedModeService = inject(EmbedModeService);
  private mockDataService = inject(MockDataService);
  private errorHandlerService = inject(ErrorHandlerService);
  
  constructor() {
    // Theme is initialized in ThemeService constructor
    
    // Add global error testing methods for development
    if (typeof window !== 'undefined') {
      (window as any).testErrorHandling = {
        enableErrors: (enabled: boolean = true) => this.mockDataService.enableErrorSimulation(enabled),
        setErrorRate: (rate: number) => this.mockDataService.setErrorRate(rate),
        simulateNetworkError: () => this.mockDataService.forceError('network').subscribe({ error: (e) => this.errorHandlerService.handleError(e, 'Test network error') }),
        simulateServerError: () => this.mockDataService.forceError('server').subscribe({ error: (e) => this.errorHandlerService.handleError(e, 'Test server error') }),
        simulateTimeoutError: () => this.mockDataService.forceError('timeout').subscribe({ error: (e) => this.errorHandlerService.handleError(e, 'Test timeout error') }),
        clearErrors: () => this.errorHandlerService.clearAllErrors(),
        showErrorState: () => console.log('Error state:', this.errorHandlerService.errorState())
      };
      
      console.log('Error testing methods available on window.testErrorHandling:', Object.keys((window as any).testErrorHandling));
    }
  }
}