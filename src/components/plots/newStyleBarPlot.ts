///<reference path="../../reference.ts" />

module Plottable {
export module Abstract {
  export class NewStyleBarPlot<X,Y> extends XYPlot<X,Y> {
    public static _BarAlignmentToFactor: {[alignment: string]: number} = {};
    private static DEFAULT_WIDTH = 10;
    public _baseline: D3.Selection;
    public _baselineValue = 0;
    public _barAlignmentFactor = 0;
    public _isVertical: boolean;

    public _animators: Animator.IPlotAnimatorMap = {
      "bars-reset" : new Animator.Null(),
      "bars"       : new Animator.IterativeDelay(),
      "baseline"   : new Animator.Null()
    };

    /**
     * Constructs a NewStyleBarPlot.
     *
     * @constructor
     * @param {Scale} xScale The x scale to use.
     * @param {Scale} yScale The y scale to use.
     */
    constructor(xScale: Abstract.Scale<X, number>, yScale: Abstract.Scale<Y, number>) {
      super(xScale, yScale);
      this.classed("bar-plot", true);
      this.project("fill", () => Core.Colors.INDIGO);
      // super() doesn't set baseline
      this.baseline(this._baselineValue);
    }

    public _getDrawer(key: string) {
      return new Plottable._Drawer.Rect(key);
    }

    public _setup() {
      super._setup();
      this._baseline = this._renderArea.append("line").classed("baseline", true);
    }

    public _paint() {
      super._paint();

      var primaryScale: Abstract.Scale<any,number> = this._isVertical ? this._yScale : this._xScale;
      var scaledBaseline = primaryScale.scale(this._baselineValue);
      var baselineAttr: any = {
        "x1": this._isVertical ? 0 : scaledBaseline,
        "y1": this._isVertical ? scaledBaseline : 0,
        "x2": this._isVertical ? this.width() : scaledBaseline,
        "y2": this._isVertical ? scaledBaseline : this.height()
      };
      this._applyAnimatedAttributes(this._baseline, "baseline", baselineAttr);
    }

    /**
     * Sets the baseline for the bars to the specified value.
     *
     * The baseline is the line that the bars are drawn from, defaulting to 0.
     *
     * @param {number} value The value to position the baseline at.
     * @returns {AbstractBarPlot} The calling AbstractBarPlot.
     */
    public baseline(value: number) {
      this._baselineValue = value;
      this._updateXDomainer();
      this._updateYDomainer();
      this._render();
      return this;
    }

    /**
     * Sets the bar alignment relative to the independent axis.
     * VerticalBarPlot supports "left", "center", "right"
     * HorizontalBarPlot supports "top", "center", "bottom"
     *
     * @param {string} alignment The desired alignment.
     * @returns {AbstractBarPlot} The calling AbstractBarPlot.
     */
     public barAlignment(alignment: string) {
       var alignmentLC = alignment.toLowerCase();
       var align2factor = (<typeof NewStyleBarPlot> this.constructor)._BarAlignmentToFactor;
       if (align2factor[alignmentLC] === undefined) {
         throw new Error("unsupported bar alignment");
       }
       this._barAlignmentFactor = align2factor[alignmentLC];

       this._render();
       return this;
     }


    private parseExtent(input: any): IExtent {
      if (typeof(input) === "number") {
        return {min: input, max: input};
      } else if (input instanceof Object && "min" in input && "max" in input) {
        return <IExtent> input;
      } else {
        throw new Error("input '" + input + "' can't be parsed as an IExtent");
      }
    }

    /**
     * Selects the bar under the given pixel position (if [xValOrExtent]
     * and [yValOrExtent] are {number}s), under a given line (if only one
     * of [xValOrExtent] or [yValOrExtent] are {IExtent}s) or are under a
     * 2D area (if [xValOrExtent] and [yValOrExtent] are both {IExtent}s).
     *
     * @param {any} xValOrExtent The pixel x position, or range of x values.
     * @param {any} yValOrExtent The pixel y position, or range of y values.
     * @param {boolean} [select] Whether or not to select the bar (by classing it "selected");
     * @returns {D3.Selection} The selected bar, or null if no bar was selected.
     */
    public selectBar(xValOrExtent: IExtent, yValOrExtent: IExtent, select?: boolean): D3.Selection;
    public selectBar(xValOrExtent: number, yValOrExtent: IExtent, select?: boolean): D3.Selection;
    public selectBar(xValOrExtent: IExtent, yValOrExtent: number, select?: boolean): D3.Selection;
    public selectBar(xValOrExtent: number, yValOrExtent: number, select?: boolean): D3.Selection;
    public selectBar(xValOrExtent: any, yValOrExtent: any, select = true): D3.Selection {
      if (!this._isSetup) {
        return null;
      }

      var selectedBars: any[] = [];

      var xExtent: IExtent = this.parseExtent(xValOrExtent);
      var yExtent: IExtent = this.parseExtent(yValOrExtent);

      // the SVGRects are positioned with sub-pixel accuracy (the default unit
      // for the x, y, height & width attributes), but user selections (e.g. via
      // mouse events) usually have pixel accuracy. A tolerance of half-a-pixel
      // seems appropriate:
      var tolerance: number = 0.5;

      // currently, linear scan the bars. If inversion is implemented on non-numeric scales we might be able to do better.
      this._getDrawersInOrder().forEach((d) => {
        d._renderArea.selectAll("rect").each(function(d: any) {
          var bbox = this.getBBox();
          if (bbox.x + bbox.width >= xExtent.min - tolerance && bbox.x <= xExtent.max + tolerance &&
              bbox.y + bbox.height >= yExtent.min - tolerance && bbox.y <= yExtent.max + tolerance) {
            selectedBars.push(this);
          }
        });
      });

      if (selectedBars.length > 0) {
        var selection: D3.Selection = d3.selectAll(selectedBars);
        selection.classed("selected", select);
        return selection;
      } else {
        return null;
      }
    }

