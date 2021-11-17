import { Injectable } from "@angular/core";
import { OAuthService } from "angular-oauth2-oidc";
import { AlertService } from "../shared/alert/alert.service";
import { authConfig } from "./auth.config";

@Injectable({
    providedIn: 'root'
  })
  export class DelegatedAuthenticationService {

    constructor (private oauthService: OAuthService,
      private alertService: AlertService){
    }

    login(issuer: string) {
        authConfig.issuer = issuer;
        this.oauthService.configure(authConfig);
        this.oauthService.loadDiscoveryDocumentAndTryLogin().then((onfulfilled) => {
          this.oauthService.initImplicitFlowInPopup();
        }).catch((e) => {
          this.alertService.showDanger('Could not login. Verify the server details or contact your administrator.');
        });   
    }

  }