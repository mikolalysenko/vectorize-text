"use strict"

module.exports = vectorizeText
module.exports.processPixels = processPixels

var surfaceNets = require('surface-nets')
var ndarray = require('ndarray')
var simplify = require('simplify-planar-graph')
var cleanPSLG = require('clean-pslg')
var cdt2d = require('cdt2d')
var toPolygonCrappy = require('planar-graph-to-polyline')
var toSuperScript = require('superscript-text');

function fixSuperScript(x) {
    var idx = 0;

    while((idx = x.indexOf('<sup>', idx)) >= 0) {
        var nidx = x.indexOf('</sup>', idx);
        if(nidx < idx) break;

        x = x.slice(0, idx) + toSuperScript(x.slice(idx + 5, nidx)) + x.slice(nidx + 6);
    }

    return x;
}

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

function getPixels(canvas, context, raw_str, size, lineSpacing) {

  raw_str = raw_str.replace(/\<br\>/g, '\n')

  raw_str = fixSuperScript(raw_str);

  var allStr = raw_str.split('\n')

  var numberOfLines = allStr.length

  var minHeight = size * 3 * numberOfLines

  if(canvas.height < minHeight) {
    canvas.height = minHeight
  }

  var lineHeight = Math.ceil(lineSpacing * size)

  context.fillStyle = "#000"
  context.fillRect(0, 0, canvas.width, canvas.height)

  var offsetX = size
  var offsetY = size * 2
  var maxWidth = 0

  for(var i = 0; i < numberOfLines; ++i) {

    var str = allStr[i]

    var linePos = i * lineHeight

    context.fillStyle = "#fff"
    context.fillText(str, offsetX, offsetY + linePos)

    var width = Math.ceil(context.measureText(str).width + 2 * offsetX) | 0

    if(maxWidth < width) maxWidth = width
  }
  //Cut pixels from image
  var xCut = maxWidth
  var yCut = offsetY + lineHeight * numberOfLines

  var allPixels = context.getImageData(0, 0, xCut, yCut).data

  var pixels = ndarray(allPixels, [yCut, xCut, 4])

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
  var positions = transformPositions(contour.positions, options, size)
  var edges     = contour.edges
  var flip = "ccw" === options.orientation

  //Clean up the PSLG, resolve self intersections, etc.
  cleanPSLG(positions, edges)

  //If triangulate flag passed, triangulate the result
  if(options.polygons || options.polygon || options.polyline) {
    var result = toPolygonCrappy(edges, positions)
    var nresult = new Array(result.length)
    for(var i=0; i<result.length; ++i) {
      var loops = result[i]
      var nloops = new Array(loops.length)
      for(var j=0; j<loops.length; ++j) {
        var loop = loops[j]
        var nloop = new Array(loop.length)
        for(var k=0; k<loop.length; ++k) {
          nloop[k] = positions[loop[k]].slice()
        }
        if(flip) {
          nloop.reverse()
        }
        nloops[j] = nloop
      }
      nresult[i] = nloops
    }
    return nresult
  } else if(options.triangles || options.triangulate || options.triangle) {
    return {
      cells: cdt2d(positions, edges, {
        delaunay: false,
        exterior: false,
        interior: true
      }),
      positions: positions
    }
  } else {
    return {
      edges:     edges,
      positions: positions
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
  var lineSpacing = options.lineSpacing || 1.25

  context.font = [
    options.fontStyle,
    options.fontVariant,
    options.fontWeight,
    size + "px",
    options.font
  ].filter(function(d) {return d}).join(" ")
  context.textAlign = "start"
  context.textBaseline = "alphabetic"
  context.direction = "ltr"

  var pixels = getPixels(canvas, context, str, size, lineSpacing)

  return processPixels(pixels, options, size)
}
