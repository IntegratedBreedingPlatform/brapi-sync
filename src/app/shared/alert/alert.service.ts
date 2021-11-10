import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AlertService {

  constructor(public toastService: ToastService) {

  }

  showSuccess(successTpl: any) {
    this.toastService.show(successTpl, { title: 'Success', classname: 'bg-success text-light', delay: 10000 });
  }

  showWarning(warningTpl: any) {
    this.toastService.show(warningTpl, { title: 'Warning', classname: 'bg-warning text-light', delay: 10000 });
  }

  showDanger(dangerTpl: any) {
    this.toastService.show(dangerTpl, { title: 'Error', classname: 'bg-danger text-light', delay: 15000 });
  }

  removeAll() {
    this.toastService.removeAll();
  }

}
