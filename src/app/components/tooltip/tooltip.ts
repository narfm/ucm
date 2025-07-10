import { Component, Input, ElementRef, Renderer2, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #tooltipElement class="custom-tooltip" [class.visible]="visible">
      {{ text }}
    </div>
  `,
  styles: [`
    .custom-tooltip {
      position: absolute;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
      pointer-events: none;
      backdrop-filter: blur(8px);
    }

    .custom-tooltip.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .custom-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -4px;
      border: 4px solid transparent;
      border-top-color: var(--bg-tertiary);
    }

    .custom-tooltip.bottom-position::after {
      top: -8px;
      border-top-color: transparent;
      border-bottom-color: var(--bg-tertiary);
    }
  `]
})
export class TooltipComponent implements OnDestroy {
  @Input() text = '';
  @ViewChild('tooltipElement', { static: true }) tooltipElement!: ElementRef;
  
  visible = false;
  private hideTimeout?: number;

  constructor(private renderer: Renderer2) {}

  show(targetElement: HTMLElement, text: string) {
    this.text = text;
    this.visible = true;
    
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }

    // Position tooltip relative to target element
    setTimeout(() => {
      this.positionTooltip(targetElement);
    }, 0);
  }

  hide() {
    this.hideTimeout = window.setTimeout(() => {
      this.visible = false;
    }, 100);
  }

  private positionTooltip(targetElement: HTMLElement) {
    const tooltip = this.tooltipElement.nativeElement;
    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Position above the target element
    let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    let top = targetRect.top - tooltipRect.height - 8;
    
    // Ensure tooltip doesn't go off screen
    const padding = 8;
    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    
    if (top < padding) {
      // If no room above, position below
      top = targetRect.bottom + 8;
      // Flip arrow for bottom positioning
      this.renderer.addClass(tooltip, 'bottom-position');
    }
    
    this.renderer.setStyle(tooltip, 'left', `${left}px`);
    this.renderer.setStyle(tooltip, 'top', `${top}px`);
  }

  ngOnDestroy() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }
}