import { Component, OnInit } from '@angular/core';
import { brapiAll } from '../util/brapi-all';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { HttpClient } from '@angular/common/http';

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
    public context: ContextService,
    private http: HttpClient
  ) {
  }

  ngOnInit(): void {
  }

  async next(): Promise<void> {
    this.removeTrailingSlashes();

    // TODO verify only v2 endpoints
    this.loading = true;
    try {
      await this.http.get(this.context.source + '/serverinfo').toPromise();
      this.sourceSuccess = true;
    } catch (e) {
      this.sourceSuccess = false;
    }

    try {
      await this.http.get(this.context.destination + '/serverinfo').toPromise();
      this.destSuccess = true;
    } catch (e) {
      this.destSuccess = false;
    }

    this.loading = false;

    if (this.sourceSuccess && this.destSuccess) {
      this.router.navigate(['program']);
    }
  }

  /**
   * Some servers (e.g breedbase catalyst) won't accept double slash //
   */
  removeTrailingSlashes(): void {
    this.context.source = this.context.source.replace(/\/+$/, '');
    this.context.destination = this.context.destination.replace(/\/+$/, '');
  }

}
