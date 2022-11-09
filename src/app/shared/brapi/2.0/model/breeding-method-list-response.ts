import { BreedingMethodListResponseResult } from './breeding-method-list-response-result';
import { Context } from './context';
import { Metadata } from './metadata';

export interface BreedingMethodListResponse {
  context?: Context;
  metadata: Metadata;
  result: BreedingMethodListResponseResult;
}
