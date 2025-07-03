import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataGridComponent } from '../data-grid/data-grid';
import { FilterBarComponent, FilterEvent } from '../filter-bar/filter-bar';
import { DataNode, HierarchyMode } from '../../models';
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
  
  originalData = signal<DataNode[]>([]);
  filteredData = signal<DataNode[]>([]);
  searchText = signal<string>('');
  currentHierarchy = signal<HierarchyMode>({ type: 'bank' });
  
  ngOnInit() {
    const mockData = this.mockDataService.generateMockData(10000);
    this.originalData.set(mockData);
    this.filteredData.set(mockData);
  }
  
  onFilterChange(event: FilterEvent): void {
    switch (event.type) {
      case 'top':
        this.applyTopFilter(event.value);
        break;
      case 'hierarchy':
        this.changeHierarchy(event.value);
        break;
      case 'search':
        this.searchText.set(event.value);
        this.applyFilters();
        break;
    }
  }
  
  private applyTopFilter(count: number): void {
    // Get top records first (this returns flattened data)
    const topRecords = this.mockDataService.getTopRecords(this.originalData(), count);
    
    // Reconstruct hierarchy based on current mode
    const currentMode = this.currentHierarchy();
    let hierarchicalData: DataNode[];
    
    if (currentMode.type === 'bank') {
      // For bank hierarchy, we need to rebuild the tree structure from top records
      hierarchicalData = this.mockDataService.reconstructBankHierarchy(topRecords);
    } else {
      // For other hierarchies, use the reshape method with the top records
      hierarchicalData = this.mockDataService.reshapeByHierarchy(
        topRecords, 
        currentMode.type, 
        currentMode.groupBy
      );
    }
    
    this.filteredData.set(hierarchicalData);
  }
  
  private changeHierarchy(hierarchyMode: HierarchyMode): void {
    this.currentHierarchy.set(hierarchyMode);
    
    let reshapedData: DataNode[];
    
    if (hierarchyMode.type === 'bank') {
      reshapedData = this.originalData();
    } else {
      reshapedData = this.mockDataService.reshapeByHierarchy(
        this.originalData(), 
        hierarchyMode.type, 
        hierarchyMode.groupBy
      );
    }
    
    this.filteredData.set(reshapedData);
    this.applyFilters();
  }
  
  private applyFilters(): void {
    let data = this.filteredData();
    
    const searchText = this.searchText();
    if (searchText) {
      data = this.mockDataService.searchData(data, searchText, ['accountName']);
    }
    
    // Since we're updating the signal, the data grid will automatically react
    this.filteredData.set(data);
  }
}