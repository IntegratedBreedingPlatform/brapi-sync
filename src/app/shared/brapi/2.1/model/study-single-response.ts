import { Context } from '../../shared/model/context';
import { Metadata } from '../../shared/model/metadata';
import { Study } from './study';

export interface StudySingleResponse {
  context?: Context;
  metadata: Metadata;
  result: Study;
}
