import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataGridComponent } from '../data-grid/data-grid';
import { SearchBarComponent } from '../search-bar/search-bar';
import { FilterBarComponent, FilterEvent } from '../filter-bar/filter-bar';
import { DataNode, HierarchyMode } from '../../models';
import { MockDataService } from '../../services/mock-data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DataGridComponent, SearchBarComponent, FilterBarComponent],
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
  
  onSearchChange(searchText: string): void {
    this.searchText.set(searchText);
    this.applyFilters();
  }
  
  onFilterChange(event: FilterEvent): void {
    switch (event.type) {
      case 'top':
        this.applyTopFilter(event.value);
        break;
      case 'hierarchy':
        this.changeHierarchy(event.value);
        break;
    }
  }
  
  private applyTopFilter(count: number): void {
    const topRecords = this.mockDataService.getTopRecords(this.originalData(), count);
    this.filteredData.set(topRecords);
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