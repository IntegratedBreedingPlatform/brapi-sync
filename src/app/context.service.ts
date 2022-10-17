import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  // source = 'https://test-server.brapi.org/brapi/v2/';
  // FIXME bms brapi/v2/programs
  // source = 'https://bms-centos-1.leafnode.io/bmsapi/maize/brapi/v2/';

  // breedbase catalyst won't accept double slash //
  source = '';
  destination = '';

  // TODO clear data for testing
  sourceToken = '';
  destinationToken = '';

  sourceProgram: any = {};
  sourceTrial: any = {};
  sourceLocation: any = {};
  sourceStudy: any = {};

  targetProgram: any = {};
  targetLocation: any = {};
  targetTrial: any = {};
  targetStudy: any = {};
  variablesMap: any = {};

  isEmbedded = false;

  sourceStudyWasPreviouslyImportedFromTarget = false;
  sourceVariablesAliasByOntologyNames: any = {};

  constructor() {
  }

  reset() {
    this.sourceTrial = {};
    this.sourceStudy = {};
    this.sourceLocation = {};
    this.targetLocation = {};
    this.targetTrial = {};
    this.targetStudy = {};
    this.variablesMap = {};
    this.sourceStudyWasPreviouslyImportedFromTarget = false;
    this.sourceVariablesAliasByOntologyNames = {};
  }
}
