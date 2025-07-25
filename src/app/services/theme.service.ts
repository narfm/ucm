import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'vibrant';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSignal = signal<Theme>('light');
  
  theme = this.themeSignal.asReadonly();

  constructor() {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      this.themeSignal.set(savedTheme);
    }
    
    // Apply theme on change
    effect(() => {
      const theme = this.themeSignal();
      this.applyTheme(theme);
    });
  }

  toggleTheme(): void {
    const currentTheme = this.themeSignal();
    const newTheme = currentTheme === 'light' ? 'dark' : 
                     currentTheme === 'dark' ? 'vibrant' : 'light';
    this.themeSignal.set(newTheme);
    localStorage.setItem('theme', newTheme);
  }

  setTheme(theme: Theme): void {
    this.themeSignal.set(theme);
    localStorage.setItem('theme', theme);
  }

  private applyTheme(theme: Theme): void {
    document.body.classList.remove('light-theme', 'dark-theme', 'vibrant-theme');
    document.body.classList.add(`${theme}-theme`);
  }
}