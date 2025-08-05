import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnFilterService } from '../../services/column-filter.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-filter-indicator',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  templateUrl: './filter-indicator.html',
  styleUrl: './filter-indicator.scss'
})
export class FilterIndicatorComponent {
  @Output() filterRemoved = new EventEmitter<string>();
  @Output() allFiltersCleared = new EventEmitter<void>();
  
  columnFilterService = inject(ColumnFilterService);
  
  get activeFilters() {
    return this.columnFilterService.activeFilters();
  }
  
  get hasActiveFilters() {
    return this.columnFilterService.hasActiveFilters();
  }
  
  get activeFilterCount() {
    return this.columnFilterService.activeFilterCount();
  }
  
  removeFilter(columnKey: string): void {
    this.columnFilterService.removeFilter(columnKey);
    this.filterRemoved.emit(columnKey);
  }
  
  clearAllFilters(): void {
    this.columnFilterService.clearAllFilters();
    this.allFiltersCleared.emit();
  }
  
  getFilterDescription(filter: any): string {
    let description = `${this.formatColumnName(filter.column)} `;
    
    switch (filter.operator) {
      case 'equals':
        description += filter.column === 'legalEntity' 
          ? (filter.value ? 'is legal entity' : 'is not legal entity')
          : `equals ${filter.value}`;
        break;
      case 'contains':
        description += `contains "${filter.value}"`;
        break;
      case 'startsWith':
        description += `starts with "${filter.value}"`;
        break;
      case 'endsWith':
        description += `ends with "${filter.value}"`;
        break;
      case 'greaterThan':
        description += `> ${filter.value}`;
        break;
      case 'lessThan':
        description += `< ${filter.value}`;
        break;
      default:
        description += `${filter.operator} ${filter.value}`;
    }
    
    return description;
  }
  
  formatColumnName(columnKey: string): string {
    // Handle metric columns
    if (columnKey.startsWith('metrics.')) {
      return columnKey.substring(8);
    }
    
    // Format camelCase to Title Case
    return columnKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  getFilterSummary(): string {
    const filters = this.activeFilters;
    if (filters.length === 0) return '';
    
    // Show first 2 filters inline
    const summaryFilters = filters.slice(0, 2).map(f => this.formatColumnName(f.column));
    let summary = summaryFilters.join(', ');
    
    if (filters.length > 2) {
      summary += ` +${filters.length - 2}`;
    }
    
    return `(${summary})`;
  }
  
  getFilterTooltip(): string {
    return this.activeFilters
      .map(filter => this.getFilterDescription(filter))
      .join('\n');
  }
}