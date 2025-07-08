import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { HierarchyNode, ColumnDefinition, GridState, HierarchyRequest } from '../../models/financial-data.interface';
import { MockDataService } from '../../services/mock-data.service';

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.scss'
})
export class DataGridComponent implements OnInit, OnDestroy {
  @Input() data = signal<HierarchyNode[]>([]);
  @Input() columns: ColumnDefinition[] = [];
  @Input() hierarchyRequest?: HierarchyRequest;
  @Output() rowClick = new EventEmitter<HierarchyNode>();
  @Output() cellClick = new EventEmitter<{row: HierarchyNode, column: ColumnDefinition}>();
  
  private mockDataService = inject(MockDataService);
  
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
    
    // Ensure we have data before processing
    if (!currentData || currentData.length === 0) {
      return [];
    }
    
    let sortedData = currentData;
    
    // Apply sorting
    if (state.sortColumn && state.sortDirection) {
      sortedData = this.sortData(sortedData, state.sortColumn, state.sortDirection);
    }
    
    // Then flatten for virtual scrolling
    return this.flattenData(sortedData, state.expandedNodeIds);
  });
  
  // Row height for virtual scrolling
  rowHeight = 40;
  
  // Default columns if none provided
  defaultColumns: ColumnDefinition[] = [
    { key: 'name', label: 'Name', sortable: true, searchable: true, width: '300px' },
    { key: 'type', label: 'Type', sortable: true, searchable: true, width: '100px' },
    { key: 'partyId', label: 'Party ID', sortable: true, searchable: true, width: '150px' },
    { key: 'legalEntity', label: 'Legal Entity', sortable: true, dataType: 'boolean', align: 'center', width: '120px' },
    { key: 'childrenCount', label: 'Children', sortable: true, dataType: 'number', align: 'right', width: '100px' }
  ];
  
  ngOnInit() {
    if (!this.columns || this.columns.length === 0) {
      this.columns = this.defaultColumns;
    }
    
    // Generate mock data if none provided
    if (this.data().length === 0 && this.hierarchyRequest) {
      const response = this.mockDataService.generateHierarchicalData(this.hierarchyRequest);
      this.data.set(response.root.children);
    }
  }
  
  toggleExpand(node: HierarchyNode, event: Event) {
    event.stopPropagation();
    
    if (!node.children || node.children.length === 0) return;
    
    const currentState = this.gridState();
    const newExpandedIds = new Set(currentState.expandedNodeIds);
    const nodeId = node.partyId || node.name;
    
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
  
  private flattenData(nodes: HierarchyNode[], expandedIds: Set<string>, result: HierarchyNode[] = []): HierarchyNode[] {
    nodes.forEach(node => {
      result.push(node);
      
      if (node.children && expandedIds.has(node.partyId || node.name)) {
        this.flattenData(node.children, expandedIds, result);
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
        return String(value);
    }
  }
  
  onRowClick(row: HierarchyNode) {
    this.rowClick.emit(row);
  }
  
  onCellClick(row: HierarchyNode, column: ColumnDefinition, event: Event) {
    event.stopPropagation();
    this.cellClick.emit({ row, column });
  }
  
  trackByRow(index: number, row: HierarchyNode): string {
    return row.partyId || row.name;
  }
  
  trackByColumn(index: number, column: ColumnDefinition): string {
    return column.key;
  }
  
  onColumnSort(column: ColumnDefinition): void {
    if (!column.sortable) return;
    
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
      children: node.children ? this.sortData(node.children, sortColumn, direction) : undefined
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
    this.resizing = false;
    this.resizeColumnIndex = null;
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  
  ngOnDestroy(): void {
    // Clean up event listeners
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}