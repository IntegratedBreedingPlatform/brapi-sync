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

  // { germplasmDbId: germplasm }
  selectedItems: {[key: string]: any} = {};
  isSelectAllPages = false;

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

  isSelected(row: any): boolean {
    return this.selectedItems[row.germplasmDbId];
  }

  toggleSelect(row: any): void {
    if (this.selectedItems[row.germplasmDbId]) {
      delete this.selectedItems[row.germplasmDbId];
    } else {
      this.selectedItems[row.germplasmDbId] = row;
    }
  }

  isPageSelected(): boolean {
    const pageItems = this.getPageItems();
    return Boolean(this.size(this.selectedItems)) && pageItems.every((item) => this.selectedItems[item.germplasmDbId]);
  }

  onSelectPage(): void {
    const pageItems = this.getPageItems();
    if (this.isPageSelected()) {
      // remove all items
      pageItems.forEach((item) => delete this.selectedItems[item.germplasmDbId]);
    } else {
      // check remaining items
      pageItems.forEach((item) => this.selectedItems[item.germplasmDbId] = item);
    }
  }

  onSelectAllPages(): void {
    this.isSelectAllPages = !this.isSelectAllPages;
    this.selectedItems = {};
  }

  getPageItems(): any[] {
    if (!(this.germplasm && this.germplasm.length)) {
      return [];
    }
    return this.germplasm;
  }

  size(obj: any): number {
    return Object.keys(obj).length;
  }
}

enum FILTER {
  STUDY = 'STUDY',
  LIST = 'LIST'
}
