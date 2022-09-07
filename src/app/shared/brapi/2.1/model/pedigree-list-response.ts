import { Context } from './context';
import { Metadata } from './metadata';
import { PedigreeListResponseResult } from './pedigree-list-response-result';

export interface PedigreeListResponse {
  context?: Context;
  metadata: Metadata;
  result: PedigreeListResponseResult;
}
