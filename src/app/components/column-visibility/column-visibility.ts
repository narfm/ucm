import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnDefinition } from '../../models/financial-data.interface';
import { ColumnVisibilityService } from '../../services/column-visibility.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-column-visibility',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  templateUrl: './column-visibility.html',
  styleUrl: './column-visibility.scss'
})
export class ColumnVisibilityComponent {
  @Input() columns: ColumnDefinition[] = [];
  @Input() showAsDropdown: boolean = true;
  @Input() embedMode: boolean = false;
  
  private columnVisibilityService = inject(ColumnVisibilityService);
  
  // Track dropdown open state
  dropdownOpen = false;
  
  // Get the visibility service for template access
  get visibilityService() {
    return this.columnVisibilityService;
  }
  
  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }
  
  closeDropdown(): void {
    this.dropdownOpen = false;
  }
  
  onToggleColumn(column: ColumnDefinition, event: Event): void {
    event.stopPropagation();
    
    // Prevent hiding the name column (essential column)
    if (column.key === 'name') {
      return;
    }
    
    this.columnVisibilityService.toggleColumnVisibility(column.key);
  }
  
  onShowAll(): void {
    this.columnVisibilityService.showAllColumns(this.columns);
  }
  
  onHideNonEssential(): void {
    this.columnVisibilityService.hideAllNonEssentialColumns(this.columns);
  }
  
  onResetDefaults(): void {
    this.columnVisibilityService.resetToDefaults(this.columns);
  }
  
  getColumnLabel(column: ColumnDefinition): string {
    // Format column labels for better readability
    if (column.key.startsWith('metrics.')) {
      return column.label || column.key.substring(8); // Remove "metrics." prefix
    }
    return column.label || column.key;
  }
  
  isEssentialColumn(column: ColumnDefinition): boolean {
    // Name column is always essential and cannot be hidden
    return column.key === 'name';
  }
  
  getVisibleColumnCount(): number {
    return this.columnVisibilityService.getVisibleColumnCount(this.columns);
  }
  
  // Handle clicks outside the dropdown to close it
  onDocumentClick(event: Event): void {
    if (!this.dropdownOpen) return;
    
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.column-visibility-dropdown');
    const button = document.querySelector('.column-visibility-button');
    
    if (dropdown && button && 
        !dropdown.contains(target) && 
        !button.contains(target)) {
      this.closeDropdown();
    }
  }
  
  ngOnInit(): void {
    // Initialize column visibility from current columns
    if (this.columns.length > 0) {
      this.columnVisibilityService.initializeFromColumns(this.columns);
    }
    
    // Set embed mode state
    this.columnVisibilityService.setEmbedMode(this.embedMode);
    
    // Add document click listener
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }
  
  ngOnDestroy(): void {
    // Clean up event listener
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }
  
  // Update columns when input changes
  ngOnChanges(): void {
    if (this.columns.length > 0) {
      this.columnVisibilityService.initializeFromColumns(this.columns);
    }
    this.columnVisibilityService.setEmbedMode(this.embedMode);
  }
  
  // Track by function for column list
  trackByColumn(index: number, column: ColumnDefinition): string {
    return column.key;
  }
}