import { Component, TemplateRef } from "@angular/core";
import { ToastService } from "./toast.service";

@Component({
    selector: 'app-toasts',
    template: `
      <ngb-toast
        *ngFor="let toast of toastService.toasts"
        [class]="toast.classname"
        [autohide]="true"
        [delay]="toast.delay || 5000"
        (hidden)="toastService.remove(toast)"
        [header]="toast.title"
      >
        <ng-template [ngIf]="isTemplate(toast)">
          <ng-template [ngTemplateOutlet]="toast.textOrTplOrArray"></ng-template>
        </ng-template>
  
        <ng-template [ngIf]="isText(toast)">{{ toast.textOrTplOrArray }}</ng-template>
        <ng-template [ngIf]="isArray(toast)">
          <ul>
            <li *ngFor="let m of toast.textOrTplOrArray">{{m.message}}</li>
          </ul>
        </ng-template>
      </ngb-toast>
    `,
    host: {'[class.ngb-toasts]': 'true'}
  })
  export class ToastsContainer {
    constructor(public toastService: ToastService) {}
  
    isTemplate(toast: any) { return toast.textOrTplOrArray instanceof TemplateRef; }
    isText(toast: any) { return typeof toast.textOrTplOrArray === 'string'; }
    isArray(toast: any) { return toast.textOrTplOrArray instanceof Array; }
  }