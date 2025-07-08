import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataGridComponent } from '../data-grid/data-grid';
import { FilterBarComponent, FilterEvent } from '../filter-bar/filter-bar';
import { HierarchyNode, HierarchyRequest, HierarchyResponse, FilterCriteria } from '../../models/financial-data.interface';
import { MockDataService } from '../../services/mock-data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DataGridComponent, FilterBarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private mockDataService = inject(MockDataService);
  
  originalData = signal<HierarchyNode[]>([]);
  filteredData = signal<HierarchyNode[]>([]);
  searchText = signal<string>('');
  
  // Default hierarchy request
  hierarchyRequest: HierarchyRequest = {
    filters: ['UPM_L1_NAME'],
    hierarchyTypeCode: 'G001',
    maxDepth: 3
  };
  
  ngOnInit() {
    this.loadHierarchicalData();
  }
  
  private loadHierarchicalData(): void {
    this.mockDataService.generateHierarchicalData(this.hierarchyRequest).subscribe({
      next: (response: HierarchyResponse) => {
        this.originalData.set(response.root.children || []);
        this.filteredData.set(response.root.children || []);
      },
      error: (error) => {
        console.error('Error loading hierarchical data:', error);
        this.originalData.set([]);
        this.filteredData.set([]);
      }
    });
  }
  
  onFilterChange(event: FilterEvent): void {
    switch (event.type) {
      case 'search':
        this.searchText.set(event.value);
        this.applySearch();
        break;
      case 'filter':
        this.applyColumnFilters(event.value);
        break;
      case 'hierarchy':
        // Update hierarchy request and reload data
        if (event.value.maxDepth) {
          this.hierarchyRequest.maxDepth = event.value.maxDepth;
          this.loadHierarchicalData();
        }
        break;
    }
  }
  
  private applySearch(): void {
    const searchText = this.searchText();
    if (!searchText) {
      this.filteredData.set(this.originalData());
      return;
    }
    
    const filtered = this.mockDataService.searchNodes(this.originalData(), searchText);
    this.filteredData.set(filtered);
  }
  
  private applyColumnFilters(filters: FilterCriteria[]): void {
    if (!filters || filters.length === 0) {
      this.filteredData.set(this.originalData());
      return;
    }
    
    const filtered = this.mockDataService.filterNodes(this.originalData(), filters);
    this.filteredData.set(filtered);
  }
  
  onRowClick(node: HierarchyNode): void {
    console.log('Row clicked:', node);
  }
  
  onCellClick(event: {row: HierarchyNode, column: any}): void {
    console.log('Cell clicked:', event);
  }
}