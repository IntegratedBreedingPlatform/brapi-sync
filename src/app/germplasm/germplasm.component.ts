import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StudyFilterComponent } from '../study-filter/study-filter.component';

@Component({
  selector: 'app-germplasm',
  templateUrl: './germplasm.component.html',
  styleUrls: ['./germplasm.component.css']
})
export class GermplasmComponent implements OnInit {
  loading = false;
  filter = FILTER.STUDY;
  FILTERS = FILTER;

  constructor(
    private router: Router,
    public context: ContextService,
    private modalService: NgbModal
  ) {
  }

  ngOnInit(): void {
  }

  back(): void {
    this.router.navigate(['program']);
  }

  async next(): Promise<void> {

  }

  addFilter(): void {
    this.modalService.open(StudyFilterComponent);
  }
}

enum FILTER {
  STUDY = 'STUDY',
  LIST = 'LIST'
}
