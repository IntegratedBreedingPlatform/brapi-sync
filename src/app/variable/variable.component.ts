import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlockUIService } from 'ng-block-ui';
import { EXTERNAL_REFERENCE_SOURCE } from '../app.constants';
import { ContextService } from '../context.service';
import { AlertService } from '../shared/alert/alert.service';
import { EntityEnum, ExternalReferenceService } from '../shared/external-reference/external-reference.service';
import { StudiesService } from '../shared/brapi/2.1/api/studies.service';
import { StudyUpdateRequest } from '../shared/brapi/2.1/model/study-update-request';

declare const BrAPI: any;

@Component({
  selector: 'app-variable',
  templateUrl: './variable.component.html',
  styleUrls: ['./variable.component.css']
})
export class VariableComponent implements OnInit {

  brapiSource: any;
  brapiDestination: any;
  sourceVariables: any = {};
  variablesMap: any = {};
  isLoading = false;
  isSaving = false;
  variablesSaved = false;
  isStudySelectable = false;
  sourceVariablesAliasByOntologyNames: any = {};

  constructor(private router: Router,
              private http: HttpClient,
              public externalReferenceService: ExternalReferenceService,
              public context: ContextService,
              private alertService: AlertService,
              private blockUIService: BlockUIService,
              private studiesService: StudiesService) {
    this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
  }

  ngOnInit(): void {
    this.alertService.removeAll();
    if (this.context.sourceStudy && this.context.sourceStudy.studyDbId) {
      this.load();
    } else {
      this.isStudySelectable = true;
    }
  }

  onStudySelect(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.setTargetStudyToContext();

    if (this.context.targetStudy) {
      this.sourceVariables = await this.loadVariablesFromSource();
      this.loadVariablesFromTarget();
    } else {
      this.alertService.showDanger(`${this.context.sourceStudy.studyName} is not present in the destination server nor was previously imported from the target server.`);
    }
    // TODO: review this error message
    this.isLoading = false;
  }

  async setTargetStudyToContext(): Promise<void> {
    // try to get study from target by external reference
    this.context.targetStudy = await this.getStudyFromTargetServer({
      externalReferenceId: this.externalReferenceService.getReferenceId(EntityEnum.STUDIES, this.context.sourceStudy.studyDbId),
      externalReferenceSource: EXTERNAL_REFERENCE_SOURCE
    });
    // if study is not present in target server searching by external reference,
    // verify if the study was previously imported from the target server
    if (!this.context.targetStudy && this.context.sourceTrial && this.context.sourceTrial.externalReferences) {
      const sourceExternalReferences = this.context.sourceTrial.externalReferences
        .filter((externalReference: any) => externalReference.referenceID.startsWith(this.context.destination));
      if (sourceExternalReferences.length === 1) {
        const targetStudyDbId = sourceExternalReferences[0].referenceID.replace(`${this.context.destination}/${EntityEnum.TRIALS}/`, '');
        this.context.targetStudy = await this.getStudyFromTargetServer({ trialDbId: targetStudyDbId });
        this.context.sourceStudyWasPreviouslyImportedFromTarget = true;
      }
    }
  }

  hasVariableMatches(): boolean {
    return Object.entries(this.variablesMap).length > 0;
  }

  loadVariablesFromSource(): Promise<any> {
    // Get the variables from source study
    return new Promise<any>(resolve => {
      const variables: any = {};
      this.brapiSource.search_variables({
          studyDbId: [this.context.sourceStudy.studyDbId]
        }
      ).all((result: any[]) => {
        result.forEach((observationVariable) => {
          if (observationVariable.contextOfUse?.includes('PLOT')) {
            variables[observationVariable.observationVariableName] = observationVariable;
          }
        });
        resolve(variables);
      });
    });
  }

  async loadVariablesFromTarget(): Promise<void> {
    // Get the variables from target system
    const observationVariableNames: string[] = [];
    Object.entries<any>(this.sourceVariables).forEach(async ([key, value]) => {
      const variableName: string = value.observationVariableName;
      observationVariableNames.push(variableName);

      if (value.ontologyReference && value.ontologyReference.ontologyName !== variableName) {
        const ontologyName: string = value.ontologyReference.ontologyName;

        observationVariableNames.push(ontologyName);
        this.sourceVariablesAliasByOntologyNames[ontologyName] = variableName;
      }
    });

    if (observationVariableNames.length > 0) {
      const targetVariables: any[] = await this.findVariablesFromTarget(observationVariableNames);
      targetVariables.forEach((variableFromTarget) => {
        const variableName: string = variableFromTarget.observationVariableName;
        if (this.sourceVariables[variableName]) {
          // variable matches with by the same alias or name in source and target
          this.variablesMap[variableName] = variableFromTarget;
        } else if (variableFromTarget.ontologyReference && this.sourceVariables[variableFromTarget.ontologyReference.ontologyName]) {
          // variable has an alias in target
          this.variablesMap[variableFromTarget.ontologyReference.ontologyName] = variableFromTarget;
        } else if (this.sourceVariablesAliasByOntologyNames[variableName]) {
          // variable has an alias in source
          const variableAlias: string = this.sourceVariablesAliasByOntologyNames[variableName];
          this.variablesMap[variableAlias] = variableFromTarget;
        } else {
          // variable has alias in both source and target
          const variableAlias: string = this.sourceVariablesAliasByOntologyNames[variableFromTarget.ontologyReference.ontologyName];
          this.variablesMap[variableAlias] = variableFromTarget;
        }
      });
    }
  }

