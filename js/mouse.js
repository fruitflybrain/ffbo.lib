
function mouseSVG(ffbomesh) {

    var bodyRect = d3.select("body").node().getBoundingClientRect();

    this.svg = d3.select("body")
        .append("svg")
        .attr("height", bodyRect.height)
        .attr("width", bodyRect.width)
        .attr('id','mouse-svg')
        .attr("viewBox", "0 0 " + bodyRect.width + " " + bodyRect.height)
        .style("top" , "0px")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .style("position", "fixed")
        .style("z-index", "9999")
        .style("cursor", "none")

    this.cursor = this.svg.append("g")
    var arrow = this.cursor.append("polygon")
        .attr("points", "10.0844,10.2745 0.0,0.0 0.0004,14.3965 2.9325,11.8501 5.1731,17.3312 8.4486,15.9922 6.2081,10.5112")
        .style("fill", "#111")
        .style('stroke','#f9f9ab')
        .style('opacity',0)
        .style('stroke-width',2)
        .attr("transform","translate(" +  (1*bodyRect.width/2) + ", " + (1*bodyRect.height/2) + ")")
    this.hide = function(x) {
        this.obj[x].style("opacity",0);
        return this;
    }
    this.remove = function () {
        this.svg.remove();
    }
    this.hide = function () {
        this.cursor.select("polygon")
            .transition()
            .duration(500)
            .style("opacity", 0);
    }
    this.show = function (point) {
        if (point !== undefined) {
            this.cursor.select("polygon")
                .attr("transform","translate(" + point.x + ", " + point.y + ")")
        }
        this.cursor.select("polygon")
            .transition()
            .duration(500)
            .style("opacity", 1);
    }
    this.click = function () {
        this.cursor.select("polygon")
            .transition()
            .duration(200)
            .style("opacity", 0.5)
            .transition()
            .duration(200)
            .style("opacity", 0.5)
            .transition()
            .duration(200)
            .style("opacity", 1)
    }
    this.dbclick = function () {
        this.cursor.select("polygon")
            .transition()
            .duration(150)
            .style("opacity", 0.5)
            .transition()
            .duration(150)
            .style("opacity", 1.0)
            .transition()
            .duration(150)
            .style("opacity", 0.5)
            .transition()
            .duration(150)
            .style("opacity", 1.0)
    }
    this.dbclickshort = function () {
        this.cursor.select("polygon")
            .transition()
            .duration(50)
            .style("opacity", 0.5)
            .transition()
            .duration(50)
            .style("opacity", 1.0)
            .transition()
            .duration(50)
            .style("opacity", 0.5)
            .transition()
            .duration(50)
            .style("opacity", 1.0)
    }
    this.blink = function () {
        this.cursor.select("polygon")
            .transition()
            .duration(250)
            .attr("r", 5)
            .style("opacity", 0)
            .transition()
            .duration(250)
            .style("opacity", 1)
            .attr("r",8)
            .transition()
            .duration(250)
            .attr("r", 5)
            .style("opacity", 0)
            .transition()
            .duration(250)
            .attr("r", 8)
            .style("opacity", 1);
    }
    this.moveto = function (t, dur) {
        // if typeof(t) is a string, assume it is a selector
        if (typeof t === 'string') {
            var rect = $(t)[0].getBoundingClientRect();
            t = {'x':(rect.right+rect.left)/2, 'y':(rect.top+rect.bottom)/2};
        }
        var s = this.getCirclePosition();
        var line = this.svg.append("path")
                .attr("d","M " + s.x + " " + s.y +
                          "L " + t.x + " " + t.y)
        if (dur === undefined)
            dur = 1000;

        this.cursor.select("polygon")
            .transition()
                .duration(dur)
                .ease("quad")
                .attrTween("transform", translateAlong(line.node()))
    }
    this.getCirclePosition = function() {
        var t = d3.transform(this.cursor.select('polygon').attr("transform")),
            x = t.translate[0],
            y = t.translate[1];
        return {'x':x, 'y':y};
    }
    this.test = function(x) {
            var bodyRect = d3.select("body").node().getBoundingClientRect();
            var line = this.svg.append("path")
                .attr("d","M " +  (2*bodyRect.width/5) + " " + (2*bodyRect.height/5) +
                          "L " +  (3*bodyRect.width/5) + " " + (3*bodyRect.height/5))
            var totalLength = line.node().getTotalLength();
            var dur = 4500;

            this.cursor.select("polygon")
                .transition()
                    .duration(dur)
                    .ease("quad")
                    .attrTween("transform", translateAlong(line.node()))
    }
    this.hit = function(t, dur) {

        var s = this.getCirclePosition();
        var bodyRect = d3.select("body").node().getBoundingClientRect();
        var line = this.svg.append("path")
            .attr("d","M " +  (s.x) + " " + (s.y) +
                      "L " +  (t.x) + " " + (t.y))
        if (dur === undefined)
            dur = 1000;

        this.cursor.select("polygon")
            .transition()
                .duration(dur)
                .ease("quad")
                .attrTween("transform", translateAlongHit(line.node(),this))
    }
    // Returns an attrTween for translating along the specified path element.
    function translateAlong(path) {
        var l = path.getTotalLength();
        var ps = path.getPointAtLength(0);
        return function(d, i, a) {
            return function(t) {
                var e = document.createEvent("MouseEvents");
                var p = path.getPointAtLength(t * l);
                e.initMouseEvent("mousemove", true, true, window, 0, 0, 0, p.x, p.y, false, false, false, false, 0, null);
                if (ffbomesh !== undefined )
                    ffbomesh.onDocumentMouseMove(e);
                delete e;
                return "translate(" + p.x + "," + p.y + ")";
            };
        };
    };
    function translateAlongHit(path, obj) {
        var l = path.getTotalLength();
        var ps = path.getPointAtLength(0);
        return function(d, i, a) {
            return function(t) {
                var p;
                if ( ffbomesh !== undefined && ffbomesh.highlightedObj === null ) {j
                    var e = document.createEvent("MouseEvents");
                    var p = path.getPointAtLength(t * l);
                    e.initMouseEvent("mousemove", true, true, window, 0, 0, 0, p.x, p.y, false, false, false, false, 0, null);
                    ffbomesh.onDocumentMouseMove(e);
                    delete e;
                } else
                    p = obj.getCirclePosition();
                return "translate(" + p.x + "," + p.y + ")";
            };
        };
    };
}
