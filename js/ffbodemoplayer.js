if( moduleExporter === undefined){
  var moduleExporter = function(name, dependencies, definition) {
    if (typeof module === 'object' && module && module.exports) {
      dependencies = dependencies.map(require);
      module.exports = definition.apply(context, dependencies);
    } else if (typeof require === 'function') {
      define(dependencies, definition);
    } else {
      window[name] = definition();
    }
  };
}

moduleExporter(
   "FFBODemoPlayer",
   ["jquery", "d3", "blockui"],
   function($, d3){
     $ = $ || window.$;
     d3 = d3 || window.d3;
     FFBODemoPlayer = function(ffbomesh, menuApi, menuSelectors, uiBtns, srchBoxSelector, srchBtnSelector, srchWrapSelector, pageWrapSelector){
       this.ffbomesh = ffbomesh;
       this.demoJson = {};
       this._interrupt = false;
       this.srchBtn = srchBtnSelector || '#srch_box_btn';
       this.srchBox = srchBoxSelector || '#srch_box';
       this.srchWrap = srchWrapSelector || '#search-wrapper';
       this.pageWrap = pageWrapSelector || 'body';

       $(this.pageWrap).append(`
                               <div id="demo-blocker" style="display:none;width:100vw;height:100vh;background-color:rgba(0,0,0,0.1);position:fixed;z-index:9999999">
                                 <button class="btn" id="demoStopBtn" style="background-color: rgba(0,0,0,0);color: rgb(255,50,100);position: fixed; bottom: 120px; left: 50px">
                                    <i class="fa fa-close">  Stop Demo</i>
                                 </button>
                               </div>`)
       $('#demoStopBtn').click((function(){ this._interrupt = true;}).bind(this));
       this.cursor = undefined;
       this.autoType = AutoTyper($(this.srchBox)[0]);
       this.menu = menuApi;
       this.menuSels = Object.assign({}, {singleNeu: '#single-neu',
                                            singlePin: '#single-pin',
                                            lpu: '#toggle_neuropil',
                                            neu: '#toggle_neuron',
                                            top: '#mm-0',
                                            neuNone: '#btn-neu-none',
                                            neuAll: '#btn-neu-all',
                                            pinKeep: '#btn-pin-keep',
                                            pinRemove: '#btn-pin-remove',
                                            unpinAll: '#btn-pin-unpinall',
                                            lpuAll: '#btn-lpu-all',
                                            lpuNone: '#btn-lpu-none'
                                           }, menuSelectors)
       this.uiBtns = Object.assign({}, {showSettings: 'showSettings',
                                        takeScreenshot: 'takeScreenshot',
                                        showInfo: 'showInfo',
                                        resetView: 'resetView',
                                        resetVisibleView: 'resetVisibleView',
                                        showAll: 'showAll',
                                        hideAll: 'hideAll',
                                        removeUnpin: 'removeUnpin',
                                        downData: 'downData'}, uiBtns);
       for(key in this.uiBtns)
         this.uiBtns.key = '#ffboUIbtn-' + this.uiBtns.key;
       // InfoPanel API

     }

     Object.assign(FFBODemoPlayer.prototype, {
       // For Test
       _initCursor: function(){
         this.cursor = new mouseSVG();
         bodyRect = $('#demo-blocker')[0].getBoundingClientRect();
         this.cursor.show({x: Math.round(bodyRect.width/2), y:Math.round(bodyRect.width/2)})
       },
       moveTo: function(t, dur){
         return new Promise((function(resolve){
           if(typeof t === 'string'){
             $(t)[0].scrollIntoView({behavior: 'smooth'});
             setTimeout((function(){ this.cursor.moveTo(t, dur);}).bind(this), 500);
             setTimeout(function(){ resolve() }, dur + 500);
           }
         }).bind(this));
       },
       /*
       // Only one of uiBtn, menu, selector label, rid will be processed in that order
       {
         uiBtn: {
           type:   // showSettings, takeScreenshot etc
         }
         menu: {
           type:  pin/unpin-pinned/toggle/rm/neuAll/neuNone/pinKeep/pinRemove/unpinAll/lpuAll/lpuNone,
           label/rid: ,// if type in pin/toggle/rm/unpin-pinned
         }
         selector: jquerySelector,  // Currently could be used for info panel, to be removed later
         label: objectLabel,
         rid: objectRid,
         cursorMove: true // default,
         cursorMoveDuration: 500 //default
       }*/

       _openPanel: function(panel, moveTo=true, moveToDur=500, panelOpenPause=100){
         return new Promise((resolve) => {
           if(panel == this.menuSels.singleNeu || panel == this.menuSels.singlePin){
             this._openPanel(this.menuSels.top, moveTo, moveToDur, panelOpenPause).then(() => {
               this._openPanel(this.menuSels.neu, moveTo, moveToDur, panelOpenPause).then(() => {
                 if(moveTo) this.moveTo(panel, moveToDur);
                 this.menu.openPanel(panel);
                 setTimeout(function(){resolve()}, panelOpenPause);
               });
             });
           }
           else if(panel == this.menuSels.lpu){
             this._openPanel(this.menuSels.top, moveTo, moveToDur, panelOpenPause).then(() => {
               if(moveTo) this.moveTo(panel, moveToDur);
               this.menu.openPanel(panel);
               setTimeout(function(){resolve()}, panelOpenPause);
             });
           }
           else{
             if(moveTo) this.moveTo(panel, moveToDur);
             this.menu.openPanel(panel);
             setTimeout(function(){resolve()}, panelOpenPause);
           }
         });
       },
       click: function(object){
         object = Object.assign({cursorMove: true, cursorMoveDuration: 500}, object)
         if('uiBtn' in object){
         }
         else if('menu' in object){

         }
         else if('selector' in object){
           $(object.selector).click();
         }
         else if('label' in object){
           ffbomesh.select(ffbomesh._labelToRid(object.label));
         }
         else if('rid' in object){
           ffbomesh.select(object.rid);
         }
       },
       /*{
         label: objectLabel,
         rid: objectRid,
         cursorMove: true // default,
         cursorMoveDuration: 500 //default
       }*/
       pin: function(object){
       },
       /*{
         label: objectLabel,
         rid: objectRid,
         cursorMove: true // default,
         cursorMoveDuration: 500 //default
       }*/
       highlight: function(object){

       },
       search: function(query){
         return new Promise((function(resolve, reject){
           this.menu.closeAllPanels();
           $(this.srchWrap).toggleClass("search-middle");
           setTimeout((function(){
             this.autoType(query).then((function(){
               setTimeout((function(){
                 $(this.srchBtn).addClass("search-hover");
               }).bind(this), 500);
               setTimeout((function(){
                 $(this.srchBtn).removeClass("search-hover");
               }).bind(this), 1000);
               setTimeout((function(){
                 $(this.srchWrap).toggleClass("search-middle");
               }).bind(this), 1500);
               setTimeout(function(){
                 NLPsearch().then(function(){ resolve(); }, function(){ reject(); });
               }, 3500);
             }).bind(this));
           }).bind(this), 1000);
         }).bind(this));
       },
       addDemos: function(demoJson){
       },
       getDemosTable: function(){

       },
       displayMessage: function(message, settings){},
       startDemo: function(demoName){
         this.cursor = new mouseSVG();
         $('#demo-blocker').show();

         //this.cursor.svg.remove();
         //delete this.cursor;
         //this.cursor = undefined;
       },
       stopDemo: function(){ this._interrupt = true; }
     });

     function mouseSVG() {

       var bodyRect = $('#demo-blocker')[0].getBoundingClientRect();

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
     }

     function AutoTyper(element) {
       return function(str, second_element, speed) {
         return new Promise(function (resolve) {
           var query_str = str;
           var i = 0, text;
           speed = speed || 80;
           (function type() {
             text = query_str.slice(0, ++i);
             element.value = text;
             element.focus();
             element.scrollLeft = element.scrollWidth;
             if (second_element !== undefined)
               second_element.innerHTML += query_str[i-1];
             if (text === query_str) {
               resolve()
               return;
             }
             setTimeout(type, speed);
           }());
         });
       }
     }

    function uidDecode(id) {

      id = id.replace(/#/g,'hashtag');
      id = id.replace(/:/g,'colon');
      return id;
    }
    function uidEncode(id) {

      if (id.indexOf("hashtag") > -1)
          id = id.replace("hashtag","#");
      if (id.indexOf("colon") > -1)
          id = id.replace("colon",":");
      return id;
    }

     return FFBODemoPlayer;
   }
)

function ScriptLoader(func) {
    return function (script, i) {
        if (func !== undefined)
            func();
        if (i === undefined)
            i = 0;
        setTimeout( function() {
            script[i][1]();
            ++i;
            if (i === script.length)
                return;
            if (script[i][0] === null) {
                $("body").on( "demoproceed", function(event, e) {
                    $("body").off( "demoproceed" );
                    if (e === "success")
                        script_loader(script, i);
                    else
                        Notify("Stopping the demo due to the previous error...", null, null, 'danger');
                })
            } else
                script_loader(script, i);
        }, script[i][0] )
    }
}


function checkOnMobile() {

    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
        return true;
    else
        return false;
}

function demoBtnCallback(script) {
  return function() {
    $("#btn-pin-unpinall").click();
    onHideAllClick();
    $("#demo-panel").slideUp(500);
    closeAllOverlay(false);
    ffbomesh.controls.reset();
    script_loader(script);
  }
}

function chooseNeuron(name) {
  for(var i in ffbomesh.meshDict) {
    if (ffbomesh.meshDict[i].name == name) {
      return i;
    }
  }
}

function fetchInfo(name) {
  for(var i in ffbomesh.meshDict) {
    if (ffbomesh.meshDict[i].name == name) {
      fetchDetailInfo([name, i]);
    }
  }
}

function visual_highlight_neuron(demo_neuron_id) {
  demo_neuron_name = ffbomesh.meshDict[demo_neuron_id].name;
  cursor.dbclickshort();
  ffbomesh.togglePin(demo_neuron_id);
  if (ffbomesh.dispatch['dblclick'] !== undefined ) {
    ffbomesh.dispatch['dblclick'](demo_neuron_id, demo_neuron_name, ffbomesh.meshDict[demo_neuron_id]['pinned']);
  }
}

function add_neuron_click(demo_neuron_id) {
  demo_neuron_name = ffbomesh.meshDict[demo_neuron_id].name;
  ffbomesh.highlight(demo_neuron_id)
  ffbomesh.dispatch['click'](demo_neuron_id, demo_neuron_name);
}
