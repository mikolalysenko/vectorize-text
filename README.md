vectorize-text
==============
Convert a string of text into a vectorized geometric representation.

# Example

This module is capable of outputting geometry in several formats.

### Planar graphs

The default (and fastest) output from the module is a planar graph:

```javascript
var vectorizeText = require("vectorize-text")

var graph = vectorizeText("Hello world!")

console.log('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  width="338"  height="80" >')
graph.edges.forEach(function(c) {
  var p0 = graph.positions[c[0]]
  var p1 = graph.positions[c[1]]
  console.log('<line x1="' + p0[0] + '" y1="' + p0[1] + 
    '" x2="' + p1[0] + '" y2="' + p1[1] + 
    '" stroke-width="1" stroke="black" />')
})
console.log("</svg>")
```

And here is what the resulting SVG looks like:

<img src="https://mikolalysenko.github.io/vectorize-text/example/hello.svg">

### Polygons

You can also configure the module to emit polygons instead:

```javascript
var vectorizeText = require("vectorize-text")

var polygons = vectorizeText("Hello world!", { polygon: true })

console.log('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  width="338"  height="80" >')
graph.edges.forEach(function(c) {
  var p0 = graph.positions[c[0]]
  var p1 = graph.positions[c[1]]
  console.log('<line x1="' + p0[0] + '" y1="' + p0[1] + 
    '" x2="' + p1[0] + '" y2="' + p1[1] + 
    '" stroke-width="1" stroke="black" />')
})
console.log("</svg>")
```

And here is the resulting output:

<img src="https://mikolalysenko.github.io/vectorize-text/example/hello-polygon.svg">


### Triangulations

Finally, the module can output a triangulation (which is compatible with WebGL for example):

```javascript
var vectorizeText = require("vectorize-text")

var polygons = vectorizeText("Hello world!", { triangle: true })

console.log('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  width="338"  height="80" >')
graph.edges.forEach(function(c) {
  var p0 = graph.positions[c[0]]
  var p1 = graph.positions[c[1]]
  console.log('<line x1="' + p0[0] + '" y1="' + p0[1] + 
    '" x2="' + p1[0] + '" y2="' + p1[1] + 
    '" stroke-width="1" stroke="black" />')
})
console.log("</svg>")
```

And here is the resulting output:

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
    + `options.triangles` if set, then output a triangulation instead of a planar graph
    + `options.polygons` if set, output a list of polylines instead of a 

**Returns** A planar graph encoding the vectorized text, represented as an object with two properties.

* `cells` are the cells of the complex
* `positions` are the positions

# Credits
(c) 2014 Mikola Lysenko. MIT License