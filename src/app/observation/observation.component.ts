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
  targetObservationsByVariable: any = {};
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
    this.load();
  }

  async load() {
    // Load the target observation units so that we can map them from the source
    const observationUnits = await this.loadTargetObservationUnits();
    this.targetObservationUnitsByReferenceId = this.createObservationUnitsByReferenceId(observationUnits);

    if (observationUnits.length > 0) {
      this.sourceObservations = await this.loadSourceObservations();
      this.sourceObservationsByVariable = this.groupObservationsByVariable(this.sourceObservations);
      
      this.targetObservations = await this.loadTargetObservations();
      this.targetObservationsByVariable = this.groupObservationsByVariable(this.targetObservations);
    } else {
      this.errors.push({ message: `There are no observation units in the target server.` });
    }
  }

  async loadSourceObservations(): Promise<any[]> {
    // Get the observations from source study
    return new Promise<any>(resolve => { 
      this.brapiSource.observations({
        studyDbId: [this.context.sourceStudy.studyDbId]
      }
      ).all((result: any[]) => {
        resolve(result);
      });
    });
  }

  async loadTargetObservations(): Promise<any[]> {
    // Get the observations from target study
    return new Promise<any>(resolve => { 
      this.brapiDestination.observations({
        studyDbId: [this.context.targetStudy.studyDbId]
      }
      ).all((result: any[]) => {
        resolve(result);
      });
    });
  }

  async loadTargetObservationUnits(): Promise<any[]> {
    return new Promise<any>(resolve => {
      // Get the observation units from target study
      this.brapiDestination.search_observationunits({
        studyDbIds: [this.context.targetStudy.studyDbId]
      }
      ).all((result: any[]) => {
        resolve(result);
      });
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
    const observations:any = [];
    sourceObservations.forEach((observation) => {
      const targetObservationUnit = this.targetObservationUnitsByReferenceId[this.externalReferenceService.getReferenceId(EntityEnum.OBSERVATIONUNITS, observation.observationUnitDbId)];
      if (this.isValidForImport(observation.observationVariableName)) {
        observations.push({
          germplasmDbId: targetObservationUnit.germplasmDbId,
          observationUnitDbId: targetObservationUnit.observationUnitDbId,
          observationVariableDbId: this.context.variablesMap[observation.observationVariableName].observationVariableDbId,
          observationVariableName: this.context.variablesMap[observation.observationVariableName].observationVariableName,
          studyDbId: this.context.targetStudy.studyDbId,
          value: observation.value
        });
      }
    });
    return observations;
  }

  groupObservationsByVariable(observations: any[]) {
    const observationsCountByVariable: any = {};
    // Count observations per observation variable.
    for (const [k, v] of Object.entries(this.context.variablesMap)) {
      observationsCountByVariable[k] = observations.filter((observation) => observation.observationVariableName === k);
    }
    return observationsCountByVariable;
  }

  createObservationUnitsByReferenceId(observationUnits: any[]) {
    const observationUnitsByReferenceId: any = {};
    observationUnits.forEach((observationUnit) => {
      //const externalReference = observationUnit.externalReferences.filter((externalReference: any) => { externalReference.referenceSource === EXTERNAL_REFERENCE_SOURCE})[0];
      const externalReference = observationUnit.externalReferences[0];
      observationUnitsByReferenceId[externalReference.referenceID] = observationUnit;
    });
    return observationUnitsByReferenceId;
  }

  cancel(): void {
    this.router.navigate(['entity-selector']);
  }

  isValid(): boolean {
    return true;
  }

  isValidForImport(variableName: string): boolean {
    // Check if the variable already has existing observation in the target server
    const observationsByVariable: any[] = this.targetObservationsByVariable[variableName];
    return observationsByVariable && observationsByVariable.length <= 0;
  }

  canProceed() : boolean {
    return true; 
  }

}
