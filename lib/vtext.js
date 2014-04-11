"use strict"

module.exports = vectorizeText

var surfaceNets = require("surface-nets")
var ndarray = require("ndarray")
var simplify = require("simplify-2d-complex")

function vectorizeText(str, canvas, context, options) {
  var size = options.size || 64
  var family = options.font || "normal"

  context.font = size + "px " + family
  context.textAlign = "start"
  context.textBaseline = "hanging"
  
  var width = context.measureText(str).width + 10
  var height = 2 * size + 10
  if(canvas.width < width) {
    canvas.width = width
  }
  if(canvas.height < height) {
    canvas.height = height
  }

  context.fillStyle = "#000"
  context.fillRect(0,0,width,height)

  context.fillStyle = "#fff"
  context.fillText(str, 5, 5)

  //Cut pixels from image  
  var pixelData = context.getImageData(0, 0, width, height)
  var pixels = ndarray(pixelData.data, [height, width, 4])

  //Extract contour
  var contour = surfaceNets(pixels.pick(-1,-1,0).transpose(1,0), 128)

  //TODO: Maybe apply some smoothing here?

  //Run simplification
  contour = simplify(contour.cells, contour.positions, 0.25)

  return contour
}