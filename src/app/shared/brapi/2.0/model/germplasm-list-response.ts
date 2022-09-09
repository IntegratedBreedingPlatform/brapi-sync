import { Context } from './context';
import { GermplasmListResponseResult } from './germplasm-list-response-result';
import { Metadata } from './metadata';

export interface GermplasmListResponse {
  context?: Context;
  metadata: Metadata;
  result: GermplasmListResponseResult;
}
