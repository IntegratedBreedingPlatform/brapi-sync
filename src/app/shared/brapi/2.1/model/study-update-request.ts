import { ExternalReferencesInner } from './external-references-inner';
import { ObservationUnitHierarchyLevel1 } from './observation-unit-hierarchy-level-1';
import { StudyContacts } from './study-contacts';
import { StudyDataLinks } from './study-data-links';
import { StudyEnvironmentParameters } from './study-environment-parameters';
import { StudyExperimentalDesign } from './study-experimental-design';
import { StudyGrowthFacility } from './study-growth-facility';
import { StudyLastUpdate } from './study-last-update';

export class StudyUpdateRequest {
  active?: boolean;
  additionalInfo?: { [key: string]: string; };
  commonCropName?: string;
  contacts?: Array<StudyContacts>;
  culturalPractices?: string;
  dataLinks?: Array<StudyDataLinks>;
  documentationURL?: string;
  endDate?: Date;
  environmentParameters?: Array<StudyEnvironmentParameters>;
  experimentalDesign?: StudyExperimentalDesign;
  externalReferences?: Array<ExternalReferencesInner>;
  growthFacility?: StudyGrowthFacility;
  lastUpdate?: StudyLastUpdate;
  license?: string;
  locationDbId?: string;
  locationName?: string;
  observationLevels?: Array<ObservationUnitHierarchyLevel1>;
  observationUnitsDescription?: string;
  observationVariableDbIds?: Array<string>;
  seasons?: Array<string>;
  startDate?: Date;
  studyCode?: string;
  studyDescription?: string;
  studyName?: string;
  studyPUI?: string;
  studyType?: string;
  trialDbId?: string;
  trialName?: string;
}
