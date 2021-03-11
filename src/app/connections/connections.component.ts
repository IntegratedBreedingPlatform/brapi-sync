import { Component, OnInit } from '@angular/core';
import { brapiCatch } from '../util/brapi-catch';
import { Router } from '@angular/router';

declare const BrAPI: any;

@Component({
  selector: 'app-connections',
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.css']
})
export class ConnectionsComponent implements OnInit {

  loading = false;

  sourceSuccess: boolean | null = null;
  destSuccess: boolean | null = null;

  source = 'https://test-server.brapi.org/brapi/v1/';
  destination = 'https://bms-uat-test.net/bmsapi/maize/brapi/v1/';

  sourceAuth = 'token';
  destinationAuth = 'token';

  sourceToken = '';
  destinationToken = '';

  constructor(
    private router: Router
  ) {
  }

  ngOnInit(): void {
  }

  async next() {
    this.loading = true;
    try {
      const brapiSrc = BrAPI(this.source, '2.0', this.sourceToken);
      await brapiCatch(brapiSrc.calls());
      this.sourceSuccess = true;
    } catch (e) {
      this.sourceSuccess = false;
      this.loading = false;
      return;
    }

    try {
      const brapiDest = BrAPI(this.destination, '2.0', this.destinationToken);
      await brapiCatch(brapiDest.calls());
      this.destSuccess = true;
    } catch (e) {
      this.destSuccess = false;
      this.loading = false;
      return;
    }

    if (this.sourceSuccess && this.destSuccess) {
      this.router.navigate(['program']);
    }
  }

}
