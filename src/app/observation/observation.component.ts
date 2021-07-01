import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';

@Component({
  selector: 'app-observation',
  templateUrl: './observation.component.html',
  styleUrls: ['./observation.component.css']
})
export class ObservationComponent implements OnInit {

  loading = false;

  constructor(private router: Router,
              public context: ContextService) {
  }

  ngOnInit(): void {
  }

  async next(): Promise<void> {
    this.router.navigate(['observation']);
  }

  back(): void {
    this.router.navigate(['study']);
  }

  loadGermplasm(): void {
  }

}
