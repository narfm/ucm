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
  selectedSalesPerson = signal<SalesPerson | ''>('');
  selectedService = signal<ServiceType | ''>('');
  showSalesPersonDropdown = signal(false);
  showServiceDropdown = signal(false);
  
  applyTopFilter(count: number): void {
    this.filterChange.emit({
      type: 'top',
      value: count
    });
  }
  
  toggleHierarchyMode(mode: 'salesPerson' | 'service'): void {
    if (mode === 'salesPerson') {
      this.showSalesPersonDropdown.set(!this.showSalesPersonDropdown());
      this.showServiceDropdown.set(false);
    } else {
      this.showServiceDropdown.set(!this.showServiceDropdown());
      this.showSalesPersonDropdown.set(false);
    }
  }
  
  selectSalesPerson(person: SalesPerson): void {
    this.selectedSalesPerson.set(person);
    this.selectedHierarchy.set('salesPerson');
    this.showSalesPersonDropdown.set(false);
    
    const hierarchyMode: HierarchyMode = {
      type: 'salesPerson',
      groupBy: person
    };
    
    this.filterChange.emit({
      type: 'hierarchy',
      value: hierarchyMode
    });
  }
  
  selectService(service: ServiceType): void {
    this.selectedService.set(service);
    this.selectedHierarchy.set('service');
    this.showServiceDropdown.set(false);
    
    const hierarchyMode: HierarchyMode = {
      type: 'service',
      groupBy: service
    };
    
    this.filterChange.emit({
      type: 'hierarchy',
      value: hierarchyMode
    });
  }
  
  resetToDefaultHierarchy(): void {
    this.selectedHierarchy.set('bank');
    this.selectedSalesPerson.set('');
    this.selectedService.set('');
    this.showSalesPersonDropdown.set(false);
    this.showServiceDropdown.set(false);
    
    const hierarchyMode: HierarchyMode = {
      type: 'bank'
    };
    
    this.filterChange.emit({
      type: 'hierarchy',
      value: hierarchyMode
    });
  }
}