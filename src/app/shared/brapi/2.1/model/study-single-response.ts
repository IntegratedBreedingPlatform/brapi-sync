import { Context } from './context';
import { Metadata } from './metadata';
import { Study } from './study';

export interface StudySingleResponse {
  context?: Context;
  metadata: Metadata;
  result: Study;
}
