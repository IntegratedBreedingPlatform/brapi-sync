import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { HttpClient } from '@angular/common/http';
import { DelegatedAuthenticationService } from '../auth/delegated-authentication.service';
import { AlertService } from '../shared/alert/alert.service';

declare const BrAPI: any;

@Component({
  selector: 'app-connections',
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.css']
})
export class ConnectionsComponent implements OnInit {

  authenticationType = AuthenticationType;

  loading = false;

  sourceSuccess: boolean | null = null;
  destSuccess: boolean | null = null;

  sourceAuth = AuthenticationType.DELEGATED;
  destinationAuth = AuthenticationType.DELEGATED;

  tokenToStore = '';

  constructor(
    private router: Router,
    public context: ContextService,
    private http: HttpClient,
    private delegatedAuthenticationService: DelegatedAuthenticationService,
    private alertService: AlertService
  ) {
  }

  ngOnInit(): void {
  }

  // FIXME
  // Use the built-in oAuthService.getAccessToken() to get the token.
  // For some unknown reason, it doesn't work. Probably because there's no valid id_token returned
  // by the server (at least for BMS OIDC implementation)
  @HostListener('window:message', ['$event'])
  onMessage(e: any): void {
    // To receive the access token from login auth popup
    if (e.origin === window.location.origin && typeof e.data === 'string') {
      const urlParams = new URLSearchParams(e.data.split('?')[1]);
      const accessToken = urlParams.get('access_token');
      if (accessToken) {
        if (this.tokenToStore === 'source') {
          this.context.sourceToken = accessToken;
          this.sourceSuccess = true;
        } else if (this.tokenToStore === 'destination') {
          this.context.destinationToken = accessToken;
          this.destSuccess = true;
        }
      } else {
        this.alertService.showDanger('Authentication failed.');
      }
    }
  }

  loginSource(): void {
    this.removeTrailingSlashes();
    if (this.context.source) {
      this.tokenToStore = 'source';
      this.delegatedAuthenticationService.login(this.context.source);
    } else {
      this.alertService.showDanger('Please specify the source URL.');
    }
  }

  loginDestination(): void {
    this.removeTrailingSlashes();
    if (this.context.destination) {
      this.tokenToStore = 'destination';
      this.delegatedAuthenticationService.login(this.context.destination);
    } else {
      this.alertService.showDanger('Please specify the destination URL.');
    }
  }

  async next(): Promise<void> {

    this.removeTrailingSlashes();

    // TODO verify only v2 endpoints
    this.loading = true;
    try {
      await this.http.get(this.context.source + '/serverinfo').toPromise();
      this.sourceSuccess = true;
    } catch (e) {
      this.sourceSuccess = false;
    }

    try {
      await this.http.get(this.context.destination + '/serverinfo').toPromise();
      this.destSuccess = true;
    } catch (e) {
      this.destSuccess = false;
    }

    this.loading = false;

    if (this.sourceSuccess && this.destSuccess) {
      this.router.navigate(['program']);
    } else {
      this.alertService.showDanger('Cannot proceed without authentication. Verify the authentication details or contact your system administrator.');
    }

  }

  /**
   * Some servers (e.g breedbase catalyst) won't accept double slash //
   */
  removeTrailingSlashes(): void {
    this.context.source = this.context.source.replace(/\/+$/, '');
    this.context.destination = this.context.destination.replace(/\/+$/, '');
  }

}

enum AuthenticationType {
  DELEGATED = 'delegated',
  TOKEN = 'token',
  CREDENTIALS = 'credentials'
}

