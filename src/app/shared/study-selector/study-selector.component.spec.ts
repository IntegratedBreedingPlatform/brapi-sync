import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudySelectorComponent } from './study-selector.component';

describe('StudySelectorComponent', () => {
  let component: StudySelectorComponent;
  let fixture: ComponentFixture<StudySelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudySelectorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
