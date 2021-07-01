import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from '../context.service';
import { StudyFilterComponent } from '../study-filter/study-filter.component';

declare const BrAPI: any;

@Component({
  selector: 'app-trial',
  templateUrl: './trial.component.html',
  styleUrls: ['./trial.component.css']
})
export class TrialComponent implements OnInit {

  searchOptions: any[] = [{ id: 1, name: 'Study' }];
  searchSelected: number = 1;
  loading = false;

  constructor(private router: Router,
              public context: ContextService,
              public modalService: NgbModal) {
  }

  ngOnInit(): void {
  }

  openSearchModal() {
    this.modalService.open(StudyFilterComponent).result.then((result) => {
    });
  }

  async next(): Promise<void> {
    this.router.navigate(['study']);
  }

  back(): void {
    this.router.navigate(['entity-selector']);
  }

}
