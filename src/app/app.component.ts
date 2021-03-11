import { Component } from '@angular/core';
import { brapiCatch } from './util/brapi-catch';

declare const BrAPI: any;


@Component({
  selector: 'app-brapi-sync',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'brapi-sync-angular';

  sourceSuccess: boolean | null = null;
  destSuccess: boolean | null = null;

  source = 'https://test-server.brapi.org/brapi/v1/';
  destination = 'https://bms-uat-test.net/bmsapi/maize/brapi/v1/';

  sourceAuth = 'token';
  destinationAuth = 'token';

  sourceToken = '';
  destinationToken = '';

  async next() {
    try {
      const brapiSrc = BrAPI(this.source, '2.0', this.sourceToken);
      await brapiCatch(brapiSrc.calls());
      this.sourceSuccess = true;
    } catch (e) {
      this.sourceSuccess = false;
    }

    try {
      const brapiDest = BrAPI(this.destination, '2.0', this.destinationToken);
      await brapiCatch(brapiDest.calls());
      this.destSuccess = true;
    } catch (e) {
      this.destSuccess = false;
    }

    if (this.sourceSuccess && this.destSuccess) {
      // go to next step
    }
  }
}
