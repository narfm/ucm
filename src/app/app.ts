import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header';
import { HierarchyConfigModalComponent } from './components/hierarchy-config-modal/hierarchy-config-modal';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, HierarchyConfigModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'ucm';
  private themeService = inject(ThemeService);
  
  constructor() {
    // Theme is initialized in ThemeService constructor
  }
}