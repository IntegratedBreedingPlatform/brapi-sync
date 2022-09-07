import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { PedigreeSearchRequest } from '../model/pedigree-search-request';
import { Observable } from 'rxjs';
import { PedigreeListResponse } from '../model/pedigree-list-response';
import { PedigreeNode } from '../model/pedigree-node';
import { PedigreeSearchResponse } from '../model/pedigree-search-response';

@Injectable({
  providedIn: 'root'
})
export class PedigreeService {

  baseUrl: string | undefined;
  accessToken: string | undefined;

  constructor(private httpClient: HttpClient) {
  }

  public searchPedigreePost(body?: PedigreeSearchRequest, authorization?: string): Observable<HttpResponse<PedigreeSearchResponse>> {
    return this.httpClient.request<PedigreeSearchResponse>('post', `${this.baseUrl}/search/pedigree`,
      {
        body,
        headers: this.createHeader(),
        observe: 'response'
      }
    );
  }

  public searchPedigreeSearchResultsDbIdGet(searchResultsDbId: string, page?: number, pageSize?: number): Observable<HttpResponse<PedigreeListResponse>> {

    if (searchResultsDbId === null || searchResultsDbId === undefined) {
      throw new Error('Required parameter searchResultsDbId was null or undefined when calling searchPedigreeSearchResultsDbIdGet.');
    }

    let queryParameters = new HttpParams();

    queryParameters = queryParameters.set('searchResultsDbId', searchResultsDbId as any);

    if (page !== undefined && page !== null) {
      queryParameters = queryParameters.set('page', page as any);
    }
    if (pageSize !== undefined && pageSize !== null) {
      queryParameters = queryParameters.set('pageSize', pageSize as any);
    }

    return this.httpClient.request<PedigreeListResponse>('get', `${this.baseUrl}/search/pedigree/${encodeURIComponent(String(searchResultsDbId))}`,
      {
        params: queryParameters,
        headers: this.createHeader(),
        observe: 'response'
      }
    );
  }


  public pedigreePut(body?: { [key: string]: PedigreeNode; }, authorization?: string): Observable<HttpResponse<PedigreeListResponse>> {
    return this.httpClient.request<PedigreeListResponse>('put', `${this.baseUrl}/pedigree`,
      {
        body,
        headers: this.createHeader(),
        observe: 'response'
      }
    );
  }

  private createHeader(): HttpHeaders {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json; charset=UTF-8',
      Authorization: `Bearer ${this.accessToken}`
    });
    return headers;
  }
}
