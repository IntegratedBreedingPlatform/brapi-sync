import { AfterViewInit, Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Graphviz, graphviz } from 'd3-graphviz';
import * as d3 from 'd3';
import { GraphNode } from './graph-node';

@Component({
  selector: 'app-pedigree-graph',
  templateUrl: './pedigree-graph.component.html',
  styleUrls: ['./pedigree-graph.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class PedigreeGraphComponent implements OnInit, AfterViewInit {

  @Input() getGermplasmTreeNode: ((isPreviewTarget: boolean) => Promise<GraphNode | undefined>) | undefined;
  @Input() isPreviewTarget = false;
  @Input() colorizeNodes = false;
  @Input() graphId = 'pedigree-graph';

  includeDerivativeLines = false;
  includeBreedingMethod = true;
  graphviz: Graphviz<any, any, any, any> | undefined;

  MAX_NAME_DISPLAY_SIZE = 30;

  constructor() {
  }

  ngAfterViewInit(): void {
    this.initialize();
  }

  ngOnInit(): void {

  }

  initialize(): void {
    this.initializeGraph();
    if (this.getGermplasmTreeNode) {
      this.getGermplasmTreeNode(this.isPreviewTarget).then(data => this.render(data));
    }
  }

  render(graphNode?: GraphNode): void {
    if (this.graphviz && graphNode) {
      this.graphviz.renderDot(this.createDot(graphNode));
    }
  }

  initializeGraph(): void {

    this.graphviz = graphviz(`#${this.graphId}`, {
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

  isUnknownGermplasm(datum: any):
    boolean {
    return datum.key === '0';
  }

  stopPropagation(): void {
    const event = d3.event;
    event.preventDefault();
    event.stopPropagation();
  }

  createDot(graphNode: GraphNode): string {

    const dot: string[] = [];
    dot.push('strict digraph G {');
    this.addNode(dot, graphNode);
    dot.push('}');

    return dot.join('');
  }

  addNode(dot: string[], graphNode: GraphNode): void {

    dot.push(`${this.createNodeTextWithFormatting(dot, graphNode)}\n`);

    if (this.isUnknownImmediateSource(graphNode)) {
      if (graphNode.maleParentNode) {
        dot.push(this.createNodeTextWithFormatting(dot, graphNode.maleParentNode) + `->"${graphNode.germplasmDbId}";\n`);
        this.addNode(dot, graphNode.maleParentNode);
      }
      if (graphNode.femaleParentNode) {
        dot.push(this.createNodeTextWithFormatting(dot, graphNode.femaleParentNode) + `-> "${graphNode.maleParentNode?.germplasmDbId}";\n`);
        this.addNode(dot, graphNode.femaleParentNode);
      }
    } else {
      if (!graphNode.isDerivative && graphNode.femaleParentNode) {
        dot.push(this.createNodeTextWithFormatting(dot, graphNode.femaleParentNode) + `-> "${graphNode.germplasmDbId}"`
          + ((graphNode.isDerivative && !graphNode.maleParentNode) ? ';\n' :
            ' [color=\"RED\", arrowhead=\"odottee\"];\n'));
        this.addNode(dot, graphNode.femaleParentNode);
      }
      if (graphNode.maleParentNode) {
        dot.push(this.createNodeTextWithFormatting(dot, graphNode.maleParentNode) + `-> "${graphNode.germplasmDbId}"`
          + ((graphNode.isDerivative) ? ';\n' : ' [color=\"BLUE\", arrowhead=\"veeodot\"];\n'));
        this.addNode(dot, graphNode.maleParentNode);
      }
      if (graphNode.otherProgenitors && graphNode.otherProgenitors.length > 0) {
        graphNode.otherProgenitors.forEach((otherProgenitorGermplasmTreeNode: any) => {
          dot.push(this.createNodeTextWithFormatting(dot, otherProgenitorGermplasmTreeNode) + `-> "${graphNode.germplasmDbId}"`
            + ' [color=\"BLUE\", arrowhead=\"veeodot\"];\n');
          this.addNode(dot, otherProgenitorGermplasmTreeNode);
        });
      }
    }

  }

  isUnknownImmediateSource(graphNode: GraphNode): boolean {
    return graphNode.isDerivative &&
      graphNode.femaleParentNode?.germplasmDbId !== '0' &&
      graphNode.maleParentNode?.germplasmDbId === '0';
  }

  createNodeTextWithFormatting(dot: string[], graphNode: GraphNode): string {

    let name = '';

    if (graphNode.preferredName) {
      const preferredName = graphNode.preferredName.length > this.MAX_NAME_DISPLAY_SIZE
        ? graphNode.preferredName.substring(0, this.MAX_NAME_DISPLAY_SIZE) + '...' : graphNode.preferredName;
      name = `<<FONT>${preferredName}</FONT><BR/>`;
    }
    if (graphNode.germplasmDbId === '0') {
      dot.push(`"${graphNode.germplasmDbId}" [shape=box, style=dashed];\n`);
      name += `>`;
    } else {
      name += `<FONT>ID: ${graphNode.germplasmDbId}</FONT>`;
      dot.push(`"${graphNode.germplasmDbId}" [shape="box" ${this.getNodeColor(graphNode)}];\n`);
      if (this.includeBreedingMethod && graphNode.methodName) {
        if (graphNode.isBreedingMethodExisting) {
          name += `<BR/><BR/><FONT>${graphNode.methodName}</FONT>>`;
        } else {
          name += `<BR/><BR/><FONT COLOR="RED">${graphNode.methodName}</FONT>>`;
        }
      }
    }
    dot.push(`"${graphNode.germplasmDbId}" [label=${name}, tooltip="${graphNode.preferredName}", fontname="Helvetica", fontsize=12.0, ordering="in"];\n`);
    return `"${graphNode.germplasmDbId}"`;
  }

  getNodeColor(graphNode: GraphNode): string {
    if (this.colorizeNodes) {
      if (graphNode.isMismatched) {
        return `color="Red" style="filled" fontcolor="white"`;
      } else if (graphNode.isExistingInTarget) {
        return `color="Gold" style="filled"`;
      } else {
        return `color="LimeGreen" style="filled"`;
      }
    }
    return '';
  }

}
