import { Injectable, signal, computed } from '@angular/core';
import { FilterCriteria } from '../models/financial-data.interface';

export interface LegalEntityFilterOption {
  value: 'all' | 'legal' | 'non-legal';
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class ColumnFilterService {
  private columnFilters = signal<FilterCriteria[]>([]);
  
  public readonly activeFilters = computed(() => this.columnFilters());
  public readonly hasActiveFilters = computed(() => this.columnFilters().length > 0);
  
  public readonly legalEntityFilterOptions: LegalEntityFilterOption[] = [
    { value: 'all', label: 'All' },
    { value: 'legal', label: 'Legal Entities Only' },
    { value: 'non-legal', label: 'Non-Legal Entities Only' }
  ];
  
  private legalEntityFilter = signal<'all' | 'legal' | 'non-legal'>('all');
  public readonly currentLegalEntityFilter = computed(() => this.legalEntityFilter());
  
  addFilter(filter: FilterCriteria): void {
    const filters = this.columnFilters();
    const existingIndex = filters.findIndex(f => f.column === filter.column);
    
    if (existingIndex >= 0) {
      // Replace existing filter for this column
      const newFilters = [...filters];
      newFilters[existingIndex] = filter;
      this.columnFilters.set(newFilters);
    } else {
      // Add new filter
      this.columnFilters.set([...filters, filter]);
    }
  }
  
  removeFilter(columnKey: string): void {
    const filters = this.columnFilters();
    this.columnFilters.set(filters.filter(f => f.column !== columnKey));
  }
  
  clearAllFilters(): void {
    this.columnFilters.set([]);
    this.legalEntityFilter.set('all');
  }
  
  getFilterForColumn(columnKey: string): FilterCriteria | undefined {
    return this.columnFilters().find(f => f.column === columnKey);
  }
  
  hasFilterForColumn(columnKey: string): boolean {
    return this.columnFilters().some(f => f.column === columnKey);
  }
  
  setLegalEntityFilter(value: 'all' | 'legal' | 'non-legal'): void {
    this.legalEntityFilter.set(value);
    
    if (value === 'all') {
      this.removeFilter('legalEntity');
    } else {
      this.addFilter({
        column: 'legalEntity',
        value: value === 'legal',
        operator: 'equals'
      });
    }
  }
}