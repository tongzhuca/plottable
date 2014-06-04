
function scatterFull(svg, dataset) {

  // First, define some scales
  var xScale = new Plottable.Scales.Log();

  var yScale = new Plottable.Scales.Log();

  // var rScale = new Plottable.Scales.Log()
  //             .range([2, 12])
  //             .widenDomainOnData(data, linesAddedAccessor);

  var colorScale = new Plottable.Scales.Color()
                    .domain(["danmane", "jlan", "aramaswamy", "derekcicerone"])
                    .range(["#ff7f0e", "#1f77b4", "#2ca02c", "#d62728"]);

  function colorAccessor(d) { return colorScale.scale(d.name); }
  function x(d) { return d.deletions > 0 ? d.deletions : 1; }
  function y(d) { return d.insertions > 0 ? d.insertions : 1; }
  function r(d) { return 5;}
  var renderer = new Plottable.Plots.Scatter(dataset, xScale, yScale, x, y, r)
                 .colorAccessor(colorAccessor);
  renderer.clipPathEnabled = false;

  xScale.nice();
  yScale.nice();

  var legend    = new Plottable.Components.Legend(colorScale).minimumWidth(160).xOffset(-15).yOffset(100);
  var gridlines = new Plottable.Components.Gridlines(xScale, yScale);
  var group     = legend.merge(renderer).merge(gridlines);


  var xAxis  = new Plottable.Axis.XAxis(xScale, "bottom");
  var xLabel = new Plottable.Components.AxisLabel("# of Deletions");
  var xAxisT = new Plottable.Components.Table([[xAxis], [xLabel]]);

  var yAxis  = new Plottable.Axis.YAxis(yScale, "left").showEndTickLabels(true);
  var yLabel = new Plottable.Components.AxisLabel("# of Insertions", "vertical-left");
  var yAxisT = new Plottable.Components.Table([[yLabel, yAxis]]);

  var table  = new Plottable.Components.Table().addComponent(0, 0, yAxisT)
                                    .addComponent(0, 1, group)
                                    .addComponent(1, 1, xAxisT);

  var title = new Plottable.Components.TitleLabel("Commits by Size");
  var full  = new Plottable.Components.Table([[title], [table]]);
  full.renderTo(svg);

  xAxis._hideCutOffTickLabels();
  yAxis._hideCutOffTickLabels();
}
