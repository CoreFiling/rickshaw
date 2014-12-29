var Rickshaw = require("../rickshaw");

exports.setUp = function(callback) {

	Rickshaw = require('../rickshaw');

	global.document = d3.select('html')[0][0].parentNode;
	global.window = document.defaultView;

	new Rickshaw.Compat.ClassList();

	callback();
};

exports.tearDown = function(callback) {

	delete require.cache.d3;
	callback();
};

exports.reduceData = function(test) {
	// document comes from jsdom
	var el = document.createElement("div");

	var graph = new Rickshaw.Graph({
		element: el,
		width: 960,
		height: 500,
		renderer: 'line',
		series: [
			{
				color: 'steelblue',
				data: [
					{ x: 0, y: 0 },
					{ x: 1, y: 1 },
					{ x: 2, y: 3 },
					{ x: 3, y: 2 },
					{ x: 12, y: 4 },
					{ x: 13, y: 2 },
					{ x: 14, y: 7 },
					{ x: 15, y: 6 },
					{ x: 16, y: 8 },
					{ x: 20, y: 9 },
			    { x: 21, y: 10 },
			    { x: 22, y: 11 },
					{ x: 23, y: 12 },
					{ x: 24, y: 13 },
					{ x: 28, y: 1 },
					{ x: 29, y: 2 },
					{ x: 30, y: 3 },
					{ x: 31, y: 4 },
					{ x: 32, y: 3 }
				]
			},
			{ data: [] } // test that _reduceData can handle empty series
		]
	});

	var seriesData = graph.series.map(function(s) { return s.stack });

	graph.renderer.steps = seriesData[0].length;
	test.deepEqual(seriesData[0], graph.renderer._reduceData(seriesData)[0], "Number of steps equal to the number of data points should not change the data");

	graph.renderer.steps = 4;
	expected =	[
								// 1st segment
								{x: 0, y: 0, y0: 0},  // minY
								{x: 2, y: 3, y0: 0},  // maxY
								{x: 3, y: 2, y0: 0},  // last
								{x: 12, y: 4, y0: 0}, // selected point

								// 2nd segment
								{x: 13, y: 2, y0: 0}, // minY (also minY for 3rd segment)
								{x: 14, y: 7, y0: 0}, // maxY
								{x: 15, y: 6, y0: 0}, // last
								{x: 16, y: 8, y0: 0}, // selected point

								// 3rd segment
								{x: 23, y: 12, y0: 0}, // last
								{x: 24, y: 13, y0: 0}, // step + maxY (also maxY for 4th segment)

								// 4th segment
								{x: 28, y: 1, y0: 0}, // minY
								{x: 31, y: 4, y0: 0}, // last + maxY
								{x: 32, y: 3, y0: 0}  // step
							];

	test.deepEqual(expected, graph.renderer._reduceData(seriesData)[0], "Multiple segments");
	test.deepEqual([], graph.renderer._reduceData(seriesData)[1], "Empty series preserved");

	var testData = [];
	for (var i=0; i < 10000; i++) {
		testData.push({x: i, y: Math.random()});
	}
	graph.renderer.steps = STEPS = 500;
	test.ok(graph.renderer._reduceData([testData])[0].length <= STEPS * 4, "Total number of points should be less than or equal to 4 times the number of steps");

	test.done();
};

