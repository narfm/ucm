import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-values-side-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './values-side-panel.html',
  styleUrl: './values-side-panel.scss'
})
export class ValuesSidePanelComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() title = 'Select Values';
  @Input() values: string[] = [];
  @Input() selectedValues: string[] = [];
  
  @Output() close = new EventEmitter<void>();
  @Output() applySelection = new EventEmitter<string[]>();
  
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  
  searchTerm = '';
  filteredValues: string[] = [];
  tempSelectedValues: string[] = [];
  
  get selectedCount(): number {
    return this.tempSelectedValues.length;
  }
  
  get totalCount(): number {
    return this.values.length;
  }
  
  ngOnChanges(): void {
    if (this.isOpen) {
      // Copy selected values to temp when opening
      this.tempSelectedValues = [...this.selectedValues];
      this.searchTerm = '';
      this.filterValues();
      
      // Focus search input when panel opens
      setTimeout(() => {
        this.searchInput?.nativeElement.focus();
      }, 100);
    }
  }
  
  onSearchChange(): void {
    this.filterValues();
  }
  
  private filterValues(): void {
    if (!this.searchTerm) {
      this.filteredValues = [...this.values];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredValues = this.values.filter(value => 
        value.toLowerCase().includes(searchLower)
      );
    }
  }
  
  isSelected(value: string): boolean {
    return this.tempSelectedValues.includes(value);
  }
  
  toggleValue(value: string): void {
    const index = this.tempSelectedValues.indexOf(value);
    if (index > -1) {
      this.tempSelectedValues.splice(index, 1);
    } else {
      this.tempSelectedValues.push(value);
    }
  }
  
  selectAll(): void {
    // Add all filtered values that aren't already selected
    this.filteredValues.forEach(value => {
      if (!this.tempSelectedValues.includes(value)) {
        this.tempSelectedValues.push(value);
      }
    });
  }
  
  clearAll(): void {
    this.tempSelectedValues = [];
  }
  
  onCancel(): void {
    this.close.emit();
  }

  onClose(): void {
    this.close.emit();
  }
  
  onApply(): void {
    this.applySelection.emit(this.tempSelectedValues);
    this.close.emit();
  }
  
  trackByValue(index: number, value: string): string {
    return value;
  }
}