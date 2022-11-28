import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { PedigreeSearchRequest } from '../model/pedigree-search-request';
import { Observable } from 'rxjs';
import { PedigreeListResponse } from '../model/pedigree-list-response';
import { PedigreeNode } from '../model/pedigree-node';
import { PedigreeSearchResponse } from '../model/pedigree-search-response';
import { getAllRecords } from '../../shared/get-all-records';

@Injectable({
  providedIn: 'root'
})
export class PedigreeService {

  constructor(private httpClient: HttpClient) {
  }

  public searchPedigreePost(basePath: string, body?: PedigreeSearchRequest):
    Observable<HttpResponse<PedigreeSearchResponse>> {
    return this.httpClient.request<PedigreeSearchResponse>('post', `${basePath}/search/pedigree`,
      {
        body,
        observe: 'response'
      }
    );
  }

  public searchPedigreeSearchResultsDbIdGet(basePath: string, searchResultsDbId: string, page?: number,
                                            pageSize?: number): Observable<HttpResponse<PedigreeListResponse>> {

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

    return this.httpClient.request<PedigreeListResponse>('get', `${basePath}/search/pedigree/${encodeURIComponent(String(searchResultsDbId))}`,
      {
        params: queryParameters,
        observe: 'response'
      }
    );
  }

  public searchPedigreeSearchResultsDbIdGetAll(basePath: string, searchResultsDbId: string): Observable<PedigreeNode[]> {
    return getAllRecords<PedigreeNode>((page, pageSize) => {
      return this.searchPedigreeSearchResultsDbIdGet(basePath, searchResultsDbId, page, pageSize);
    });
  }

  public pedigreePut(basePath: string, body?: { [key: string]: PedigreeNode; }):
    Observable<HttpResponse<PedigreeListResponse>> {
    return this.httpClient.request<PedigreeListResponse>('put', `${basePath}/pedigree`,
      {
        body,
        observe: 'response'
      }
    );
  }
}
