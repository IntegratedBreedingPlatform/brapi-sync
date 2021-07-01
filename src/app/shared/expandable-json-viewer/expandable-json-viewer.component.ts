import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-expandable-json-viewer',
  templateUrl: './expandable-json-viewer.component.html',
  styleUrls: ['./expandable-json-viewer.component.css']
})
export class ExpandableJsonViewerComponent implements OnInit {

  @Input() json: any;
  showJson: boolean = false;
  constructor() { }

  ngOnInit(): void {
  }

  show(): void {
    this.showJson = true;
  }

}
