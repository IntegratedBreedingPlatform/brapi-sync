import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'objectKeys'
})
export class ObjectKeysPipe implements PipeTransform {

  transform(value: {}): string[] {

    if (!value) {
      return [];
    }

    return Object.keys(value);
  }

}
