import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { HierarchyNode, ColumnDefinition, GridState, HierarchyRequest, HierarchyConfig, HierarchyType } from '../../models/financial-data.interface';
import { MockDataService } from '../../services/mock-data.service';
import { ProgressBarComponent } from '../progress-bar/progress-bar';
import { HierarchyModalService } from '../../services/hierarchy-modal.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [CommonModule, ScrollingModule, ProgressBarComponent, FormsModule, TooltipDirective],
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.scss'
})
export class DataGridComponent implements OnInit, OnDestroy {
  @Input() data = signal<HierarchyNode[]>([]);
  @Input() columns: ColumnDefinition[] = [];
  @Input() hierarchyRequest?: HierarchyRequest;
  @Input() hierarchyTypes: HierarchyType[] = [];
  @Input() searchText = signal<string>('');
  @Output() rowClick = new EventEmitter<HierarchyNode>();
  @Output() cellClick = new EventEmitter<{row: HierarchyNode, column: ColumnDefinition}>();
  
  // ViewChild for virtual scroll viewport
  @ViewChild(CdkVirtualScrollViewport) viewportRef!: CdkVirtualScrollViewport;
  
  // Loading state
  loading = signal<boolean>(false);
  
  // Row-level loading state - tracks which rows are currently loading
  rowLoadingStates = signal<Map<string, boolean>>(new Map());
  
  // Child search state
  childSearchActive = signal<boolean>(false);
  childSearchParent = signal<HierarchyNode | null>(null);
  childSearchTerm = signal<string>('');
  childSearchResults = signal<HierarchyNode[]>([]);
  childSearchCurrentIndex = signal<number>(-1);
  childSearchHighlightedNode = signal<HierarchyNode | null>(null);
  private childSearchHighlightTimeout?: number;
  
  // Row focus state for keyboard shortcuts
  focusedRow = signal<HierarchyNode | null>(null);
  
  // Context menu properties
  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuNode: HierarchyNode | null = null;
  
  // Node hierarchy selector properties
  showNodeHierarchySelector = false;
  nodeForHierarchyChange: HierarchyNode | null = null;
  nodeHierarchyConfig: HierarchyConfig = {
    levels: [],
    maxDepth: 3
  };
  
  private mockDataService = inject(MockDataService);
  private hierarchyModalService = inject(HierarchyModalService);
  
  // Resize properties
  resizing = false;
  private resizeColumnIndex: number | null = null;
  private startX = 0;
  private startWidth = 0;
  private minColumnWidth = 50;
  
  // Grid state
  gridState = signal<GridState>({
    filters: [],
    expandedNodeIds: new Set<string>()
  });
  
  // Sorted and flattened data for virtual scrolling
  flattenedData = computed(() => {
    const state = this.gridState();
    const currentData = this.data();
    const searchTerm = this.searchText();
    
    // Ensure we have data before processing
    if (!currentData || currentData.length === 0) {
      return [];
    }
    
    let processedData = currentData;
    
    // Apply search filtering first
    if (searchTerm && searchTerm.trim() !== '') {
      processedData = this.filterBySearch(processedData, searchTerm.trim());
    }
    
    // Apply sorting
    if (state.sortColumn && state.sortDirection) {
      processedData = this.sortData(processedData, state.sortColumn, state.sortDirection);
    }
    
    // Then flatten for virtual scrolling
    return this.flattenData(processedData, state.expandedNodeIds);
  });
  
  // Row height for virtual scrolling
  rowHeight = 32;
  
  // Helper methods for row loading states
  private setRowLoading(nodeId: string, loading: boolean) {
    const currentStates = new Map(this.rowLoadingStates());
    if (loading) {
      currentStates.set(nodeId, true);
    } else {
      currentStates.delete(nodeId);
    }
    this.rowLoadingStates.set(currentStates);
  }
  
  isRowLoading(nodeId: string): boolean {
    return this.rowLoadingStates().has(nodeId);
  }
  
