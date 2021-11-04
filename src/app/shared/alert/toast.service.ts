import { Injectable, TemplateRef } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts: any[] = [];

  show(textOrTplOrArray: string | TemplateRef<any> | any[], options: any = {}) {
    this.toasts.push({ textOrTplOrArray, ...options });
  }

  remove(toast: any) {
    this.toasts = this.toasts.filter(t => t !== toast);
  }

  removeAll() {
    this.toasts = [];
  }
}