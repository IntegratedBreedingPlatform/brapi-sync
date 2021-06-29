import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-collapsible',
  templateUrl: './collapsible.component.html',
  styleUrls: ['./collapsible.component.css']
})
export class CollapsibleComponent implements OnInit {

  @Input() isCollapsed = false;
  @Input() heading: string = '';
  @Input() collapsable = true;

  constructor() { }

  ngOnInit(): void {
  }

}
