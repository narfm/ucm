import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, inject, computed, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { HierarchyNode, ColumnDefinition, GridState, HierarchyRequest, HierarchyConfig, HierarchyType } from '../../models/financial-data.interface';
import { MockDataService } from '../../services/mock-data.service';
import { ProgressBarComponent } from '../progress-bar/progress-bar';
import { HierarchyModalService } from '../../services/hierarchy-modal.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';
import { ErrorHandlerService, AppError } from '../../services/error-handler.service';
import { ErrorDisplayComponent } from '../error-display/error-display';

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [CommonModule, ScrollingModule, ProgressBarComponent, FormsModule, TooltipDirective, ErrorDisplayComponent],
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.scss'
})
export class DataGridComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() data = signal<HierarchyNode[]>([]);
  @Input() columns: ColumnDefinition[] = [];
  @Input() hierarchyRequest?: HierarchyRequest;
  @Input() hierarchyTypes: HierarchyType[] = [];
  @Input() searchText = signal<string>('');
  @Input() embedMode: boolean = false;
  @Output() rowClick = new EventEmitter<HierarchyNode>();
  @Output() cellClick = new EventEmitter<{row: HierarchyNode, column: ColumnDefinition}>();
  @Output() childSearchRequest = new EventEmitter<HierarchyNode>();
  
  // ViewChild for virtual scroll viewport
  @ViewChild(CdkVirtualScrollViewport) viewportRef!: CdkVirtualScrollViewport;
  
  // Loading state
  loading = signal<boolean>(false);
  
  // Row-level loading state - tracks which rows are currently loading
  rowLoadingStates = signal<Map<string, boolean>>(new Map());
  
  // Error state
  currentError = signal<AppError | null>(null);
  hasError = signal<boolean>(false);
  
  // Child search state
  childSearchActive = signal<boolean>(false);
  childSearchParent = signal<HierarchyNode | null>(null);
  childSearchTerm = signal<string>('');
  childSearchResults = signal<HierarchyNode[]>([]);
  childSearchRecursive = signal<boolean>(false); // Default to direct children only
  childSearchCurrentIndex = signal<number>(-1);
  childSearchHighlightedNode = signal<HierarchyNode | null>(null);
  private childSearchHighlightTimeout?: number;
  
  // Scroll timeout for sticky parent updates
  private scrollTimeout?: any;
  
  // Row focus state for keyboard shortcuts
  focusedRow = signal<HierarchyNode | null>(null);
  
  // Sticky parent tracking - now supports multiple parent levels
  stickyParentNodes = signal<HierarchyNode[]>([]);
  maxStickyParentLevel = signal<number>(0);
  
  // Sorting state
  isSorting = signal<boolean>(false);
  
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
  private errorHandlerService = inject(ErrorHandlerService);
  
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
    
    // console.log('flattenedData computed - currentData:', currentData, 'length:', currentData?.length);
    
    // Ensure we have data before processing
    if (!currentData || currentData.length === 0) {
      console.log('No data available for flattening');
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
    const flattened = this.flattenData(processedData, state.expandedNodeIds);
    // console.log('Flattened data:', flattened, 'length:', flattened.length);
    return flattened;
  });
  
  // Effect to update sticky parent when data changes
  constructor() {
    effect(() => {
      const flattened = this.flattenedData();
      if (flattened.length === 0) {
        this.stickyParentNodes.set([]);
      } else if (this.viewportRef) {
        // Trigger sticky parent update when data changes
        requestAnimationFrame(() => this.updateStickyParentOnScroll());
      }
    });
  }
  
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
    { key: 'name', label: 'Name', sortable: true, searchable: true, width: '500px', minWidth: '200px' },
    { key: 'type', label: 'Type', sortable: true, searchable: true, width: '180px', minWidth: '120px' },
    { key: 'partyId', label: 'Party ID', sortable: true, searchable: true, width: '200px', minWidth: '120px' },
    { key: 'legalEntity', label: 'Legal', sortable: true, dataType: 'boolean', align: 'center', width: '100px', minWidth: '80px' },
    { key: 'hierarchyInfo', label: 'Hierarchy / Accounts', sortable: false, align: 'right', width: '220px', minWidth: '180px' }
  ];

  // Embed mode columns (reduced set with responsive widths)
  embedColumns: ColumnDefinition[] = [
    { key: 'name', label: 'Name', sortable: true, searchable: true, width: '45%', minWidth: '120px' },
    { key: 'type', label: 'Type', sortable: true, searchable: true, width: '20%', minWidth: '60px' },
    { key: 'hierarchyInfo', label: 'Hierarchy', sortable: false, align: 'right', width: '35%', minWidth: '100px' }
  ];
  
  ngOnInit() {
    if (!this.columns || this.columns.length === 0) {
      this.columns = this.embedMode ? this.embedColumns : this.defaultColumns;
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
    this.clearError();
    
    this.mockDataService.generateHierarchicalData(this.hierarchyRequest).subscribe({
      next: (response) => {
        // Include root node in the data
        const nodes = [response.root];
        // Assign parent references after data is loaded
        this.assignParentReferences(nodes);
        // Set childrenLoaded and allChildrenLoaded for each node
        this.updateNodeLoadedStates(nodes);
        
        // Update columns with metric columns if available
        if (response.metricKeys && response.metricKeys.length > 0) {
          this.updateColumnsWithMetrics(response.metricKeys);
        }
        
        this.data.set(nodes);
        
        // Ensure root node is always expanded
        const currentState = this.gridState();
        const newExpandedIds = new Set(currentState.expandedNodeIds);
        newExpandedIds.add('root'); // Root node uses its name as ID
        this.gridState.set({
          ...currentState,
          expandedNodeIds: newExpandedIds
        });
        
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.loading.set(false);
        this.handleError(error, 'Loading data');
      }
    });
  }

  reloadWithNewHierarchy(newRequest: HierarchyRequest): void {
    this.hierarchyRequest = newRequest;
    this.loadData();
  }

  private updateColumnsWithMetrics(metricKeys: string[]): void {
    // Start with base columns (default or embed mode)
    const baseColumns = this.embedMode ? this.embedColumns.slice() : this.defaultColumns.slice();
    
    // Add metric columns (limit to 1 in embed mode to maintain responsiveness)
    const limitedMetricKeys = this.embedMode ? metricKeys.slice(0, 1) : metricKeys;
    const metricColumns: ColumnDefinition[] = limitedMetricKeys.map((key, index) => ({
      key: `metrics.${key}`,
      label: key,
      sortable: true,
      dataType: 'number',
      align: 'right' as const,
      width: this.embedMode ? '25%' : '150px',
      minWidth: this.embedMode ? '60px' : '100px'
    }));
    
    // In embed mode, adjust base column widths to accommodate metrics
    if (this.embedMode && metricColumns.length > 0) {
      // Adjust widths to fit: Name (40%), Type (20%), Children (20%), Metric (20%)
      baseColumns[0].width = '40%'; // Name
      baseColumns[1].width = '20%'; // Type
      baseColumns[2].width = '20%'; // Children
    }
    
    // Update the columns array
    this.columns = [...baseColumns, ...metricColumns];
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
        // Update the node with loaded children from root
        node.children = response.root.children || [];
        
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
        this.handleError(error, `Loading children for ${node.name}`);
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
    
    // Update sticky parent after expand/collapse
    requestAnimationFrame(() => this.updateStickyParentOnScroll());
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
    // Handle metric columns (e.g., "metrics.Revenue")
    if (column.key.startsWith('metrics.')) {
      const metricKey = column.key.substring(8); // Remove "metrics." prefix
      return row.values ? row.values[metricKey] : null;
    }
    
    // Handle special hierarchyInfo column
    if (column.key === 'hierarchyInfo') {
      return this.formatHierarchyInfo(row);
    }
    
    return (row as any)[column.key];
  }
  
  private formatHierarchyInfo(row: HierarchyNode): any {
    const childrenCount = row.childrenCount || 0;
    const selfAccounts = row.selfAccountCount || 0;
    const childrenAccounts = row.childrenAccountCount || 0;
    const totalAccounts = selfAccounts + childrenAccounts;
    
    // Return an object with structured data for template rendering
    return {
      hasChildren: childrenCount > 0,
      childrenCount,
      selfAccounts,
      childrenAccounts,
      totalAccounts,
      // Calculate percentage for visual indicator
      selfAccountsPercentage: totalAccounts > 0 ? Math.round((selfAccounts / totalAccounts) * 100) : 0
    };
  }

  getIndentationPixels(level: number): number {
    // Use smaller indentation in embed mode to save space
    return level * (this.embedMode ? 12 : 20);
  }
  
  formatCellValue(value: any, column: ColumnDefinition): string {
    if (value == null) return '';
    
    // Special columns that return objects (handled in template)
    if (column.key === 'hierarchyInfo') {
      return '';
    }
    
    switch (column.dataType) {
      case 'number':
        // Special formatting for metric columns
        if (column.key.startsWith('metrics.')) {
          const metricKey = column.key.substring(8);
          
          // Format based on metric type
          if (metricKey.includes('%')) {
            return `${value.toFixed(1)}%`;
          } else if (metricKey.includes('Revenue') || metricKey.includes('Income') || metricKey.includes('Costs') || metricKey.includes('Profit') || metricKey.includes('Expense')) {
            return `$${new Intl.NumberFormat('en-US').format(value)}`;
          } else if (metricKey.includes('Count')) {
            return new Intl.NumberFormat('en-US').format(value);
          } else {
            return new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
          }
        }
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
    // Handle Ctrl+F to focus search input
    if (event.ctrlKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      // Update focused row which will be used as search parent
      this.focusedRow.set(row);
      // Request to focus the search input
      this.childSearchRequest.emit(row);
    }
  }
  
  isRowFocused(row: HierarchyNode): boolean {
    const focusedRow = this.focusedRow();
    if (!focusedRow) return false;

    if (focusedRow.partyId && row.partyId) {
      return focusedRow.partyId === row.partyId;
    }
    
    return            (focusedRow.name === row.name && focusedRow.type === row.type);
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
    if (!this.nodeHasActualChildren(node) || !node.partyId) {
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
    if (!this.nodeHasActualChildren(node) || !node.partyId) {
      this.hideContextMenu();
      return;
    }
    
    // Set up hierarchy config based on current hierarchy request
    this.buildHierarchyConfigFromRequest().subscribe(hierarchyConfig => {
      this.hierarchyModalService.openModal({
        config: hierarchyConfig,
        title: 'Change Hierarchy',
        nodeContext: { name: node.name },
        hierarchyTypes: this.hierarchyTypes,
        onConfigChange: (config) => {
          this.onNodeHierarchyConfigChange(config, node);
        }
      });
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
          targetNode.children = response.root.children || [];
          targetNode.childrenCount = targetNode.children.length;
          
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
        this.handleError(error, `Loading hierarchy for ${targetNode.name}`);
      }
    });
  }
  
  trackByRow(index: number, row: HierarchyNode): string {
    return row.partyId || row.name;
  }
  
  trackByColumn(index: number, column: ColumnDefinition): string {
    return column.key;
  }

  // Track by function for sticky parent nodes
  trackByParent(index: number, parent: HierarchyNode): string {
    return parent.partyId || parent.name;
  }

  // Calculate top position for sticky parent rows
  getStickyParentTop(index: number): number {
    const headerHeight = 36; // Grid header height
    const rowHeight = 32; // Sticky row height
    
    return headerHeight + (index * rowHeight);
  }

  // Calculate z-index for sticky parent rows (higher index = higher z-index)
  getStickyParentZIndex(index: number): number {
    return 11 + index; // Start at 11 (above header) and increase for each level
  }

  
  onColumnSort(column: ColumnDefinition): void {
    if (!column.sortable || this.resizing) return;
    
    // Set sorting state to true
    this.isSorting.set(true);
    
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
    
    // Use setTimeout to give the UI time to update and show the sorting animation
    setTimeout(() => {
      this.isSorting.set(false);
    }, 300); // 300ms delay to show the animation
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
      let aValue, bValue;

      if(sortColumn.startsWith('metrics')) {
        const metricKey = sortColumn.replace('metrics.', '')
      aValue = (a as any).values?.[metricKey] ?? 0;
      bValue = (b as any).values?.[metricKey] ?? 0;
      } else {
      aValue = (a as any)[sortColumn];
      bValue = (b as any)[sortColumn];
      }

      
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
    // Handle Ctrl+F to focus search input
    if (event.ctrlKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      const focusedRow = this.focusedRow();
      if (focusedRow) {
        this.childSearchRequest.emit(focusedRow);
      } else {
        // If no row is focused, emit with null to use root
        this.childSearchRequest.emit(null as any);
      }
    }
  }

  // Error handling methods
  private handleError(error: any, context: string): void {
    const appError = this.errorHandlerService.handleError(error, context);
    this.currentError.set(appError);
    this.hasError.set(true);
  }

  clearError(): void {
    this.currentError.set(null);
    this.hasError.set(false);
  }

  retryLastOperation(): void {
    this.clearError();
    // Retry the last operation based on current state
    if (this.data().length === 0) {
      this.loadData();
    }
  }

  // Development/testing methods
  enableErrorSimulation(enabled: boolean = true): void {
    this.mockDataService.enableErrorSimulation(enabled);
  }

  setErrorRate(rate: number): void {
    this.mockDataService.setErrorRate(rate);
  }

  simulateError(type: 'network' | 'server' | 'timeout' = 'server'): void {
    this.mockDataService.forceError(type).subscribe({
      error: (error) => this.handleError(error, 'Simulated error')
    });
  }

  ngAfterViewInit(): void {
    // Add scroll listener for sticky parent updates after view is initialized
    if (this.viewportRef) {
      // Listen to scroll events with throttling for performance
      this.viewportRef.elementScrolled().subscribe(() => {
        // Immediate update
        this.updateStickyParentOnScroll();
        
        // Debounced update for accuracy
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
          this.updateStickyParentOnScroll();
        }, 50);
      });
      
      // Also update on index change
      this.viewportRef.scrolledIndexChange.subscribe(() => {
        this.updateStickyParentOnScroll();
      });
      
      // Initial check
      setTimeout(() => this.updateStickyParentOnScroll(), 100);
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
    
    // Clean up scroll timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  // Initialize hierarchy configuration from mock service
  private initializeHierarchyConfig(): void {
    this.mockDataService.getHierarchyLevels().subscribe(levels => {
      this.nodeHierarchyConfig = {
        levels: levels,
        maxDepth: this.hierarchyRequest?.maxDepth || 3
      };
    });
  }

  // Build hierarchy config based on current request
  private buildHierarchyConfigFromRequest(): Observable<HierarchyConfig> {
    return new Observable(observer => {
      this.mockDataService.getHierarchyLevels().subscribe(allLevels => {
        if (this.hierarchyRequest?.filters) {
          // Update enabled state and order based on current filters
          const updatedLevels = allLevels.map(level => ({
            ...level,
            enabled: this.hierarchyRequest!.filters.includes(level.id),
            order: this.hierarchyRequest!.filters.indexOf(level.id) !== -1 
              ? this.hierarchyRequest!.filters.indexOf(level.id) 
              : level.order
          }));
          
          observer.next({
            levels: updatedLevels,
            maxDepth: this.hierarchyRequest.maxDepth || 3,
            hierarchyTypeCode: this.hierarchyRequest.hierarchyTypeCode || 'G001'
          });
        } else {
          observer.next({
            levels: allLevels,
            maxDepth: this.hierarchyRequest?.maxDepth || 3,
            hierarchyTypeCode: this.hierarchyRequest?.hierarchyTypeCode || 'G001'
          });
        }
        observer.complete();
      });
    });
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

  // Child search methods (now triggered externally)
  requestChildSearch(node: HierarchyNode): void {
    if (!this.nodeHasActualChildren(node)) return;
    
    this.childSearchRequest.emit(node);
    this.hideContextMenu();
  }

  fetchNodeAccounts(node: HierarchyNode) {
    if (!node.selfAccountCount || node.selfAccountCount <= 0 || !node.partyId) {
      this.hideContextMenu();
      return;
    }

    const nodePartyId = node.partyId; // TypeScript type guard
    
    // Set row loading state
    this.setRowLoading(nodePartyId, true);

    // Fetch accounts from the service
    this.mockDataService.getAccounts(nodePartyId).subscribe({
      next: (response) => {
        // Create individual account nodes
        const accountNodes: HierarchyNode[] = response.list.map(account => ({
          name: account.name,
          type: account.type,
          partyId: account.partyId,
          hasChildren: false,
          childrenCount: 0,
          level: (node.level || 0) + 2, // One level deeper since we'll have a parent folder
          parent: undefined, // Will be set when we create the parent folder
          selfAccountCount: 0,
          childrenAccountCount: 0
        }));

        // Create a parent folder for all accounts
        const accountsFolder: HierarchyNode = {
          name: `Accounts (${response.list.length})`,
          type: 'ORG', // Use ORG type for the folder
          partyId: `${nodePartyId}_ACCOUNTS_FOLDER`,
          hasChildren: true,
          childrenCount: response.list.length,
          level: (node.level || 0) + 1,
          parent: node,
          children: accountNodes,
          expanded: true, // Start expanded so accounts are visible
          selfAccountCount: 0,
          childrenAccountCount: 0,
          legalEntity: false
        };

        // Set the parent reference for all account nodes
        accountNodes.forEach(account => {
          account.parent = accountsFolder;
        });

        // Add the accounts folder as the first child of the node
        if (!node.children) {
          node.children = [];
        }
        node.children.unshift(accountsFolder); // Add as first child
        
        // Mark both the node and accounts folder as expanded
        const nodeId = nodePartyId || node.name;
        const accountsFolderId = accountsFolder.partyId!; // We know this is defined since we just set it
        const expandedIds = new Set(this.gridState().expandedNodeIds);
        expandedIds.add(nodeId);
        expandedIds.add(accountsFolderId);
        this.gridState.update(state => ({
          ...state,
          expandedNodeIds: expandedIds
        }));

        // Data will automatically refresh due to reactive computed signal
        this.setRowLoading(nodePartyId, false);
      },
      error: (error) => {
        this.setRowLoading(nodePartyId, false);
        this.handleError(error, `fetchAccounts for node ${node.name} (${nodePartyId})`);
      }
    });

    this.hideContextMenu();
  }
  
  // External interface for child search
  startChildSearch(node: HierarchyNode): void {
    // Check if node has children (either hasChildren flag or actual children array)
    if (!node.hasChildren && (!node.children || node.children.length === 0)) return;
    
    this.childSearchParent.set(node);
    this.childSearchActive.set(true);
    this.childSearchTerm.set('');
    this.childSearchResults.set([]);
    this.childSearchCurrentIndex.set(-1);
    this.childSearchHighlightedNode.set(null);
  }
  
  updateChildSearchFromExternal(searchTerm: string): void {
    this.childSearchTerm.set(searchTerm);
    this.performChildSearch(searchTerm);
  }


  private performChildSearch(searchTerm: string): void {
    const parent = this.childSearchParent();
    if (!parent) {
      return;
    }
    
    const recursive = this.childSearchRecursive();
    const results = this.findChildrenMatching(parent, searchTerm, recursive);
    this.childSearchResults.set(results);
    
    if (results.length > 0) {
      this.childSearchCurrentIndex.set(0);
      this.navigateToChildSearchResult(0);
    } else {
      this.childSearchCurrentIndex.set(-1);
      this.childSearchHighlightedNode.set(null);
    }
  }

  private findChildrenMatching(parent: HierarchyNode, searchTerm: string, recursive: boolean = true): HierarchyNode[] {
    const results: HierarchyNode[] = [];
    const searchLower = searchTerm.toLowerCase();
    
    const traverseChildren = (node: HierarchyNode, depth: number = 0) => {
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
          
          // Only recurse if recursive mode is enabled
          if (recursive && child.children) {
            traverseChildren(child, depth + 1);
          }
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
      // Calculate all sticky elements that block the view
      const stickyParentCount = this.stickyParentNodes().length;
      const childSearchHeight = this.childSearchActive() ? 52 : 0; // Child search bar height
      const stickyRowHeight = 32; // Height of each sticky row
      const gridHeaderHeight = 36; // Grid header height
      
      // Total height that blocks the view at the top
      const totalBlockingHeight = gridHeaderHeight + (stickyParentCount * stickyRowHeight) + childSearchHeight;
      
      // Add extra padding to ensure the row is clearly visible
      const extraPadding = 8;
      const totalOffsetHeight = totalBlockingHeight + extraPadding;
      
      // Calculate target scroll position in pixels
      const targetPixelPosition = targetIndex * this.rowHeight;
      const desiredScrollTop = Math.max(0, targetPixelPosition - totalOffsetHeight);
      
      // Use pixel-based scrolling for more precise positioning
      this.viewportRef.scrollToOffset(desiredScrollTop);
      
      // Double-check positioning after a brief delay
      setTimeout(() => {
        const currentScrollTop = this.viewportRef.measureScrollOffset('top');
        const visibleTop = currentScrollTop + totalOffsetHeight;
        const targetTop = targetIndex * this.rowHeight;
        
        // If the target is still not visible, adjust
        if (targetTop < visibleTop) {
          const correctedScrollTop = Math.max(0, targetTop - totalOffsetHeight);
          this.viewportRef.scrollToOffset(correctedScrollTop);
        }
      }, 100); // Slightly longer delay for more reliable positioning
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

  setChildSearchRecursive(recursive: boolean): void {
    this.childSearchRecursive.set(recursive);
    // Re-run search with new mode if search is active
    if (this.childSearchActive() && this.childSearchTerm()) {
      this.performChildSearch(this.childSearchTerm());
    }
  }

  
  // Get hierarchy path for any specific node
  private getNodeHierarchyPath(targetNode: HierarchyNode): string {
    const flattened = this.flattenedData();
    
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
  
  
  // Update sticky parent on scroll - now builds full parent chain
  private updateStickyParentOnScroll(): void {
    if (!this.viewportRef) return;
    
    const scrollTop = this.viewportRef.measureScrollOffset('top');
    const flattened = this.flattenedData();
    
    if (flattened.length === 0) {
      this.stickyParentNodes.set([]);
      this.maxStickyParentLevel.set(0);
      return;
    }
    
    // Calculate which item index is at the top of the viewport
    const topIndex = Math.floor(scrollTop / this.rowHeight);
    
    // If we're at the very top, no sticky parent needed
    if (topIndex <= 0) {
      this.stickyParentNodes.set([]);
      this.maxStickyParentLevel.set(0);
      return;
    }
    
    // Build the full parent chain for sticky display
    const stickyParentChain: HierarchyNode[] = [];
    let checkIndex = Math.min(topIndex, flattened.length - 1);
    
    // Start from the top visible item and work backwards to find all parents
    for (let i = checkIndex; i >= 0; i--) {
      const node = flattened[i];
      if (!node) continue;
      
      // If this is a parent node (has children and is expanded)
      if (node.hasChildren && node.children && node.children.length > 0) {
        const nodeId = node.partyId || node.name;
        const isExpanded = this.gridState().expandedNodeIds.has(nodeId);
        
        if (isExpanded) {
          // Check if any of its children are visible
          const hasVisibleChildren = this.checkChildrenVisible(node, flattened, topIndex);
          
          if (hasVisibleChildren && i < topIndex) {
            // Add this parent to the chain if it's not already there
            const alreadyInChain = stickyParentChain.some(parent => 
              (parent.partyId || parent.name) === nodeId
            );
            
            if (!alreadyInChain) {
              stickyParentChain.push(node);
            }
          }
        }
      }
    }
    
    // Sort the parent chain by level (lowest level first - root to deepest)
    stickyParentChain.sort((a, b) => (a.level || 0) - (b.level || 0));
    
    // Set the sticky parent chain
    this.stickyParentNodes.set(stickyParentChain);
    this.maxStickyParentLevel.set(stickyParentChain.length > 0 ? 
      Math.max(...stickyParentChain.map(node => node.level || 0)) : 0);
  }
  
  // Check if a node's children are visible
  private checkChildrenVisible(parent: HierarchyNode, flattened: HierarchyNode[], topIndex: number): boolean {
    const parentId = parent.partyId || parent.name;
    const parentLevel = parent.level || 0;
    
    // Look ahead from the top index to see if any children are visible
    for (let i = topIndex; i < flattened.length && i < topIndex + 20; i++) {
      const node = flattened[i];
      if (!node) continue;
      
      // If we hit a node at the same level or higher, we're done checking
      if ((node.level || 0) <= parentLevel) {
        break;
      }
      
      // Check if this node is a descendant of the parent
      let current = node;
      while (current.parent) {
        if ((current.parent.partyId || current.parent.name) === parentId) {
          return true;
        }
        current = current.parent;
      }
    }
    
    return false;
  }
  
  
  // Check if the current node is one of the sticky parents
  isStickyParentNode(node: HierarchyNode): boolean {
    const stickyParents = this.stickyParentNodes();
    if (stickyParents.length === 0) return false;
    
    return stickyParents.some(stickyParent => 
      (stickyParent.partyId && stickyParent.partyId === node.partyId) ||
      (stickyParent.name === node.name && stickyParent.type === node.type)
    );
  }

  // Check if a node actually has children (not just hasChildren flag)
  nodeHasActualChildren(node: HierarchyNode | null): boolean {
    if (!node) return false;
    return node.children != null && node.children.length > 0;
  }

}