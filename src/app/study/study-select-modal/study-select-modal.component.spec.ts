import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudySelectModalComponent } from './study-select-modal.component';

describe('StudySearchModalComponent', () => {
  let component: StudySelectModalComponent;
  let fixture: ComponentFixture<StudySelectModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudySelectModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudySelectModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
