import { Context } from './context';
import { Metadata } from './metadata';
import { ListResponseResult } from './list-response-result';

export interface ListResponse<T> {
  context?: Context;
  metadata: Metadata;
  result: ListResponseResult<T>;
}
