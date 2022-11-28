import { Observable } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';
import { ListResponse } from './model/list-response';
import { ListResponseResult } from './model/list-response-result';

const GET_ALL_PAGE_SIZE = 5000;
const GET_ALL_LIMIT = 50000;

/**
 * Consume a paginated api until no more records are found
 * @param f function that does the http request (page should be 0-indexed)
 */
export function getAllRecords<T>(f: (page: number, pageSize: number) => Observable<HttpResponse<ListResponse<any>>>):
  Observable<Array<T>> {
  let page = 0;
  let totalCount = 0;

  const mapReponse = () => {
    return map((resp: HttpResponse<ListResponse<ListResponseResult<any>>>) => {
      if (resp.body?.metadata.pagination?.totalCount) {
        totalCount = resp.body?.metadata.pagination?.totalCount;
      }
      return resp.body?.result.data ? resp.body?.result.data : new Array<any>();
    });
  };

  return f(page, GET_ALL_PAGE_SIZE).pipe(
    mapReponse(),
    expand((resp) => {
      const nextPageRecord = (page + 1) * GET_ALL_PAGE_SIZE;
      if (resp.length && nextPageRecord < GET_ALL_LIMIT && nextPageRecord < totalCount) {
        page++;
        return f(page, GET_ALL_PAGE_SIZE).pipe(mapReponse());
      } else {
        return new Array<any>();
      }
    }),
    reduce((accumulator, resp) => accumulator.concat(resp), [])
  );
}
