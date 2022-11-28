import { Context } from '../../shared/model/context';
import { Metadata } from '../../shared/model/metadata';
import { PedigreeSearchResponseResult } from './pedigree-search-response-result';

export interface PedigreeSearchResponse {
  context?: Context;
  metadata: Metadata;
  result: PedigreeSearchResponseResult;
}
