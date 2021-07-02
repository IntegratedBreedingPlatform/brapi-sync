import { Injectable } from '@angular/core';
import { ContextService } from '../../context.service';

@Injectable({
  providedIn: 'root'
})
export class ExternalReferenceService {

  constructor(private context: ContextService) {
  }

  generateExternalReference(id: string, entity: string, externalReferences: any[]): any[] {
    let externalReferencesTemp: any[] = [];
    if (externalReferences && externalReferences.length) {
      externalReferencesTemp.push(externalReferences);
    }
    externalReferencesTemp.push({
      referenceID: this.getReferenceId(entity, id),
      referenceSource: 'brapi-sync'
    });
    return externalReferencesTemp;
  }

  getReferenceId(entity: string, id: string): string {
    return `${this.context.source}/${entity}/${id}`;
  }
}
