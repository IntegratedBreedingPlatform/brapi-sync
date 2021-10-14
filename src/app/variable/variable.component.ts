import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EXTERNAL_REFERENCE_SOURCE } from '../app.constants';
import { ContextService } from '../context.service';
import { EntityEnum, ExternalReferenceService } from '../shared/external-reference/external-reference.service';

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
  targetVariables: any = {};
  variablesMap: any = {};
  info: any = [];
  errors: any = [];
  isLoading = false;
  isSaving = false;
  variablesSaved = false;
  variablesAlreadyExist = false;
  isStudySelectable: boolean = false;

  constructor(private router: Router,
    private http: HttpClient,
    public externalReferenceService: ExternalReferenceService,
    public context: ContextService) {
        this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
        this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
}

  ngOnInit(): void {
    if (this.context.sourceStudy && this.context.sourceStudy.studyDbId) {
      this.load();
    } else {
      this.isStudySelectable = true;
    }
  }

  onStudySelect(): void {
    this.load();
  }

  async load() {
    this.isLoading = true;
    this.context.targetStudy = await this.getStudyFromTargetServer(this.context.sourceStudy.studyDbId);
    if (this.context.targetStudy) {
      this.sourceVariables = await this.loadVariablesFromSource();
      this.targetVariables = await this.loadVariablesFromTarget(this.sourceVariables);
      this.mapVariables(this.sourceVariables, this.targetVariables);
    } else {
      this.errors.push({ message: `${this.context.sourceStudy.studyName} is not present in the destination server.` });
    }
    this.isLoading = false;
  }

  mapVariables(sourceVariables: any, targetVariables: any) {
    // Map the source observation variables to the target observation variables
    Object.entries(sourceVariables).forEach(([key, value]) => {
      if (targetVariables[key]) {
        this.variablesMap[key] = targetVariables[key];
      }
    });
  }

  hasVariableMatches(): boolean {
    return Object.entries(this.variablesMap).length > 0;
  }

  loadVariablesFromSource() : Promise<any> {
    // Get the variables from source study
    return new Promise<any>(resolve => { 
      const variables: any = {};
      this.brapiSource.search_variables({
        studyDbId: [this.context.sourceStudy.studyDbId]
      }
      ).all((result: any[]) => {
        result.forEach((observationVariable) => {
          variables[observationVariable.observationVariableName] = observationVariable;
        });
        resolve(variables);
      });
    });
  }

  loadVariablesFromTarget(sourceVariables: any): Promise<any> {
    // Get the variables from target system
    const variables: any = {};
    const sourceObservationVariableNames: any[] = Object.entries<any>(this.sourceVariables).map(([key, value]) => value.observationVariableName);
    return new Promise<any>(resolve => { 
      this.brapiDestination.search_variables({
        observationVariableNames: sourceObservationVariableNames
      }
      ).all((result: any[]) => {
         result.forEach((observationVariable) => {
          variables[observationVariable.observationVariableName] = observationVariable;
         });
         resolve(variables);
      });
    });
  }

  async post(): Promise<void> {
    const allVariableHasAMatch = Object.entries(this.sourceVariables).every(([key, value]) => this.isValidMapping(value));
    if (allVariableHasAMatch) {
        // Add Observation Variable to the study
        this.updateObservationVariables(Object.values(this.variablesMap));
    }
  }

  async updateObservationVariables(observationVariables: any[]) {
    this.isSaving = true;
    observationVariables.forEach(async (observationVariable) => {

      const observationVariableNewRequest = {

        additionalInfo: observationVariable.additionalInfo,
        commonCropName: observationVariable.commonCropName,
        contextOfUse: observationVariable.contextOfUse,
        defaultValue: observationVariable.defaultValue,
        documentationURL: observationVariable.documentationURL,
        externalReferences: observationVariable.externalReferences,
        growthStage: observationVariable.growthStage,
        institution: observationVariable.institution,
        language: observationVariable.language,
        observationVariableDbId: observationVariable.observationVariableDbId,
        observationVariableName: observationVariable.observationVariableName,
        ontologyDbId: observationVariable.ontologyDbId,
        ontologyName: observationVariable.ontologyName,
        ontologyReference: observationVariable.ontologyReference,
        trait: observationVariable.trait,
        method: observationVariable.method,
        scale: observationVariable.scale,
        scientist: observationVariable.scientist,
        status: observationVariable.status,
        submissionTimestamp: observationVariable.submissionTimestamp,
        synonyms: observationVariable.synonyms,
        studyDbIds: [this.context.targetStudy.studyDbId]

      };

      // Use v2.1 PUT /variables to update and associate observation variable to a study.
      const postRes: any = await this.http.put(this.context.destination + '/variables/' + observationVariable.observationVariableDbId, observationVariableNewRequest
      ).toPromise();

      this.errors = this.errors.concat(postRes.metadata.status.filter((s: any) => s.messageType === 'ERROR'));
      this.info = this.info.concat(postRes.metadata.status.filter((s: any) => s.messageType === 'INFO'));
      
    });
    this.variablesSaved = true;
    this.isSaving = false;
    
  }

  getStudyFromTargetServer(studyDbId: any): Promise<any> {
    return new Promise<any>(resolve => { 
      if (studyDbId && studyDbId) {
        this.brapiDestination.studies({
          externalReferenceId: this.externalReferenceService.getReferenceId(EntityEnum.STUDIES, studyDbId),
          externalReferenceSource: EXTERNAL_REFERENCE_SOURCE
        }).all((result: any) => {
          if (result.length) {
            resolve(result[0]);
          } else {
            resolve(null);
          }
        });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['entity-selector']);
  }

  isValid(): boolean {
    return !this.variablesSaved && !this.isLoading && Object.entries(this.sourceVariables).every(([key, value]) => this.isValidMapping(value));
  }

  isValidMapping(sourceVariable: any): boolean {
    const targetVariable = this.variablesMap[sourceVariable.observationVariableName];
    // Source variable should have a match in the target server
    // Source and target variable should have the same datatype.
    return targetVariable && targetVariable.scale.dataType === sourceVariable.scale.dataType && this.isValidCategoricalValues(sourceVariable, targetVariable);
  }

  isValidCategoricalValues(sourceVariable: any, targetVariable: any) {
    // Check if the source and target variables cagetorical valid values are equal
    if (targetVariable.scale.dataType === sourceVariable.scale.dataType && targetVariable.scale.dataType === 'Nominal') {
        const sortArray = (array: any[]) => array.sort((a, b) => (a.value > b.value) ? 1 : -1);
        const objectsEqual = (o1:any, o2:any) => Object.keys(o1).length === Object.keys(o2).length && Object.keys(o1).every(p => o1[p] === o2[p]);
        const arraysEqual = (a1: any[], a2: any[]) => a1.length === a2.length && a1.every((o: any, idx: any) => objectsEqual(o, a2[idx]));
        return arraysEqual(sortArray(sourceVariable.scale.validValues.categories), sortArray(targetVariable.scale.validValues.categories));
    } else {
      return true;
    }
  }

  canProceed() : boolean {
    return this.variablesSaved;
  }

  async next() {
    this.context.variablesMap = this.variablesMap;
    this.router.navigate(['observation']);
  }

}
function hash(a: any) {
  throw new Error('Function not implemented.');
}
