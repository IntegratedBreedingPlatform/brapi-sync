import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';

@Component({
  selector: 'app-entity-selector',
  templateUrl: './entity-selector.component.html',
  styleUrls: ['./entity-selector.component.css']
})
export class EntitySelectorComponent implements OnInit {

  ENTITY_GERMPLASM = 'germplasm';
  ENTITY_STUDY = 'study';
  ENTITY_OBSERVATION = 'observation';

  entitySelected: string = this.ENTITY_GERMPLASM;
  loading = false;

  constructor(private router: Router,
              public context: ContextService) {
  }

  ngOnInit(): void {
    this.context.reset();
  }

  async next(): Promise<void> {
    if (this.entitySelected == this.ENTITY_GERMPLASM) {
      this.router.navigate(['germplasm']);
    } else if (this.entitySelected == this.ENTITY_OBSERVATION) {
      this.router.navigate(['variable']);
    } else if (this.entitySelected == this.ENTITY_STUDY) {
      this.router.navigate(['trial']);
    }
  }

  back(): void {
    this.router.navigate(['program']);
  }

}
