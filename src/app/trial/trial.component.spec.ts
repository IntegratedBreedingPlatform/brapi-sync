import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrialComponent } from './study.component';

describe('StudyComponent', () => {
  let component: TrialComponent;
  let fixture: ComponentFixture<TrialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TrialComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TrialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
