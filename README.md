vectorize-text
==============
Renders a string to a vector image.

# Example

```javascript
var vectorizeText = require("vectorize-text")

var complex = vectorizeText("Hello world!")

console.log('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  width="338"  height="80" >')
complex.cells.forEach(function(c) {
  var p0 = complex.positions[c[0]]
  var p1 = complex.positions[c[1]]
  console.log('<line x1="' + p0[0] + '" y1="' + p0[1] + 
    '" x2="' + p1[0] + '" y2="' + p1[1] + 
    '" stroke-width="0.1" stroke="black" />')
})
console.log("</svg>")
```

Output:

<img src="https://mikolalysenko.github.io/vectorize-text/hello.svg">

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

**Returns** A 2D cell complex encoding the vectorized text, represented as an object with two properties.

* `cells` are the cells of the complex
* `positions` are the positions

# Credits
(c) 2014 Mikola Lysenko. MIT License