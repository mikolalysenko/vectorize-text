"use strict"

module.exports = vectorizeText
module.exports.processPixels = processPixels

var surfaceNets = require('surface-nets')
var ndarray = require('ndarray')
var simplify = require('simplify-planar-graph')
var cleanPSLG = require('clean-pslg')
var cdt2d = require('cdt2d')
var toPolygonCrappy = require('planar-graph-to-polyline')

var TAG_bold = "b"
var CHR_bold = 'b'

var TAG_italic = "i"
var CHR_italic = 'i'

var TAG_super = "sup"
var CHR_super = 'P'

var TAG_sub = "sub"
var CHR_sub = 'B'

function parseTag(tag, TAG_CHR, str, map) {

  var opnTag =  "<"  + tag + ">"
  var clsTag =  "</" + tag + ">"

  var nOPN = opnTag.length
  var nCLS = clsTag.length

  var nStr = str.length

  var a = 0
  var b = -nCLS
  while (a > -1) {
    a = str.indexOf(opnTag, b + nCLS)
    if(a === -1) break

    b = str.indexOf(clsTag, a + nOPN)
    if(b === -1) break

    if(b <= a) break

    for(var i = a; i < b + nCLS; ++i){
      if((i < a + nOPN) || (i >= b)) {
        map[i] = null
      } else {
        if(map[i] !== null) {
          if(map[i].indexOf(TAG_CHR) === -1) map[i] += TAG_CHR
        }
      }
    }
  }

  return map
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

function getPixels(canvas, context, raw_str, fontSize, lineSpacing) {

  raw_str = raw_str.replace(/\<br\>/g, '\n')

  var activeStyle = ""
  var map = []
  for (j = 0; j < raw_str.length; ++j) {
    map[j] = activeStyle
  }
  map = parseTag(TAG_bold,
                 CHR_bold, raw_str, map)
  map = parseTag(TAG_italic,
                 CHR_italic, raw_str, map)
  map = parseTag(TAG_super,
                 CHR_super, raw_str, map)
  map = parseTag(TAG_sub,
                 CHR_sub, raw_str, map)

  var allStyles = []
  var plainText = ""
  for(j = 0; j < raw_str.length; ++j) {
    if(map[j] !== null) {
      plainText += raw_str[j]
      allStyles.push(map[j])
    }
  }

  var allTexts = plainText.split('\n')

  var numberOfLines = allTexts.length
  var lineHeight = Math.round(lineSpacing * fontSize)
  var offsetX = fontSize
  var offsetY = fontSize * 2
  var maxWidth = 0
  var minHeight = numberOfLines * lineHeight + offsetY

  if(canvas.height < minHeight) {
    canvas.height = minHeight
  }

  context.fillStyle = "#000"
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = "#fff"
  var i, j, xPos, yPos, zPos
  var nDone = 0

  for(i = 0; i < numberOfLines; ++i) {

    var txt = allTexts[i] + '\n'
    xPos = 0
    yPos = i * lineHeight
    zPos = fontSize

    var buffer = ""
    function writeBuffer() {
      if(buffer !== "") {
        var delta = context.measureText(buffer).width

        context.fillText(buffer, offsetX + xPos, offsetY + yPos)
        xPos += delta
      }
    }

    function changeStyle(oldStyle, newStyle) {

      function getTextFontSize() {
        return "" + Math.round(zPos) + "px ";
      }

      var ctxFont = "" + context.font;

      var wasSub = (oldStyle.indexOf(CHR_sub) > -1)
      var is_Sub = (newStyle.indexOf(CHR_sub) > -1)

      if(!wasSub && is_Sub) {
        ctxFont = ctxFont.replace(getTextFontSize(), "?px ")
        zPos *= 0.75
        ctxFont = ctxFont.replace("?px ", getTextFontSize())
        yPos += 0.25 * lineHeight
      }
      if(wasSub && !is_Sub) {
        ctxFont = ctxFont.replace(getTextFontSize(), "?px ")
        zPos /= 0.75
        ctxFont = ctxFont.replace("?px ", getTextFontSize())
        yPos -= 0.25 * lineHeight
      }

      var wasSuper = (oldStyle.indexOf(CHR_super) > -1)
      var is_Super = (newStyle.indexOf(CHR_super) > -1)

      if(!wasSuper && is_Super) {
        ctxFont = ctxFont.replace(getTextFontSize(), "?px ")
        zPos *= 0.75
        ctxFont = ctxFont.replace("?px ", getTextFontSize())
        yPos -= 0.25 * lineHeight
      }
      if(wasSuper && !is_Super) {
        ctxFont = ctxFont.replace(getTextFontSize(), "?px ")
        zPos /= 0.75
        ctxFont = ctxFont.replace("?px ", getTextFontSize())
        yPos += 0.25 * lineHeight
      }

      var wasBold = (oldStyle.indexOf(CHR_bold) > -1)
      var is_Bold = (newStyle.indexOf(CHR_bold) > -1)

      if(!wasBold && is_Bold) {
        if(wasItalic) {
          ctxFont = ctxFont.replace("italic ", "italic bold ")
        } else {
          ctxFont = "bold " + ctxFont
        }
      }
      if(wasBold && !is_Bold) {
        ctxFont = ctxFont.replace("bold ", '')
      }

      var wasItalic = (oldStyle.indexOf(CHR_italic) > -1)
      var is_Italic = (newStyle.indexOf(CHR_italic) > -1)

      if(!wasItalic && is_Italic) {
        ctxFont = "italic " + ctxFont
      }
      if(wasItalic && !is_Italic) {
        ctxFont = ctxFont.replace("italic ", '')
      }

      context.font = ctxFont
    }

    for(j = 0; j < txt.length; ++j) {
      var style = (j + nDone < allStyles.length) ? allStyles[j + nDone] : allStyles[allStyles.length - 1]
      if(activeStyle === style) {
        buffer += txt[j]
      } else {
        writeBuffer()
        buffer = txt[j]

        changeStyle(activeStyle, style)
        activeStyle = style
      }
    }
    writeBuffer()

    nDone += txt.length

    var width = Math.round(xPos + 2 * offsetX) | 0
    if(maxWidth < width) maxWidth = width
  }

  //Cut pixels from image
  var xCut = maxWidth
  var yCut = offsetY + lineHeight * numberOfLines
  var pixels = ndarray(context.getImageData(0, 0, xCut, yCut).data, [yCut, xCut, 4])
  return pixels.pick(-1, -1, 0).transpose(1, 0)
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
