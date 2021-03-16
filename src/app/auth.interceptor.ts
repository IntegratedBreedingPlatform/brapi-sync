import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContextService } from './context.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private context: ContextService
  ) {
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!request || !request.url || !(request.url.includes('/brapi'))) {
      return next.handle(request);
    }
    if (request.url.startsWith(this.context.source) && this.context.sourceToken) {
      request = request.clone({
        setHeaders: {
          Authorization: 'Bearer ' + this.context.sourceToken
        }
      });
    } else if (request.url.startsWith(this.context.destination) && this.context.destinationToken) {
      request = request.clone({
        setHeaders: {
          Authorization: 'Bearer ' + this.context.destinationToken
        }
      });
    }
    return next.handle(request);
  }
}
