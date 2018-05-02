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
       this._demoJson = {};
       this._interrupt = false;
       this.srchBtn = srchBtnSelector || '#srch_box_btn';
       this.srchBox = srchBoxSelector || '#srch_box';
       this.srchWrap = srchWrapSelector || '#search-wrapper';
       this.pageWrap = pageWrapSelector || 'body';

       $(this.pageWrap).append(`
                               <div id="demo-blocker" style="display:none;width:100vw;height:100vh;background-color:rgba(0,0,0,0.1);position:fixed;z-index:9999999">
                               <!-- <button class="btn" id="demoStopBtn" style="background-color: rgba(0,0,0,0);color: rgb(255,50,100);position: fixed; bottom: 120px; left: 50px">
                               <i class="fa fa-close">  Stop Demo</i>
                               </button> -->
                               </div>`)
       this.stopDemo = function(){ this._interrupt = true; };

       $('#demoStopBtn').click((function(){ this._interrupt = true;}).bind(this));
       this.cursor = undefined;
       this.autoType = AutoTyper($(this.srchBox)[0]);
       this.menu = menuApi;
       this.menuSels = Object.assign({}, {singleNeu: '#single-neu',
                                          singlePin: '#single-pin',
                                          lpu: '#toggle_neuropil',
                                          neu: '#toggle_neuron',
                                          top: '#mm-0',
                                          neuHideAll: '#btn-neu-none',
                                          neuShowAll: '#btn-neu-all',
                                          pinKeep: '#btn-pin-keep',
                                          pinRemove: '#btn-pin-remove',
                                          unpinAll: '#btn-pin-unpinall',
                                          lpuShowAll: '#btn-lpu-all',
                                          lpuHideAll: '#btn-lpu-none'
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
         this.uiBtns[key] = '#ffboUIbtn-' + this.uiBtns[key];
       // InfoPanel API

       // Settings API

       // Tags API
       this._timeOutPause = 100;
       this._longerPause = 400;
     }

     Object.assign(FFBODemoPlayer.prototype, {
       // For Test
       _initCursor: function(){
         this.cursor = new mouseSVG(ffbomesh);
         bodyRect = $('#demo-blocker')[0].getBoundingClientRect();
         this.cursor.show({x: Math.round(bodyRect.width/2), y:Math.round(bodyRect.width/2)})
       },
       _moveTo: function(t, dur){
         return new Promise((resolve, reject) => {
           try{
             if(this._interrupt){
               resolve();
               return;
             }
             //mouseOver = this.ffbomesh.states.mouseOver;
             //this.ffbomesh.states.mouseOver = true;
             if(typeof t === 'string'){
               $(t)[0].scrollIntoView({behavior: 'smooth'});
               setTimeout(() => { this.cursor.moveTo(t, dur); }, 2000);
               setTimeout(() => { resolve(); /*this.ffbomesh.states.mouseOver = mouseOver;*/ }, dur + 2000 + this._timeOutPause);
             }
             else{
               this.cursor.moveTo(t, dur);
               setTimeout(() => { resolve(); /*this.ffbomesh.states.mouseOver = mouseOver;*/ }, dur + this._timeOutPause);
             }
           }catch(err){
             reject(err)
           }
         });
       },
       _openPanel: function(panel, moveTo=true, moveToDur=1000, panelOpenPause=500){
         return new Promise((resolve, reject) => {
           try{
             if(this._interrupt){
               resolve();
               return;
             }
             if($(panel).hasClass('mm-panel_opened') && $('#ui_menu_nav').hasClass('mm-menu_opened')){
               resolve();
               return;
             }
             if(panel == this.menuSels.singleNeu || panel == this.menuSels.singlePin){
               this._openPanel(this.menuSels.top, moveTo, moveToDur, panelOpenPause).then(() => {
                 this._openPanel(this.menuSels.neu, moveTo, moveToDur, panelOpenPause).then(() => {
                   if(moveTo) {
                     sel = this.menuSels.neu + (panel == this.menuSels.singleNeu ? ' > ul > li:nth-child(4)' : ' > ul > li:nth-child(3)')
                     this._moveTo(sel, moveToDur).then(() =>{
                       this.cursor.click();
                       this.menu.openPanel($(panel));
                       setTimeout(function(){resolve()}, panelOpenPause + this._timeOutPause);
                     });
                   }
                   else{
                     this.menu.openPanel($(panel));
                     setTimeout(function(){resolve()}, panelOpenPause + this._timeOutPause);
                   }
                 });
               }).catch(reject);
             }
             else if (panel == this.menuSels.neu){
               if(moveTo) {
                 sel = this.menuSels.top + ' > ul > li:nth-child(3)'
                 this._moveTo(sel, moveToDur).then(() =>{
                   this.cursor.click();
                   this.menu.openPanel($(panel));
                   setTimeout(function(){resolve()}, panelOpenPause + this._timeOutPause);
                 }).catch(reject);
               }
               else{
                 this.menu.openPanel($(panel));
                 setTimeout(function(){resolve()}, panelOpenPause + this._timeOutPause);
               }
             }
             else if(panel == this.menuSels.lpu){
               this._openPanel(this.menuSels.top, moveTo, moveToDur, panelOpenPause).then(() => {
                 if(moveTo) {
                   sel = this.menuSels.top + ' > ul > li:nth-child(4)'
                   this._moveTo(sel, moveToDur).then(() =>{
                     this.cursor.click();
                     this.menu.openPanel($(panel));
                     setTimeout(function(){resolve()}, panelOpenPause + this._timeOutPause);
                   }).catch(reject);
                 }
                 else{
                   this.menu.openPanel($(panel));
                   setTimeout(function(){resolve()}, panelOpenPause + this._timeOutPause);
                 }
               });
             }
             else if(panel == this.menuSels.top){
               this.menu.open();
               this.menu.openPanel($(panel));
               setTimeout(function(){resolve()}, panelOpenPause + this._timeOutPause);
             }
           }catch(err){
             reject(err)
           }
         });
       },
       _clickMenu: function(sel, moveTo=true, moveToDur=1000, hoverPause = 500){
         return new Promise((resolve, reject) => {
           try{
             if(this._interrupt){
               resolve();
               return;
             }
             if(moveTo){
               this._moveTo(sel, moveToDur).then( () => {
                 $(sel).mouseover();
                 setTimeout(() => {this.cursor.click(); $(sel)[0].click();}, hoverPause)
                 setTimeout(() => {resolve();}, hoverPause + this._longerPause)
               }).catch(reject);
             }else{
               $(sel).mouseover();
               setTimeout(() => {$(sel)[0].click();}, hoverPause)
             }
           }catch(err){
             reject(err);
           }
         });
       },
       /*
       // Only one of uiBtn, menu, selector label, rid will be processed in that order
       {
       uiBtn: {
       type:   // showSettings, takeScreenshot etc
       }
       menu: {
       type:  pinToggle/unpin-pinned/visToggle/remove/neuShowAll/neuHideAll/pinKeep/pinRemove/unpinAll/lpuShowAll/lpuHideAll,
       label/rid: ,// if type in pinToggle/vistoggle/remove/unpin-pinned
       }
       selector: jquerySelector,  // Currently could be used for info panel, to be removed later
       label: objectLabel,
       rid: objectRid,
       cursorMove: true // default,
       cursorMoveDuration: 1000 //default
       }*/

       _click: function(object){
         return new Promise((resolve, reject) => {
           try{
             if(this._interrupt){
               resolve();
               return;
             }
             object = Object.assign({cursorMove: true, cursorMoveDuration: 1000}, object)
             if('uiBtn' in object){
               if(object.uiBtn.type in this.uiBtns)
                 this._clickMenu(this.uiBtns[object.uiBtn.type], object.cursorMove, object.cursorMoveDuration).then(() => {
                   resolve();
                 }).catch(reject);
               else
                 resolve();
             }
             else if('menu' in object){
               switch(object.menu.type){
               case "pinToggle":
                 this._openPanel(this.menuSels.singleNeu, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = '#btn-pin-symbol-' + ('label' in object.menu ? uidDecode(this.ffbomesh._labelToRid[object.menu.label]) : uidDecode(object.menu.rid));
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject);
                 break;
               case "unpin-pinned":
                 this._openPanel(this.menuSels.singlePin, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = '#btn-pinned-' + ('label' in object.menu ? uidDecode(this.ffbomesh._labelToRid[object.menu.label]) : uidDecode(object.menu.rid));
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject);
                 break;
               case "visToggle":
                 this._openPanel(this.menuSels.singleNeu, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = '#btn-toggle-' + ('label' in object.menu ? uidDecode(this.ffbomesh._labelToRid[object.menu.label]) : uidDecode(object.menu.rid));
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject);
                 break;
               case "remove":
                 this._openPanel(this.menuSels.singleNeu, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = '#btn-rm-' + ('label' in object.menu ? uidDecode(this.ffbomesh._labelToRid[object.menu.label]) : uidDecode(object.menu.rid));
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject);
                 break;
               case "neuShowAll":
                 this._openPanel(this.menuSels.singleNeu, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = this.menuSels.neuShowAll;
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject)
                 break;
               case "neuHideAll":
                 this._openPanel(this.menuSels.singleNeu, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = this.menuSels.neuHideAll;
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject)
                 break;
               case "lpuShowAll":
                 this._openPanel(this.menuSels.lpu, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = this.menuSels.lpuShowAll;
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject)
                 break;
               case "lpuHideAll":
                 this._openPanel(this.menuSels.lpu, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = this.menuSels.lpuHideAll;
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject)
                 break;
               case "pinKeep":
                 this._openPanel(this.menuSels.singlePin, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = this.menuSels.pinKeep;
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject);
                 break;
               case "pinRemove":
                 this._openPanel(this.menuSels.singlePin, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = this.menuSels.pinRemove;
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject);
                 break;
               case "unpinAll":
                 this._openPanel(this.menuSels.singlePin, object.cursorMove, object.cursorMoveDuration).then(()=>{
                   sel = this.menuSels.unpinAll;
                   this._clickMenu(sel, object.cursorMove, object.cursorMoveDuration).then(() => {resolve()});
                 }).catch(reject);
                 break;
               default:
                 reject("Unrecognized Command");
               }
             }
             else if('selector' in object){
               // Can be used for Info Panel now. Should be later replaced by an API
               this._clickMenu(object.selector, object.cursorMove, object.cursorMoveDuration)
                 .then(() => {
                   $(object.selector).click();
                   setTimeout(resolve, this._timeOutPause);
                 }).catch(reject);
             }
             else if('label' in object || 'rid' in object){
               this._highlight(object).then( () => {
                 rid = 'label' in object ? ffbomesh._labelToRid[object.label] : object.rid;
                 if(object.cursorMove) this.cursor.click();
                 ffbomesh.select(rid);
                 setTimeout(() => {resolve();}, this._longerPause);
               }).catch(reject)
             }
             else{
               resolve();
             }
           }catch(err){
             reject(err);
           }
         });
       },
       /*{
         label: objectLabel,
         rid: objectRid,
         cursorMove: true // default,
         cursorMoveDuration: 1000 //default
         }*/
       _pin: function(object){
         return new Promise((resolve, reject) => {
           try{
             if(this._interrupt){
               resolve();
               return;
             }
             object = Object.assign({}, {cursorMove: true, cursorMoveDuration: 1000}, object);
             this._highlight(object).then( () => {
               rid = 'label' in object ? ffbomesh._labelToRid[object.label] : object.rid;
               ffbomesh.select(rid);
               if(object.cursorMove) this.cursor.dbclick();
               ffbomesh.togglePin(rid);
               setTimeout(() => {resolve();}, this._longerPause*1.2);
             }).catch(reject)
           }catch(err){
             reject(err);
           }
         });
       },
       /*{
         label: objectLabel,
         rid: objectRid,
         cursorMove: true // default,
         cursorMoveDuration: 1000 //default
         }*/
       _highlight: function(object){
         return new Promise((resolve, reject) => {
           try{
             if(this._interrupt){
               resolve();
               return;
             }
             object = Object.assign({}, {cursorMove: true, cursorMoveDuration: 1000}, object);
             rid = 'label' in object ? ffbomesh._labelToRid[object.label] : object.rid;
             if(object.cursorMove){
               pos = ffbomesh.getNeuronScreenPosition(rid);
               this._moveTo(pos, object.cursorMoveDuration).then(() =>{
                 this.ffbomesh.highlight(rid, true);
                 setTimeout(() => {resolve();}, this._timeOutPause);
               }).catch(reject);
             }else{
               this.ffbomesh.highlight(rid);
               setTimeout(() => {resolve();}, this._timeOutPause);
             }
           }catch(err){
             reject(err);
           }
         });
       },
       _search: function(query){
         return new Promise((resolve, reject) => {
           try{
             if(typeof query !== 'string')
               query = query.query;
             if(this._interrupt){
               resolve();
               return;
             }
             this.menu.closeAllPanels();
             this.menu.close();
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
                 if(this._interrupt){
                   resolve();
                   return;
                 }
                 setTimeout(function(){
                   NLPsearch().then(function(){ resolve(); }, function(err){ reject(err); });
                 }, 3500);
               }).bind(this)).catch(reject);
             }).bind(this), 1000);
           }catch(err){
             reject(err);
           }
         });
       },
       addDemos: function(demoJson){
         Object.assign(this._demoJson, demoJson)
       },
       updateDemoTable: function(sel){
         $(sel).html("");
         this._categories = {};
         for ( demoId in this._demoJson ) {
           demo = this._demoJson[demoId];
           if(demo.category == undefined)
             demo.category = "Miscellaneous";
           if(!(demo.category in this._categories)){
             this._categories[demo.category] = 0;
             $(sel).append(
                "<h4>" + demo.category + "</h4>" +
                 "<table id='table-demo-" + demo.category.replace(/ /g,"_") + "' class='table-demo table table-inverse table-hover'>" +
                 "<thead class='thead-inverse'><tr><th>#</th><th>Keyword</th><th>Description</th><th></th></tr></thead>" +
                 "<tbody id='basic-table-demo-body' class='table-demo-body'></tbody>" +
                 "</table>"
             );
           }
           $("#table-demo-" + demo.category.replace(/ /g,"_")).append(
              "<tr><th>" + this._categories[demo.category] + "</th><td>" + demo.keyword + "</td><td>" + demo.description + "</td><td><button id='btn-demo-" + demoId + "' class='btn btn-danger btn-xs'>Launch</button></td></tr>"
           )
           $("#btn-demo-" + demoId).attr("demoid", demoId);
           this._categories[demo.category] ++;
           if (demo.script !== undefined)
             $("#btn-demo-" + demoId).click( (e) => {this.startDemo($(e.target).attr("demoid"));} );
           else
             $("#btn-demo-" + demoId).prop( 'disabled', true);
         }

       },
       // Should be overwritten by NeuroNLP.js
       notify: function(message, settings){
       },
       _displayMessage: function(object){
         object = Object.assign({pause: 4000, message:""}, object);
         return new Promise((resolve, reject) => {
           try{
             object.settings = Object.assign({timeout: 6000}, object.settings);
             this.notify(object.message, object.settings);
             setTimeout(resolve, object.pause);
           }catch(err){
             reject(err);
           }
         });
       },
       _demoPlayer: function(json){
         return new Promise((resolve, reject) => {
           var len = json.length;
           execute = (i) => {
             try{
               if (i == len || this._interrupt){
                 this._onDemoEnd();
                 resolve();
                 return;
               }
               var p = undefined;
               //             console.log(i);
               //             console.log(json[i]);
               switch ( json[i][0] ){
               case "click":
                 p = this._click(json[i][1])
                 break;
               case "pin":
                 p = this._pin(json[i][1])
                 break;
               case "highlight":
                 p = this._highlight(json[i][1])
                 break;
               case "search":
                 p = this._search(json[i][1])
                 break;
               case "notify":
                 p = this._displayMessage(json[i][1])
                 break;
               }
               if(p !== undefined) p.then(()=>{execute(i+1)}).catch(reject);
               else execute(i+1);
             }catch(err){
               reject(err);
               return;
             }
           }
           try{
             execute(0);
           }catch(err){
             reject(err);
           }
         });
       },
       beforeDemo: function(keyword){
       },
       afterDemo: function(){
       },
       startDemo: function(demoName){
         return new Promise((resolve, reject) => {
           try{
             this._interrupt = false;
             if(demoName in this._demoJson){
               $('#demo-blocker').show();
               this.beforeDemo(this._demoJson[demoName].keyword);
               this._initCursor();
               this._demoPlayer(this._demoJson[demoName].script).then(resolve).catch((err)=>{
                 this._onDemoEnd(err);
                 reject(err);
               });
             }
             else{
               reject("Demo not found");
             }
           }catch(err){
             this._onDemoEnd(err);
             reject(err)
           }
         });
       },
       stopDemo: function(){ this._interrupt = true; },
       _onDemoEnd: function(err){
         try{
           this.afterDemo();
         }catch(err){console.log(err);}
         if(this._interrupt)
           this.notify("Demo stopped successfully", {color: "yellow"});
         if(err !== undefined){
           this.notify("Demo was stopped due to an error", {color: "red", icon:"ico-error"});
           console.error(err);
         }
         this._interrupt = false;
         if(this.cursor){
           this.cursor.remove();
           delete this.cursor;
         }
         this.cursor = undefined;
         $('#demo-blocker').hide();
         this.ffbomesh.highlight(undefined);
         this.menu.closeAllPanels();
         this.menu.close();
       }
     });

     function mouseSVG(ffbomesh) {

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
       this.moveTo = function (t, dur) {
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
             var mouseOver;
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

     }

     function AutoTyper(element) {
       return function(str, second_element, speed) {
         return new Promise(function (resolve) {
           var query_str = str;
           var i = 0, text;
           speed = speed || 40;
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

