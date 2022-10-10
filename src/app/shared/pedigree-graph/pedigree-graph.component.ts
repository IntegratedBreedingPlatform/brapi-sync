import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Graphviz, graphviz } from 'd3-graphviz';
import * as d3 from 'd3';
import { GermplasmTreeNode } from './germplasm-tree-node';

@Component({
  selector: 'app-pedigree-graph',
  templateUrl: './pedigree-graph.component.html',
  styleUrls: ['./pedigree-graph.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class PedigreeGraphComponent implements OnInit {

  @Input() getGermplasmTreeNode: (() => Promise<GermplasmTreeNode | undefined>) | undefined;

  includeDerivativeLines = false;
  includeBreedingMethod = true;
  graphviz: Graphviz<any, any, any, any> | undefined;

  MAX_NAME_DISPLAY_SIZE = 30;

  constructor() {
  }

  ngOnInit(): void {
    this.initialize();
  }

  initialize(): void {
    this.initializeGraph();
    if (this.getGermplasmTreeNode) {
      this.getGermplasmTreeNode().then(data => this.render(data));
    }
  }

  render(germplasmTreeNode?: GermplasmTreeNode): void {
    if (this.graphviz && germplasmTreeNode) {
      this.graphviz.renderDot(this.createDot(germplasmTreeNode), () => {
        this.initializeNodes();
      });
    }
  }

  initializeGraph(): void {

    this.graphviz = graphviz('#pedigree-graph', {
      useWorker: false
    }).totalMemory(Math.pow(2, 27)) // Increase memory available to avoid OOM
      .fit(true)
      .zoom(true)
      .attributer((obj: any) => {
        if (obj.tag === 'svg') {
          // Make sure the svg render fits the container
          obj.attributes.height = '100%';
          obj.attributes.width = '100%';
        }
      });
  }

  initializeNodes(): void {
    const nodes = d3.selectAll('.node');
    nodes.on('mouseover', (datum: any, i: any, group: any) => {
      this.stopPropagation();
      if (!this.isUnknownGermplasm(datum)) {
        const node = group[i];
        const selection = d3.select(node);
        selection.selectAll('polygon').attr('fill', '#337ab7');
        selection.selectAll('text').attr('fill', 'white');
      }
    });
    nodes.on('mouseout', (datum: any, i: any, group: any) => {
      this.stopPropagation();
      if (!this.isUnknownGermplasm(datum)) {
        const node = group[i];
        const selection = d3.select(node);
        selection.selectAll('polygon').attr('fill', 'none');
        selection.selectAll('text').attr('fill', '#000000');
      }
    });
  }

  isUnknownGermplasm(datum: any):
    boolean {
    return datum.key === '0';
  }

  stopPropagation(): void {
    const event = d3.event;
    event.preventDefault();
    event.stopPropagation();
  }

  createDot(germplasmTreeNode: GermplasmTreeNode): string {

    const dot: string[] = [];
    dot.push('strict digraph G {');
    this.addNode(dot, germplasmTreeNode);
    dot.push('}');

    return dot.join('');
  }

  addNode(dot: string[], germplasmTreeNode: GermplasmTreeNode): void {

    dot.push(this.createNodeTextWithFormatting(dot, germplasmTreeNode) + ';\n');

    if (this.isUnknownImmediateSource(germplasmTreeNode)) {
      if (germplasmTreeNode.maleParentNode) {
        dot.push(this.createNodeTextWithFormatting(dot, germplasmTreeNode.maleParentNode) + '->'
          + germplasmTreeNode.germplasmDbId + ';\n');
        this.addNode(dot, germplasmTreeNode.maleParentNode);
      }
      if (germplasmTreeNode.femaleParentNode) {
        dot.push(this.createNodeTextWithFormatting(dot, germplasmTreeNode.femaleParentNode) + '->'
          + germplasmTreeNode.maleParentNode?.germplasmDbId + ';\n');
        this.addNode(dot, germplasmTreeNode.femaleParentNode);
      }
    } else {
      if (germplasmTreeNode.femaleParentNode) {
        dot.push(this.createNodeTextWithFormatting(dot, germplasmTreeNode.femaleParentNode) + '->'
          + germplasmTreeNode.germplasmDbId + ((germplasmTreeNode.isDerivative && !germplasmTreeNode.maleParentNode) ? ';\n' :
            ' [color=\"RED\", arrowhead=\"odottee\"];\n'));
        this.addNode(dot, germplasmTreeNode.femaleParentNode);
      }
      if (germplasmTreeNode.maleParentNode) {
        dot.push(this.createNodeTextWithFormatting(dot, germplasmTreeNode.maleParentNode) + '->'
          + germplasmTreeNode.germplasmDbId + ((germplasmTreeNode.isDerivative
            && !germplasmTreeNode.femaleParentNode) ? ';\n' : ' [color=\"BLUE\", arrowhead=\"veeodot\"];\n'));
        this.addNode(dot, germplasmTreeNode.maleParentNode);
      }
      if (germplasmTreeNode.otherProgenitors && germplasmTreeNode.otherProgenitors.length > 0) {
        germplasmTreeNode.otherProgenitors.forEach((otherProgenitorGermplasmTreeNode: any) => {
          dot.push(this.createNodeTextWithFormatting(dot, otherProgenitorGermplasmTreeNode) + '->' + germplasmTreeNode.germplasmDbId
            + ' [color=\"BLUE\", arrowhead=\"veeodot\"];\n');
          this.addNode(dot, otherProgenitorGermplasmTreeNode);
        });
      }
    }

  }

  isUnknownImmediateSource(germplasmTreeNode: GermplasmTreeNode): boolean {
    return germplasmTreeNode.isDerivative &&
      germplasmTreeNode.femaleParentNode?.germplasmDbId !== '0' &&
      germplasmTreeNode.maleParentNode?.germplasmDbId === '0';
  }

  createNodeTextWithFormatting(dot: string[], germplasmTreeNode: GermplasmTreeNode): string {

    const name: string[] = [];

    if (germplasmTreeNode.preferredName) {
      const preferredName = germplasmTreeNode.preferredName.length > this.MAX_NAME_DISPLAY_SIZE
        ? germplasmTreeNode.preferredName.substring(0, this.MAX_NAME_DISPLAY_SIZE) + '...' : germplasmTreeNode.preferredName;
      name.push(preferredName + '\n');
    }
    if (germplasmTreeNode.germplasmDbId === '0') {
      dot.push(germplasmTreeNode.germplasmDbId + ' [shape=box, style=dashed];\n');
    } else {
      name.push('ID: ' + germplasmTreeNode.germplasmDbId);
      dot.push(`${germplasmTreeNode.germplasmDbId} [shape=box];\n`);
      if (this.includeBreedingMethod && germplasmTreeNode.methodName && germplasmTreeNode.methodCode) {
        name.push(`\n\n${germplasmTreeNode.methodCode}: ${germplasmTreeNode.methodName}`);
      }
    }
    dot.push(germplasmTreeNode.germplasmDbId + ' [label=\"' + name.join('') + '\", tooltip=\"' + germplasmTreeNode.preferredName
      + '\", fontname=\"Helvetica\", fontsize=12.0, ordering=\"in\"];\n');

    return germplasmTreeNode.germplasmDbId;
  }

}
