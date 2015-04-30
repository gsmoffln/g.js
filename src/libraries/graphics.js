'use strict';

var vg = require('vg.js');
var img = require('img.js');

var grob = {};

function transformShape(shape, t) {
    return t.transformShape(shape);
}

function transformImage(image, t) {
    return image._transform(t.m);
}

function transform(shape, t) {
    if (shape instanceof vg.Path || shape instanceof vg.Group) {
        return transformShape(shape, t);
    } else if (shape instanceof img.Img) {
        return transformImage(shape, t);
    }
}

grob.align = function (shape, position, hAlign, vAlign) {
    if (!shape) {
        return;
    }
    var dx, dy, t,
        x = position.x,
        y = position.y,
        bounds = shape.bounds();
    if (hAlign === 'left') {
        dx = x - bounds.x;
    } else if (hAlign === 'right') {
        dx = x - bounds.x - bounds.width;
    } else if (hAlign === 'center') {
        dx = x - bounds.x - bounds.width / 2;
    } else {
        dx = 0;
    }
    if (vAlign === 'top') {
        dy = y - bounds.y;
    } else if (vAlign === 'bottom') {
        dy = y - bounds.y - bounds.height;
    } else if (vAlign === 'middle') {
        dy = y - bounds.y - bounds.height / 2;
    } else {
        dy = 0;
    }

    t = new vg.Transform().translate(dx, dy);
    return transform(shape, t);
};

grob.bounds = function (shape) {
    if (!shape) {
        return null;
    }
    return shape.bounds();
};

grob.copy = function (shape, copies, order, translate, rotate, scale) {
    var i, t, j, op, fn,
        shapes = [],
        tx = 0,
        ty = 0,
        r = 0,
        sx = 1.0,
        sy = 1.0;

    if (shape instanceof vg.Path || shape instanceof vg.Group) {
        fn = transformShape;
    } else if (shape instanceof img.Img) {
        fn = transformImage;
    }

    for (i = 0; i < copies; i += 1) {
        t = new vg.Transform();
        for (j = 0; j < order.length; j += 1) {
            op = order[j];
            if (op === 't') {
                t = t.translate(tx, ty);
            } else if (op === 'r') {
                t = t.rotate(r);
            } else if (op === 's') {
                t = t.scale(sx, sy);
            }
        }
        shapes.push(fn(shape, t));

        tx += translate.x;
        ty += translate.y;
        r += rotate;
        sx += scale.x / 100;
        sy += scale.y / 100;
    }
    return shapes;
};

grob.fit = function (shape, position, width, height, keepProportions) {
    if (!shape) {
        return;
    }
    keepProportions = keepProportions !== undefined ? keepProportions : true;
    var t, sx, sy,
        bounds = shape.bounds(),
        bx = bounds.x,
        by = bounds.y,
        bw = bounds.width,
        bh = bounds.height;

    // Make sure bw and bh aren't infinitely small numbers.
    // This will lead to incorrect transformations with for examples lines.
    bw = (bw > 0.000000000001) ? bw : 0;
    bh = (bh > 0.000000000001) ? bh : 0;

    t = new vg.Transform();
    t = t.translate(position.x, position.y);

    if (keepProportions) {
        // don't scale widths or heights that are equal to zero.
        sx = (bw > 0) ? (width / bw) : Number.MAX_VALUE;
        sy = (bh > 0) ? (height / bh) : Number.MAX_VALUE;
        sx = sy = Math.min(sx, sy);
    } else {
        sx = (bw > 0) ? (width / bw) : 1;
        sy = (bh > 0) ? (height / bh) : 1;
    }

    t = t.scale(sx, sy);
    t = t.translate(-bw / 2 - bx, -bh / 2 - by);
    return transform(shape, t);
};

grob.fitTo = function (shape, bounding, keepProportions) {
    if (!shape) {
        return;
    }
    if (!bounding) {
        return;
    }

    var bounds = bounding.bounds(),
        bx = bounds.x,
        by = bounds.y,
        bw = bounds.width,
        bh = bounds.height;

    return grob.fit(shape, {x: bx + bw / 2, y: by + bh / 2}, bw, bh, keepProportions);
};

// TODO: Make this work for vector shapes
grob.hslAdjust = function (image, h, s, l) {
    var layer = image.toLayer(false);
    layer.addFilter('hsl', {hue: h / 100, saturation: s / 100, lightness: l / 100});
    return image.withCanvas(layer.toCanvas());
};

grob.rgbAdjust = function (v, red, green, blue) {
    function rgbAdjust(v) {
        if (v instanceof img.Img) {
            var image = v;
            var layer = image.toLayer(false);
            layer.addFilter('coloradjust', {r: red / 100, g: green / 100, b: blue / 100});
            return image.withCanvas(layer.toCanvas());
        } else if (v instanceof vg.Group) {
            var newShapes = [];
            for (var i = 0; i < v.shapes.length; i += 1) {
                newShapes.push(rgbAdjust(v.shapes[i]));
            }
            return new vg.Group(newShapes);
        } else if (v instanceof vg.Path) {
            var p = v.clone();
            p.fill = rgbAdjust(p.fill);
            p.stroke = rgbAdjust(p.stroke);
            return p;
        }
        var c = v;
        if (!(c instanceof vg.Color)) {
            c = vg.Color.parse(c);
        }
        return new vg.Color(c.r + red / 100, c.g + green / 100, c.b + blue / 100, c.a);
    }
    return rgbAdjust(v);
};

grob.stack = function (shapes, direction, margin) {
    if (!shapes) {
        return [];
    }
    if (shapes.length <= 1) {
        return shapes;
    }

    var tx, ty, t, bounds,
        firstBounds = shapes[0].bounds(),
        newShapes = [];
    if (direction === 'e') {
        tx = -(firstBounds.width / 2);
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new vg.Transform().translate(tx - bounds.x, 0);
            newShapes.push(transform(shape, t));
            tx += bounds.width + margin;
        });
    } else if (direction === 'w') {
        tx = firstBounds.width / 2;
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new vg.Transform().translate(tx + bounds.x, 0);
            newShapes.push(transform(shape, t));
            tx -= bounds.width + margin;
        });
    } else if (direction === 'n') {
        ty = firstBounds.height / 2;
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new vg.Transform().translate(0, ty + bounds.y);
            newShapes.push(transform(shape, t));
            ty -= bounds.height + margin;
        });
    } else if (direction === 's') {
        ty = -(firstBounds.height / 2);
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new vg.Transform().translate(0, ty - bounds.y);
            newShapes.push(transform(shape, t));
            ty += bounds.height + margin;
        });
    }
    return newShapes;
};

module.exports = grob;