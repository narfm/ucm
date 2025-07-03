import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent {
  themeService = inject(ThemeService);
  showUserMenu = false;

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  logout(): void {
    console.log('Logout clicked');
    // Implement logout logic here
  }
}