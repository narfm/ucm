import { Injectable, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EmbedModeService {
  private _isEmbedMode = signal<boolean>(false);
  
  constructor(private router: Router) {
    this.initializeEmbedModeDetection();
  }

  // Public getter for embed mode state
  isEmbedMode() {
    return this._isEmbedMode.asReadonly();
  }

  // Initialize embed mode detection from route
  private initializeEmbedModeDetection(): void {
    // Check initial route
    this.checkEmbedModeFromRoute(this.router.url);
    
    // Listen for route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.checkEmbedModeFromRoute(event.url);
    });
  }

  // Check if current route is embed mode
  private checkEmbedModeFromRoute(url: string): void {
    const isEmbed = url.includes('/embedmode') || url.includes('embedmode');
    this._isEmbedMode.set(isEmbed);
  }

  // Manual activation (for testing or special cases)
  activateEmbedMode(): void {
    this._isEmbedMode.set(true);
  }

  // Manual deactivation
  deactivateEmbedMode(): void {
    this._isEmbedMode.set(false);
  }

  // Get embed mode configuration
  getEmbedConfig() {
    return {
      // maxWidth: '500px',
      hideHeader: true,
      compactLayout: true,
      reducedPadding: true,
      limitedColumns: true
    };
  }
}