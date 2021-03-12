import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StudyFilterComponent } from '../study-filter/study-filter.component';
import { HttpClient } from '@angular/common/http';

declare const BrAPI: any;

@Component({
  selector: 'app-germplasm',
  templateUrl: './germplasm.component.html',
  styleUrls: ['./germplasm.component.css']
})
export class GermplasmComponent implements OnInit {
  loading = false;
  filter = FILTER.STUDY;
  FILTERS = FILTER;
  brapi: any;
  germplasm: any = [];
  page = 1;
  pageSize = 20;
  totalCount = 0;

  constructor(
    private router: Router,
    public context: ContextService,
    private modalService: NgbModal,
    private http: HttpClient
  ) {
    // TODO / testing / remove
    this.load();
  }

  ngOnInit(): void {
  }

  back(): void {
    this.router.navigate(['program']);
  }

  async next(): Promise<void> {

  }

  addFilter(): void {
    this.modalService.open(StudyFilterComponent).result
      .then(() => this.load());
  }

  load(): void {
    /* TODO get page count brapijs?
    const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapi.germplasm({
      studyDbId: this.context.studySelected.studyDbId,
      // page: this.page,
      pageSize: this.pageSize,
      pageRange: [this.page - 1, this.page]
    }).all((germplasm: any[]) => {
      this.germplasm = germplasm;
    });
     */
    this.http.get(this.context.source + '/germplasm', {
      params: {
        studyDbId: this.context.studySelected.studyDbId,
        page: (this.page - 1).toString(),
        pageSize: this.pageSize.toString(),
      }
    }).subscribe((res: any) => {
      this.germplasm = res.result.data;
      this.totalCount = res.metadata.pagination.totalCount;
    });
  }
}

enum FILTER {
  STUDY = 'STUDY',
  LIST = 'LIST'
}
