import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from '../shared/alert/alert.service';
import { DropdownVirtualScrollResult } from '../shared/dropdown-virtual-scroll/dropdown-vritual-scroll.component';

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

  brapiSourcePrograms = (page: number) => {
    return new Promise<DropdownVirtualScrollResult>(resolve => {
      this.brapiSource.programs({
        pageRange: [page, page + 1],
      }).all((items: any[]) => {
        if (items.length) {
          resolve(this.createDropdownVirtualScrollResult(items));
        }
      });
    });
  }

  brapiDestinationPrograms = (page: number) => {
    return new Promise<DropdownVirtualScrollResult>(resolve => {
      this.brapiDestination.programs({
        pageRange: [page, page + 1],
      }).all((items: any[]) => {
        if (items.length) {
          resolve(this.createDropdownVirtualScrollResult(items));
        }
      });
    });
  }

  createDropdownVirtualScrollResult(items: any[]): DropdownVirtualScrollResult {
    const pageSize = items[0].__response.metadata.pagination.pageSize;
    const totalCount = items[0].__response.metadata.pagination.totalCount;
    const totalPages = items[0].__response.metadata.pagination.totalPages;
    return { items, pageSize, totalCount, totalPages };
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
