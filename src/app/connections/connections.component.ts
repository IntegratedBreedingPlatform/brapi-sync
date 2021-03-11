import { Component, OnInit } from '@angular/core';
import { brapiCatch } from '../util/brapi-catch';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';

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

  sourceAuth = 'token';
  destinationAuth = 'token';

  constructor(
    private router: Router,
    public context: ContextService
  ) {
  }

  ngOnInit(): void {
  }

  async next(): Promise<void> {
    this.loading = true;
    try {
      const brapiSrc = BrAPI(this.context.source, '2.0', this.context.sourceToken);
      await brapiCatch(brapiSrc.calls());
      this.sourceSuccess = true;
    } catch (e) {
      this.sourceSuccess = false;
    }

    try {
      const brapiDest = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
      await brapiCatch(brapiDest.calls());
      this.destSuccess = true;
    } catch (e) {
      this.destSuccess = false;
    }

    this.loading = false;

    if (this.sourceSuccess && this.destSuccess) {
      this.router.navigate(['program']);
    }
  }

}
