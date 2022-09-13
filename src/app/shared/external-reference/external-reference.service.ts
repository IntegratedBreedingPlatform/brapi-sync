import { Injectable } from '@angular/core';
import { EXTERNAL_REFERENCE_SOURCE } from 'src/app/app.constants';
import { ContextService } from '../../context.service';

@Injectable({
  providedIn: 'root'
})
export class ExternalReferenceService {

  constructor(private context: ContextService) {
  }

  generateExternalReference(id: string, entity: EntityEnum, externalReferences?: any[]): any[] {
    const externalReferencesTemp: any[] = [];
    if (externalReferences && externalReferences.length) {
      externalReferencesTemp.push(externalReferences);
    }
    externalReferencesTemp.push({
      referenceID: this.getReferenceId(entity, id),
      referenceSource: EXTERNAL_REFERENCE_SOURCE
    });
    return externalReferencesTemp;
  }

  getReferenceId(entity: EntityEnum, id: string | null | undefined): string {
    if (id) {
      return `${this.context.source}/${entity}/${id}`;
    }
    return '';
  }
}

export enum EntityEnum {
  GERMPLASM = 'germplasm',
  STUDIES = 'studies',
  TRIALS = 'trials',
  OBSERVATIONUNITS = 'observationunits',
  OBSERVATION = 'observation'
}
