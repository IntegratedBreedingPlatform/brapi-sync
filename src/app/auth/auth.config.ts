import { AuthConfig } from "angular-oauth2-oidc";

export const authConfig : AuthConfig = {
    // URL of the Identity Provider / STS (Security Token Server)
    issuer: '',

    // URL of application to redirect the user to after login
    redirectUri: window.location.origin,

    // The application's id
    clientId: 'brapi-sync',

    // set the scope for the permissions the client should request
    // The first four are defined by OIDC.
    // Important: Request offline_access to get a refresh token
    // The api scope is a usecase specific one
    scope: 'openid profile email voucher',

    // URL of the SPA to redirect the user after silent refresh
    silentRefreshRedirectUri: window.location.origin + '/silent-refresh',

    strictDiscoveryDocumentValidation: false
    
  };