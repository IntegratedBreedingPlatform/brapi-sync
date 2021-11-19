import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from 'src/app/context.service';
import { brapiAll } from 'src/app/util/brapi-all';
import { DropdownVirtualScrollResult } from '../dropdown-virtual-scroll/dropdown-vritual-scroll.component';

declare const BrAPI: any;

@Component({
  selector: 'app-study-filter',
  templateUrl: './study-filter.component.html',
  styleUrls: ['./study-filter.component.css']
})
export class StudyFilterComponent {

  isTrialDisabled = false;
  isStudyDisabled = false;
  isLocationDisabled = false;
  brapiSource: any;
  trials: any[] = [];
  studies: any[] = [];
  locations: any[] = [];
  trialSelected: any;
  studySelected: any;
  locationSelected: any;
  loading = false;

  constructor(public activeModal: NgbActiveModal,
              public context: ContextService) {
    this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
  }

  brapiTrials = async (page: number) => {
    return new Promise<DropdownVirtualScrollResult>(resolve => {
      this.brapiSource.trials({
        programDbId: this.context.sourceProgram.programDbId,
        pageRange: [page, page + 1]
      }).all((items: any[]) => {
        if (items.length) {
          const pageSize = items[0].__response.metadata.pagination.pageSize;
          const totalCount = items[0].__response.metadata.pagination.totalCount;
          const totalPages = items[0].__response.metadata.pagination.totalPages;
          resolve({ items, pageSize, totalCount, totalPages });
        }
      });
    });
  };

  brapiLocations = async (page: number) => {
    return new Promise<DropdownVirtualScrollResult>(resolve => {
      if (this.trialSelected && this.trialSelected.trialName) {
        // If a trial is selected, it should list all available location
        // associated to studies.
        brapiAll(this.brapiSource.studies({
          programDbId: this.context.sourceProgram.programDbId,
          trialDbId: this.trialSelected.trialDbId,
          active: true
        })).then((result) => {
          if (result && result.length) {
            this.brapiSource.data([...new Set(result.map((study: any) => study.locationDbId))]).locations((locationDbId: any) => {
              return { locationDbId };
            }).all((items: any[]) => {
              if (items.length) {
                resolve(this.createDropdownVirtualScrollResult(items));
              }
            });
          }
        });
      } else {
        // If no trial is selected, list all locations in the system
        this.brapiSource.locations({
          pageRange: [page, page + 1]
        }).all((items: any[]) => {
          if (items.length) {
            resolve(this.createDropdownVirtualScrollResult(items));
          }
        });
      }
    });
  };

  brapiStudies = async (page: number) => {
    return new Promise<DropdownVirtualScrollResult>(resolve => {
      const params: any = {};
      if (this.trialSelected && this.trialSelected.trialDbId) {
        params.trialDbId = this.trialSelected.trialDbId;
      }
      if (this.locationSelected && this.locationSelected.locationDbId) {
        params.locationDbId = this.locationSelected.locationDbId;
      }
      this.studySelected = null;
      this.brapiSource.studies(Object.assign({
        programDbId: this.context.sourceProgram.programDbId,
        active: true,
        pageRange: [page, page + 1],
      }, params)).all((items: any[]) => {
        if (items.length) {
          resolve(this.createDropdownVirtualScrollResult(items));
        }
      });
    });
  }

  createDropdownVirtualScrollResult(items: any[]): DropdownVirtualScrollResult {
    const pageSize = items[0].__response.metadata.pagination.pageSize;
    const totalCount = items[0].__response.metadata.pagination.totalCount;
    const totalPages = items[0].__response.metadata.pagination.totalPages;
    return { items, pageSize, totalCount, totalPages };
  }

  select(): void {
    this.context.sourceStudy = this.studySelected;
    this.context.sourceTrial = this.trialSelected;
    this.context.sourceLocation = this.locationSelected;
    this.activeModal.close();
  }

  cancel(): void {
    this.activeModal.close();
  }

  isValid(): boolean {
    return !this.loading && this.studySelected;
  }

}
