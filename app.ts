interface IConfig {
  events?: IEvent;
  nodes: IRootNode[];
}

interface IEvent {
  onClick: (self: INodePosition) => void;
}

interface INodePosition {
  children?: () => INodePosition[];
  parent?: () => INodePosition;
  additionalData: any;
  connections: string[];
  cx: number;
  cy: number;
  id: string;
  type: NodeType;
}

interface IRootNode {
  id: string;
  connections: string[];
  children: IChildNode[];
  additionalData: any;
}

interface IChildNode {
  id: string;
  additionalData: any;
}

type NodeType = 'ROOT' | 'CHILD';

const EXPAND_VIEWBOX_PER_NODE: number = 25;
const OFFSET_TO_BORDER: number = 10;

const COLOR_ROOT_NODE: string = '#36f9f6';
const COLOR_CHILD_NODE: string = '#fe4450';

const compose = <T>(init: (x: T) => T, ...f: Array<(x: T) => T>) => f.reduceRight((prev, next) => value => prev(next(value)), init);
const pipe = <T>(init: (x: T) => T, ...f: Array<(x: T) => T>) => f.reduce((prev, next) => value => next(prev(value)), init);

const createElement = (name: string): SVGElement => document.createElementNS('http://www.w3.org/2000/svg', name);
const appendElement = (append: SVGElement) => (e: SVGElement): SVGElement => { e.appendChild(append); return e; };
const addAttribute = (key: string, value: string) => (e: SVGElement): SVGElement => { e.setAttribute(key, value); return e };

const randomNumber = (max: number) => (): number => Math.floor(Math.random() * max);
const randomNumberBetween = (min: number, max: number) => (): number => Math.floor(Math.random() * (max - min) + min);

const calcViewBox = (countNodes: number): number => EXPAND_VIEWBOX_PER_NODE * countNodes;
const offsetNodeFromBorder = (nodeBorderOffset: number, max: number) => (x: number): number => x >= (max - (2 * nodeBorderOffset))
  ? x -= nodeBorderOffset
  : x <= (2 * nodeBorderOffset)
    ? x += 2 * nodeBorderOffset
    : x;

const svgElement = (nodes: IRootNode[]): SVGElement => pipe(
  addAttribute('viewBox', `0,0,${calcViewBox(nodes.length)},${calcViewBox(nodes.length)}`),
  addAttribute('style', `height: 100%; width: 100%;`),
  addAttribute('preserveAspectRatio', 'xMidYMid meet')
)(createElement('svg'));

const generatePosition = (
  id: string,
  connections: string[],
  type: NodeType,
  nodes: IRootNode[],
  additionalData: any,
  cxRandomFunction: () => number,
  cyRandomFunction: () => number
): INodePosition => {
  return {
    id,
    connections,
    type,
    additionalData,
    cx: compose(offsetNodeFromBorder(OFFSET_TO_BORDER, calcViewBox(nodes.length)))(cxRandomFunction()),
    cy: compose(offsetNodeFromBorder(OFFSET_TO_BORDER, calcViewBox(nodes.length)))(cyRandomFunction())
  }
};
const getRootNodePosition = (id: string, rootNodePositions: INodePosition[]): INodePosition => rootNodePositions.find(x => x.id === id);
const generateRootNodePosition = (nodes: IRootNode[]): INodePosition[] => nodes
  .map(x => generatePosition(
    x.id,
    x.connections,
    'ROOT',
    nodes,
    x.additionalData,
    randomNumber(calcViewBox(nodes.length)),
    randomNumber(calcViewBox(nodes.length))
  ));
const generateChildNodesPosition = (nodes: IRootNode[], rootNodePositions: INodePosition[]): INodePosition[] => nodes
  .map(x => x.children
    .map(
      y => generatePosition(
        y.id,
        [x.id],
        'CHILD',
        nodes,
        y.additionalData,
        randomNumberBetween(getRootNodePosition(x.id, rootNodePositions).cx - 20, getRootNodePosition(x.id, rootNodePositions).cx + 20),
        randomNumberBetween(getRootNodePosition(x.id, rootNodePositions).cy - 20, getRootNodePosition(x.id, rootNodePositions).cy + 20))
    ))
  .reduce((a, b) => a.concat(b));

