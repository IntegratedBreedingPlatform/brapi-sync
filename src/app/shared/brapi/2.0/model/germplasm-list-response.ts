import { Metadata } from './metadata';
import { ListResponse } from '../../shared/model/list-response';
import { Germplasm } from './germplasm';
import { ListResponseResult } from '../../shared/model/list-response-result';

export class GermplasmListResponse implements ListResponse<Germplasm> {
  metadata: Metadata;
  result: ListResponseResult<Germplasm>;

  constructor(metadata: Metadata, result: ListResponseResult<Germplasm>) {
    this.metadata = metadata;
    this.result = result;
  }
}
