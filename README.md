vectorize-text
==============
Convert a string of text into a vectorized geometric representation.  Works in both node.js and [browserify](http://browserify.org/).

# Example

This module is capable of outputting geometry in several formats.

### Planar graphs

The default (and fastest) output from the module is a planar graph:

```javascript
var vectorizeText = require("vectorize-text")

var graph = vectorizeText("Hello world! 你好")

var svg = ['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  width="500"  height="80" >']
graph.edges.forEach(function(e) {
  var p0 = graph.positions[e[0]]
  var p1 = graph.positions[e[1]]
  svg.push('<line x1="' + p0[0] + '" y1="' + p0[1] + 
    '" x2="' + p1[0] + '" y2="' + p1[1] + 
    '" stroke-width="1" stroke="black" />')
})
svg.push("</svg>")

console.log(svg.join(""))
```

Output:

<img src="https://mikolalysenko.github.io/vectorize-text/example/hello-graph.svg">

### Polygons

You can also configure the module to emit polygons instead:

```javascript
var vectorizeText = require("vectorize-text")

var polygons = vectorizeText("Hello world!", { polygon: true })

console.log('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  width="338"  height="80" >')
polygons.forEach(function(polygon) {
  
})
console.log("</svg>")
```

Output:

<img src="https://mikolalysenko.github.io/vectorize-text/example/hello-polygon.svg">


### Triangulations

Finally, the module can output a triangulation (which is compatible with WebGL for example):

```javascript
var vectorizeText = require("vectorize-text")

var complex = vectorizeText("Hello world! 你好", { triangles: true })

var svg = ['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  width="500"  height="80" >']
complex.cells.forEach(function(c) {
  for(var j=0; j<3; ++j) {
    var p0 = complex.positions[c[j]]
    var p1 = complex.positions[c[(j+1)%3]]
    svg.push('<line x1="' + p0[0] + '" y1="' + p0[1] + 
      '" x2="' + p1[0] + '" y2="' + p1[1] + 
      '" stroke-width="1" stroke="black" />')
  }
})
svg.push("</svg>")

console.log(svg)
```

Output:

<img src="https://mikolalysenko.github.io/vectorize-text/example/hello-triangles.svg">

# Install

```sh
npm install vectorize-text
```

# API

#### `require("vectorize-text")(string[,options])`
Renders a string to a 2D cell complex

* `string` is a string of text (single line)
* `options` is an optional object of parameters

    + `options.font` is the font to use (default: `"normal"`)
    + `options.triangles` if set, then output a triangulation
    + `options.polygons` if set, output a list of polygons

**Returns** The returned value depends on the type of geometry

* *Planar graph*: This is the fastest output format. A JSON object encoding the embedding of an oriented planar graph, with the following properties:

    + `edges` are the edges of the graph
    + `positions` are the positions

* *Polygon list*: A list of complex polygons encoded as arrays of positions.  This format is most suitable for SVG and GeoJSON output

* *Triangulation*: This format may be most suitable for WebGL/rendering applications. A 2D oriented simplicial complex encoded as a list of cells and positions, represented by a JSON object with two properties

    + `cells` are the faces of the triangulation, encoded as triples of indices into the vertex array
    + `positions` are the positions of the vertices in the triangulation

**Note** In node.js, this library requires Cairo.  For more information on how to set this up, look at the documentation for the [canvas module](https://www.npmjs.org/package/canvas).

# Credits
(c) 2014 Mikola Lysenko. MIT License