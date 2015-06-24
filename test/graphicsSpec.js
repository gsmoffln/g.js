'use strict';

var assert = require('assert');
var mocha = require('mocha');
var describe = mocha.describe;
var it = mocha.it;

var grob = require('../src/grob');

function assertAlmostEqual(actual, expected) {
    assert(Math.abs(actual - expected) < 0.00001, 'Expected ' + expected + ', got ' + actual);
}

describe('The angle function', function () {

    it('returns the angle between two points', function () {
        assert.equal(grob.angle(0, 0, 100, 100), 45);
        assert.equal(grob.angle(0, 0, 0, 120), 90);
        assert.equal(grob.angle({x: 100, y: 100}, {x: 0, y: 0}), -135);
        assert.equal(grob.angle([150, 0], [0, 150]), 135);
        assertAlmostEqual(grob.angle([50, 0], {x: -100, y: 259.8076}), 120);
    });

});

describe('The stack function', function () {

    it('returns valid bounds', function () {
        var r1 = grob.rect(0, 0, 100, 100);
        var r2 = grob.rect(0, 0, 100, 100);
        var g = grob.stack([r1, r2], 'e', 10);
        var bounds = grob.bounds(g);
        assert.deepEqual(bounds, {x: -50, y: -50, width: 210, height: 100});
    });

});
