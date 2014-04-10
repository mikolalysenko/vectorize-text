"use strict"

module.exports = vectorizeText

var surfaceNets = require("surface-nets")
var ndarray = require("ndarray")

var imshow = require("ndarray-imshow")

function vectorizeText(str, canvas, context, options) {
  var size = options.size || 64
  var family = options.font || "Calibri"


  context.font = size + "px " + family
  context.textAlign = "start"
  context.textBaseline = "hanging"
  
  console.log(context.font)
  
  var width = context.measureText(str).width + 10
  var height = 2 * size + 10
  console.log(width, height)
  if(canvas.width < width) {
    console.log("resize-width")
    canvas.width = width
  }
  if(canvas.height < height) {
    console.log("resize-height")
    canvas.height = height
  }

  console.log(context.font, context.textAlign, context.textBaseline)
  context.fillStyle = "#000"
  context.fillRect(0,0,canvas.width,canvas.height)


  context.fillStyle = "#fff"
  context.font = size + "px " + family
  context.textAlign = "start"
  context.textBaseline = "hanging"
  context.fillText(str, 5, 5)
  
  var pixelData = context.getImageData(0, 0, width, height)
  var pixels = ndarray(pixelData.data, [height, width, 4])

  imshow(pixels)

  var contour = surfaceNets(pixels.pick(-1,-1,0).transpose(1,0), 128)

  console.log(contour)
  return contour
}