  // Default columns if none provided
  defaultColumns: ColumnDefinition[] = [
    { key: 'name', label: 'Name', sortable: true, searchable: true, width: '250px', minWidth: '200px' },
    { key: 'type', label: 'Type', sortable: true, searchable: true, width: '120px', minWidth: '120px' },
    { key: 'partyId', label: 'Party ID', sortable: true, searchable: true, width: '120px', minWidth: '120px' },
    { key: 'legalEntity', label: 'Legal', sortable: true, dataType: 'boolean', align: 'center', width: '120px', minWidth: '120px' },
    { key: 'childrenCount', label: 'Children', sortable: true, dataType: 'number', align: 'right', width: '120px', minWidth: '120px' }
  ];
  
  ngOnInit() {
    if (!this.columns || this.columns.length === 0) {
      this.columns = this.defaultColumns;
    }
    
    // Initialize hierarchy configuration from mock service
    this.initializeHierarchyConfig();
    
    // Generate mock data if none provided
    if (this.data().length === 0 && this.hierarchyRequest) {
      this.loadData();
    }
    
    // Add document click listener to close context menu
    document.addEventListener('click', this.onDocumentClick);
    
    // Add global keydown listener for keyboard shortcuts
    document.addEventListener('keydown', this.onGlobalKeydown);
  }

  loadData(): void {
    if (!this.hierarchyRequest) return;
    
    this.loading.set(true);
    this.mockDataService.generateHierarchicalData(this.hierarchyRequest).subscribe({
      next: (response) => {
        const nodes = response.root.children || [];
        // Assign parent references after data is loaded
        this.assignParentReferences(nodes);
        // Set childrenLoaded and allChildrenLoaded for each node
        this.updateNodeLoadedStates(nodes);
        this.data.set(nodes);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.loading.set(false);
      }
    });
  }

  reloadWithNewHierarchy(newRequest: HierarchyRequest): void {
    this.hierarchyRequest = newRequest;
    this.loadData();
  }
  
  private loadNodeChildren(node: HierarchyNode): void {
    if (!this.hierarchyRequest || !node.partyId) return;
    
    // Set row loading state instead of global loading
    if (node.partyId) {
      this.setRowLoading(node.partyId, true);
    }
    
    const childRequest: HierarchyRequest = {
      ...this.hierarchyRequest,
      rootPartyId: node.partyId,
      maxDepth: this.hierarchyRequest.maxDepth,
      filters: node.parent?.filters || []
    };
    
    this.mockDataService.generateHierarchicalData(childRequest).subscribe({
      next: (response) => {
        // Update the node with loaded children
        node.children = response.root.children;
        
        // Assign parent references for the newly loaded children
        if (node.children) {
          this.assignParentReferences(node.children, node);
        }
        
        // Update loaded states for the children
        if (node.children) {
          this.updateNodeLoadedStates(node.children);
        }
        
        // Update the node's loaded states based on hasChildren and children array
        this.updateSingleNodeLoadedState(node);
        
        // Update the main data signal to trigger re-render
        this.updateNodeInData(node);
        
        // Automatically expand the node after loading
        const currentState = this.gridState();
        const newExpandedIds = new Set(currentState.expandedNodeIds);
        const nodeId = node.partyId || node.name;
        newExpandedIds.add(nodeId);
        
        this.gridState.set({
          ...currentState,
          expandedNodeIds: newExpandedIds
        });
        
        // Clear row loading state
        if (node.partyId) {
          this.setRowLoading(node.partyId, false);
        }
      },
      error: (error) => {
        console.error('Error loading node children:', error);
        // Clear row loading state on error
        if (node.partyId) {
          this.setRowLoading(node.partyId, false);
        }
      }
    });
  }
  
  private updateNodeInData(updatedNode: HierarchyNode): void {
    const currentData = this.data();
    const newData = this.updateNodeRecursively(currentData, updatedNode);
    this.data.set([...newData]);
  }
  
