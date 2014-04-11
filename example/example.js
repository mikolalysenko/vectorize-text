"use strict"

var vectorizeText = require("../index.js")

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