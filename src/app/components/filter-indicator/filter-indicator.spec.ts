import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterIndicator } from './filter-indicator';

describe('FilterIndicator', () => {
  let component: FilterIndicator;
  let fixture: ComponentFixture<FilterIndicator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterIndicator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterIndicator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
