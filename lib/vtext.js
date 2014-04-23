"use strict"

module.exports = vectorizeText

var surfaceNets = require("surface-nets")
var ndarray = require("ndarray")
var simplify = require("simplify-planar-graph")
var toPolygons = require("planar-graph-to-polyline")
var triangulate = require("triangulate-polyline")

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

  //Run simplification
  contour = simplify(contour.cells, contour.positions, 0.25)

  //If triangulate flag passed, triangulate the result
  if(options.polygons || options.polygon || options.polyline) {
    var polygons = toPolygons(contour.cells, contour.positions)
    return polygons.map(function(polygon) {
      return polygon.map(function(loop) {
        return loop.map(function(v) {
          return contour.positions[v]
        })
      })
    })
  } else if(options.triangles || options.triangulate || options.triangle) {
    var polygons = toPolygons(contour.cells, contour.positions)
    var triangles = []
    for(var i=0; i<polygons.length; ++i) {
      triangles.push.apply(triangles, triangulate(polygons[i], contour.positions))
    }
    return {
      cells: triangles,
      positions: contour.positions
    }
  }

  return {
    edges: contour.cells,
    positions: contour.positions
  }
}