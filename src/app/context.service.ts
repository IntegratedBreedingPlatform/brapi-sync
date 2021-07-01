import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  // source = 'https://test-server.brapi.org/brapi/v2/';
  // FIXME bms brapi/v2/programs
  // source = 'https://bms-centos-1.leafnode.io/bmsapi/maize/brapi/v2/';

  // breedbase catalyst won't accept double slash //
  source = 'http://localhost:8080/bmsapi/maize/brapi/v2/';
  destination = 'http://localhost:8080/bmsapi/maize/brapi/v2/';

  // TODO clear data for testing
  sourceToken = 'admin:1625121537941:b85ee0cfa33fbec8b7dbd8aeffe23e9e';
  destinationToken = 'admin:1625121537941:b85ee0cfa33fbec8b7dbd8aeffe23e9e';

  programSelected: any = {};
  trialSelected: any = {};
  locationSelected: any = {};
  studySelected: any = {};

  constructor() {
  }
}