  findVariablesFromTarget(observationVariableNames: string[]): Promise<any> {
    return new Promise<any>(resolve => {
      this.brapiDestination.search_variables({
          observationVariableNames
        }
      ).all((results: any[]) => {
        resolve(results);
      });
    });
  }

  async post(): Promise<void> {
    const allVariableHasAMatch = Object.entries(this.sourceVariables).every(([key, value]) => this.isValidMapping(value));
    if (allVariableHasAMatch) {
      // Add Observation Variable to the study
      this.associateTraitsToStudy(Object.values(this.variablesMap));
    }
  }

  async associateTraitsToStudy(observationVariables: any[]): Promise<void> {
    this.isSaving = true;
    this.blockUIService.start('main');

    const observationVariableDbIds: string[] = observationVariables.map((o: any) => o.observationVariableDbId);
    const studyUpdateRequest: StudyUpdateRequest = new StudyUpdateRequest();
    studyUpdateRequest.observationVariableDbIds = observationVariableDbIds;
    studyUpdateRequest.trialDbId = this.context.targetStudy.trialDbId;

    // Use v2.1 PUT /studyies/{studyDbId} to associate observation variables to a study.
    const response = await this.studiesService.studiesStudyDbIdPut(this.context.destination,
      this.context.targetStudy.studyDbId, studyUpdateRequest).toPromise();

    const errors = response?.body?.metadata?.status?.filter((s) => s.messageType === 'ERROR');
    const info = response?.body?.metadata?.status?.filter((s) => s.messageType === 'INFO');

    if (errors?.length) {
      this.alertService.showDanger(errors);
    } else if (info?.length) {
      this.alertService.showSuccess(info);
    }

    this.variablesSaved = true;
    this.isSaving = false;
    this.blockUIService.stop('main');

  }

  getStudyFromTargetServer(request: any): Promise<any> {
    return new Promise<any>(resolve => {
      if (request) {
        this.brapiDestination.studies(request).all((result: any) => {
          if (result.length) {
            resolve(result[0]);
          } else {
            resolve(null);
          }
        });
      }
    });
  }

  sanitizeObject(variable: any): any {
    const copy = Object.assign({}, variable);
    // TODO: check why the code is adding __response automatic to the object.
    delete copy.__response;
    return copy;
  }

  cancel(): void {
    this.router.navigate(['entity-selector']);
  }

  isValid(): boolean {
    return Object.keys(this.sourceVariables).length > 0 && !this.variablesSaved && !this.isLoading
      && Object.entries(this.sourceVariables).every(([key, value]) => this.isValidMapping(value));
  }

  isValidMapping(sourceVariable: any): boolean {
    const targetVariable = this.variablesMap[sourceVariable.observationVariableName];
    // Source variable should have a match in the target server
    // Source and target variable should have the same datatype.
    return targetVariable && targetVariable.scale.dataType === sourceVariable.scale.dataType
      && this.isValidCategoricalValues(sourceVariable, targetVariable);
  }

  isValidCategoricalValues(sourceVariable: any, targetVariable: any): boolean {
    // Check if the source and target variables cagetorical valid values are equal
    if (targetVariable.scale.dataType === sourceVariable.scale.dataType && targetVariable.scale.dataType === 'Nominal') {
      const sortArray = (array: any[]) => array.sort((a, b) => (a.value > b.value) ? 1 : -1);
      const objectsEqual = (o1: any, o2: any) => Object.keys(o1).length === Object.keys(o2).length
        && Object.keys(o1).every(p => o1[p] === o2[p]);
      const arraysEqual = (a1: any[], a2: any[]) => a1.length === a2.length && a1.every((o: any, idx: any) => objectsEqual(o, a2[idx]));
      return arraysEqual(sortArray(sourceVariable.scale.validValues.categories), sortArray(targetVariable.scale.validValues.categories));
    } else {
      return true;
    }
  }

  canProceed(): boolean {
    return this.variablesSaved;
  }

  async next(): Promise<void> {
    this.context.variablesMap = this.variablesMap;
    this.context.sourceVariablesAliasByOntologyNames = this.sourceVariablesAliasByOntologyNames;
    this.router.navigate(['observation']);
  }

}