const getNodePosition = (id: string, nodes: INodePosition[]): INodePosition => nodes.find(x => x.id == id);
const generateNodePositions = (nodes: IRootNode[]): INodePosition[] => {
  const root = generateRootNodePosition(nodes);
  const nodes_position = generateChildNodesPosition(nodes, root);
  return root.concat(nodes_position);
};

const calcPath = (source: INodePosition, target: INodePosition): string => `M${source.cx},${source.cy}L${target.cx},${target.cy}`;
const basePath = (source: INodePosition, target: INodePosition): SVGElement => pipe(
  addAttribute('d', calcPath(source, target)),
  addAttribute('stroke', 'white'),
  addAttribute('fill', 'none')
)(createElement('path'));
const rootNodePath = (e: SVGElement): SVGElement => pipe(addAttribute('stroke-width', '0.3'))(e);
const childNodePath = (e: SVGElement): SVGElement => pipe(addAttribute('stroke-width', '0.1'))(e);
const drawPaths = (nodePosition: INodePosition[]) => (svg: SVGElement): SVGElement => nodePosition
  .map(x => {
    x
      .connections
      .map(y => basePath(x, getNodePosition(y, nodePosition)))
      .map(y => x.type === 'ROOT' ? rootNodePath(y) : childNodePath(y))
      .map(y => svg.appendChild(y));
  })
  .map(_ => svg)
  .pop();

const baseNode = (position: INodePosition): SVGElement => pipe(
  addAttribute('id', position.id),
  addAttribute('cx', position.cx.toString()),
  addAttribute('cy', position.cy.toString())
)(createElement('circle'));
const rootNode = (e: SVGElement): SVGElement => pipe(addAttribute('r', '1.25'), addAttribute('fill', COLOR_ROOT_NODE))(e);
const childNode = (e: SVGElement): SVGElement => pipe(addAttribute('r', '1'), addAttribute('fill', COLOR_CHILD_NODE))(e);
const drawNodes = (nodePosition: INodePosition[]) => (svg: SVGElement): SVGElement => nodePosition
  .map(x => x.type === 'ROOT' ? rootNode(baseNode(x)) : childNode(baseNode(x)))
  .map(x => svg.appendChild(x))
  .map(_ => svg)
  .pop();
const appendSvg = (svg: SVGElement): SVGElement => {
  document.getElementById('svg').appendChild(svg);
  return svg;
};

const addClickEvents = (events: IEvent, nodePositions: INodePosition[]) => (svg: SVGElement): SVGElement => {
  nodePositions
    .map(x => {
      if(events.onClick) {
        document.getElementById(x.id).addEventListener('click', (_) => events.onClick(x));
      }
      return x;
    });
  return svg;
}
const addChildren = (nodePositions: INodePosition[]): INodePosition[] => {
  nodePositions
  .filter(x => x.type === 'ROOT')
  .map(x => {
    x.children = (): INodePosition[] => nodePositions
      .filter(y => y.type === 'CHILD')
      .filter(y => y.connections[0] === x.id);
    return x;
  });
  return nodePositions;
};
const addParent = (nodePositions: INodePosition[]): INodePosition[] => {
  nodePositions
    .filter(x => x.type === 'CHILD')
    .map(x => {
      x.parent = (): INodePosition => nodePositions
        .filter(y => y.type === 'ROOT')
        .find(y => y.id === x.connections[0]);
      return x;
    });
  return nodePositions;
};

const generate = (config: IConfig): SVGElement => {
  const positions: INodePosition[] = pipe(
    addChildren,
    addParent,
  )(generateNodePositions(config.nodes));

  return pipe(
      drawPaths(positions),
      drawNodes(positions),
      appendSvg,
      addClickEvents(config.events, positions)
    )(svgElement(config.nodes))
};