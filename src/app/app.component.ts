import { Component } from '@angular/core';

declare const BrAPI: any;


@Component({
  selector: 'app-brapi-sync',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'brapi-sync-angular';

  source = 'https://test-server.brapi.org/brapi/v1/';
  destination = 'https://bms-uat.test.net/bmsapi/maize/brapi/v1/';

  sourceAuth = 'token';
  destinationAuth = 'token';

  next() {
    const brapiSrc = BrAPI(this.source, "2.0");
    brapiSrc.calls().all((c: any) => console.log(c));

    const brapiDest = BrAPI(this.destination, "2.0");
    brapiDest.calls().all((c: any) => console.log(c));
  }
}
