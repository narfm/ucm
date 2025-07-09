import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { HierarchyLevel, HierarchyConfig } from '../../models/financial-data.interface';

@Component({
  selector: 'app-hierarchy-selector',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './hierarchy-selector.html',
  styleUrl: './hierarchy-selector.scss'
})
export class HierarchySelectorComponent {
  @Input() config: HierarchyConfig = {
    levels: [
      {
        id: 'UPM_L1_NAME',
        name: 'Service Area',
        description: 'Primary business service area',
        enabled: true,
        order: 0
      },
      {
        id: 'CLIENT_OWNER_NAME',
        name: 'Client Owner',
        description: 'Client relationship owner',
        enabled: false,
        order: 1
      }
    ],
    maxDepth: 3
  };

  @Output() configChange = new EventEmitter<HierarchyConfig>();

  onDrop(event: CdkDragDrop<HierarchyLevel[]>): void {
    const levels = [...this.config.levels];
    moveItemInArray(levels, event.previousIndex, event.currentIndex);
    
    // Update order property
    levels.forEach((level, index) => {
      level.order = index;
    });

    const newConfig: HierarchyConfig = {
      ...this.config,
      levels
    };
    
    this.config = newConfig;
    this.configChange.emit(newConfig);
  }

  toggleLevel(levelId: string): void {
    const levels = this.config.levels.map(level => 
      level.id === levelId ? { ...level, enabled: !level.enabled } : level
    );

    const newConfig: HierarchyConfig = {
      ...this.config,
      levels
    };
    
    this.config = newConfig;
    this.configChange.emit(newConfig);
  }

  getEnabledLevels(): HierarchyLevel[] {
    return this.config.levels
      .filter(level => level.enabled)
      .sort((a, b) => a.order - b.order);
  }

  getFiltersArray(): string[] {
    return this.getEnabledLevels().map(level => level.id);
  }

  trackByLevel(index: number, level: HierarchyLevel): string {
    return level.id;
  }
}