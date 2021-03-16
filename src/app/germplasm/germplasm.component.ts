import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StudyFilterComponent } from '../study-filter/study-filter.component';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

declare const BrAPI: any;

@Component({
  selector: 'app-germplasm',
  templateUrl: './germplasm.component.html',
  styleUrls: ['./germplasm.component.css']
})
export class GermplasmComponent implements OnInit {
  isSaving = false;
  isLoading = false;

  filter = FILTER.STUDY;
  FILTERS = FILTER;
  germplasm: any = [];
  page = 1;
  pageSize = 20;
  totalCount = 0;

  // { germplasmDbId: germplasm }
  selectedItems: { [key: string]: any } = {};
  isSelectAllPages = false;

  breedingMethodsDestByName: any = {};
  breedingMethodsDestById: any = {};
  breedingMethodsSourceByName: any = {};
  breedingMethodsSourceById: any = {};

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

  import(): void {
    if (this.isSelectAllPages) {
      const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
      brapi.germplasm().all((germplasm: any[]) => {
        this.post(germplasm);
      });
    } else {
      const germplasm = Object.values(this.selectedItems).map((g) => this.transformForSave(g));
      this.post(germplasm);
    }
  }

  private async post(germplasm: any[]): Promise<void> {
    try {

      const request = germplasm.map((g) => this.transformForSave(g));
      const res = await this.http.post(this.context.destination + '/germplasm', request).toPromise();
      this.onSuccess(res);
    } catch (error) {
      this.onError(error);
    }
  }

  transformForSave(germplasm: any): any {
    const copy = Object.assign({}, germplasm);
    delete copy.germplasmDbId;
    if (!(copy.externalReferences && copy.externalReferences.length)) {
      copy.externalReferences = [];
    }
    copy.externalReferences.push({
      referenceID: this.context.source + '/germplasm/' + germplasm.germplasmDbId,
      referenceSource: 'brapi-sync'
    });
    copy.breedingMethodDbId = this.getBreedingMethodIdInDest(copy);
    return copy;
  }

  private getBreedingMethodIdInDest(copy: any): string {
    const bmSource = this.breedingMethodsSourceById[copy.breedingMethodDbId];
    if (!bmSource) {
      return '';
    }
    const bmDest = this.breedingMethodsDestByName[bmSource.breedingMethodName];
    if (!bmDest) {
      return '';
    }
    return bmDest.breedingMethodDbId;
  }

  onError(res: HttpErrorResponse): void {
    // TODO ng-toast?
    alert('error');
    console.error(res);
  }

  onSuccess(res: any): void {
    // TODO ng-toast?
    alert('success');
    console.log(res);
  }

  addFilter(): void {
    this.modalService.open(StudyFilterComponent).result
      .then(() => this.load());
  }

  async load(): Promise<void> {
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
    this.isLoading = true;
    try {
      const res: any = await this.http.get(this.context.source + '/germplasm', {
        params: {
          // https://github.com/plantbreeding/brapi-Java-TestServer/issues/45
          // studyDbId: this.context.studySelected.studyDbId,
          page: (this.page - 1).toString(),
          pageSize: this.pageSize.toString(),
        }
      }).toPromise();
      this.germplasm = res.result.data;
      this.totalCount = res.metadata.pagination.totalCount;

      this.searchInTarget(this.germplasm);

      const bmDestSource: any = await this.http.get(this.context.source + '/breedingmethods').toPromise();
      if (bmDestSource.result.data && bmDestSource.result.data.length) {
        bmDestSource.result.data.forEach((bm: any) => {
          this.breedingMethodsSourceByName[bm.breedingMethodName] = bm;
          this.breedingMethodsSourceById[bm.breedingMethodDbId] = bm;
        });
      }

      const bmDestResp: any = await this.http.get(this.context.destination + '/breedingmethods').toPromise();
      if (bmDestResp.result.data && bmDestResp.result.data.length) {
        bmDestResp.result.data.forEach((bm: any) => {
          this.breedingMethodsDestByName[bm.breedingMethodName] = bm;
          this.breedingMethodsDestById[bm.breedingMethodDbId] = bm;
        });
      }
    } catch (error) {
      this.onError(error);
    }
    this.isLoading = false;
  }

  async searchInTarget(germplasm: any[]): Promise<void> {
    /**
     * TODO
     *  - search by PUID, documentationUrl, externalReferences
     *  - show synchronized sources
     *  - BMS: /search/germplasm
     */
    const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    // const byPUID = brapi.germplasm({externalReferenceId: })
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

  getSynonyms(synonyms: any[]): string {
    if (!(synonyms && synonyms.length)) {
      return '';
    }
    return synonyms.map((s) => s.synonym).join(', ');
  }
}

enum FILTER {
  STUDY = 'STUDY',
  LIST = 'LIST'
}
