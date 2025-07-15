import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header';
import { HierarchyConfigModalComponent } from './components/hierarchy-config-modal/hierarchy-config-modal';
import { ThemeService } from './services/theme.service';
import { EmbedModeService } from './services/embed-mode.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, HierarchyConfigModalComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'ucm';
  private themeService = inject(ThemeService);
  protected embedModeService = inject(EmbedModeService);
  
  constructor() {
    // Theme is initialized in ThemeService constructor
  }
}