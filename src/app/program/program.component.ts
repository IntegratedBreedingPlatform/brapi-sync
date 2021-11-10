import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { brapiAll } from '../util/brapi-all';
import { ContextService } from '../context.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from '../shared/alert/alert.service';

declare const BrAPI: any;

@Component({
  selector: 'app-program',
  templateUrl: './program.component.html',
  styleUrls: ['./program.component.css']
})
export class ProgramComponent implements OnInit {
  loading = false;
  sourcePrograms: any[] = [];
  targetPrograms: any[] = [];

  constructor(
    private router: Router,
    public context: ContextService,
    private alertService: AlertService
  ) {
    const brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapiAll(brapiSource.programs({
      // put a limit for now (default page=1000). TODO paginated dropdown
      pageRange: [0, 1],
    })).then(
      (programs: any[]) => this.sourcePrograms = programs,
      (error) => this.onError(error)
    );
    const brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
    brapiAll(brapiDestination.programs({
      // put a limit for now (default page=1000). TODO paginated dropdown
      pageRange: [0, 1],
    })).then(
      (programs: any[]) => this.targetPrograms = programs,
      (error) => this.onError(error)
    );
  }

  ngOnInit(): void {
    this.alertService.removeAll();
  }

  async next(): Promise<void> {
    this.router.navigate(['entity-selector']);
  }

  back(): void {
    this.router.navigate(['connections']);
  }

  onError(res: HttpErrorResponse): void {
    this.alertService.showDanger('Cannot load programs.');
  }
}
