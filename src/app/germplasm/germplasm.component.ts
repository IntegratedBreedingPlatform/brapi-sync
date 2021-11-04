import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { brapiAll } from '../util/brapi-all';
import { EXTERNAL_REFERENCE_SOURCE } from '../app.constants';
import { StudyFilterComponent } from '../shared/study-selector/study-filter.component';
import { EntityEnum, ExternalReferenceService } from '../shared/external-reference/external-reference.service';
import { AlertService } from '../shared/alert/alert.service';

declare const BrAPI: any;

@Component({
  selector: 'app-germplasm',
  templateUrl: './germplasm.component.html',
  styleUrls: ['./germplasm.component.css']
})
export class GermplasmComponent implements OnInit {

  brapiDestination: any;
  isSaving = false;
  isLoading = false;

  filter = FILTER.STUDY;
  FILTERS = FILTER;
  germplasm: any = [];
  page = 1;
  // TODO bms /search/germplasm, using many get /germplasm for now
  pageSize = 5;
  totalCount = 0;

  // { germplasmDbId: germplasm }
  selectedItems: { [key: string]: any } = {};
  isSelectAllPages = false;

  errors: any = [];
  info: any = [];

  breedingMethodsDestByName: any = {};
  breedingMethodsDestById: any = {};
  breedingMethodsSourceByName: any = {};
  breedingMethodsSourceById: any = {};
  germplasmInDestinationByPUIs: any = {};
  germplasmInDestinationByRefIds: any = {};

  constructor(
    private router: Router,
    public context: ContextService,
    private modalService: NgbModal,
    private http: HttpClient,
    private externalReferenceService: ExternalReferenceService,
    private alertService: AlertService
  ) {
    // TODO / testing / remove
    // this.load();
    this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
  }

  ngOnInit(): void {
    this.alertService.removeAll();
  }

  back(): void {
    this.router.navigate(['entity-selector']);
  }

  import(): void {
    if (this.isSelectAllPages) {
      const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
      brapi.germplasm({
        studyDbId: this.context.sourceStudy.studyDbId,
        // put a limit on synchronization (default page=1000). TODO improve
        pageRange: [0, 1],
      }).all((germplasm: any[]) => {
        this.post(germplasm);
      });
    } else {
      const germplasm = Object.values(this.selectedItems);
      this.post(germplasm);
    }
  }

  private async post(germplasm: any[]): Promise<void> {
    try {
      this.isSaving = true;
      germplasm = germplasm.filter((g) => !this.isGermplasmExistsInDestination(g));
      if (!germplasm.length) {
        return;
      }
      const request = germplasm.map((g) => this.transformForSave(g));
      const res = await this.http.post(this.context.destination + '/germplasm', request).toPromise();
      this.onSuccess(res);
    } catch (error: any) {
      this.onError(error);
    }
    this.isSaving = false;
  }

  transformForSave(germplasm: any): any {
    const copy = Object.assign({}, germplasm);

    delete copy.germplasmDbId;

    if (!(copy.externalReferences && copy.externalReferences.length)) {
      copy.externalReferences = [];
    }
    copy.externalReferences.push({
      referenceID: this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM, germplasm.germplasmDbId),
      referenceSource: EXTERNAL_REFERENCE_SOURCE
    });

    copy.breedingMethodDbId = this.getBreedingMethodIdInDest(copy);

    // FIXME! bms should handle defaults
    if (!copy.acquisitionDate) {
      copy.acquisitionDate = new Date().toISOString().slice(0, 10);
    }
    if (!copy.countryOfOriginCode) {
      copy.countryOfOriginCode = 'USA';
    }

    if (!copy.additionalInfo) {
      copy.additionalInfo = {};
    }

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

  renderBreedingMethodCell(g: any): string {
    if (!this.breedingMethodsSourceById[g.breedingMethodDbId]) {
      return '';
    }
    let cell = this.breedingMethodsSourceById[g.breedingMethodDbId].breedingMethodName;
    const b = this.getBreedingMethodIdInDest(g);

    if (!b) {
      cell = '<i class="text-danger" title="Doesn\'t exists in target">&#10007;</i> ' + cell;
    } else {
      cell = '<i class="text-success" title="exists in target">&#10003;</i> ' + cell;
    }
    return cell;
  }

  onError(res: HttpErrorResponse): void {
    // TODO ng-toast?
    // alert('error');
    console.error(res);
  }

  onSuccess(res: any): void {
    this.errors = res.metadata.status.filter((s: any) => s.messageType === 'ERROR');
    this.info = res.metadata.status.filter((s: any) => s.messageType === 'INFO');
    if (this.errors.length) {
      this.alertService.showDanger(this.errors);
    } else if (this.info.length) {
      this.alertService.showSuccess(this.info);
    }
    this.load();
  }

  addFilter(): void {
    this.modalService.open(StudyFilterComponent).result
      .then(() => {
        if (this.context.sourceStudy && this.context.sourceStudy.studyDbId) {
          this.load();
        }
      });
  }

  async load(): Promise<void> {
    this.reset();
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
          studyDbId: this.context.sourceStudy.studyDbId,
          page: (this.page - 1).toString(),
          pageSize: this.pageSize.toString(),
        }
      }).toPromise();
      this.germplasm = res.result.data;
      this.totalCount = res.metadata.pagination.totalCount;

      await this.searchInTarget(this.germplasm);

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
    } catch (error: any) {
      this.onError(error);
    }
    this.isLoading = false;
  }

  reset(): void {
    this.selectedItems = {};
    this.isSelectAllPages = false;
    this.breedingMethodsDestByName = {};
    this.breedingMethodsDestById = {};
    this.breedingMethodsSourceByName = {};
    this.breedingMethodsSourceById = {};
    this.germplasmInDestinationByPUIs = {};
    this.germplasmInDestinationByRefIds = {};
  }

  async searchInTarget(germplasm: any[]): Promise<void> {
    // Find germplasm in destination by Permanent Unique Identifier (germplasmPUI)
    const germplasmPUIs = germplasm.filter(g => g.germplasmPUI !== null && g.germplasmPUI !== undefined).map(g => g.germplasmPUI);
    const germplasmByPUIsResult = await brapiAll(this.brapiDestination.search_germplasm({
      germplasmPUIs: germplasmPUIs
    }));
    if (germplasmByPUIsResult && germplasmByPUIsResult.length && germplasmByPUIsResult[0].data.length) {
      germplasmByPUIsResult[0].data.forEach((g: any) => {
        this.germplasmInDestinationByPUIs[g.germplasmPUI] = g;
      });
    };
    // Find germplasm in destination by external reference ID
    const germplasmRefIds = germplasm.map(g => this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM, g.germplasmDbId));
    const germplasmByRefIdsResult = await brapiAll(this.brapiDestination.search_germplasm({
      externalReferenceIDs: germplasmRefIds
    }))
    if (germplasmByRefIdsResult && germplasmByRefIdsResult.length && germplasmByRefIdsResult[0].data.length) {
      germplasmByRefIdsResult[0].data.forEach((g: any) => {
        if (g.externalReferences && g.externalReferences.length) {
          g.externalReferences.forEach((ref: any) => {
            this.germplasmInDestinationByRefIds[ref.referenceID] = g;
          });
        }
      });
    }
  }

  isGermplasmExistsInDestination(germplasm: any) {
    // Check first if the germplasm has a match by PUI
    return this.germplasmInDestinationByPUIs[germplasm.germplasmPUI] || this.germplasmInDestinationByRefIds[this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM, germplasm.germplasmDbId)];
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
