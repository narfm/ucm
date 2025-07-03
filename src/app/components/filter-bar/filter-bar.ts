import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HierarchyMode, ServiceType, SalesPerson } from '../../models';

export interface FilterEvent {
  type: 'top' | 'hierarchy' | 'search';
  value: any;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss'
})
export class FilterBarComponent {
  @Output() filterChange = new EventEmitter<FilterEvent>();
  
  // Available options
  salesPersons: SalesPerson[] = ['Alice', 'Bob', 'Charlie', 'Diana'];
  services: ServiceType[] = ['Corporate Trust', 'Treasury', 'Custody'];
  
  // Current selections
  selectedHierarchy = signal<'bank' | 'salesPerson' | 'service'>('bank');
  
  applyTopFilter(count: number): void {
    this.filterChange.emit({
      type: 'top',
      value: count
    });
  }
  
  setHierarchy(type: 'bank' | 'salesPerson' | 'service'): void {
    this.selectedHierarchy.set(type);
    
    const hierarchyMode: HierarchyMode = {
      type: type
    };
    
    this.filterChange.emit({
      type: 'hierarchy',
      value: hierarchyMode
    });
  }
}