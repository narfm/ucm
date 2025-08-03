import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValuesSidePanel } from './values-side-panel';

describe('ValuesSidePanel', () => {
  let component: ValuesSidePanel;
  let fixture: ComponentFixture<ValuesSidePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValuesSidePanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValuesSidePanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
