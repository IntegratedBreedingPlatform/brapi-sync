import { Context } from './context';
import { Metadata } from './metadata';
import { GermplasmSearchResponseResult } from './germplasm-search-response-result';

export interface GermplasmSearchResponse {
  context?: Context;
  metadata: Metadata;
  result: GermplasmSearchResponseResult;
}
