import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  source = 'https://test-server.brapi.org/brapi/v1/';
  destination = 'https://bms-centos-1.leafnode.io/bmsapi/maize/brapi/v1/';

  sourceToken = '';
  destinationToken = '';

  programSelected: any = {};
  trialSelected: any = {};

  constructor() {
  }
}
