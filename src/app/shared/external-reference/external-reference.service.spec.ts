import { TestBed } from '@angular/core/testing';

import { ExternalReferenceService } from './external-reference.service';

describe('ExternalReferenceService', () => {
  let service: ExternalReferenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExternalReferenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
