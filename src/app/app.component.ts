import { Component } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';


@Component({
  selector: 'app-brapi-sync',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  @BlockUI('blockUI') blockUI!: NgBlockUI;

  title = 'brapi-sync-angular';

}
