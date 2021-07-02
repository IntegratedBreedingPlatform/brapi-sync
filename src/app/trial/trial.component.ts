import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from '../context.service';
import { StudyFilterComponent } from '../study-filter/study-filter.component';
import { HttpClient } from '@angular/common/http';
import { ExternalReferenceService } from '../shared/external-reference/external-reference.service';

declare const BrAPI: any;

@Component({
  selector: 'app-trial',
  templateUrl: './trial.component.html',
  styleUrls: ['./trial.component.css']
})
export class TrialComponent implements OnInit {

  searchOptions: any[] = [{ id: 1, name: 'Study' }];
  searchSelected: number = 1;
  loading = false;

  constructor(private router: Router,
              private http: HttpClient,
              private externalReferenceService: ExternalReferenceService,
              public context: ContextService,
              public modalService: NgbModal) {
  }

  ngOnInit(): void {
  }

  openSearchModal() {
    this.modalService.open(StudyFilterComponent).result.then((result) => {
    });
  }

  async next(): Promise<void> {
    this.router.navigate(['study']);
  }

  back(): void {
    this.router.navigate(['entity-selector']);
  }

  async post() {
    this.loading = true;
    await this.http.post(this.context.destination + '/trials', [this.transform(this.context.trialSelected)]).toPromise();
    this.loading = false;
  }

  transform(trial: any) {
    return {
      active: trial.active,
      additionalInfo: trial.additionalInfo,
      datasetAuthorships: trial.datasetAuthorships,
      documentationURL: trial.documentationURL,
      endDate: trial.endDate,
      externalReferences: this.externalReferenceService.generateExternalReference(trial.trialDbId, 'trials', trial.externalReferences),
      programDbId: this.context.targetProgramSelected.programDbId,
      programName: this.context.targetProgramSelected.programName,
      publications: trial.publications,
      startDate: trial.startDate,
      trialName: trial.trialName,
      trialDescription: trial.trialDescription,
      trialPUI: trial.trialPUI
    };
  }


}
