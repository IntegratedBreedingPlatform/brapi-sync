import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { HttpClient } from '@angular/common/http';
import { brapiAll } from '../util/brapi-all';
import { ExternalReferenceService } from '../shared/external-reference/external-reference.service';

declare const BrAPI: any;

@Component({
  selector: 'app-observation',
  templateUrl: './observation.component.html',
  styleUrls: ['./observation.component.css']
})
export class ObservationComponent implements OnInit {

  brapiSource: any;
  sourceGermplasm: any[] = [];
  sourceObservationUnits: any[] = [];
  page = 1;
  pageSize = 20;
  germplasmTotalCount = 0;
  loading = false;
  isSaving = false;
  germplasmInDestinationByRefId: any = {};
  info: any = [];
  errors: any = [];

  constructor(private router: Router,
              private http: HttpClient,
              public externalReferenceService: ExternalReferenceService,
              public context: ContextService) {
  }

  ngOnInit(): void {
    // Get the germplasm of the study from source
    this.loadGermplasm();
    // Get the observation units of the study from source
    this.loadObservationUnits();
  }

  async next(): Promise<void> {
    this.router.navigate(['observation']);
  }

  back(): void {
    this.router.navigate(['study']);
  }

  async post(): Promise<void> {
    this.isSaving = true;
    // Load all germplasm from source
    const res: any = await this.http.get(this.context.source + '/germplasm', {
      params: {
        studyDbId: this.context.studySelected.studyDbId,
        pageSize: '10000'
      }
    }).toPromise();
    let allGermplasm = res.result.data;

    await this.searchInTarget(allGermplasm);

    const data = this.transform(this.sourceObservationUnits);
    console.log(data);
    const postRes: any = await this.http.post(this.context.destination + '/observationunits', data
    ).toPromise();
    this.errors = postRes.metadata.status.filter((s: any) => s.messageType === 'ERROR');
    this.info = postRes.metadata.status.filter((s: any) => s.messageType === 'INFO');
    this.isSaving = false;
  }

  loadObservationUnits() {
    const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapi.search_observationunits({
        studyDbIds: [this.context.studySelected.studyDbId]
      }
    ).all((result: any) => {
      this.sourceObservationUnits = result;
      console.log(result);
    });
  }

  async loadGermplasm(): Promise<void> {
    this.loading = true;
    try {
      const res: any = await this.http.get(this.context.source + '/germplasm', {
        params: {
          studyDbId: this.context.studySelected.studyDbId,
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
    /**
     * TODO
     *  - search by PUID, documentationUrl, externalReferences
     *  - show synchronized sources
     *  - BMS: /search/germplasm (IBP-4448)
     *  - search by other fields: e.g PUID
     */
    const brapi = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
    const germplasmInDestination = await brapiAll(
      brapi.data(germplasm.map((germplasm: any) => this.externalReferenceService.getReferenceId('germplasm', germplasm.germplasmDbId))
      ).germplasm((id: any) => {
        return {
          externalReferenceID: id,
          // guard against brapjs get-all behaviour
          pageRange: [0, 1],
          pageSize: 1
        };
      })
      , 30000);

    if (germplasmInDestination && germplasmInDestination.length) {
      germplasmInDestination.forEach((g: any) => {
        if (g.externalReferences && g.externalReferences.length) {
          g.externalReferences.forEach((ref: any) => {
            this.germplasmInDestinationByRefId[ref.referenceID] = g;
          });
        }
      });
    }
  }

  getTargetGermplasm(germplasm: any) {
    const referenceId = this.externalReferenceService.getReferenceId('germplasm', germplasm.germplasmDbId);
    return this.germplasmInDestinationByRefId[referenceId];
  }

  transform(observationUnits: any[]) {
    return observationUnits.map(observationUnit => {

      const targetGermplasm = this.germplasmInDestinationByRefId[this.externalReferenceService.getReferenceId('germplasm', observationUnit.germplasmDbId)];
      return {
        // FIXME: mock additionalInfo for now because search observationunit schema is not yet fixed.
        // TODO: IBP-4725 Fix search observationunit schema first
        additionalInfo: {},
        externalReferences: this.externalReferenceService.generateExternalReference(observationUnit.observationUnitDbId, 'observationunits', observationUnit.externalReferences),
        germplasmDbId: targetGermplasm.germplasmDbId,
        germplasmName: targetGermplasm.germplasmName,
        locationDbId: this.context.targetLocation.locationDbId,
        locationName: this.context.targetLocation.locationName,
        observationUnitName: observationUnit.observationUnitName,
        observationUnitPUI: observationUnit.observationUnitPUI,
        // FIXME: mock observationUnitPosition for now becaus search observationunit is not yet fixed.
        // TODO: IBP-4725 Fix search observationunit schema first
        observationUnitPosition: {
          'entryType': 'Test entry',
          'geoCoordinates': {
            'geometry': {
              'coordinates': [
                -76.506042,
                42.417373,
                123
              ],
              'type': 'Point'
            },
            'type': 'Feature'
          },
          'observationLevelRelationships': [
            {
              'levelCode': '1',
              'levelName': 'PLOT_NO',
              'levelOrder': 0
            },
            {
              'levelCode': '1',
              'levelName': 'REP_NO',
              'levelOrder': 0
            }
          ],
          'positionCoordinateX': '1',
          'positionCoordinateY': '3'
        },
        programDbId: this.context.targetProgramSelected.programDbId,
        programName: this.context.targetProgramSelected.programName,
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
    // TODO: Implement this.

  }

  isValid(): boolean {
    return !this.loading && !this.isSaving && this.sourceObservationUnits.length > 0 && this.sourceGermplasm.length > 0;
  }

}
