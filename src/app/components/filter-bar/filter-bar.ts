import { Component, Output, EventEmitter, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FilterType, FilterCriteria, HierarchyConfig } from '../../models/financial-data.interface';
import { HierarchySelectorComponent } from '../hierarchy-selector/hierarchy-selector';

export interface FilterEvent {
  type: 'search' | 'filter' | 'hierarchy-config';
  value: any;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, HierarchySelectorComponent],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss'
})
export class FilterBarComponent implements OnDestroy {
  @Output() filterChange = new EventEmitter<FilterEvent>();
  
  // Filter type options
  filterTypes: FilterType[] = [
    'Asset Servicing',
    'Corporate Trust',
    'Credit Services',
    'Depository Receipts',
    'Markets',
    'Other',
    'Treasury Services'
  ];
  
  
  // Selected filter types
  selectedFilterTypes: FilterType[] = [];
  
  // Search functionality
  searchText = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  // Hierarchy configuration
  hierarchyConfig = signal<HierarchyConfig>({
    levels: [
      {
        id: 'UPM_L1_NAME',
        name: 'Service Area',
        description: 'Primary business service area',
        enabled: true,
        order: 0
      },
      {
        id: 'CLIENT_OWNER_NAME',
        name: 'Client Owner',
        description: 'Client relationship owner',
        enabled: false,
        order: 1
      }
    ],
    maxDepth: 3
  });
  
  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchText => {
      this.filterChange.emit({
        type: 'search',
        value: searchText
      });
    });
  }
  
  
  toggleFilterType(filterType: FilterType): void {
    const index = this.selectedFilterTypes.indexOf(filterType);
    if (index >= 0) {
      this.selectedFilterTypes.splice(index, 1);
    } else {
      this.selectedFilterTypes.push(filterType);
    }
    
    this.applyFilters();
  }
  
  isFilterTypeSelected(filterType: FilterType): boolean {
    return this.selectedFilterTypes.includes(filterType);
  }
  
  private applyFilters(): void {
    const filters: FilterCriteria[] = this.selectedFilterTypes.map(filterType => ({
      column: 'filters',
      value: `UPM_L1_NAME/${filterType}`,
      operator: 'contains' as const
    }));
    
    this.filterChange.emit({
      type: 'filter',
      value: filters
    });
  }
  
  onSearchChange(value: string): void {
    this.searchText = value;
    this.searchSubject.next(value);
  }
  
  clearSearch(): void {
    this.searchText = '';
    this.searchSubject.next('');
  }
  
  clearAllFilters(): void {
    this.selectedFilterTypes = [];
    this.clearSearch();
    this.applyFilters();
  }

  onHierarchyConfigChange(config: HierarchyConfig): void {
    this.hierarchyConfig.set(config);
    this.filterChange.emit({
      type: 'hierarchy-config',
      value: config
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}