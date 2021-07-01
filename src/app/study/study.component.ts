import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';

@Component({
  selector: 'app-study',
  templateUrl: './study.component.html',
  styleUrls: ['./study.component.css']
})
export class StudyComponent implements OnInit {

  searchOptions: any[] = [{ id: 1, name: 'Study' }];
  searchSelected: number = 1;
  loading = false;
  study: any = {};

  constructor(private router: Router,
              public context: ContextService) {
  }

  ngOnInit(): void {
    console.log(this.context.studySelected);
  }

  openSearchModal() {
  }

  async next(): Promise<void> {
    this.router.navigate(['observation']);
  }

  back(): void {
    this.router.navigate(['trial']);
  }


}
