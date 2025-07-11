import { Component, Output, EventEmitter, signal, OnDestroy, inject, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FilterType, FilterCriteria, HierarchyConfig, HierarchyType, HierarchyNode, ColumnDefinition } from '../../models/financial-data.interface';
import { HierarchySelectorComponent } from '../hierarchy-selector/hierarchy-selector';
import { MockDataService } from '../../services/mock-data.service';
import { HierarchyModalService } from '../../services/hierarchy-modal.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';

export interface FilterEvent {
  type: 'search' | 'filter' | 'hierarchy-config' | 'hierarchy-types-loaded';
  value: any;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, HierarchySelectorComponent, TooltipDirective],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss'
})
export class FilterBarComponent implements OnInit, OnDestroy {
  @Output() filterChange = new EventEmitter<FilterEvent>();
  @Input() data: HierarchyNode[] = [];
  @Input() columns: ColumnDefinition[] = [];
  
  private mockDataService = inject(MockDataService);
  private hierarchyModalService = inject(HierarchyModalService);
  private excelExportService = inject(ExcelExportService);
  
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
    levels: [],
    maxDepth: 3,
    hierarchyTypeCode: 'G001'
  });
  
  // Hierarchy types for display
  hierarchyTypes: HierarchyType[] = [];
  currentHierarchyType = signal<HierarchyType | null>(null);
  
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

  ngOnInit(): void {
    // Initialize hierarchy configuration from mock service
    const levels = this.mockDataService.getHierarchyLevels();
    this.hierarchyConfig.set({
      levels: levels,
      maxDepth: 3,
      hierarchyTypeCode: 'G001'
    });
    
    // Load hierarchy types for display
    this.loadHierarchyTypes();
  }
  
  private loadHierarchyTypes(): void {
    this.mockDataService.getHierarchyTypes().subscribe({
      next: (types) => {
        this.hierarchyTypes = types;
        // Set the current hierarchy type based on config
        const currentType = types.find(t => t.hierarchyTypeCode === this.hierarchyConfig().hierarchyTypeCode);
        this.currentHierarchyType.set(currentType || null);
        
        // Emit hierarchy types to parent component
        this.filterChange.emit({
          type: 'hierarchy-types-loaded',
          value: types
        });
      },
      error: (error) => {
        console.error('Failed to load hierarchy types:', error);
      }
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
    
    // Update the current hierarchy type display
    if (config.hierarchyTypeCode && this.hierarchyTypes.length > 0) {
      const currentType = this.hierarchyTypes.find(t => t.hierarchyTypeCode === config.hierarchyTypeCode);
      this.currentHierarchyType.set(currentType || null);
    }
    
    this.filterChange.emit({
      type: 'hierarchy-config',
      value: config
    });
  }

  openHierarchyConfiguration(): void {
    this.hierarchyModalService.openModal({
      config: this.hierarchyConfig(),
      title: 'Change Hierarchy Configuration',
      hierarchyTypes: this.hierarchyTypes,
      onConfigChange: (config) => {
        this.onHierarchyConfigChange(config);
      }
    });
  }

  // Export data to Excel
  exportToExcel(): void {
    if (!this.data || this.data.length === 0) {
      console.warn('No data available to export');
      return;
    }

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `hierarchy-data-${currentDate}`;

    try {
      this.excelExportService.exportToExcel(this.data, this.columns, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}