exports.domain = function(test) {

	// document comes from jsdom
	var el = document.createElement("div");

	var graph = new Rickshaw.Graph({
		element: el,
		width: 960,
		height: 500,
		padding: { top: 0, right: 0, bottom: 0, left: 0 },
		renderer: 'scatterplot',
		series: [
			{
				color: 'steelblue',
				data: [
					{ x: 0, y: 40 },
					{ x: 1, y: 49 },
					{ x: 2, y: 38 },
					{ x: 3, y: 30 },
					{ x: 4, y: 32 }
				]
			}
		]
	});

	var domain = graph.renderer.domain();
	test.deepEqual(domain, { x: [ 0, 4 ], y: [ 0, 49 ] }, 'domain matches');

	// with padding

	graph.configure({ padding: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 }});

	domain = graph.renderer.domain();
	test.deepEqual(domain, { x: [ -0.4, 4.44 ], y: [ 0, 49 + 4.9 ] }, 'domain matches with padding');

	// negative y-values minus auto

	graph.series[0].data[2].y = -72;
	graph.configure({ padding: { top: 0, right: 0, bottom: 0, left: 0 }});

	domain = graph.renderer.domain();
	test.deepEqual(domain, { x: [ 0, 4 ], y: [ 0, 49 ] }, 'domain matches with negative numbers and no auto');

	// negative y-values w/ auto

	graph.series[0].data[2].y = -72;
	graph.configure({ padding: { top: 0, right: 0, bottom: 0, left: 0 }, min: 'auto'});

	domain = graph.renderer.domain();
	test.deepEqual(domain, { x: [ 0, 4 ], y: [ -72, 49 ] }, 'domain matches with negative numbers and min auto');

	// different series lengths

	graph.series.push({
		color: 'lightblue',
		data: [ { x: 1, y: 20 }, { x: 2, y: 38 }, { x: 3, y: 30 }, { x: 4, y: 32 }, { x: 5, y: 32 } ]
	});

	graph.stackData();
	domain = graph.renderer.domain();
	test.deepEqual(domain, { x: [ 0, 5 ], y: [ -72, 49 ] }, 'multiple length series extents match');

	// null values and auto

	graph.series.splice(0, graph.series.length);
	graph.series.push({ data: [ { x: 1, y: 27 }, { x: 2, y: 49 }, { x: 3, y: 14 } ] });
	graph.series.push({ data: [ { x: 1, y: null }, { x: 2, y: 9 }, { x: 3, y: 3 } ] });

	graph.configure({ min: 'auto' });
	graph.stackData();

	domain = graph.renderer.domain();
	test.deepEqual(domain, { x: [ 1, 3 ], y: [ 3, 49 ] }, "null values don't set min to zero");

	// max of zero

	graph.series.push({ data: [ { x: 1, y: -29 }, { x: 2, y: -9 }, { x: 3, y: -3 } ] });

	graph.configure({ max: 0 });
	graph.stackData();

	domain = graph.renderer.domain();
	test.deepEqual(domain, { x: [ 1, 3 ], y: [ -29, 0 ] }, "explicit zero max doesn't fall through");

	test.done();
};

exports.respectStrokeFactory = function(test) {

	var el = document.createElement("div");
	
	Rickshaw.Graph.Renderer.RespectStrokeFactory = Rickshaw.Class.create( Rickshaw.Graph.Renderer, {

		name: 'respectStrokeFactory',
		
		seriesPathFactory: function() {
			var graph = this.graph;
			var factory = d3.svg.line()
				.x( function(d) { return graph.x(d.x) } )
				.y( function(d) { return graph.y(d.y + d.y0) } )
				.interpolate(graph.interpolation).tension(this.tension);
			factory.defined && factory.defined( function(d) { return d.y !== null } );
			return factory;
		},
		
		seriesStrokeFactory: function() {
			var graph = this.graph;
			var factory = d3.svg.line()
				.x( function(d) { return graph.x(d.x) } )
				.y( function(d) { return graph.y(d.y + d.y0) } )
				.interpolate(graph.interpolation).tension(this.tension);
			factory.defined && factory.defined( function(d) { return d.y !== null } );
			return factory;
		}
	});
	
	var graph = new Rickshaw.Graph({
		element: el,
		stroke: true,
		width: 10,
		height: 10,
		renderer: 'respectStrokeFactory',
		series: [
			{
				className: 'fnord',
				data: [
					{ x: 0, y: 40 },
					{ x: 1, y: 49 },
					{ x: 2, y: 38 },
					{ x: 3, y: 30 },
					{ x: 4, y: 32 }
				]
			}
		]
	});
	graph.render();
	
	var path = graph.vis.select('path.path.fnord');
	test.equals(path.size(), 1, "we have a fnord path");
	
	var stroke = graph.vis.select('path.stroke.fnord');
	test.equals(stroke.size(), 1, "we have a fnord stroke");
	
	// should also be availeable via series
	var firstSeries = graph.series[0];
	test.ok(d3.select(firstSeries.path).classed('path'), "selectable path");
	test.ok(d3.select(firstSeries.stroke).classed('stroke', "selectable stroke"));
	
	test.done();
};


exports['should allow arbitrary empty series when finding the domain of stacked data'] = function(test) {
	
	var el = document.createElement("div");
	
	// should not throw
	var graph = new Rickshaw.Graph({
		element: el,
		stroke: true,
		width: 10,
		height: 10,
		renderer: 'line',
		series: [
			{
				data: []
			},
			{
				data: [
					{ x: 0, y: 40 },
					{ x: 1, y: 49 },
					{ x: 2, y: 38 },
					{ x: 3, y: 30 },
					{ x: 4, y: 32 }
				]
			}
		]
	});
	test.deepEqual(graph.renderer.domain(), { x: [0, 4], y: [0, 49.49]});
	
	test.done();
};

