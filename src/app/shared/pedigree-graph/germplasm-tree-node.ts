export class GermplasmTreeNode {
  constructor(
    public germplasmDbId: string,
    public preferredName: string,
    public methodName?: string,
    public methodCode?: string,
    public femaleParentNode?: GermplasmTreeNode,
    public maleParentNode?: GermplasmTreeNode,
    public otherProgenitors: GermplasmTreeNode[] = [],
    public isDerivative: boolean = false
  ) {
  }
}
