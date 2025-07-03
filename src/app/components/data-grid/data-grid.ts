import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { DataNode, ColumnDefinition, GridState } from '../../models';
import { MockDataService } from '../../services/mock-data.service';

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.scss'
})
export class DataGridComponent implements OnInit, OnDestroy {
  @Input() data = signal<DataNode[]>([]);
  @Input() columns: ColumnDefinition[] = [];
  @Output() rowClick = new EventEmitter<DataNode>();
  @Output() cellClick = new EventEmitter<{row: DataNode, column: ColumnDefinition}>();
  
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
    hierarchyMode: { type: 'bank' },
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
    { key: 'accountName', label: 'Account Name', sortable: true, searchable: true, width: '250px' },
    { key: 'salesPerson', label: 'Sales Person', sortable: true, searchable: true, width: '150px' },
    { key: 'service', label: 'Service', sortable: true, searchable: true, width: '150px' },
    { key: 'assetsUnderCustody', label: 'Assets Under Custody', sortable: true, dataType: 'currency', align: 'right', width: '180px' },
    { key: 'profitLoss', label: 'Profit/Loss', sortable: true, dataType: 'currency', align: 'right', width: '150px' }
  ];
  
  ngOnInit() {
    if (!this.columns || this.columns.length === 0) {
      this.columns = this.defaultColumns;
    }
    
    // Generate mock data if none provided
    if (this.data().length === 0) {
      const mockData = this.mockDataService.generateMockData(10000);
      this.data.set(mockData);
    }
  }
  
  toggleExpand(node: DataNode, event: Event) {
    event.stopPropagation();
    
    if (!node.children || node.children.length === 0) return;
    
    const currentState = this.gridState();
    const newExpandedIds = new Set(currentState.expandedNodeIds);
    
    if (newExpandedIds.has(node.id)) {
      newExpandedIds.delete(node.id);
    } else {
      newExpandedIds.add(node.id);
    }
    
    this.gridState.set({
      ...currentState,
      expandedNodeIds: newExpandedIds
    });
  }
  
  private flattenData(nodes: DataNode[], expandedIds: Set<string>, result: DataNode[] = []): DataNode[] {
    nodes.forEach(node => {
      result.push(node);
      
      if (node.children && expandedIds.has(node.id)) {
        this.flattenData(node.children, expandedIds, result);
      }
    });
    
    return result;
  }
  
  getCellValue(row: DataNode, column: ColumnDefinition): any {
    return (row as any)[column.key];
  }
  
  formatCellValue(value: any, column: ColumnDefinition): string {
    if (value == null) return '';
    
    switch (column.dataType) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      default:
        return String(value);
    }
  }
  
  onRowClick(row: DataNode) {
    this.rowClick.emit(row);
  }
  
  onCellClick(row: DataNode, column: ColumnDefinition, event: Event) {
    event.stopPropagation();
    this.cellClick.emit({ row, column });
  }
  
  trackByRow(index: number, row: DataNode): string {
    return row.id;
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
  
  private sortData(nodes: DataNode[], sortColumn: string, direction: 'asc' | 'desc'): DataNode[] {
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