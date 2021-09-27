import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationUnitComponent } from './observation-unit.component';

describe('ObservationComponent', () => {
  let component: ObservationUnitComponent;
  let fixture: ComponentFixture<ObservationUnitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ObservationUnitComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationUnitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
