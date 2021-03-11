import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { brapiCatch } from '../util/brapi-catch';
import { ContextService } from '../context.service';

declare const BrAPI: any;

@Component({
  selector: 'app-program',
  templateUrl: './program.component.html',
  styleUrls: ['./program.component.css']
})
export class ProgramComponent implements OnInit {
  loading = false;
  programs: any[] = [];

  constructor(
    private router: Router,
    public context: ContextService
  ) {
    const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapi.programs().all((programs: any[]) => this.programs = programs);
  }

  ngOnInit(): void {
  }

  async next(): Promise<void> {

  }

  back(): void {
    this.router.navigate(['connections']);
  }
}
