"use strict"

module.exports = createText

var vectorizeText = require("./lib/vtext")
var Canvas = require("canvas-browserify")
var canvas = new Canvas(1024, 256)
var context = canvas.getContext("2d")

function createText(str, options) {
  if((typeof options !== "object") || (options === null)) {
    options = {}
  }
  return vectorizeText(str, canvas, context, options)
}