  private updateNodeRecursively(nodes: HierarchyNode[], updatedNode: HierarchyNode): HierarchyNode[] {
    return nodes.map(node => {
      if (node.partyId === updatedNode.partyId) {
        return updatedNode;
      }
      if (node.children) {
        return {
          ...node,
          children: this.updateNodeRecursively(node.children, updatedNode)
        };
      }
      return node;
    });
  }
  
  toggleExpand(node: HierarchyNode, event: Event) {
    event.stopPropagation();
    
    const currentState = this.gridState();
    const newExpandedIds = new Set(currentState.expandedNodeIds);
    const nodeId = node.partyId || node.name;
    
    // Check if we need to load children
    const needsLoading = this.nodeNeedsChildrenLoading(node);
    
    // If node has children but they're not loaded, load them first
    if (needsLoading && node.partyId) {
      this.loadNodeChildren(node);
      return;
    }
    
    // Regular expand/collapse logic
    if (!node.children || node.children.length === 0) return;
    
    if (newExpandedIds.has(nodeId)) {
      newExpandedIds.delete(nodeId);
    } else {
      newExpandedIds.add(nodeId);
    }
    
    this.gridState.set({
      ...currentState,
      expandedNodeIds: newExpandedIds
    });
  }
  
  private flattenData(nodes: HierarchyNode[], expandedIds: Set<string>, result: HierarchyNode[] = [], level: number = 0): HierarchyNode[] {
    nodes.forEach(node => {
      // Create a copy with the calculated level
      const nodeWithLevel = { ...node, level };
      result.push(nodeWithLevel);
      
      if (node.children && expandedIds.has(node.partyId || node.name)) {
        this.flattenData(node.children, expandedIds, result, level + 1);
      }
    });
    
    return result;
  }
  
  getCellValue(row: HierarchyNode, column: ColumnDefinition): any {
    return (row as any)[column.key];
  }
  
  formatCellValue(value: any, column: ColumnDefinition): string {
    if (value == null) return '';
    
    switch (column.dataType) {
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        const stringValue = String(value);
        // Hide type column value for FILTER rows
        if (column.key === 'type' && (stringValue === 'FILTER' || stringValue.startsWith('FILTER/'))) {
          return '';
        }
        return stringValue;
    }
  }
  
  onRowClick(row: HierarchyNode) {
    this.focusedRow.set(row);
    this.rowClick.emit(row);
  }
  
  onRowFocus(row: HierarchyNode) {
    this.focusedRow.set(row);
  }
  
  onRowKeydown(row: HierarchyNode, event: KeyboardEvent) {
    // Handle Ctrl+F for child search
    if (event.ctrlKey && event.key.toLowerCase() === 'f') {
      if (row.hasChildren && !this.childSearchActive()) {
        event.preventDefault();
        this.startChildSearch(row);
      }
    }
  }
  
  isRowFocused(row: HierarchyNode): boolean {
    const focusedRow = this.focusedRow();
    if (!focusedRow) return false;
    
    return (focusedRow.partyId && focusedRow.partyId === row.partyId) ||
           (focusedRow.name === row.name && focusedRow.type === row.type);
  }
  
  onCellClick(row: HierarchyNode, column: ColumnDefinition, event: Event) {
    event.stopPropagation();
    this.cellClick.emit({ row, column });
  }
  
  onRowContextMenu(row: HierarchyNode, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    this.contextMenuNode = row;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuVisible = true;
  }
  
  hideContextMenu() {
    this.contextMenuVisible = false;
    this.contextMenuNode = null;
  }
  
