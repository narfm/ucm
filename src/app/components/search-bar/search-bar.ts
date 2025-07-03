import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss'
})
export class SearchBarComponent implements OnDestroy {
  @Output() searchChange = new EventEmitter<string>();
  
  searchText = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchText => {
      this.searchChange.emit(searchText);
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