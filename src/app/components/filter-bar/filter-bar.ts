import { Component, Output, EventEmitter, signal, OnDestroy, inject, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { FilterType, FilterCriteria, HierarchyConfig, HierarchyType, HierarchyNode, ColumnDefinition } from '../../models/financial-data.interface';
import { HierarchySelectorComponent } from '../hierarchy-selector/hierarchy-selector';
import { MockDataService } from '../../services/mock-data.service';
import { HierarchyModalService } from '../../services/hierarchy-modal.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';

export interface FilterEvent {
  type: 'filter' | 'hierarchy-config' | 'hierarchy-types-loaded' | 'child-search';
  value: any;
}

export interface ChildSearchEvent {
  type: 'start' | 'update' | 'navigate-next' | 'navigate-previous' | 'close' | 'clear';
  searchTerm?: string;
  parent?: HierarchyNode;
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
  @Output() childSearchEvent = new EventEmitter<ChildSearchEvent>();
  @Input() data: HierarchyNode[] = [];
  @Input() columns: ColumnDefinition[] = [];
  @Input() embedMode: boolean = false;
  @Input() flattenedData: HierarchyNode[] = [];
  
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
  
  // Child search state
  childSearchActive = signal<boolean>(false);
  childSearchParent = signal<HierarchyNode | null>(null);
  childSearchTerm = signal<string>('');
  childSearchResults = signal<HierarchyNode[]>([]);
  childSearchCurrentIndex = signal<number>(-1);
  private childSearchHighlightTimeout?: number;
  
  constructor() {
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
  
  // Child search methods
  startChildSearch(node: HierarchyNode): void {
    if (!this.nodeHasActualChildren(node)) return;
    
    this.childSearchParent.set(node);
    this.childSearchActive.set(true);
    this.childSearchTerm.set('');
    this.childSearchResults.set([]);
    this.childSearchCurrentIndex.set(-1);
    
    this.childSearchEvent.emit({
      type: 'start',
      parent: node
    });
    
    // Focus the search input after the view updates
    setTimeout(() => {
      const searchInput = document.querySelector('.child-search-section input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  updateChildSearchTerm(event: any): void {
    const term = event.target.value;
    this.childSearchTerm.set(term);
    
    if (term.trim() === '') {
      this.childSearchResults.set([]);
      this.childSearchCurrentIndex.set(-1);
      this.childSearchEvent.emit({ type: 'clear' });
      return;
    }
    
    this.performChildSearch(term.trim());
  }

  private performChildSearch(searchTerm: string): void {
    const parent = this.childSearchParent();
    if (!parent) return;
    
    const results = this.findChildrenMatching(parent, searchTerm);
    this.childSearchResults.set(results);
    
    if (results.length > 0) {
      this.childSearchCurrentIndex.set(0);
      this.childSearchEvent.emit({
        type: 'update',
        searchTerm: searchTerm
      });
    } else {
      this.childSearchCurrentIndex.set(-1);
    }
  }

  private findChildrenMatching(parent: HierarchyNode, searchTerm: string): HierarchyNode[] {
    const results: HierarchyNode[] = [];
    const searchLower = searchTerm.toLowerCase();
    
    const traverseChildren = (node: HierarchyNode) => {
      if (node.children) {
        node.children.forEach(child => {
          // Check if child matches search term
          const childMatches = 
            child.name.toLowerCase().includes(searchLower) ||
            (child.partyId && child.partyId.toLowerCase().includes(searchLower)) ||
            (child.type && child.type.toLowerCase().includes(searchLower));
          
          if (childMatches) {
            results.push(child);
          }
          
          // Recursively search in child's children
          traverseChildren(child);
        });
      }
    };
    
    traverseChildren(parent);
    return results;
  }

  navigateChildSearchNext(): void {
    const results = this.childSearchResults();
    const currentIndex = this.childSearchCurrentIndex();
    
    if (results.length === 0 || currentIndex >= results.length - 1) return;
    
    const nextIndex = currentIndex + 1;
    this.childSearchCurrentIndex.set(nextIndex);
    
    this.childSearchEvent.emit({ type: 'navigate-next' });
  }

  navigateChildSearchPrevious(): void {
    const results = this.childSearchResults();
    const currentIndex = this.childSearchCurrentIndex();
    
    if (results.length === 0 || currentIndex <= 0) return;
    
    const prevIndex = currentIndex - 1;
    this.childSearchCurrentIndex.set(prevIndex);
    
    this.childSearchEvent.emit({ type: 'navigate-previous' });
  }

  clearChildSearchTerm(): void {
    this.childSearchTerm.set('');
    this.childSearchResults.set([]);
    this.childSearchCurrentIndex.set(-1);
    
    this.childSearchEvent.emit({ type: 'clear' });
  }

  closeChildSearch(): void {
    this.childSearchActive.set(false);
    this.childSearchParent.set(null);
    this.childSearchTerm.set('');
    this.childSearchResults.set([]);
    this.childSearchCurrentIndex.set(-1);
    
    if (this.childSearchHighlightTimeout) {
      clearTimeout(this.childSearchHighlightTimeout);
    }
    
    this.childSearchEvent.emit({ type: 'close' });
  }

  // Get hierarchy path for the current search context (either parent or current result)
  getSearchParentHierarchyPath(): string {
    const searchResults = this.childSearchResults();
    const currentIndex = this.childSearchCurrentIndex();
    
    // If we have search results and are viewing a specific result, show its path
    if (searchResults.length > 0 && currentIndex >= 0 && currentIndex < searchResults.length) {
      const currentResult = searchResults[currentIndex];
      return this.getNodeHierarchyPath(currentResult);
    }
    
    // Otherwise show the search parent's path
    const searchParent = this.childSearchParent();
    if (!searchParent) return '';
    
    return this.getNodeHierarchyPath(searchParent);
  }
  
  // Get appropriate tooltip text based on current search state
  getHierarchyTooltipText(): string {
    const searchResults = this.childSearchResults();
    const currentIndex = this.childSearchCurrentIndex();
    
    // If we're viewing a specific search result
    if (searchResults.length > 0 && currentIndex >= 0 && currentIndex < searchResults.length) {
      const currentResult = searchResults[currentIndex];
      return `Current result location: ${this.getNodeHierarchyPath(currentResult)}`;
    }
    
    // Otherwise show search scope
    const searchParent = this.childSearchParent();
    if (searchParent) {
      return `Searching within: ${this.getNodeHierarchyPath(searchParent)}`;
    }
    
    return 'Search hierarchy location';
  }
  
  // Get hierarchy path for any specific node
  private getNodeHierarchyPath(targetNode: HierarchyNode): string {
    const flattened = this.flattenedData;
    
    // Find the target node in flattened data to get its index and level
    const targetIndex = flattened.findIndex(node => 
      (node.partyId && node.partyId === targetNode.partyId) ||
      (node.name === targetNode.name && node.type === targetNode.type)
    );
    
    if (targetIndex === -1) return targetNode.name;
    
    const targetLevel = flattened[targetIndex].level || 0;
    const path: string[] = [];
    
    // Build path by working backwards from target node
    for (let level = 0; level <= targetLevel; level++) {
      // Find the ancestor at this specific level by looking backwards from target
      for (let i = targetIndex; i >= 0; i--) {
        const node = flattened[i];
        const nodeLevel = node.level || 0;
        
        if (nodeLevel === level) {
          // Found a node at the required level
          // Check if it's an ancestor by ensuring it comes before target
          // and there's no other node at same or higher level between them
          let isAncestor = true;
          
          if (level < targetLevel) {
            // Check if there's a break in hierarchy between this node and target
            for (let j = i + 1; j < targetIndex; j++) {
              const intermediateNode = flattened[j];
              const intermediateLevel = intermediateNode.level || 0;
              
              // If we find a node at same or higher level, this breaks the ancestry
              if (intermediateLevel <= level) {
                isAncestor = false;
                break;
              }
            }
          }
          
          if (isAncestor) {
            path.push(node.name);
            break; // Found the ancestor at this level, move to next level
          }
        }
      }
    }
    
    return path.length > 0 ? path.join(' > ') : targetNode.name;
  }

  onChildSearchKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeChildSearch();
        break;
      case 'Enter':
        event.preventDefault();
        this.navigateChildSearchNext();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.navigateChildSearchNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateChildSearchPrevious();
        break;
    }
  }

  // Check if a node actually has children (not just hasChildren flag)
  private nodeHasActualChildren(node: HierarchyNode | null): boolean {
    if (!node) return false;
    return node.children != null && node.children.length > 0;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up child search timeout
    if (this.childSearchHighlightTimeout) {
      clearTimeout(this.childSearchHighlightTimeout);
    }
  }
}