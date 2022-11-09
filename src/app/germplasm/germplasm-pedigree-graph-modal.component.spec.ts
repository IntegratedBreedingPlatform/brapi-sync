import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GermplasmPedigreeGraphModalComponent } from './germplasm-pedigree-graph-modal.component';

describe('GermplasmPedigreeGraphComponent', () => {
  let component: GermplasmPedigreeGraphModalComponent;
  let fixture: ComponentFixture<GermplasmPedigreeGraphModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GermplasmPedigreeGraphModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GermplasmPedigreeGraphModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
