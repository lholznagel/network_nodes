var EXPAND_VIEWBOX_PER_NODE = 25;
var OFFSET_TO_BORDER = 10;
var COLOR_ROOT_NODE = '#36f9f6';
var COLOR_CHILD_NODE = '#fe4450';
var compose = function (init) {
    var f = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        f[_i - 1] = arguments[_i];
    }
    return f.reduceRight(function (prev, next) { return function (value) { return prev(next(value)); }; }, init);
};
var pipe = function (init) {
    var f = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        f[_i - 1] = arguments[_i];
    }
    return f.reduce(function (prev, next) { return function (value) { return next(prev(value)); }; }, init);
};
var createElement = function (name) { return document.createElementNS('http://www.w3.org/2000/svg', name); };
var appendElement = function (append) { return function (e) { e.appendChild(append); return e; }; };
var addAttribute = function (key, value) { return function (e) { e.setAttribute(key, value); return e; }; };
var randomNumber = function (max) { return function () { return Math.floor(Math.random() * max); }; };
var randomNumberBetween = function (min, max) { return function () { return Math.floor(Math.random() * (max - min) + min); }; };
var calcViewBox = function (countNodes) { return EXPAND_VIEWBOX_PER_NODE * countNodes; };
var offsetNodeFromBorder = function (nodeBorderOffset, max) { return function (x) { return x >= (max - (2 * nodeBorderOffset))
    ? x -= nodeBorderOffset
    : x <= (2 * nodeBorderOffset)
        ? x += 2 * nodeBorderOffset
        : x; }; };
var svgElement = function (nodes) { return pipe(addAttribute('viewBox', "0,0," + calcViewBox(nodes.length) + "," + calcViewBox(nodes.length)), addAttribute('style', "height: 100%; width: 100%;"), addAttribute('preserveAspectRatio', 'xMidYMid meet'))(createElement('svg')); };
var generatePosition = function (id, connections, type, nodes, additionalData, cxRandomFunction, cyRandomFunction) {
    return {
        id: id,
        connections: connections,
        type: type,
        additionalData: additionalData,
        cx: compose(offsetNodeFromBorder(OFFSET_TO_BORDER, calcViewBox(nodes.length)))(cxRandomFunction()),
        cy: compose(offsetNodeFromBorder(OFFSET_TO_BORDER, calcViewBox(nodes.length)))(cyRandomFunction())
    };
};
var getRootNodePosition = function (id, rootNodePositions) { return rootNodePositions.find(function (x) { return x.id === id; }); };
var generateRootNodePosition = function (nodes) { return nodes
    .map(function (x) { return generatePosition(x.id, x.connections, 'ROOT', nodes, x.additionalData, randomNumber(calcViewBox(nodes.length)), randomNumber(calcViewBox(nodes.length))); }); };
var generateChildNodesPosition = function (nodes, rootNodePositions) { return nodes
    .map(function (x) { return x.children
    .map(function (y) { return generatePosition(y.id, [x.id], 'CHILD', nodes, y.additionalData, randomNumberBetween(getRootNodePosition(x.id, rootNodePositions).cx - 20, getRootNodePosition(x.id, rootNodePositions).cx + 20), randomNumberBetween(getRootNodePosition(x.id, rootNodePositions).cy - 20, getRootNodePosition(x.id, rootNodePositions).cy + 20)); }); })
    .reduce(function (a, b) { return a.concat(b); }); };
var getNodePosition = function (id, nodes) { return nodes.find(function (x) { return x.id == id; }); };
var generateNodePositions = function (nodes) {
    var root = generateRootNodePosition(nodes);
    var nodes_position = generateChildNodesPosition(nodes, root);
    return root.concat(nodes_position);
};
var calcPath = function (source, target) { return "M" + source.cx + "," + source.cy + "L" + target.cx + "," + target.cy; };
var basePath = function (source, target) { return pipe(addAttribute('d', calcPath(source, target)), addAttribute('stroke', 'white'), addAttribute('fill', 'none'))(createElement('path')); };
var rootNodePath = function (e) { return pipe(addAttribute('stroke-width', '0.3'))(e); };
var childNodePath = function (e) { return pipe(addAttribute('stroke-width', '0.1'))(e); };
var drawPaths = function (nodePosition) { return function (svg) { return nodePosition
    .map(function (x) {
    x
        .connections
        .map(function (y) { return basePath(x, getNodePosition(y, nodePosition)); })
        .map(function (y) { return x.type === 'ROOT' ? rootNodePath(y) : childNodePath(y); })
        .map(function (y) { return svg.appendChild(y); });
})
    .map(function (_) { return svg; })
    .pop(); }; };
var baseNode = function (position) { return pipe(addAttribute('id', position.id), addAttribute('cx', position.cx.toString()), addAttribute('cy', position.cy.toString()))(createElement('circle')); };
var rootNode = function (e) { return pipe(addAttribute('r', '1.25'), addAttribute('fill', COLOR_ROOT_NODE))(e); };
var childNode = function (e) { return pipe(addAttribute('r', '1'), addAttribute('fill', COLOR_CHILD_NODE))(e); };
var drawNodes = function (nodePosition) { return function (svg) { return nodePosition
    .map(function (x) { return x.type === 'ROOT' ? rootNode(baseNode(x)) : childNode(baseNode(x)); })
    .map(function (x) { return svg.appendChild(x); })
    .map(function (_) { return svg; })
    .pop(); }; };
var appendSvg = function (svg) {
    document.getElementById('svg').appendChild(svg);
    return svg;
};
var addClickEvents = function (events, nodePositions) { return function (svg) {
    nodePositions
        .map(function (x) {
        if (events.onClick) {
            document.getElementById(x.id).addEventListener('click', function (_) { return events.onClick(x); });
        }
        return x;
    });
    return svg;
}; };
var addChildren = function (nodePositions) {
    nodePositions
        .filter(function (x) { return x.type === 'ROOT'; })
        .map(function (x) {
        x.children = function () { return nodePositions
            .filter(function (y) { return y.type === 'CHILD'; })
            .filter(function (y) { return y.connections[0] === x.id; }); };
        return x;
    });
    return nodePositions;
};
var addParent = function (nodePositions) {
    nodePositions
        .filter(function (x) { return x.type === 'CHILD'; })
        .map(function (x) {
        x.parent = function () { return nodePositions
            .filter(function (y) { return y.type === 'ROOT'; })
            .find(function (y) { return y.id === x.connections[0]; }); };
        return x;
    });
    return nodePositions;
};
var generate = function (config) {
    var positions = pipe(addChildren, addParent)(generateNodePositions(config.nodes));
    return pipe(drawPaths(positions), drawNodes(positions), appendSvg, addClickEvents(config.events, positions))(svgElement(config.nodes));
};
