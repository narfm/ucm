import { Directive, Input, ElementRef, HostListener, OnDestroy, Renderer2, Injector, EnvironmentInjector, createComponent } from '@angular/core';
import { TooltipComponent } from './tooltip';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnDestroy {
  @Input('appTooltip') tooltipText = '';
  @Input() tooltipDelay = 300;

  private tooltipElement?: HTMLElement;
  private showTimeout?: number;

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private injector: Injector,
    private environmentInjector: EnvironmentInjector
  ) {}

  @HostListener('mouseenter', ['$event'])
  onMouseEnter(event: MouseEvent) {
    if (!this.tooltipText.trim()) return;

    this.showTimeout = window.setTimeout(() => {
      this.showTooltip(event);
    }, this.tooltipDelay);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = undefined;
    }
    
    this.hideTooltip();
  }

  private showTooltip(event: MouseEvent) {
    if (this.tooltipElement) {
      this.hideTooltip();
    }

    // Create tooltip element directly
    this.tooltipElement = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltipElement, 'custom-tooltip');
    this.renderer.setStyle(this.tooltipElement, 'position', 'fixed');
    this.renderer.setStyle(this.tooltipElement, 'background', '#2d3748');
    this.renderer.setStyle(this.tooltipElement, 'color', '#ffffff');
    this.renderer.setStyle(this.tooltipElement, 'border', '1px solid #4a5568');
    this.renderer.setStyle(this.tooltipElement, 'border-radius', '6px');
    this.renderer.setStyle(this.tooltipElement, 'padding', '6px 10px');
    this.renderer.setStyle(this.tooltipElement, 'font-size', '12px');
    this.renderer.setStyle(this.tooltipElement, 'font-weight', '500');
    this.renderer.setStyle(this.tooltipElement, 'white-space', 'nowrap');
    this.renderer.setStyle(this.tooltipElement, 'box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)');
    this.renderer.setStyle(this.tooltipElement, 'z-index', '9999');
    this.renderer.setStyle(this.tooltipElement, 'pointer-events', 'none');
    this.renderer.setStyle(this.tooltipElement, 'opacity', '1');
    this.renderer.setStyle(this.tooltipElement, 'visibility', 'visible');
    
    // Set text content
    this.renderer.setProperty(this.tooltipElement, 'textContent', this.tooltipText);
    
    // Append to body
    this.renderer.appendChild(document.body, this.tooltipElement);
    
    // Position tooltip immediately
    this.positionTooltip(event);
  }

  private positionTooltip(event: MouseEvent) {
    if (!this.tooltipElement) return;
    
    // Position tooltip bottom right of cursor
    let left = event.clientX + 12; // 12px to the right of cursor
    let top = event.clientY + 12; // 12px below cursor
    
    // Ensure tooltip doesn't go off screen
    const padding = 8;
    if (left + 200 > window.innerWidth) { // Assume max tooltip width of 200px
      left = event.clientX - 12 - 200; // Position to the left instead
    }
    
    if (top + 50 > window.innerHeight) { // Assume max tooltip height of 50px
      top = event.clientY - 12 - 50; // Position above instead
    }
    
    this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
    this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
  }

  private hideTooltip() {
    if (this.tooltipElement) {
      this.renderer.removeChild(document.body, this.tooltipElement);
      this.tooltipElement = undefined;
    }
  }

  ngOnDestroy() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }
    this.hideTooltip();
  }
}