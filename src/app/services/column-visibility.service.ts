import { Injectable, signal, computed } from '@angular/core';
import { ColumnDefinition } from '../models/financial-data.interface';

export interface ColumnVisibilityState {
  [columnKey: string]: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ColumnVisibilityService {
  // Private signal to store column visibility state
  private columnVisibility = signal<ColumnVisibilityState>({});
  
  // Private signal to track whether we're in embed mode
  private embedMode = signal<boolean>(false);
  
  // Computed signal for visible columns based on current visibility state
  visibleColumns = computed(() => {
    const visibility = this.columnVisibility();
    return (columns: ColumnDefinition[]) => 
      columns.filter(column => visibility[column.key] !== false);
  });
  
  // Get visibility state for all columns
  getColumnVisibility(): ColumnVisibilityState {
    return this.columnVisibility();
  }
  
  // Set visibility for a specific column
  setColumnVisibility(columnKey: string, visible: boolean): void {
    const current = this.columnVisibility();
    this.columnVisibility.set({
      ...current,
      [columnKey]: visible
    });
  }
  
  // Toggle visibility for a specific column
  toggleColumnVisibility(columnKey: string): void {
    const current = this.columnVisibility();
    const currentVisibility = current[columnKey] !== false; // Default to true if not set
    this.setColumnVisibility(columnKey, !currentVisibility);
  }
  
  // Initialize column visibility from columns array
  initializeFromColumns(columns: ColumnDefinition[]): void {
    const current = this.columnVisibility();
    const newVisibility: ColumnVisibilityState = {};
    
    columns.forEach(column => {
      // Keep existing state if it exists, otherwise default to true
      newVisibility[column.key] = current[column.key] !== false;
    });
    
    this.columnVisibility.set(newVisibility);
  }
  
  // Update embed mode state
  setEmbedMode(isEmbedMode: boolean): void {
    this.embedMode.set(isEmbedMode);
  }
  
  // Get embed mode state
  isEmbedMode(): boolean {
    return this.embedMode();
  }
  
  // Show all columns
  showAllColumns(columns: ColumnDefinition[]): void {
    const newVisibility: ColumnVisibilityState = {};
    columns.forEach(column => {
      newVisibility[column.key] = true;
    });
    this.columnVisibility.set(newVisibility);
  }
  
  // Hide all columns except essential ones (name column)
  hideAllNonEssentialColumns(columns: ColumnDefinition[]): void {
    const newVisibility: ColumnVisibilityState = {};
    columns.forEach(column => {
      // Always keep the name column visible, allow hiding others
      newVisibility[column.key] = column.key === 'name';
    });
    this.columnVisibility.set(newVisibility);
  }
  
  // Get count of visible columns
  getVisibleColumnCount(columns: ColumnDefinition[]): number {
    const visibility = this.columnVisibility();
    return columns.filter(column => visibility[column.key] !== false).length;
  }
  
  // Check if a specific column is visible
  isColumnVisible(columnKey: string): boolean {
    const visibility = this.columnVisibility();
    return visibility[columnKey] !== false; // Default to true if not set
  }
  
  // Reset to default visibility (all columns visible)
  resetToDefaults(columns: ColumnDefinition[]): void {
    const newVisibility: ColumnVisibilityState = {};
    columns.forEach(column => {
      newVisibility[column.key] = true;
    });
    this.columnVisibility.set(newVisibility);
  }
}