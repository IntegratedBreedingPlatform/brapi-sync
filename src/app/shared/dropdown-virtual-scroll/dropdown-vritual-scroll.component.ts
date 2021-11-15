import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ContextService } from 'src/app/context.service';

declare const BrAPI: any;

@Component({
  selector: 'app-dropdown-virtual-scroll',
  templateUrl: './dropdown-virtual-scroll.component.html'
})
export class DropdownVirtualScrollComponent implements OnInit {

  @Input() bindLabel: any;
  @Input() selectedValue: any;
  @Output() selectedValueChange = new EventEmitter<any>();
  @Output() change = new EventEmitter<any>();
  @Input() disabled = false;
  @Input() getBrapi!: (page: number) => Promise<any>;

  value: any;
  brapiSource: any;
  items: any[] = [];
  numberOfItemsFromEndBeforeFetchingMore = 10;
  loading = false;

  // Pagination
  currentPage = 0;
  pageSize = 0;
  totalCount = 0;
  totalPages = 0;

  constructor(public context: ContextService) {
    this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
  }

  ngOnInit(): void {
  }

  open(): void {
    this.currentPage = 0;
    this.pageSize = 0;
    this.totalCount = 0;
    this.totalPages = 0;
    this.items = [];
    this.fetch(this.currentPage);
  }

  fetch(page: number): void {
    this.loading = true;
    this.getBrapi(page).then((brapi: any) => {
      brapi.all((result: any[]) => {
        this.items = this.items.concat(result);
        if (result.length) {
          this.pageSize = result[0].__response.metadata.pagination.pageSize;
          this.totalCount = result[0].__response.metadata.pagination.totalCount;
          this.totalPages = result[0].__response.metadata.pagination.totalPages;
        }
        this.loading = false;
      });
    });
  }

  onScrollToEnd(): void {
    this.currentPage = ++this.currentPage;
    if (this.currentPage > (this.totalPages - 1)) {
      return;
    }
    this.fetch(this.currentPage);
  }

  onChange(): void {
    this.selectedValueChange.emit(this.value);
    this.change.emit();
  }
}
