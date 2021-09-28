import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { ExternalReferenceService } from '../shared/external-reference/external-reference.service';

declare const BrAPI: any;

@Component({
  selector: 'app-variable',
  templateUrl: './variable.component.html',
  styleUrls: ['./variable.component.css']
})
export class VariableComponent implements OnInit {

  brapiSource: any;
  brapiDestination: any;
  info: any = [];
  errors: any = [];
  loading = false;
  isSaving = false;
  variablesSaved = false;
  sourceVariables: any [] = [];
  targetVariablesByName: any = {};

  constructor(private router: Router,
    private http: HttpClient,
    public externalReferenceService: ExternalReferenceService,
    public context: ContextService) {
        this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
        this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
}

  ngOnInit(): void {
    this.loadVariables();
  }

  async loadVariables() : Promise<void> {
    // Get the variables from source study
    this.brapiSource.search_variables({
      studyDbIds: [this.context.sourceStudy.studyDbId]
    }
    ).all((result: any) => {
      this.sourceVariables = result;
      // Search variables in target source, match by name or alias
      this.searchInTarget(this.sourceVariables);
    });

  }

  async searchInTarget(sourceVariables: any[]): Promise<void> {

    const observationVariableNames: any[] = sourceVariables.map(variable => variable.observationVariableName);

    this.brapiSource.search_variables({
      observationVariableNames: observationVariableNames
    }
    ).all((result: any[]) => {
       result.forEach((targetVariable) => {
        this.targetVariablesByName[targetVariable.observationVariableName] = targetVariable;
       });
    });
  }

  async post(): Promise<void> {
    const allVariableHasAMatch = this.sourceVariables.every((sourceVariable) => this.isValidMapping(sourceVariable));
    if (allVariableHasAMatch) {
        // Add Observation Variable to the study
        //this.updateObservationVariable(Object.values(this.targetVariablesByName));
    }
  }

  async updateObservationVariable(targetVariables: any[]) {
    targetVariables.forEach(async (targetVariable) => {
      targetVariable.studyDbId = this.context.targetStudy.studyDbId;
      // Use v2.1 PUT /variables to associate observation variable to a study.
      const postRes: any = await this.http.put(this.context.destination + '/variable', targetVariable
      ).toPromise();
    });
    this.variablesSaved = true;
    
  }

  cancel(): void {
    this.router.navigate(['entity-selector']);
  }

  isValid(): boolean {
    return this.sourceVariables.every((sourceVariable) => this.isValidMapping(sourceVariable));
  }

  isValidMapping(sourceVariable: any): boolean {
    const targetVariable = this.targetVariablesByName[sourceVariable.observationVariableName];
    return targetVariable && targetVariable.scale.dataType === sourceVariable.scale.dataType;
  }

  canProceed() : boolean {
    return this.variablesSaved;
  }

  async next() {
    this.router.navigate(['observation']);
  }

}
