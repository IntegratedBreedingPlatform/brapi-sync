import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrialSelectModalComponent } from './study-select-modal.component';

describe('StudySearchModalComponent', () => {
  let component: TrialSelectModalComponent;
  let fixture: ComponentFixture<TrialSelectModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TrialSelectModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TrialSelectModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
