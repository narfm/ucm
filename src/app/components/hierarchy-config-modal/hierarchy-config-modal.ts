import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HierarchySelectorComponent } from '../hierarchy-selector/hierarchy-selector';
import { HierarchyConfig } from '../../models/financial-data.interface';
import { HierarchyModalService } from '../../services/hierarchy-modal.service';

@Component({
  selector: 'app-hierarchy-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, HierarchySelectorComponent],
  templateUrl: './hierarchy-config-modal.html',
  styleUrl: './hierarchy-config-modal.scss'
})
export class HierarchyConfigModalComponent implements OnInit, OnDestroy {
  private hierarchyModalService = inject(HierarchyModalService);

  // Use service signals for reactive state
  isOpen = this.hierarchyModalService.isOpen;
  modalConfig = this.hierarchyModalService.modalConfig;

  ngOnInit() {
    // Could add any initialization logic here if needed
  }

  ngOnDestroy() {
    // Restore body scroll when component is destroyed
    document.body.style.overflow = '';
  }

  onConfigChange(config: HierarchyConfig) {
    this.hierarchyModalService.onConfigChange(config);
  }

  closeModal() {
    this.hierarchyModalService.closeModal();
  }

  onOverlayClick(event: Event) {
    // Only close if clicking the overlay itself, not its contents
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}