  refreshNodeChildren(node: HierarchyNode) {
    if (!node.hasChildren || !node.partyId) {
      this.hideContextMenu();
      return;
    }
    
    // Start row loading for this node
    if (node.partyId) {
      this.setRowLoading(node.partyId, true);
    }
    
    // Reset the node's children state
    node.children = [];
    
    // Update the node's loaded states
    this.updateSingleNodeLoadedState(node);
    
    // Update the data to reflect the change
    this.updateNodeInData(node);
    
    // Load the children
    this.loadNodeChildren(node);
    
    this.hideContextMenu();
  }
  
  changeNodeHierarchy(node: HierarchyNode) {
    if (!node.hasChildren || !node.partyId) {
      this.hideContextMenu();
      return;
    }
    
    // Set up hierarchy config based on current hierarchy request
    let hierarchyConfig: HierarchyConfig = this.buildHierarchyConfigFromRequest();
    
    this.hierarchyModalService.openModal({
      config: hierarchyConfig,
      title: 'Change Hierarchy',
      nodeContext: { name: node.name },
      hierarchyTypes: this.hierarchyTypes,
      onConfigChange: (config) => {
        this.onNodeHierarchyConfigChange(config, node);
      }
    });
    
    this.hideContextMenu();
  }
  
  closeNodeHierarchySelector() {
    this.showNodeHierarchySelector = false;
    this.nodeForHierarchyChange = null;
  }
  
  onNodeHierarchyConfigChange(config: HierarchyConfig, node?: HierarchyNode) {
    const targetNode = node || this.nodeForHierarchyChange;
    if (!targetNode || !targetNode.partyId) {
      this.closeNodeHierarchySelector();
      return;
    }
    
    const enabledLevels = config.levels
      .filter(level => level.enabled)
      .sort((a, b) => a.order - b.order);
    
    const newFilters = enabledLevels.map(level => level.id);
    
    if (newFilters.length === 0) {
      alert('Please select at least one hierarchy level');
      return;
    }
    
    // Create new hierarchy request for this node
    const nodeHierarchyRequest: HierarchyRequest = {
      filters: newFilters,
      hierarchyTypeCode: this.hierarchyRequest?.hierarchyTypeCode || 'G001',
      maxDepth: config.maxDepth,
      rootPartyId: targetNode.partyId
    };
    
    // Load new hierarchy data for this node
    if (targetNode.partyId) {
      this.setRowLoading(targetNode.partyId, true);
    }
    this.mockDataService.generateHierarchicalData(nodeHierarchyRequest).subscribe({
      next: (response) => {
        if (targetNode) {
          // Update the node with new children
          targetNode.children = response.root.children;
          targetNode.childrenCount = response.root.children?.length || 0;
          
          // Assign parent references for the newly loaded children
          if (targetNode.children) {
            this.assignParentReferences(targetNode.children, targetNode);
          }
          
          // Update loaded states for the children
          if (targetNode.children) {
            this.updateNodeLoadedStates(targetNode.children);
          }
          
          // Update the node's loaded states
          this.updateSingleNodeLoadedState(targetNode);
          
          // Update the main data signal to trigger re-render
          this.updateNodeInData(targetNode);
          
          // Expand the node to show new children
          const currentState = this.gridState();
          const newExpandedIds = new Set(currentState.expandedNodeIds);
          newExpandedIds.add(targetNode.partyId!);
          
          this.gridState.set({
            ...currentState,
            expandedNodeIds: newExpandedIds
          });
        }
        
        // Clear row loading state
        if (targetNode.partyId) {
          this.setRowLoading(targetNode.partyId, false);
        }
        this.closeNodeHierarchySelector();
      },
      error: (error) => {
        console.error('Error loading node hierarchy:', error);
        // Clear row loading state on error
        if (targetNode.partyId) {
          this.setRowLoading(targetNode.partyId, false);
        }
        alert('Failed to load new hierarchy. Please try again.');
      }
    });
  }
  
  trackByRow(index: number, row: HierarchyNode): string {
    return row.partyId || row.name;
  }
  
  trackByColumn(index: number, column: ColumnDefinition): string {
    return column.key;
  }
  
