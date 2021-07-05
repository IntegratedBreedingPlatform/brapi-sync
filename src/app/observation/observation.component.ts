import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { HttpClient } from '@angular/common/http';
import { brapiAll } from '../util/brapi-all';
import { ExternalReferenceService } from '../shared/external-reference/external-reference.service';

declare const BrAPI: any;

@Component({
  selector: 'app-observation',
  templateUrl: './observation.component.html',
  styleUrls: ['./observation.component.css']
})
export class ObservationComponent implements OnInit {

  brapiSource: any;
  sourceGermplasm: any[] = [];
  sourceObservationUnits: any[] = [];
  page = 1;
  pageSize = 20;
  germplasmTotalCount = 0;
  loading = false;
  germplasmInDestinationByRefId: any = {};

  constructor(private router: Router,
              private http: HttpClient,
              public externalReferenceService: ExternalReferenceService,
              public context: ContextService) {
  }

  ngOnInit(): void {
    // Get the germplasm of the study from source
    this.loadGermplasm();
    // Get the observation units of the study from source
    this.loadObservationUnits();
  }

  async next(): Promise<void> {
    this.router.navigate(['observation']);
  }

  back(): void {
    this.router.navigate(['study']);
  }

  post() {
    // TODO: Post the observation units.
  }

  loadObservationUnits() {
    const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapi.search_observationunits({
        studyDbIds: [this.context.studySelected.studyDbId]
      }
    ).all((result: any) => {
      this.sourceObservationUnits = result;
    });
  }

  async loadGermplasm(): Promise<void> {
    try {
      const res: any = await this.http.get(this.context.source + '/germplasm', {
        params: {
          studyDbId: this.context.studySelected.studyDbId,
          page: (this.page - 1).toString(),
          pageSize: this.pageSize.toString(),
        }
      }).toPromise();
      this.sourceGermplasm = res.result.data;
      this.germplasmTotalCount = res.metadata.pagination.totalCount;

      // Check if the germplasm already exists in the destination server.
      await this.searchInTarget(this.sourceGermplasm);

    } catch (error) {
      console.log(error);
    }
  }

  async searchInTarget(germplasm: any[]): Promise<void> {
    /**
     * TODO
     *  - search by PUID, documentationUrl, externalReferences
     *  - show synchronized sources
     *  - BMS: /search/germplasm (IBP-4448)
     *  - search by other fields: e.g PUID
     */
    const brapi = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
    const germplasmInDestination = await brapiAll(
      brapi.data(
        this.sourceGermplasm.map((germplasm: any) => this.externalReferenceService.getReferenceId('germplasm', germplasm.germplasmDbId))
      ).germplasm((id: any) => {
        return {
          externalReferenceID: id,
          // guard against brapjs get-all behaviour
          pageRange: [0, 1],
          pageSize: 1
        };
      })
      , 30000);

    if (germplasmInDestination && germplasmInDestination.length) {
      germplasmInDestination.forEach((g: any) => {
        if (g.externalReferences && g.externalReferences.length) {
          g.externalReferences.forEach((ref: any) => {
            this.germplasmInDestinationByRefId[ref.referenceID] = g;
          });
        }
      });
    }
  }

}
