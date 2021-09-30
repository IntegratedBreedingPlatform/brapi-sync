import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as karmaConf from 'karma.conf';
import { EXTERNAL_REFERENCE_SOURCE } from '../app.constants';
import { ContextService } from '../context.service';
import { EntityEnum, ExternalReferenceService } from '../shared/external-reference/external-reference.service';

declare const BrAPI: any;

@Component({
  selector: 'app-observation',
  templateUrl: './observation.component.html',
  styleUrls: ['./observation.component.css']
})
export class ObservationComponent implements OnInit {

  brapiSource: any;
  brapiDestination: any;
  info: any = [];
  errors: any = [];
  loading = false;
  isSaving = false;
  sourceObservations: any[] = [];
  sourceObservationsByVariable: any = {};

  targetObservations: any[] = [];
  targetObservationUnitsByReferenceId: any = {};
  
  observationsSaved = false;


  constructor(private router: Router,
    private http: HttpClient,
    public externalReferenceService: ExternalReferenceService,
    public context: ContextService) {
        this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
        this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
}

  ngOnInit(): void {
    this.loadSourceObservations();
    this.loadTargetObservationUnits();
  }

  loadTargetObservationUnits() {
    // Get the observation units from target study
    this.brapiSource.search_observationunits({
        studyDbIds: [this.context.targetStudy.studyDbId]
      }
    ).all((result: any[]) => {
      result.forEach((observationUnit) => {
        //const externalReference = observationUnit.externalReferences.filter((externalReference: any) => { externalReference.referenceSource === EXTERNAL_REFERENCE_SOURCE})[0];
        const externalReference = observationUnit.externalReferences[0];
        this.targetObservationUnitsByReferenceId[externalReference.referenceID] = observationUnit;
      });
    });
  }

  async loadSourceObservations() : Promise<void> {
    // Get the observations from source study
    this.brapiSource.observations({
      studyDbId: [this.context.sourceStudy.studyDbId]
    }
    ).all((result: any) => {
      this.sourceObservations = result;
      // Group the source observations per observation variable.
      for (const [k, v] of Object.entries(this.context.targetVariables)) {
        this.sourceObservationsByVariable[k] = this.sourceObservations.filter((sourceObservation) => sourceObservation.observationVariableName === k);
      }
    });

  }

  async post(): Promise<void> {

    let data: any;
    try {
      data = this.transform(this.sourceObservations);
    } catch (message) {
      this.errors.push({ message: message });
      this.isSaving = false;
      return;
    }
    try {
      const postRes: any = await this.http.post(this.context.destination + '/observations', data
      ).toPromise();
      this.errors = postRes.metadata.status.filter((s: any) => s.messageType === 'ERROR');
      this.info = postRes.metadata.status.filter((s: any) => s.messageType === 'INFO');
      if (!this.errors.length) {
        this.observationsSaved = true;
      }
    } catch (error: any) {
      this.errors.push({ message: error.message });
    }
    this.isSaving = false;

  }

  transform(sourceObservations: any[]) {
    return sourceObservations.map(observation => {
      return {
        observationUnitDbId: this.targetObservationUnitsByReferenceId[this.externalReferenceService.getReferenceId(EntityEnum.OBSERVATIONUNITS, observation.observationUnitDbId)].observationUnitDbId,
        observationVariableDbId: this.context.targetVariables[observation.observationVariableName].observationVariableDbId,
        observationVariableName: this.context.targetVariables[observation.observationVariableName].observationVariableName,
        studyDbId: this.context.targetStudy.studyDbId,
        value: observation.value
      };
    });
  }

  cancel(): void {
    this.router.navigate(['entity-selector']);
  }

  isValid(): boolean {
    return true;
  }

  canProceed() : boolean {
    return true; 
  }

}
