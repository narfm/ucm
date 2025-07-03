import { Component, Output, EventEmitter, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
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
export class FilterBarComponent implements OnDestroy {
  @Output() filterChange = new EventEmitter<FilterEvent>();
  
  // Available options
  salesPersons: SalesPerson[] = ['Alice', 'Bob', 'Charlie', 'Diana'];
  services: ServiceType[] = ['Corporate Trust', 'Treasury', 'Custody'];
  
  // Current selections
  selectedHierarchy = signal<'bank' | 'salesPerson' | 'service'>('bank');
  
  // Search functionality
  searchText = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchText => {
      this.filterChange.emit({
        type: 'search',
        value: searchText
      });
    });
  }
  
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
  
  onSearchChange(value: string): void {
    this.searchText = value;
    this.searchSubject.next(value);
  }
  
  clearSearch(): void {
    this.searchText = '';
    this.searchSubject.next('');
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}