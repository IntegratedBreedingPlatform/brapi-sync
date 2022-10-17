import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StudySingleResponse } from '../model/study-single-response';
import { StudyUpdateRequest } from '../model/study-update-request';

@Injectable({
  providedIn: 'root'
})
export class StudiesService {

  constructor(private httpClient: HttpClient) {
  }

  public studiesStudyDbIdPut(basePath: string, studyDbId: string, body?: StudyUpdateRequest):
    Observable<HttpResponse<StudySingleResponse>> {

    if (studyDbId === null || studyDbId === undefined) {
      throw new Error('Required parameter studyDbId was null or undefined when calling studiesStudyDbIdPut.');
    }

    return this.httpClient.request<StudySingleResponse>('put', `${basePath}/studies/${encodeURIComponent(String(studyDbId))}`,
      {
        body,
        observe: 'response'
      }
    );
  }
}

