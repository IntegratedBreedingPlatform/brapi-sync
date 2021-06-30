import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from '../context.service';
import { StudySelectModalComponent } from './study-select-modal/study-select-modal.component';

declare const BrAPI: any;

@Component({
  selector: 'app-study',
  templateUrl: './study.component.html',
  styleUrls: ['./study.component.css']
})
export class StudyComponent implements OnInit {

  loading = false;
  study: any = {};

  constructor(private router: Router,
              public context: ContextService,
              public modalService: NgbModal) {
  }

  ngOnInit(): void {
  }

  openSearchModal() {
    this.modalService.open(StudySelectModalComponent).result.then((result) => {
        this.study = result;
    });
  }

  async next(): Promise<void> {
    this.router.navigate(['entity-selector']);
  }

  back(): void {
    this.router.navigate(['entity-selector']);
  }

}
