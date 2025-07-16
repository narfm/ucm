import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataGridComponent } from '../data-grid/data-grid';
import { FilterBarComponent, FilterEvent, ChildSearchEvent } from '../filter-bar/filter-bar';
import { HierarchyNode, HierarchyRequest, HierarchyConfig, HierarchyType } from '../../models/financial-data.interface';
import { EmbedModeService } from '../../services/embed-mode.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DataGridComponent, FilterBarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  
  @ViewChild('dataGrid') dataGrid!: DataGridComponent;
  @ViewChild('filterBar') filterBar!: FilterBarComponent;
  
  hierarchyTypes: HierarchyType[] = [];
  
  // Embed mode service
  protected embedModeService = inject(EmbedModeService);
  
  // Default hierarchy request
  hierarchyRequest: HierarchyRequest = {
    filters: ['UPM_L1_NAME'],
    hierarchyTypeCode: 'G001',
    maxDepth: 3
  };
  
  ngOnInit() {
    // Data grid will load its own data
  }
  
  onFilterChange(event: FilterEvent): void {
    switch (event.type) {
      case 'filter':
        // Column filters not implemented yet
        break;
      case 'hierarchy-config':
        // Update hierarchy configuration and reload data
        const config = event.value as HierarchyConfig;
        const enabledLevels = config.levels
          .filter(level => level.enabled)
          .sort((a, b) => a.order - b.order);
        
        this.hierarchyRequest.filters = enabledLevels.map(level => level.id);
        this.hierarchyRequest.maxDepth = config.maxDepth;
        
        // Update hierarchy type code if provided
        if (config.hierarchyTypeCode) {
          this.hierarchyRequest.hierarchyTypeCode = config.hierarchyTypeCode;
        }
        
        if (this.dataGrid) {
          this.dataGrid.reloadWithNewHierarchy(this.hierarchyRequest);
        }
        break;
      case 'hierarchy-types-loaded':
        // Store hierarchy types for use in data grid
        this.hierarchyTypes = event.value as HierarchyType[];
        break;
    }
  }
  
  
  onRowClick(node: HierarchyNode): void {
    console.log('Row clicked:', node);
  }
  
  onCellClick(event: {row: HierarchyNode, column: any}): void {
    console.log('Cell clicked:', event);
  }
  
  onChildSearchEvent(event: ChildSearchEvent): void {
    if (!this.dataGrid) return;
    
    switch (event.type) {
      case 'start':
        if (event.parent) {
          this.dataGrid.startChildSearch(event.parent);
        }
        break;
      case 'update':
        if (event.searchTerm) {
          // Update search in data grid
          this.dataGrid.updateChildSearchFromExternal(event.searchTerm);
        }
        break;
      case 'navigate-next':
        this.dataGrid.navigateChildSearchNext();
        break;
      case 'navigate-previous':
        this.dataGrid.navigateChildSearchPrevious();
        break;
      case 'clear':
        this.dataGrid.clearChildSearchTerm();
        break;
      case 'close':
        this.dataGrid.closeChildSearch();
        break;
    }
  }
  
  // Handle child search request from data grid
  onChildSearchRequest(node: HierarchyNode): void {
    if (this.filterBar) {
      this.filterBar.startChildSearch(node);
    }
  }
}