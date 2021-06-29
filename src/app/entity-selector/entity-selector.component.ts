import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';

@Component({
  selector: 'app-entity-selector',
  templateUrl: './entity-selector.component.html',
  styleUrls: ['./entity-selector.component.css']
})
export class EntitySelectorComponent implements OnInit {

  loading = false;

  constructor(private router: Router,
              public context: ContextService) {
  }

  ngOnInit(): void {
  }

  async next(): Promise<void> {
    this.router.navigate(['study']);
  }

  back(): void {
    this.router.navigate(['program']);
  }

}