  onColumnSort(column: ColumnDefinition): void {
    if (!column.sortable || this.resizing) return;
    
    const currentState = this.gridState();
    let newSortDirection: 'asc' | 'desc' | undefined = 'asc';
    
    if (currentState.sortColumn === column.key) {
      if (currentState.sortDirection === 'asc') {
        newSortDirection = 'desc';
      } else if (currentState.sortDirection === 'desc') {
        newSortDirection = undefined;
      }
    }
    
    this.gridState.set({
      ...currentState,
      sortColumn: newSortDirection ? column.key : undefined,
      sortDirection: newSortDirection
    });
  }
  
  private filterBySearch(nodes: HierarchyNode[], searchText: string): HierarchyNode[] {
    const searchLower = searchText.toLowerCase();
    return this.filterNodesRecursively(nodes, searchLower);
  }
  
  private filterNodesRecursively(nodes: HierarchyNode[], searchText: string): HierarchyNode[] {
    const results: HierarchyNode[] = [];
    
    nodes.forEach(node => {
      const nodeMatches = 
        node.name.toLowerCase().includes(searchText) ||
        (node.partyId && node.partyId.toLowerCase().includes(searchText)) ||
        (node.type && node.type.toLowerCase().includes(searchText));
      
      const filteredChildren = node.children ? this.filterNodesRecursively(node.children, searchText) : [];
      
      if (nodeMatches || filteredChildren.length > 0) {
        const clonedNode = { ...node, children: filteredChildren };
        results.push(clonedNode);
      }
    });
    
    return results;
  }

