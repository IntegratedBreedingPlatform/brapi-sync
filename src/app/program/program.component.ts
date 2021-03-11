import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-program',
  templateUrl: './program.component.html',
  styleUrls: ['./program.component.css']
})
export class ProgramComponent implements OnInit {
  loading = false;

  constructor(
    private router: Router
  ) {
  }

  ngOnInit(): void {
  }

  async next() {

  }

  back() {
    this.router.navigate(['connections']);
  }
}
