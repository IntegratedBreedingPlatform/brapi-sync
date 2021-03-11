import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GermplasmComponent } from './germplasm.component';

describe('GermplasmComponent', () => {
  let component: GermplasmComponent;
  let fixture: ComponentFixture<GermplasmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GermplasmComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GermplasmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