  private sortData(nodes: HierarchyNode[], sortColumn: string, direction: 'asc' | 'desc'): HierarchyNode[] {
    const sortedNodes = [...nodes].sort((a, b) => {
      const aValue = (a as any)[sortColumn];
      const bValue = (b as any)[sortColumn];
      
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === 'asc' ? 1 : -1;
      if (bValue == null) return direction === 'asc' ? -1 : 1;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (aStr < bStr) return direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    // Also sort children recursively
    return sortedNodes.map(node => ({
      ...node,
      children: node.children ? this.sortData(node.children, sortColumn, direction) : node.children
    }));
  }
  
  // Column resize methods
  onResizeStart(event: MouseEvent, columnIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.resizing = true;
    this.resizeColumnIndex = columnIndex;
    this.startX = event.pageX;
    
    const column = this.columns[columnIndex];
    const currentWidth = column.width ? parseInt(column.width) : 150;
    this.startWidth = currentWidth;
    
    // Add mouse event listeners
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }
  
  private onMouseMove = (event: MouseEvent): void => {
    if (!this.resizing || this.resizeColumnIndex === null) return;
    
    const diff = event.pageX - this.startX;
    const newWidth = Math.max(this.minColumnWidth, this.startWidth + diff);
    
    // Update column width
    this.columns[this.resizeColumnIndex].width = `${newWidth}px`;
  };
  
  private onMouseUp = (): void => {
    // Remove event listeners
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Delay resetting the flag to prevent click events from firing immediately
    setTimeout(() => {
      this.resizing = false;
      this.resizeColumnIndex = null;
    }, 50);
  };
  
  private onDocumentClick = (event: Event): void => {
    // Close context menu when clicking outside
    this.hideContextMenu();
  }

  private onGlobalKeydown = (event: KeyboardEvent): void => {
    // Handle Ctrl+F for child search
    if (event.ctrlKey && event.key.toLowerCase() === 'f') {
      const focusedRow = this.focusedRow();
      if (focusedRow && focusedRow.hasChildren && !this.childSearchActive()) {
        event.preventDefault();
        this.startChildSearch(focusedRow);
      }
    }
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('click', this.onDocumentClick);
    document.removeEventListener('keydown', this.onGlobalKeydown);
    
    // Clean up child search timeout
    if (this.childSearchHighlightTimeout) {
      clearTimeout(this.childSearchHighlightTimeout);
    }
  }

  // Initialize hierarchy configuration from mock service
  private initializeHierarchyConfig(): void {
    const levels = this.mockDataService.getHierarchyLevels();
    this.nodeHierarchyConfig = {
      levels: levels,
      maxDepth: this.hierarchyRequest?.maxDepth || 3
    };
  }

  // Build hierarchy config based on current request
  private buildHierarchyConfigFromRequest(): HierarchyConfig {
    const allLevels = this.mockDataService.getHierarchyLevels();
    
    if (this.hierarchyRequest?.filters) {
      // Update enabled state and order based on current filters
      const updatedLevels = allLevels.map(level => ({
        ...level,
        enabled: this.hierarchyRequest!.filters.includes(level.id),
        order: this.hierarchyRequest!.filters.indexOf(level.id) !== -1 
          ? this.hierarchyRequest!.filters.indexOf(level.id) 
          : level.order
      }));
      
      return {
        levels: updatedLevels,
        maxDepth: this.hierarchyRequest.maxDepth || 3
      };
    }
    
    return {
      levels: allLevels,
      maxDepth: this.hierarchyRequest?.maxDepth || 3
    };
  }

  // Helper method to assign parent references
  private assignParentReferences(nodes: HierarchyNode[], parent?: HierarchyNode): void {
    nodes.forEach(node => {
      if (parent) {
        node.parent = parent;
      }
      if (node.children && node.children.length > 0) {
        this.assignParentReferences(node.children, node);
      }
    });
  }

  // Helper methods for managing childrenLoaded and allChildrenLoaded states
  private updateNodeLoadedStates(nodes: HierarchyNode[]): void {
    nodes.forEach(node => {
      this.updateSingleNodeLoadedState(node);
      if (node.children && node.children.length > 0) {
        this.updateNodeLoadedStates(node.children);
      }
    });
  }

  private updateSingleNodeLoadedState(node: HierarchyNode): void {
    // If node doesn't have children (hasChildren is false), then all children are loaded
    if (!node.hasChildren) {
      node.childrenLoaded = true;
      node.allChildrenLoaded = true;
      return;
    }

    // If node has children (hasChildren is true)
    if (node.children && node.children.length > 0) {
      // Children array exists and has elements - children are loaded
      node.childrenLoaded = true;
      // Since we load all children at once in our implementation, allChildrenLoaded is also true
      node.allChildrenLoaded = true;
    } else {
      // Children array is empty or undefined - children are not loaded yet
      node.childrenLoaded = false;
      node.allChildrenLoaded = false;
    }
  }

  private nodeNeedsChildrenLoading(node: HierarchyNode): boolean {
    // Node needs loading if:
    // 1. It has children (hasChildren is true)
    // 2. But children are not loaded (childrenLoaded is false or children array is empty)
    return node.hasChildren === true && 
           (!node.childrenLoaded || !node.children || node.children.length === 0);
  }

  // Child search methods
  startChildSearch(node: HierarchyNode): void {
    if (!node.hasChildren) return;
    
    this.childSearchParent.set(node);
    this.childSearchActive.set(true);
    this.childSearchTerm.set('');
    this.childSearchResults.set([]);
    this.childSearchCurrentIndex.set(-1);
    this.childSearchHighlightedNode.set(null);
    
    this.hideContextMenu();
    
    // Focus the search input after the view updates
    setTimeout(() => {
      const searchInput = document.querySelector('.child-search-bar input') as HTMLInputElement;
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
      this.childSearchHighlightedNode.set(null);
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
      this.navigateToChildSearchResult(0);
    } else {
      this.childSearchCurrentIndex.set(-1);
      this.childSearchHighlightedNode.set(null);
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
    this.navigateToChildSearchResult(nextIndex);
  }

  navigateChildSearchPrevious(): void {
    const results = this.childSearchResults();
    const currentIndex = this.childSearchCurrentIndex();
    
    if (results.length === 0 || currentIndex <= 0) return;
    
    const prevIndex = currentIndex - 1;
    this.childSearchCurrentIndex.set(prevIndex);
    this.navigateToChildSearchResult(prevIndex);
  }

  private navigateToChildSearchResult(index: number): void {
    const results = this.childSearchResults();
    if (index < 0 || index >= results.length) return;
    
    const targetNode = results[index];
    
    // First, expand the path to the target node
    this.expandPathToNode(targetNode);
    
    // Wait for the DOM to update, then scroll to the node
    setTimeout(() => {
      this.scrollToNode(targetNode);
      this.highlightNode(targetNode);
    }, 100);
  }

  private expandPathToNode(targetNode: HierarchyNode): void {
    const pathToExpand: string[] = [];
    
    // Find the path from root to target node
    const findPath = (nodes: HierarchyNode[], target: HierarchyNode, path: string[] = []): boolean => {
      for (const node of nodes) {
        const nodeId = node.partyId || node.name;
        const currentPath = [...path, nodeId];
        
        if (node === target) {
          pathToExpand.push(...path); // Don't include the target node itself
          return true;
        }
        
        if (node.children && findPath(node.children, target, currentPath)) {
          return true;
        }
      }
      return false;
    };
    
    findPath(this.data(), targetNode);
    
    // Expand all nodes in the path
    const currentState = this.gridState();
    const newExpandedIds = new Set(currentState.expandedNodeIds);
    
    pathToExpand.forEach(nodeId => {
      newExpandedIds.add(nodeId);
    });
    
    this.gridState.set({
      ...currentState,
      expandedNodeIds: newExpandedIds
    });
  }

  private scrollToNode(targetNode: HierarchyNode): void {
    const flattened = this.flattenedData();
    const targetIndex = flattened.findIndex(node => 
      (node.partyId && node.partyId === targetNode.partyId) ||
      (node.name === targetNode.name && node.type === targetNode.type)
    );
    
    if (targetIndex >= 0 && this.viewportRef) {
      this.viewportRef.scrollToIndex(targetIndex);
    }
  }

  private highlightNode(node: HierarchyNode): void {
    // Clear previous highlight timeout
    if (this.childSearchHighlightTimeout) {
      clearTimeout(this.childSearchHighlightTimeout);
    }
    
    // Set the highlighted node
    this.childSearchHighlightedNode.set(node);
    
    // Remove highlight after 2 seconds
    this.childSearchHighlightTimeout = setTimeout(() => {
      this.childSearchHighlightedNode.set(null);
    }, 2000);
  }

  clearChildSearchTerm(): void {
    this.childSearchTerm.set('');
    this.childSearchResults.set([]);
    this.childSearchCurrentIndex.set(-1);
    this.childSearchHighlightedNode.set(null);
  }

  closeChildSearch(): void {
    this.childSearchActive.set(false);
    this.childSearchParent.set(null);
    this.childSearchTerm.set('');
    this.childSearchResults.set([]);
    this.childSearchCurrentIndex.set(-1);
    this.childSearchHighlightedNode.set(null);
    
    if (this.childSearchHighlightTimeout) {
      clearTimeout(this.childSearchHighlightTimeout);
    }
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

  isChildSearchResultHighlighted(node: HierarchyNode): boolean {
    const results = this.childSearchResults();
    return results.some(result => 
      (result.partyId && result.partyId === node.partyId) ||
      (result.name === node.name && result.type === node.type)
    );
  }

  isCurrentChildSearchResult(node: HierarchyNode): boolean {
    const highlightedNode = this.childSearchHighlightedNode();
    if (!highlightedNode) return false;
    
    return (highlightedNode.partyId && highlightedNode.partyId === node.partyId) ||
           (highlightedNode.name === node.name && highlightedNode.type === node.type);
  }
}