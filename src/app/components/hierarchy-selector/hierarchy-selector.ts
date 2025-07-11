import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, inject, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { HierarchyLevel, HierarchyConfig, HierarchyType } from '../../models/financial-data.interface';
import { HierarchyModalService } from '../../services/hierarchy-modal.service';
import { MockDataService } from '../../services/mock-data.service';

@Component({
  selector: 'app-hierarchy-selector',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './hierarchy-selector.html',
  styleUrl: './hierarchy-selector.scss'
})
export class HierarchySelectorComponent implements OnChanges, OnInit, AfterViewInit {
  @Input() config: HierarchyConfig = {
    levels: [],
    maxDepth: 3
  };
  @Input() hierarchyTypes: HierarchyType[] = [];

  @Input() compactMode: boolean = false;
  @Input() modalMode: boolean = false; // New mode for modal usage
  @Output() configChange = new EventEmitter<HierarchyConfig>();
  @Output() openConfiguration = new EventEmitter<void>();

  @ViewChild('dragHandle') dragHandle?: ElementRef<HTMLElement>;

  private hierarchyModalService = inject(HierarchyModalService);
  private mockDataService = inject(MockDataService);
  
  showFullConfiguration = signal<boolean>(false);
  pendingConfig: HierarchyConfig = { ...this.config };
  
  selectedHierarchyType: string = 'G001'; // Default to G001
  
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  ngOnInit(): void {
    // Set selected hierarchy type from config, regardless of whether we have levels
    this.selectedHierarchyType = this.config.hierarchyTypeCode || 'G001';
    
    // If no config is provided, get default levels from mock service
    if (!this.config.levels || this.config.levels.length === 0) {
      const defaultLevels = this.mockDataService.getHierarchyLevels();
      this.config = {
        levels: defaultLevels,
        maxDepth: this.config.maxDepth || 3,
        hierarchyTypeCode: this.config.hierarchyTypeCode
      };
      this.pendingConfig = {
        levels: defaultLevels.map(level => ({ ...level })),
        maxDepth: this.config.maxDepth,
        hierarchyTypeCode: this.config.hierarchyTypeCode || 'G001'
      };
    }
          // Set selected hierarchy type
          this.selectedHierarchyType = this.config.hierarchyTypeCode || 'G001';

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && changes['config'].currentValue) {
      // Always update selected hierarchy type from config
      this.selectedHierarchyType = this.config.hierarchyTypeCode || 'G001';
      
      this.pendingConfig = {
        levels: this.config.levels.map(level => ({ ...level })),
        maxDepth: this.config.maxDepth,
        hierarchyTypeCode: this.config.hierarchyTypeCode || 'G001'
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
      this.hierarchyModalService.openModal({
        config: this.config,
        title: 'Hierarchy Configuration',
        hierarchyTypes: this.hierarchyTypes,
        onConfigChange: (newConfig) => {
          this.configChange.emit(newConfig);
        }
      });
    }
  }

  applyConfiguration(): void {
    this.configChange.emit({ 
      ...this.pendingConfig,
      hierarchyTypeCode: this.selectedHierarchyType
    });
    this.closeConfiguration();
  }

  // onHierarchyTypeChange is no longer needed since we're using [(ngModel)]

  cancelConfiguration(): void {
    // Reset pending config to current config
    this.pendingConfig = {
      levels: this.config.levels.map(level => ({ ...level })),
      maxDepth: this.config.maxDepth,
      hierarchyTypeCode: this.config.hierarchyTypeCode
    };
    
    // Reset selected hierarchy type
    this.selectedHierarchyType = this.config.hierarchyTypeCode || 'G001';
    
    this.closeConfiguration();
  }

  closeConfiguration(): void {
    this.showFullConfiguration.set(false);
  }

  getCurrentMaxDepth(): number {
    return (this.modalMode || this.compactMode) ? this.pendingConfig.maxDepth : this.config.maxDepth;
  }

  onMaxDepthChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const depth = parseInt(target.value, 10);
    
    if (this.modalMode || this.compactMode) {
      // In modal or compact mode, update pending config
      this.pendingConfig = {
        ...this.pendingConfig,
        maxDepth: depth
      };
    } else {
      // In full mode, emit change immediately
      this.configChange.emit({
        ...this.config,
        maxDepth: depth
      });
    }
  }

  selectMaxDepth(depth: number): void {
    if (this.modalMode || this.compactMode) {
      // In modal or compact mode, update pending config
      this.pendingConfig = {
        ...this.pendingConfig,
        maxDepth: depth
      };
    } else {
      // In full mode, emit change immediately
      this.configChange.emit({
        ...this.config,
        maxDepth: depth
      });
    }
  }

  ngAfterViewInit(): void {
    if (this.compactMode) {
      this.setupDragFunctionality();
    }
  }

  private setupDragFunctionality(): void {
    const element = this.dragHandle?.nativeElement;
    if (!element) return;

    element.addEventListener('mousedown', this.onMouseDown.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isDragging = true;
    const rect = (event.target as HTMLElement).closest('.hierarchy-compact')?.getBoundingClientRect();
    if (rect) {
      this.dragOffset.x = event.clientX - rect.left;
      this.dragOffset.y = event.clientY - rect.top;
    }

    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const panel = this.dragHandle?.nativeElement.closest('.hierarchy-compact') as HTMLElement;
    if (!panel) return;

    panel.style.position = 'fixed';
    panel.style.left = (event.clientX - this.dragOffset.x) + 'px';
    panel.style.top = (event.clientY - this.dragOffset.y) + 'px';
    panel.style.zIndex = '9999';
    panel.style.pointerEvents = 'auto';
  }

  private onMouseUp(): void {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
  }
}