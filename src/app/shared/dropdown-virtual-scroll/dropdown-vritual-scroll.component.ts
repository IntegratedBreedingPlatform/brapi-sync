import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

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
  @Input() fetchMore!: (page: number) => Promise<DropdownVirtualScrollResult>;

  value: any;
  items: any[] = [];
  loading = false;

  // Pagination
  currentPage = 0;
  pageSize = 0;
  totalCount = 0;
  totalPages = 0;

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
    this.fetchMore(page).then((result) => {
      if (result && result.items.length) {
        this.items = this.items.concat(result.items);
        this.pageSize = result.pageSize;
        this.totalCount = result.totalCount;
        this.totalPages = result.totalPages;
        this.loading = false;
      }
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

export class DropdownVirtualScrollResult {
  items: any[] = [];
  pageSize = 0;
  totalCount = 0;
  totalPages = 0;
}
