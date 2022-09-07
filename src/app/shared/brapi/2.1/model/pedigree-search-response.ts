import { Context } from './context';
import { Metadata } from './metadata';
import { PedigreeSearchResponseResult } from './pedigree-search-response-result';

export interface PedigreeSearchResponse {
  context?: Context;
  metadata: Metadata;
  result: PedigreeSearchResponseResult;
}
