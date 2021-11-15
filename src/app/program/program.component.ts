import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  brapiSource: any;
  brapiDestination: any;

  constructor(
    private router: Router,
    public context: ContextService,
    private alertService: AlertService
  ) {
    this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
  }

  brapiSourcePrograms = async (page: number) => {
    return this.brapiSource.programs({
      pageRange: [page, page + 1],
    });
  };

  brapiDestinationPrograms = async (page: number) => {
    return this.brapiDestination.programs({
      pageRange: [page, page + 1],
    });
  };

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
