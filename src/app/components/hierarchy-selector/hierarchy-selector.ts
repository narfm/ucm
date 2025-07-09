import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
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
export class HierarchySelectorComponent implements OnChanges {
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

  @Input() compactMode: boolean = false;
  @Output() configChange = new EventEmitter<HierarchyConfig>();
  @Output() openConfiguration = new EventEmitter<void>();

  showFullConfiguration = signal<boolean>(false);
  pendingConfig: HierarchyConfig = { ...this.config };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && changes['config'].currentValue) {
      this.pendingConfig = {
        levels: this.config.levels.map(level => ({ ...level })),
        maxDepth: this.config.maxDepth
      };
    }
  }

  onDrop(event: CdkDragDrop<HierarchyLevel[]>): void {
    const levels = [...this.pendingConfig.levels];
    moveItemInArray(levels, event.previousIndex, event.currentIndex);
    
    // Update order property
    levels.forEach((level, index) => {
      level.order = index;
    });

    this.pendingConfig = {
      ...this.pendingConfig,
      levels
    };
  }

  toggleLevel(levelId: string): void {
    const levels = this.pendingConfig.levels.map(level => 
      level.id === levelId ? { ...level, enabled: !level.enabled } : level
    );

    this.pendingConfig = {
      ...this.pendingConfig,
      levels
    };
  }

  getEnabledLevels(): HierarchyLevel[] {
    return this.config.levels
      .filter(level => level.enabled)
      .sort((a, b) => a.order - b.order);
  }

  getPendingEnabledLevels(): HierarchyLevel[] {
    return this.pendingConfig.levels
      .filter(level => level.enabled)
      .sort((a, b) => a.order - b.order);
  }

  getFiltersArray(): string[] {
    return this.getEnabledLevels().map(level => level.id);
  }

  trackByLevel(index: number, level: HierarchyLevel): string {
    return level.id;
  }

  onCompactClick(): void {
    if (this.compactMode) {
      this.showFullConfiguration.set(!this.showFullConfiguration());
      if (this.showFullConfiguration()) {
        // Reset pending config to current config when opening
        this.pendingConfig = {
          levels: this.config.levels.map(level => ({ ...level })),
          maxDepth: this.config.maxDepth
        };
        this.openConfiguration.emit();
      }
    }
  }

  applyConfiguration(): void {
    this.configChange.emit({ ...this.pendingConfig });
    this.closeConfiguration();
  }

  cancelConfiguration(): void {
    // Reset pending config to current config
    this.pendingConfig = {
      levels: this.config.levels.map(level => ({ ...level })),
      maxDepth: this.config.maxDepth
    };
    this.closeConfiguration();
  }

  closeConfiguration(): void {
    this.showFullConfiguration.set(false);
  }
}