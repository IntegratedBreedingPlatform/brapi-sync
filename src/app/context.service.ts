import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  // source = 'https://test-server.brapi.org/brapi/v2/';
  // FIXME bms brapi/v2/programs
  // source = 'https://bms-centos-1.leafnode.io/bmsapi/maize/brapi/v2/';

  // breedbase catalyst won't accept double slash //
  source = 'https://bms-centos-1.leafnode.io/bmsapi/maize/brapi/v2/';
  destination = 'http://localhost:8080/bmsapi/maize/brapi/v2/';

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
  targetVariables: any = {};

  constructor() {
  }

  reset() {
    this.sourceTrial = {};
    this.sourceStudy = {};
    this.sourceLocation = {};
    this.targetLocation = {};
    this.targetTrial = {};
    this.targetStudy = {};
    this.targetVariables = {};
  }
}
