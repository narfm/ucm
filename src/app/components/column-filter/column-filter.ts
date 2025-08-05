import { Component, Input, Output, EventEmitter, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColumnDefinition, FilterCriteria } from '../../models/financial-data.interface';
import { ColumnFilterService } from '../../services/column-filter.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-column-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipDirective],
  templateUrl: './column-filter.html',
  styleUrl: './column-filter.scss'
})
export class ColumnFilterComponent implements OnDestroy {
  @Input() column!: ColumnDefinition;
  @Output() filterChange = new EventEmitter<void>();
  
  showFilterDropdown = false;
  filterDropdownX = 0;
  filterDropdownY = 0;
  
  // Filter form values
  filterOperator: FilterCriteria['operator'] = 'contains';
  filterValue: any = '';
  
  private columnFilterService = inject(ColumnFilterService);
  
  get isFilterActive(): boolean {
    return this.columnFilterService.hasFilterForColumn(this.column.key as string);
  }
  
  get columnKey(): string {
    return this.column.key as string;
  }
  
  get isTextColumn(): boolean {
    return !this.column.dataType || this.column.dataType === 'string';
  }
  
  get isNumberColumn(): boolean {
    return this.column.dataType === 'number';
  }
  
  get isBooleanColumn(): boolean {
    return this.column.dataType === 'boolean';
  }
  
  get currentFilter(): FilterCriteria | undefined {
    return this.columnFilterService.getFilterForColumn(this.columnKey);
  }
  
  get textOperatorOptions() {
    return [
      { value: 'contains', label: 'Contains' },
      { value: 'equals', label: 'Equals' },
      { value: 'startsWith', label: 'Starts with' },
      { value: 'endsWith', label: 'Ends with' }
    ];
  }
  
  get numberOperatorOptions() {
    return [
      { value: 'equals', label: 'Equals' },
      { value: 'greaterThan', label: 'Greater than' },
      { value: 'lessThan', label: 'Less than' }
    ];
  }
  
  get booleanOptions() {
    return [
      { value: 'all', label: 'All' },
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' }
    ];
  }
  
  toggleFilter(event: MouseEvent): void {
    event.stopPropagation();
    
    if (this.showFilterDropdown) {
      this.closeFilter();
    } else {
      this.openFilter(event);
    }
  }
  
  private openFilter(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const button = target.closest('.column-filter-button') as HTMLElement;
    if (button) {
      const rect = button.getBoundingClientRect();
      this.filterDropdownX = rect.left;
      this.filterDropdownY = rect.bottom + 5;
    }
    
    // Initialize form values from current filter
    const currentFilter = this.currentFilter;
    if (currentFilter) {
      this.filterOperator = currentFilter.operator || 'contains';
      this.filterValue = currentFilter.value;
    } else {
      this.filterOperator = this.isNumberColumn ? 'equals' : 'contains';
      this.filterValue = '';
    }
    
    this.showFilterDropdown = true;
    
    setTimeout(() => {
      document.addEventListener('click', this.onDocumentClick);
    }, 0);
  }
  
  closeFilter(): void {
    this.showFilterDropdown = false;
    document.removeEventListener('click', this.onDocumentClick);
  }
  
  applyFilter(): void {
    if (this.isBooleanColumn && this.filterValue === 'all') {
      this.clearFilter();
      return;
    }
    
    let value = this.filterValue;
    
    // Convert boolean string values to actual booleans
    if (this.isBooleanColumn) {
      value = this.filterValue === 'true';
    }
    
    // Convert number strings to numbers
    if (this.isNumberColumn && typeof value === 'string') {
      value = parseFloat(value);
      if (isNaN(value)) {
        return; // Invalid number
      }
    }
    
    // Don't apply empty filters
    if (value === '' || value === null || value === undefined) {
      this.clearFilter();
      return;
    }
    
    this.columnFilterService.addFilter({
      column: this.columnKey,
      value: value,
      operator: this.filterOperator
    });
    
    this.closeFilter();
    this.filterChange.emit();
  }
  
  clearFilter(): void {
    this.columnFilterService.removeFilter(this.columnKey);
    this.closeFilter();
    this.filterChange.emit();
  }
  
  private onDocumentClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const isFilterDropdown = target.closest('.column-filter-dropdown');
    const isFilterButton = target.closest('.column-filter-button');
    
    if (!isFilterDropdown && !isFilterButton) {
      this.closeFilter();
    }
  };
  
  ngOnDestroy(): void {
    document.removeEventListener('click', this.onDocumentClick);
  }
}