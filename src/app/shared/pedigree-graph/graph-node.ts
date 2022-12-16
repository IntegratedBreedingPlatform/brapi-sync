export class GraphNode {
  constructor(
    public germplasmDbId: string,
    public preferredName: string,
    public methodName?: string,
    public methodCode?: string,
    public femaleParentNode?: GraphNode,
    public maleParentNode?: GraphNode,
    public otherProgenitors: GraphNode[] = [],
    public isDerivative: boolean = false,
    public isExistingInTarget: boolean = false,
    public isMismatched: boolean = false,
    public isBreedingMethodExisting: boolean = true
  ) {
  }
}
