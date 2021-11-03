import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { HttpClient } from '@angular/common/http';
import { brapiAll } from '../util/brapi-all';
import { EntityEnum, ExternalReferenceService } from '../shared/external-reference/external-reference.service';

declare const BrAPI: any;

@Component({
  selector: 'app-observation-unit',
  templateUrl: './observation-unit.component.html',
  styleUrls: ['./observation-unit.component.css']
})
export class ObservationUnitComponent implements OnInit {

  brapiSource: any;
  brapiDestination: any;
  sourceGermplasm: any[] = [];
  sourceObservationUnits: any[] = [];
  page = 1;
  pageSize = 20;
  germplasmTotalCount = 0;
  loading = false;
  isSaving = false;
  observationUnitsAlreadyExist = false;
  observationUnitsSaved = false;
  germplasmByGermplasmDbId: any = {};
  germplasmInDestinationByPUIs: any = {};
  germplasmInDestinationByRefIds: any = {};

  info: any = [];
  errors: any = [];

  constructor(private router: Router,
              private http: HttpClient,
              public externalReferenceService: ExternalReferenceService,
              public context: ContextService) {
    this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
  }

  ngOnInit(): void {
    // Get the germplasm of the study from source
    this.loadGermplasm();
    // Get the observation units of the study from source
    this.loadObservationUnits();
    this.checkObservationAlreadyExists();
  }

  cancel(): void {
    this.router.navigate(['entity-selector']);
  }

  async post(): Promise<void> {
    this.info = [];
    this.errors = [];
    this.isSaving = true;
    // Load all germplasm from source
    const res: any = await this.http.get(this.context.source + '/germplasm', {
      params: {
        studyDbId: this.context.sourceStudy.studyDbId,
        pageSize: '10000'
      }
    }).toPromise();
    let allGermplasm = res.result.data;

    await this.searchInTarget(allGermplasm);

    let data: any;
    try {
      data = this.transform(this.sourceObservationUnits);
    } catch (message) {
      this.errors.push({ message: message });
      this.isSaving = false;
      return;
    }
    try {

      const postRes: any = await this.http.post(this.context.destination + '/observationunits', data
      ).toPromise();
      this.errors = postRes.metadata.status.filter((s: any) => s.messageType === 'ERROR');
      this.info = postRes.metadata.status.filter((s: any) => s.messageType === 'INFO');
      if (!this.errors.length) {
        this.observationUnitsSaved = true;
      }
    } catch (error: any) {
      this.errors.push({ message: error.message });
    }
    this.isSaving = false;
  }

  loadObservationUnits() {
    this.brapiSource.search_observationunits({
        studyDbIds: [this.context.sourceStudy.studyDbId]
      }
    ).all((result: any) => {
      this.sourceObservationUnits = result;
    });
  }

  async loadGermplasm(): Promise<void> {
    this.loading = true;
    try {
      const res: any = await this.http.get(this.context.source + '/germplasm', {
        params: {
          studyDbId: this.context.sourceStudy.studyDbId,
          page: (this.page - 1).toString(),
          pageSize: this.pageSize.toString(),
        }
      }).toPromise();
      this.sourceGermplasm = res.result.data;
      this.germplasmTotalCount = res.metadata.pagination.totalCount;

      // Check if the germplasm already exists in the destination server.
      await this.searchInTarget(this.sourceGermplasm);

    } catch (error) {
      console.log(error);
    }
    this.loading = false;
  }

  async searchInTarget(germplasm: any[]): Promise<void> {

    if (germplasm && germplasm.length) {
      germplasm.forEach((g: any) => {
        this.germplasmByGermplasmDbId[g.germplasmDbId] = g;
      });
    }

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
            this.germplasmInDestinationByRefIds[ref.externalReferenceId] = g;
          });
        }
      });
    }
  
  }

  getTargetGermplasm(germplasm: any) {
    if (this.germplasmInDestinationByPUIs[germplasm.germplasmPUI]) {
      return this.germplasmInDestinationByPUIs[germplasm.germplasmPUI];
    } else {
      const referenceId = this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM, germplasm.germplasmDbId);
      return this.germplasmInDestinationByRefIds[referenceId];
    }
  }

  transform(observationUnits: any[]) {
    return observationUnits.map(observationUnit => {

      const targetGermplasm = this.getTargetGermplasm(this.germplasmByGermplasmDbId[observationUnit.germplasmDbId]);
      if (!targetGermplasm) {
        throw 'Some germplasm from source server are not yet imported in the destination server.';
      }
      return {

        additionalInfo: observationUnit.additionalInfo, // TODO: IBP-4725 Fix search observationunit schema first
        externalReferences: this.externalReferenceService.generateExternalReference(observationUnit.observationUnitDbId, EntityEnum.OBSERVATIONUNITS, observationUnit.externalReferences),
        germplasmDbId: targetGermplasm.germplasmDbId,
        germplasmName: targetGermplasm.germplasmName,
        locationDbId: this.context.targetLocation.locationDbId,
        locationName: this.context.targetLocation.locationName,
        observationUnitName: observationUnit.observationUnitName,
        observationUnitPUI: observationUnit.observationUnitPUI,
        observationUnitPosition: observationUnit.observationUnitPosition, // TODO: IBP-4725 Fix search observationunit schema first
        programDbId: this.context.targetProgram.programDbId,
        programName: this.context.targetProgram.programName,
        seedLotDbId: observationUnit.seedLotDbId,
        studyDbId: this.context.targetStudy.studyDbId,
        studyName: this.context.targetStudy.studyName,
        treatments: observationUnit.treatments,
        trialDbId: this.context.targetTrial.trialDbId,
        trialName: this.context.targetTrial.trialName
      }
    });
  }

  checkObservationAlreadyExists() {
    this.brapiDestination.search_observationunits({
        studyDbIds: [this.context.targetStudy.studyDbId],
        pageRange: [0, 1],
        pageSize: 1
      }
    ).all((result: any) => {
      if (result.length) {
        this.observationUnitsAlreadyExist = true;
      }
    });
  }

  isValid(): boolean {
    return !this.loading && !this.isSaving && !this.observationUnitsAlreadyExist && !this.observationUnitsSaved
      && this.sourceObservationUnits.length > 0 && this.sourceGermplasm.length > 0;
  }

  async next() {
    this.router.navigate(['variable']);
  }

  canProceed() {
    return this.observationUnitsAlreadyExist || this.observationUnitsSaved;
  }

}
