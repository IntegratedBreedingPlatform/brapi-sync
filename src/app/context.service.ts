import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  // source = 'https://test-server.brapi.org/brapi/v2/';
  // FIXME bms brapi/v2/programs
  // source = 'https://bms-centos-1.leafnode.io/bmsapi/maize/brapi/v2/';

  // breedbase catalyst won't accept double slash //
  source = 'https://cassavabase.org/brapi/v2';
  destination = 'http://localhost:8080/bmsapi/maize/brapi/v2/';

  // TODO clear data for testing
  sourceToken = '';
  destinationToken = '';

  programSelected: any = {};
  trialSelected: any = {};
  locationSelected: any = {};
  studySelected: any = {};

  constructor() {
  }
}
