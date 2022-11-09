import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GermplasmSearchRequest } from '../model/germplasm-search-request';
import { GermplasmListResponse } from '../model/germplasm-list-response';
import { GermplasmSearchResponse } from '../model/germplasm-search-response';
import { BreedingMethodListResponse } from '../model/breeding-method-list-response';

@Injectable({
  providedIn: 'root'
})
export class GermplasmService {

  constructor(private httpClient: HttpClient) {
  }

  public searchGermplasmPost(basePath: string, body?: GermplasmSearchRequest): Observable<HttpResponse<GermplasmSearchResponse>> {
    return this.httpClient.request<GermplasmSearchResponse>('post', `${basePath}/search/germplasm`,
      {
        body,
        observe: 'response'
      }
    );
  }


  public searchGermplasmSearchResultsDbIdGet(basePath: string, searchResultsDbId: string, page?: number, pageSize?: number,
                                             authorization?: string, observe?: 'response',
                                             reportProgress?: boolean): Observable<HttpResponse<GermplasmListResponse>> {

    if (searchResultsDbId === null || searchResultsDbId === undefined) {
      throw new Error('Required parameter searchResultsDbId was null or undefined when calling searchGermplasmSearchResultsDbIdGet.');
    }

    let queryParameters = new HttpParams();

    queryParameters = queryParameters.set('searchResultsDbId', searchResultsDbId as any);

    if (page !== undefined && page !== null) {
      queryParameters = queryParameters.set('page', page as any);
    }
    if (pageSize !== undefined && pageSize !== null) {
      queryParameters = queryParameters.set('pageSize', pageSize as any);
    }

    return this.httpClient.request<GermplasmListResponse>('get', `${basePath}/search/germplasm/${encodeURIComponent(String(searchResultsDbId))}`,
      {
        params: queryParameters,
        observe: 'response'
      }
    );
  }

  public breedingmethodsGet(basePath: string, page?: number, pageSize?: number): Observable<HttpResponse<BreedingMethodListResponse>> {

    let queryParameters = new HttpParams();
    if (page !== undefined && page !== null) {
      queryParameters = queryParameters.set('page', page as any);
    }
    if (pageSize !== undefined && pageSize !== null) {
      queryParameters = queryParameters.set('pageSize', pageSize as any);
    }

    return this.httpClient.request<BreedingMethodListResponse>('get', `${basePath}/breedingmethods`,
      {
        params: queryParameters,
        observe: 'response'
      }
    );
  }

}
