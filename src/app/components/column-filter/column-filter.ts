import { Component, Input, Output, EventEmitter, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnDefinition } from '../../models/financial-data.interface';
import { ColumnFilterService } from '../../services/column-filter.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-column-filter',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  templateUrl: './column-filter.html',
  styleUrl: './column-filter.scss'
})
export class ColumnFilterComponent implements OnDestroy {
  @Input() column!: ColumnDefinition;
  @Output() filterChange = new EventEmitter<void>();
  
  showFilterDropdown = false;
  filterDropdownX = 0;
  filterDropdownY = 0;
  
  private columnFilterService = inject(ColumnFilterService);
  
  get isFilterActive(): boolean {
    return this.columnFilterService.hasFilterForColumn(this.column.key as string);
  }
  
  get filterOptions() {
    if (this.column.key === 'legalEntity') {
      return this.columnFilterService.legalEntityFilterOptions;
    }
    return [];
  }
  
  get currentFilterValue() {
    if (this.column.key === 'legalEntity') {
      return this.columnFilterService.currentLegalEntityFilter();
    }
    return 'all';
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
    this.showFilterDropdown = true;
    
    setTimeout(() => {
      document.addEventListener('click', this.onDocumentClick);
    }, 0);
  }
  
  closeFilter(): void {
    this.showFilterDropdown = false;
    document.removeEventListener('click', this.onDocumentClick);
  }
  
  applyFilter(value: string): void {
    if (this.column.key === 'legalEntity') {
      this.columnFilterService.setLegalEntityFilter(value as 'all' | 'legal' | 'non-legal');
    }
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