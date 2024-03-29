import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlockUIService } from 'ng-block-ui';
import { ContextService } from '../context.service';
import { AlertService } from '../shared/alert/alert.service';
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
              public context: ContextService,
              private alertService: AlertService,
              private blockUIService: BlockUIService) {
    this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
  }

  ngOnInit(): void {
    this.alertService.removeAll();
    this.load();
  }

  async load() {
    this.loading = true;
    // Load the target observation units so that we can map them from the source
    const observationUnits = await this.loadTargetObservationUnits();
    if (observationUnits.length > 0) {
      this.setTargetObservationUnitsByReferenceId(observationUnits);

      this.sourceObservations = await this.loadSourceObservations();
      this.sourceObservationsByVariable = this.groupObservationsByVariable(this.sourceObservations);

      this.targetObservations = await this.loadTargetObservations();
      this.targetObservationsByVariable = this.groupObservationsByVariable(this.targetObservations);
    } else {
      this.alertService.showDanger(`There are no observation units in the target server.`);
    }
    this.loading = false;
  }

  async setTargetObservationUnitsByReferenceId(observationUnits: any[]) {
    if (this.context.sourceStudyWasPreviouslyImportedFromTarget) {
      // Search in source the previously imported observation units from the target
      const externalReferenceIDs = observationUnits
        .map((observationUnit) => `${this.context.destination}/${EntityEnum.OBSERVATIONUNITS}/${observationUnit.observationUnitDbId}`);
      const previouslyImportedObservationsUnits =
        await this.loadSourceObservationUnits({ externalReferenceIDs });
      if (previouslyImportedObservationsUnits.length > 0) {
        previouslyImportedObservationsUnits
          .filter((observationUnit) => observationUnit.externalReferences)
          .forEach((observationUnit) => {
            const externalReference = observationUnit.externalReferences
              .filter((er: any) => er.referenceID.startsWith(this.context.destination));
            if (externalReference.length === 1) {
              const targetObservationUnitDbId = externalReference[0].referenceID.replace(`${this.context.destination}/${EntityEnum.OBSERVATIONUNITS}/`, '');
              observationUnits.filter((ou) => ou.observationUnitDbId === targetObservationUnitDbId)
                .forEach((ou) => {
                  // Generates a virtual externalReferenceID for the previously imported observation unit
                  // that later can be used for mapping the source with the target
                  const generatedExternalReference =
                    this.externalReferenceService.getReferenceId(EntityEnum.OBSERVATIONUNITS,  observationUnit.observationUnitDbId);
                  this.targetObservationUnitsByReferenceId[generatedExternalReference] = ou;
                });
            }
          });
      } else {
        this.alertService.showDanger(`There are no observation units in the target server.`);
      }
    } else {
      this.targetObservationUnitsByReferenceId = this.createObservationUnitsByReferenceId(observationUnits);
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

  async loadSourceObservationUnits(request: any): Promise<any[]> {
    return new Promise<any>(resolve => {
      // Get the observation units from target study
      this.brapiSource.search_observationunits(request).all((result: any[]) => {
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
    try {
      this.isSaving = true;
      this.blockUIService.start('main');
      const observations = this.transform(this.sourceObservations);
      if (observations.length > 0) {
        const postRes: any = await this.http.post(this.context.destination + '/observations', observations
        ).toPromise();
        this.errors = postRes.metadata.status.filter((s: any) => s.messageType === 'ERROR');
        this.info = postRes.metadata.status.filter((s: any) => s.messageType === 'INFO');
        if (!this.errors.length) {
          this.observationsSaved = true;
        }
        if (this.errors.length) {
          this.alertService.showDanger(this.errors);
        } else if (this.info.length) {
          this.alertService.showSuccess(this.info);
        }
      } else {
        this.alertService.showDanger('No observation to import.');
        this.observationsSaved = true;
      }
    } catch (error: any) {
      this.errors.push({ message: error.message });
    }
    this.isSaving = false;
    this.blockUIService.stop('main');

  }

  transform(sourceObservations: any[]) {
    const observations: any = [];
    sourceObservations.forEach((observation) => {
      const targetObservationUnit = this.targetObservationUnitsByReferenceId[this.externalReferenceService.getReferenceId(EntityEnum.OBSERVATIONUNITS, observation.observationUnitDbId)];
      if (this.isValidForImport(observation) && targetObservationUnit) {
        const sourceVariableAlias = this.context.sourceVariablesAliasByOntologyNames[observation.observationVariableName];
        const key: string = (sourceVariableAlias) ? sourceVariableAlias : observation.observationVariableName;
        observations.push({
          germplasmDbId: targetObservationUnit.germplasmDbId,
          observationUnitDbId: targetObservationUnit.observationUnitDbId,
          observationVariableDbId: this.context.variablesMap[key].observationVariableDbId,
          observationVariableName: this.context.variablesMap[key].observationVariableName,
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
      observationsCountByVariable[k] = observations.filter((observation) =>
        observation.observationVariableName === k || this.context.sourceVariablesAliasByOntologyNames[observation.observationVariableName] === k);
    }
    return observationsCountByVariable;
  }

  createObservationUnitsByReferenceId(observationUnits: any[]) {
    const observationUnitsByReferenceId: any = {};
    observationUnits.forEach((observationUnit) => {
      const externalReference = observationUnit.externalReferences[0];
      observationUnitsByReferenceId[externalReference.referenceID] = observationUnit;
    });
    return observationUnitsByReferenceId;
  }

  cancel(): void {
    this.router.navigate(['entity-selector']);
  }

  isValid(): boolean {
    return !this.observationsSaved && !this.loading && Object.entries(this.context.variablesMap).some((([key, value]) => {
      return this.isValidForImport(value);
    }));
  }

  isValidForImport(observation: any): boolean {
    // check if variable has alias
    let variableName: string;
    if (observation.ontologyReference && observation.ontologyReference.ontologyName &&
      observation.ontologyReference.ontologyName !== observation.observationVariableName) {
      variableName = observation.ontologyReference.ontologyName;
    } else {
      variableName = observation.observationVariableName;
    }

    const variableAlias = this.context.sourceVariablesAliasByOntologyNames[variableName];
    const key: string = variableAlias ? variableAlias : variableName;
    // Check if the variable already has existing observation in the target server
    const observationsByVariable: any[] = this.targetObservationsByVariable[key];
    return observationsByVariable && observationsByVariable.length <= 0;
  }

  canProceed(): boolean {
    return true;
  }

  sanitizeObject(observations: any[]) {
    const copyObservations = observations.map((o: any) => {
      const copy = Object.assign({}, o);
      // TODO: check why the code is adding __response automatic to the object.
      delete copy.__response;
      return copy;
    });
    return copyObservations;
  }

}
