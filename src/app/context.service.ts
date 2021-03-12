import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  source = 'https://test-server.brapi.org/brapi/v1/';
  destination = 'https://bms-centos-1.leafnode.io/bmsapi/maize/brapi/v1/';

  sourceToken = '';
  destinationToken = '';

  // TODO clear data for testing
  programSelected: any = {programDbId: 1};
  trialSelected: any = {};
  locationSelected: any = {};
  studySelected: any = {studyDbId: 1001, studyName: 'Study 1'};

  constructor() {
  }
}
