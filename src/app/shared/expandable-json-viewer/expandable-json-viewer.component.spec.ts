import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandableJsonViewerComponent } from './expandable-json-viewer.component';

describe('ExpandableJsonViewerComponent', () => {
  let component: ExpandableJsonViewerComponent;
  let fixture: ComponentFixture<ExpandableJsonViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExpandableJsonViewerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExpandableJsonViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
