import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataGridComponent } from '../data-grid/data-grid';
import { FilterBarComponent, FilterEvent } from '../filter-bar/filter-bar';
import { HierarchyNode, HierarchyRequest, HierarchyConfig } from '../../models/financial-data.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DataGridComponent, FilterBarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  
  @ViewChild('dataGrid') dataGrid!: DataGridComponent;
  
  searchText = signal<string>('');
  
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
      case 'search':
        this.searchText.set(event.value);
        break;
      case 'filter':
        // Column filters not implemented yet
        break;
      case 'hierarchy':
        // Update hierarchy request and reload data
        if (event.value.maxDepth) {
          this.hierarchyRequest.maxDepth = event.value.maxDepth;
          if (this.dataGrid) {
            this.dataGrid.reloadWithNewHierarchy(this.hierarchyRequest);
          }
        }
        break;
      case 'hierarchy-config':
        // Update hierarchy configuration and reload data
        const config = event.value as HierarchyConfig;
        const enabledLevels = config.levels
          .filter(level => level.enabled)
          .sort((a, b) => a.order - b.order);
        
        this.hierarchyRequest.filters = enabledLevels.map(level => level.id);
        this.hierarchyRequest.maxDepth = config.maxDepth;
        
        if (this.dataGrid) {
          this.dataGrid.reloadWithNewHierarchy(this.hierarchyRequest);
        }
        break;
    }
  }
  
  
  onRowClick(node: HierarchyNode): void {
    console.log('Row clicked:', node);
  }
  
  onCellClick(event: {row: HierarchyNode, column: any}): void {
    console.log('Cell clicked:', event);
  }
}