import { Injectable, signal, inject } from '@angular/core';
import { HierarchyConfig, HierarchyType } from '../models/financial-data.interface';
import { MockDataService } from './mock-data.service';

export interface HierarchyModalConfig {
  config: HierarchyConfig;
  title?: string;
  nodeContext?: { name?: string } | null;
  onConfigChange: (config: HierarchyConfig) => void;
  hierarchyTypes?: HierarchyType[];
}

@Injectable({
  providedIn: 'root'
})
export class HierarchyModalService {
  private _modalConfig = signal<HierarchyModalConfig | null>(null);
  private _isOpen = signal<boolean>(false);

  // Public signals for components to subscribe to
  modalConfig = this._modalConfig.asReadonly();
  isOpen = this._isOpen.asReadonly();

  openModal(config: HierarchyModalConfig) {
    this._modalConfig.set(config);
    this._isOpen.set(true);
  }

  closeModal() {
    this._isOpen.set(false);
    this._modalConfig.set(null);
  }

  onConfigChange(config: HierarchyConfig) {
    const modalConfig = this._modalConfig();
    if (modalConfig) {
      modalConfig.onConfigChange(config);
    }
    this.closeModal();
  }
}