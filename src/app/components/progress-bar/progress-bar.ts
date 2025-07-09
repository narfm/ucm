import { Component, Input, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss'
})
export class ProgressBarComponent implements OnInit, OnDestroy, OnChanges {
  @Input() message: string = 'Loading...';
  @Input() show: boolean = false;
  @Input() enableRotatingMessages: boolean = true;
  
  currentMessage: string = '';
  private messageSequence = [
    'Initializing...',
    'Connecting to data source...',
    'Fetching hierarchy data...',
    'Processing nodes...',
    'Building relationships...',
    'Calculating metrics...',
    'Finalizing data structure...',
    'Almost there...',
    'Loading complete!'
  ];
  
  private messageIndex = 0;
  private messageInterval?: number;
  private isVisible = false;
  
  ngOnInit() {
    this.updateVisibility();
  }
  
  ngOnDestroy() {
    this.clearMessageInterval();
  }
  
  ngOnChanges() {
    this.updateVisibility();
  }
  
  private updateVisibility() {
    if (this.show && !this.isVisible) {
      // Starting to show
      this.isVisible = true;
      this.messageIndex = 0;
      this.currentMessage = this.enableRotatingMessages ? this.messageSequence[0] : this.message;
      
      if (this.enableRotatingMessages) {
        this.startMessageRotation();
      }
    } else if (!this.show && this.isVisible) {
      // Hiding
      this.isVisible = false;
      this.clearMessageInterval();
    }
    
    if (!this.enableRotatingMessages) {
      this.currentMessage = this.message;
    }
  }
  
  private startMessageRotation() {
    this.clearMessageInterval();
    
    // Change message every 600-1000ms
    this.messageInterval = window.setInterval(() => {
      if (this.messageIndex < this.messageSequence.length - 1) {
        this.messageIndex++;
        this.currentMessage = this.messageSequence[this.messageIndex];
      }
    }, Math.random() * 400 + 600);
  }
  
  private clearMessageInterval() {
    if (this.messageInterval) {
      window.clearInterval(this.messageInterval);
      this.messageInterval = undefined;
    }
  }
}