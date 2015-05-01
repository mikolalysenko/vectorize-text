"use strict"

var imshow = require('ndarray-imshow')

module.exports = vectorizeText
module.exports.processPixels = processPixels

var surfaceNets = require("surface-nets")
var ndarray = require("ndarray")
var simplify = require("simplify-planar-graph")
var toPolygons = require("planar-graph-to-polyline")
var triangulate = require("triangulate-polyline")

function transformPositions(positions, options, size) {
  var align = options.textAlign || "start"
  var baseline = options.textBaseline || "alphabetic"

  var lo = [1<<30, 1<<30]
  var hi = [0,0]
  var n = positions.length
  for(var i=0; i<n; ++i) {
    var p = positions[i]
    for(var j=0; j<2; ++j) {
      lo[j] = Math.min(lo[j], p[j])|0
      hi[j] = Math.max(hi[j], p[j])|0
    }
  }

  var xShift = 0
  switch(align) {
    case "center":
      xShift = -0.5 * (lo[0] + hi[0])
    break

    case "right":
    case "end":
      xShift = -hi[0]
    break

    case "left":
    case "start":
      xShift = -lo[0]
    break

    default:
      throw new Error("vectorize-text: Unrecognized textAlign: '" + align + "'")
  }

  var yShift = 0
  switch(baseline) {
    case "hanging":
    case "top":
      yShift = -lo[1]
    break

    case "middle":
      yShift = -0.5 * (lo[1] + hi[1])
    break

    case "alphabetic":
    case "ideographic":
      yShift = -3 * size
    break

    case "bottom":
      yShift = -hi[1]
    break

    default:
      throw new Error("vectorize-text: Unrecoginized textBaseline: '" + baseline + "'")
  }

  var scale = 1.0 / size
  if("lineHeight" in options) {
    scale *= +options.lineHeight
  } else if("width" in options) {
    scale = options.width / (hi[0] - lo[0])
  } else if("height" in options) {
    scale = options.height / (hi[1] - lo[1])
  }

  return positions.map(function(p) {
    return [ scale * (p[0] + xShift), scale * (p[1] + yShift) ]
  })
}



function getPixels(canvas, context, str, size) {
  var width = Math.ceil(context.measureText(str).width + 2*size)|0
  if(width > 8192) {
    throw new Error("vectorize-text: String too long (sorry, this will get fixed later)")
  }
  var height = 3 * size
  if(canvas.height < height) {
    canvas.height = height
  }

  context.fillStyle = "#000"
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = "#fff"
  context.fillText(str, size, 2*size)

  //Cut pixels from image
  var pixelData = context.getImageData(0, 0, width, height)
  var pixels = ndarray(pixelData.data, [height, width, 4])

  return pixels.pick(-1,-1,0).transpose(1,0)
}

function getContour(pixels, doSimplify) {
  var contour = surfaceNets(pixels, 128)
  if(doSimplify) {
    return simplify(contour.cells, contour.positions, 0.25)
  }
  return {
    edges: contour.cells,
    positions: contour.positions
  }
}

function processPixelsImpl(pixels, options, size, simplify) {
  //Extract contour
  var contour = getContour(pixels, simplify)

  //Apply warp to positions
  var npositions = transformPositions(contour.positions, options, size)
  var flip = "ccw" === options.orientation

  //If triangulate flag passed, triangulate the result
  if(options.polygons || options.polygon || options.polyline) {
    var polygons = toPolygons(contour.edges, contour.positions)
    return polygons.map(function(polygon) {
      if(flip) {
        polygon.reverse()
      }
      return polygon.map(function(loop) {
        return loop.map(function(v) {
          return npositions[v]
        })
      })
    })
  } else if(options.triangles || options.triangulate || options.triangle) {
    var polygons = toPolygons(contour.edges, contour.positions)
    var triangles = []
    for(var i=0; i<polygons.length; ++i) {
      triangles.push.apply(triangles, triangulate(polygons[i], contour.positions))
    }
    if(flip) {
      for(var i=0; i<triangles.length; ++i) {
        var c = triangles[i]
        var tmp = c[0]
        c[0] = c[2]
        c[2] = tmp
      }
    }
    return {
      cells: triangles,
      positions: npositions
    }
  } else {
    return {
      edges: contour.edges,
      positions: npositions
    }
  }
}

function processPixels(pixels, options, size) {
  try {
    return processPixelsImpl(pixels, options, size, true)
  } catch(e) {}
  try {
    return processPixelsImpl(pixels, options, size, false)
  } catch(e) {}
  if(options.polygons || options.polyline || options.polygon) {
    return []
  }
  if(options.triangles || options.triangulate || options.triangle) {
    return {
      cells: [],
      positions: []
    }
  }
  return {
    edges: [],
    positions: []
  }
}

function vectorizeText(str, canvas, context, options) {
  var size = options.size || 64
  var family = options.font || "normal"

  context.font = size + "px " + family
  context.textAlign = "start"
  context.textBaseline = "alphabetic"
  context.direction = "ltr"

  var pixels = getPixels(canvas, context, str, size)

  return processPixels(pixels, options, size)
}