    /**
     * Deselects all bars.
     * @returns {AbstractBarPlot} The calling AbstractBarPlot.
     */
    public deselectAll() {
      if (this._isSetup) {
        this._getDrawersInOrder().forEach((d) => d._renderArea.selectAll("rect").classed("selected", false));
      }
      return this;
    }

    public _updateDomainer(scale: Scale<any, number>) {
      if (scale instanceof Abstract.QuantitativeScale) {
        var qscale = <Abstract.QuantitativeScale<any>> scale;
        if (!qscale._userSetDomainer) {
          if (this._baselineValue != null) {
            qscale.domainer()
              .addPaddingException(this._baselineValue, "BAR_PLOT+" + this._plottableID)
              .addIncludedValue(this._baselineValue, "BAR_PLOT+" + this._plottableID);
          } else {
            qscale.domainer()
              .removePaddingException("BAR_PLOT+" + this._plottableID)
              .removeIncludedValue("BAR_PLOT+" + this._plottableID);
          }
          qscale.domainer().pad();
        }
            // prepending "BAR_PLOT" is unnecessary but reduces likely of user accidentally creating collisions
        qscale._autoDomainIfAutomaticMode();
      }
    }

    public _updateYDomainer() {
      if (this._isVertical) {
        this._updateDomainer(this._yScale);
      } else {
        super._updateYDomainer();
      }
    }

    public _updateXDomainer() {
      if (!this._isVertical) {
        this._updateDomainer(this._xScale);
      } else {
        super._updateXDomainer();
      }
    }


    public _generateAttrToProjector() {
      // Primary scale/direction: the "length" of the bars
      // Secondary scale/direction: the "width" of the bars
      var attrToProjector = super._generateAttrToProjector();
      var primaryScale: Abstract.Scale<any,number>    = this._isVertical ? this._yScale : this._xScale;
      var secondaryScale: Abstract.Scale<any,number>  = this._isVertical ? this._xScale : this._yScale;
      var primaryAttr     = this._isVertical ? "y" : "x";
      var secondaryAttr   = this._isVertical ? "x" : "y";
      var bandsMode = (secondaryScale instanceof Plottable.Scale.Ordinal)
                      && (<Plottable.Scale.Ordinal> <any> secondaryScale).rangeType() === "bands";
      var scaledBaseline = primaryScale.scale(this._baselineValue);
      if (attrToProjector["width"] == null) {
        var constantWidth = bandsMode ? (<Scale.Ordinal> <any> secondaryScale).rangeBand() : NewStyleBarPlot.DEFAULT_WIDTH;
        attrToProjector["width"] = (d: any, i: number) => constantWidth;
      }

      var positionF = attrToProjector[secondaryAttr];
      var widthF = attrToProjector["width"];
      if (!bandsMode) {
        attrToProjector[secondaryAttr] = (d: any, i: number) => positionF(d, i) - widthF(d, i) * this._barAlignmentFactor;
      } else {
        var bandWidth = (<Plottable.Scale.Ordinal> <any> secondaryScale).rangeBand();
        attrToProjector[secondaryAttr] = (d: any, i: number) => positionF(d, i) - widthF(d, i) / 2 + bandWidth / 2;
      }

      var originalPositionFn = attrToProjector[primaryAttr];
      attrToProjector[primaryAttr] = (d: any, i: number) => {
        var originalPos = originalPositionFn(d, i);
        // If it is past the baseline, it should start at the baselin then width/height
        // carries it over. If it's not past the baseline, leave it at original position and
        // then width/height carries it to baseline
        return (originalPos > scaledBaseline) ? scaledBaseline : originalPos;
      };

      attrToProjector["height"] = (d: any, i: number) => {
        return Math.abs(scaledBaseline - originalPositionFn(d, i));
      };

      return attrToProjector;
    }


  }
}
}
