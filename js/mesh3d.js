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
   "FFBOMesh3D",
   [
     "three",
     "webgl",
     "buffergeometryutils",
     "propertymanager",
     "lightshelper",
     "stats",
     "lut",
     "trackballcontrols",
     "simplifymodifier",
     "copyshader",
     "convolutionshader",
     "gltfloader",
     "fontloader",
     "textgeometry",
     "fxaashader",
     "ssaoshader",
     "luminosityhighpassshader",
     "luminosityshader",
     "tonemapshader",
     "gammacorrectionshader",
     "effectcomposer",
     "renderpass",
     "ssaarenderpass",
     "shaderpass",
     "ssaopass",
     "maskpass",
     "bloompass",
     "unrealbloompass",
     "adaptivetonemappingpass",
     'linematerial',
     'linesegmentsgeometry',
     'linesegments2'
   ],
   function(THREE, WebGL, BGUtils, PropertyManager, FFBOLightsHelper, Stats)
   {
     THREE = THREE || window.THREE;
     WebGL = THREE.WEBGL;
     BGUtils = THREE.BufferGeometryUtils;
     PropertyManager = PropertyManager || window.PropertyManager;
     FFBOLightsHelper = FFBOLightsHelper || window.FFBOLightsHelper;

     var isOnMobile = checkOnMobile();

     function checkOnMobile() {

       if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
         return true;
       else
         return false;
     }

     Math.clip = function(number, min_max) {
	    return Math.max(min_max[0], Math.min(number, min_max[1]));
	   }

     function getAttr(obj, key, val) {
       if (key in obj)
         val = obj[key];
       return val;
     }

     function setAttrIfNotDefined(obj, key, val) {
       if (!(key in obj))
         obj[key] = val;
     }

     function getRandomIntInclusive(min, max) {
       min = Math.ceil(min);
       max = Math.floor(max);
       return Math.floor(Math.random() * (max - min + 1)) + min;
     }
     function colorSeq(x) {
      a = Math.pow(2,Math.ceil(Math.log2(x+1)));
      b = Math.log2(a)-1;
      c = Math.pow(2,b)-1;
      d = 2*(x-c)-1;
      return d/a;
    }
     if ( ! WebGL.isWebGLAvailable() ) WebGL.addGetWebGLMessage();

     function FFBOMesh3D(div_id, data, metadata, stats=true) {

       /* default metadata */
       this._metadata = {
         "colormap": "rainbow_gist",
         "maxColorNum": 1747591,
         "allowPin": true,
         "allowHighlight": true,
         "enablePositionReset": true,
         "resetPosition": { 'x': 0., 'y': 0., 'z': 0. },
         "resetUp": {"x": 0., "y": 0., "z": 0},
         "cameraTarget": {"x": 0., "y": 0., "z": 0},
         "neu3dSettings": {
          defaultOpacity: 0.7,
          synapseOpacity: 1.0,
          meshOscAmp: 0.0,
          nonHighlightableOpacity: 0.0,
          lowOpacity: 0.05,
          pinOpacity: 0.9,
          pinLowOpacity: 0.1,
          highlightedObjectOpacity: 1.0,
          defaultRadius: 1.0,
          defaultSomaRadius: 3.0,
          defaultSynapseRadius: 0.2,
          RadiusRange: [0.01, 5.0],
          SomaRadiusRange: [0.1, 5.0],
          SynapseRadiusRange: [0.1, 1.0],
          anteriorAxis: [0, 0, -1],
          dorsalAxis: [0, -1, 0],
          rightHemisphereAxis: [-1, 0, 0],
          axisOrigin: [0, 0, 0],
          linewidth: 0.8,
          brightness: 1.0,
          backgroundOpacity: 0.5,
          backgroundWireframeOpacity: 0.07,
          neuron3dMode: 0,
          synapseMode: 1,   
          meshWireframe: true,
          backgroundColor: '#260226',
          sceneBackgroundColor: '#030305',
        },
        "neuron_mesh": {"url": ""}
       }
       if ( metadata !== undefined ) {
         for ( var key in this._metadata ) {
           if ( (key in metadata) && (metadata[key] !== undefined) ) {
            if (key === 'neu3dSettings') {
              for (var key2 in this._metadata['neu3dSettings']) {
                if (( key2 in metadata['neu3dSettings']) && (metadata['neu3dSettings'][key2] !== undefined)) {
                  this._metadata['neu3dSettings'][key2] = metadata['neu3dSettings'][key2];
                }
              }
            } else {
              this._metadata[key] = metadata[key];
            }
           }
         }
       }

       this.settings = new PropertyManager(this._metadata["neu3dSettings"]);

      //  this.settings.toneMappingPass = new PropertyManager({enabled: false, brightness: 0.95});
       this.settings.bloomPass = new PropertyManager({enabled: false, radius: 0.2, strength: 0.2, threshold: 0.3});
       this.settings.effectFXAA = new PropertyManager({enabled: false});
       this.settings.backrenderSSAO = new PropertyManager({enabled: false});

       this.states = new PropertyManager({
         mouseOver: false,
         pinned: false,
         highlight: false,
         animate: false
       });

       this.meshDict = new PropertyManager();

       this.uiVars = new PropertyManager({
         pinnedObjects: new Set(),
         toolTipPosition: new THREE.Vector2(),
         highlightedObjects: null,
         currentIntersected: undefined,
         cursorPosition: new THREE.Vector2(-100000,-100000),
         meshNum: 0,
         neuronNum: 0,
         synapseNum: 0,
         backNum: 0,
         tooltip: undefined,
         selected: undefined
       });

       // In case of non-unique labels, will hold the rid for the last object
       // added with that label
       this._labelToRid = {};

       this.raycaster = new THREE.Raycaster();
       this.raycaster.params.Line.threshold = 0.1;


       this.sphereGeometry = new THREE.SphereGeometry(1.0, 8, 8 );


       this.container = document.getElementById( div_id );

       this.stats = new Stats();
       this.statsMode = stats;
       if(stats) {
         this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
         this.stats.dom.style.position = "absolute"
         this.stats.dom.style.bottom = "50px";
         this.stats.dom.style.left = "5px";
         this.stats.dom.style.top = "";
         this.container.appendChild( this.stats.dom );
       } else {
         this.stats.showPanel(); // 0: fps, 1: ms, 2: mb, 3+: custom
         this.stats.dom.style.position = "absolute"
         this.stats.dom.style.bottom = "50px";
         this.stats.dom.style.left = "5px";
         this.stats.dom.style.top = "";
         this.container.appendChild( this.stats.dom );
       }

       this.camera = this.initCamera();

       this.renderer = this.initRenderer();

       this.groups = {
         frontLine: new THREE.Group(), // for raycaster detection
         frontCyl: new THREE.Group(),
         frontSyn: new THREE.Group(),
         back: new THREE.Group()
       }

       this.scenes = this.initScenes();

       this.controls = this.initControls();

       this.lightsHelper = this.initLights();

       this.lut = this.initLut();

       this.loadingManager = this.initLoadingManager();

       this.mousedown = false;
       this.isDragging = false;
       this.mouseDownPosition = undefined;
       this.container.addEventListener( 'mousedown', this.onDocumentMouseDown.bind(this), false );
       this.container.addEventListener( 'mouseup', this.onDocumentMouseUp.bind(this), false );


       this.container.addEventListener( 'click', this.onDocumentMouseClick.bind(this), false );

       this.container.addEventListener( 'dblclick', this.onDocumentMouseDBLClick.bind(this), false );

       if (isOnMobile) {
         this.container.addEventListener( 'taphold', this.onDocumentMouseDBLClickMobile.bind(this));
         document.body.addEventListener( 'contextmenu', function() { return false; });
       }

       this.container.addEventListener( 'mouseenter', this.onDocumentMouseEnter.bind(this), false );

       this.container.addEventListener( 'mousemove', this.onDocumentMouseMove.bind(this), false );

       this.container.addEventListener( 'mouseleave', this.onDocumentMouseLeave.bind(this), false );

       this.container.addEventListener( 'resize', this.onWindowResize.bind(this), false );

       this.animOpacity = {};

       this.defaultBoundingBox = {'maxY': -100000, 'minY': 100000, 'maxX': -100000, 'minX': 100000, 'maxZ': -100000, 'minZ': 100000};

       this.boundingBox = Object.assign( {}, this.defaultBoundingBox )
       this.visibleBoundingBox = Object.assign( {}, this.defaultBoundingBox )

       this.createInfoPanel();

       this.createToolTip();

       this._take_screenshot = false

       this.initPostProcessing();

       //this.composer.addPass( this.gammaCorrectionPass );
       this.UIBtns = {}

       this.dispatch = {
         click: undefined,
         dblclick: undefined,
         getInfo: this._getInfo,
         syncControls: undefined,
         resize: undefined
         /*'showInfo': undefined,
           'removeUnpin': undefined,
           'hideAll': undefined,
           'showAll': undefined,*/
       }
       this.commandDispatcher = {
         'show': this.show,
         'showall': this.showAll,
         'hide': this.hide,
         'hideall': this.hideAll,
         'pin': this.pin,
         'unpin': this.unpin,
         'unpinall': this.unpinAll,
         'remove': this.remove,
         'setcolor': this.setColor,
         'resetview': this.resetView,
       }

       this.callbackRegistry = {
         'add': (function (func) { this.meshDict.on('add', func); }).bind(this),
         'remove': (function (func) { this.meshDict.on('remove', func); }).bind(this),
         'pinned': (function (func) { this.meshDict.on('change', func, 'pinned'); }).bind(this),
         'visibility': (function (func) { this.meshDict.on('change', func, 'visibility'); }).bind(this),
         'num': (function (func) { this.uiVars.on('change', func, 'neuronNum'); }).bind(this),
         'synapsenum': (function (func) { this.uiVars.on('change', func, 'synapseNum'); }).bind(this),
         'highlight': (function (func) { this.states.on('change', func, 'highlight'); }).bind(this),
         'click': (function (func) { this.uiVars.on('change', func, 'selected'); }).bind(this)
       }

       this.on('add', (function (e) { this.onAddMesh(e); }).bind(this));
       this.on('remove', (function (e) { this.onRemoveMesh(e); }).bind(this));
       this.on('pinned', (function (e) { this.updatePinned(e); this.updateOpacity(e); }).bind(this));
       this.on('visibility', (function (e) { this.onUpdateVisibility(e.path[0]) }).bind(this));
       this.on('num', (function () { this.updateInfoPanel(); }).bind(this));
       this.on('synapsenum', (function () { this.updateInfoPanel(); }).bind(this));
       this.on('highlight', (function (e) { this.updateOpacity(e); this.onUpdateHighlight(e)  }).bind(this));
       this.settings.on("change", (function(e){
         this.updateOpacity(e)}).bind(this), [
           "pinLowOpacity", "pinOpacity", "defaultOpacity", "backgroundOpacity",
           "backgroundWireframeOpacity", "synapseOpacity",
           "highlightedObjectOpacity", "nonHighlightableOpacity", "lowOpacity"]);

       this.settings.on("change", (function(e){
        this.updateLinewidth(e.value)}).bind(this), "linewidth");

      this.settings.on("change", (function(e){
          this.updateSynapseRadius(e.value)}).bind(this), "defaultSynapseRadius");

      //  this.settings.on("change", (function(e){
      //     this.render.toneMappingExposure = e.value}).bind(this), "brightness");

       this.settings.on('change', (function(e){
         this[e.path[0]][e.prop] = e.value;
       }).bind(this), ['radius', 'strength', 'threshold', 'enabled']);

      //  this.settings.on('change', (function(e){
      //   this[e.path[0]][e.prop] = e.value;
      // }).bind(this), ['radius', 'strength', 'threshold', 'enabled']);

      //  this.settings.toneMappingPass.on('change', (function(e){
      //    this.toneMappingPass.setMinLuminance(1-this.settings.toneMappingPass.brightness);
      //  }).bind(this), 'brightness');

       this.settings.on('change', (function (e) {
         this.setBackgroundColor(e.value);
       }).bind(this), 'backgroundColor');
       this.settings.on('change', (function (e) {
        this.setSceneBackgroundColor(e.value);
      }).bind(this), 'sceneBackgroundColor');

       if ( data != undefined && Object.keys(data).length > 0)
         this.addJson( data );

       this.animate();
       this._defaultSettings = this.export_settings();
     };

     FFBOMesh3D.prototype.on = function (key, func) {
       if (typeof(func) !== "function") {
         console.log("not a function");
         return;
       }
       if (key in this.callbackRegistry) {
         var register = this.callbackRegistry[key];
         register(func);
       } else if (key in this.UIBtns) {
         this.UIBtns[key]['callbacks'].push(func);
       } else {
         console.log("callback keyword '" + key + "' not recognized.");
       }
     }

     FFBOMesh3D.prototype.initCamera = function () {

      let height = this.container.clientHeight;
      let width = this.container.clientWidth;

      this.fov = 20;
      this.prevhfov = 2 * Math.atan(Math.tan(Math.PI * this.fov / 2 / 180) * width / height);

      let camera = new THREE.PerspectiveCamera(this.fov, width / height, 0.1, 10000000 );
      camera.position.z = 1800;

      if (width < 768 && width / height < 1)
        camera.position.z = 3800;
      if (width < 768 && width / height >= 1)
        camera.position.z = 2600;

      if (this._metadata["enablePositionReset"] == true) {
        camera.position.z = this._metadata["resetPosition"]['z'];
        camera.position.y = this._metadata["resetPosition"]['y'];
        camera.position.x = this._metadata["resetPosition"]['x'];
        camera.up.z = this._metadata["resetUp"]['z'];
        camera.up.y = this._metadata["resetUp"]['y'];
        camera.up.x = this._metadata["resetUp"]['x'];
        // camera.up.y = this._metadata["upSign"];
      }
       return camera;
     }

     FFBOMesh3D.prototype.initRenderer = function () {
      renderer = new THREE.WebGLRenderer({ 'logarithmicDepthBuffer': true, alpha: false, antialias: true });
       renderer.setPixelRatio( window.devicePixelRatio );
       renderer.setSize( this.container.clientWidth, this.container.clientHeight );
       renderer.setClearColor( 0xFFFFFF, 0 );
      //  renderer.toneMapping = THREE.LinearToneMapping;
			// 	renderer.toneMappingExposure = 1.0;
        renderer.autoClear = false;
        // renderer.outputEncoding = THREE.GammaEncoding;
      //  renderer.gammaOutput = true;
       this.container.appendChild(renderer.domElement);
       return renderer;
     }

     FFBOMesh3D.prototype.initControls = function () {
       controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
       controls.rotateSpeed = 2.0;
       controls.zoomSpeed = 1.0;
       controls.panSpeed = 2.0;
       controls.staticMoving = true;
       controls.dynamicDampingFactor = 0.3;
       controls.addEventListener('change', this.render.bind(this));
       return controls;
     }

     FFBOMesh3D.prototype.initPostProcessing = function () {
       var height = this.container.clientHeight;
       var width = this.container.clientWidth;
       this.EffectComposerPasses = {};

       this.renderScene = new THREE.RenderPass( this.scenes.front, this.camera );
       this.renderScene.clear = false;
       this.renderScene.clearDepth = true;
       this.EffectComposerPasses['renderScene'] = this.renderScene;
       

       this.backrenderScene = new THREE.RenderPass( this.scenes.back, this.camera);
       this.EffectComposerPasses['backrenderScene'] = this.backrenderScene
       
       this.backrenderSSAO = new THREE.SSAOPass( this.scenes.back, this.camera, width, height);
       this.backrenderSSAO.enabled = this.settings.backrenderSSAO.enabled;
       this.EffectComposerPasses['backrenderSSAO'] = this.backrenderSSAO;

       this.effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
       this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / Math.max(width, 1440), 1 / Math.max(height, 900) );
       this.effectFXAA.enabled = this.settings.effectFXAA.enabled;
       this.EffectComposerPasses['effectFXAA'] = this.effectFXAA;

       this.bloomPass = new THREE.UnrealBloomPass(
         new THREE.Vector2( width, height ),
         this.settings.bloomPass.strength,
         this.settings.bloomPass.radius,
         this.settings.bloomPass.threshold
       );
       this.bloomPass.enabled = this.settings.bloomPass.enabled;
       this.EffectComposerPasses['bloomPass'] = this.bloomPass;
      //  this.bloomPass.renderToScreen = true;

      //  this.toneMappingPass = new THREE.AdaptiveToneMappingPass( true, width );
      //  this.toneMappingPass.setMinLuminance(1.-this.settings.toneMappingPass.brightness);

      this.effectCopy = new THREE.ShaderPass(THREE.CopyShader);
      this.effectCopy.renderToScreen = true;

      //  this.renderer.gammaInput = true;
      //  this.renderer.gammaOutput = true;

       this.composer = new THREE.EffectComposer( this.renderer );

       this.composer.addPass( this.backrenderScene );
       this.composer.addPass( this.backrenderSSAO );
       this.composer.addPass( this.renderScene );
       this.composer.addPass( this.effectFXAA );
      //  this.composer.addPass( this.toneMappingPass );
       this.composer.addPass( this.bloomPass );
       this.composer.addPass( this.effectCopy );
       this.composer.setSize( width*window.devicePixelRatio,
                              height*window.devicePixelRatio);
      //  this.composer.passes[1].enabled = this.settings.backrenderSSAO.enabled;
      //  this.composer.passes[3].enabled = this.settings.effectFXAA.enabled;
     }

     const colorX = 0xffff00;
     const colorY = 0x89C7FF;
     const colorZ = 0xFF0000;

     FFBOMesh3D.prototype.initScenes = function () {
       scenes = {
         front: new THREE.Scene(),
         back: new THREE.Scene()
       }

       scenes.front.background = null
       scenes.front.add( this.camera );

       scenes.back.background = new THREE.Color(0x030305);
       scenes.back.add( this.camera );

       scenes.front.add( this.groups.frontLine );
       scenes.front.add( this.groups.frontCyl );
       scenes.front.add( this.groups.frontSyn );
       scenes.back.add( this.groups.back );

       scenes.back.add(this.addCoordinateAxis());
       scenes.back.add(this.addAxisLabels(colorX, colorY, colorZ));

       return scenes;
     }

     FFBOMesh3D.prototype.createArrow = function(dir, color) {
      dir.normalize();

      // var width = this.container.clientWidth;
      const origin = new THREE.Vector3( ...this.settings.axisOrigin );
      const arrowHelper = new THREE.ArrowHelper( dir, origin, this.axis.arrowLength, color, 0.5*this.axis.arrowLength);

      return arrowHelper;
    }

    FFBOMesh3D.prototype.addAxisLabels = function(colorX, colorY, colorZ) {
      const loader = new THREE.FontLoader();
      let thisObject = this;
      this.axis.labels = new THREE.Object3D();
      loader.load('lib/fonts/helvetiker_bold.typeface.json', function ( font ) {
          thisObject.axis.textFont = font;
          thisObject.axis.labels.add(thisObject.createAxisLabel("Anterior", "anterior", colorX));
          thisObject.axis.labels.add(thisObject.createAxisLabel("Dorsal", "dorsal", colorY));
          thisObject.axis.labels.add(thisObject.createAxisLabel("Right", "rightHemisphere", colorZ));
      });
      return this.axis.labels;
    }

    FFBOMesh3D.prototype.createAxisLabel = function(text, axis, color) {
      textGeo = new THREE.TextGeometry( text, {
	  font: this.axis.textFont,
	  size: 0.15 * this.axis.arrowLength,
	  height: 0.05 * this.axis.arrowLength}
      );

      let fontMaterials = [
          new THREE.MeshStandardMaterial( { color: color, flatShading: true } ),
          new THREE.MeshStandardMaterial( { color: color } )
      ];
      let textMesh = new THREE.Mesh( textGeo, fontMaterials );
      let axisShift = 1.2 * this.axis.arrowLength;

      const scaledArray = this.settings[axis+"Axis"].map(item => item * axisShift);

      scaledArray.forEach((item, index) => {
        scaledArray[index] = item + this.settings.axisOrigin[index];
      });
      textMesh.position.set( ...scaledArray); 
      // if (axis == "anterior") {
      //     textMesh.position.set( ...(this.settings.anteriorAxis.map(item => item * axisShift)));
      // } else if (axis == "dorsal") {
      //     textMesh.position.set(0, axisShift, 0);
      // } else if (axis == "right") {
      //     textMesh.position.set(0, 0, -axisShift);
      // }

      return textMesh;
    }

    FFBOMesh3D.prototype.addCoordinateAxis = function() {
      this.axis = new THREE.Object3D();
      this.axis.nearPlaneHeight = Math.tan(Math.PI * this.fov / 2 / 180) * 0.1;
      this.axis.arrowLength = 0.25 * this.axis.nearPlaneHeight;
      this.axis.add(this.createArrow(new THREE.Vector3( ...this.settings.anteriorAxis), colorX));
      this.axis.add(this.createArrow(new THREE.Vector3( ...this.settings.dorsalAxis), colorY));
      this.axis.add(this.createArrow(new THREE.Vector3( ...this.settings.rightHemisphereAxis), colorZ));
      

      return this.axis;
    }

     FFBOMesh3D.prototype.initLut = function () {
       this.maxColorNum = this._metadata.maxColorNum;
       lut = new THREE.Lut( this._metadata.colormap, this.maxColorNum);
       lut.setMin( 0 );
       lut.setMax( 1 );
       return lut;
     }

     FFBOMesh3D.prototype.initLights = function() {
       lightsHelper = new FFBOLightsHelper( this.camera, this.controls, this.scenes.front );

       lightsHelper.addAmbientLight({
         intensity: 0.1,
         key: 'frontAmbient'
       });

       lightsHelper.addAmbientLight({
         intensity: 0.4,
         scene: this.scenes.back,
         key: 'backAmbient'
       });

       lightsHelper.addDirectionalLight({
         intensity: 0.1,
         position: new THREE.Vector3(0, 5000, 0),
         key: 'frontDirectional_1'
       });

       lightsHelper.addDirectionalLight({
         intensity: 0.55,
         position: new THREE.Vector3(0, 5000, 0),
         scene: this.scenes.back,
         key: 'backDirectional_1'
       });

       lightsHelper.addDirectionalLight({
         intensity: 0.1,
         position: new THREE.Vector3(0, -5000, 0),
         key: 'frontDirectional_2'
       });

       lightsHelper.addDirectionalLight({
         intensity: 0.55,
         position: new THREE.Vector3(0, -5000,0 ),
         scene: this.scenes.back,
         key: 'backDirectional_2'
       });

       lightsHelper.addSpotLight({
         posAngle1: 0,
         posAngle2: 0,
         intensity: 2.0,
         key: 'frontSpot_1'
       });

       lightsHelper.addSpotLight({
         posAngle1: 80,
         posAngle2: 80,
         intensity: 5.5,
         scene: this.scenes.back,
         key: 'backSpot_1'
       });

       lightsHelper.addSpotLight({
         posAngle1: 0,
         posAngle2: 0,
         intensity: 0.0,
         key: 'frontSpot_2'
       });

       lightsHelper.addSpotLight({
         posAngle1: -80,
         posAngle2: 80,
         intensity: 5.5,
         scene: this.scenes.back,
         key: 'backSpot_2'
       });

       return lightsHelper
     }

     FFBOMesh3D.prototype.initLoadingManager = function() {
       loadingManager = new THREE.LoadingManager();
       loadingManager.onLoad = function() {
         this.resetView();
         this.groups.frontLine.visible = true;
         this.groups.frontCyl.visible = true;
         this.groups.frontSyn.visible = true;
       }.bind(this);
       return loadingManager;
     }

     FFBOMesh3D.prototype.select = function(id) {
       this.uiVars.selected = id;
     }

     FFBOMesh3D.prototype.reset = function(resetBackground) {
       resetBackground = resetBackground || false;
       for (var key of Object.keys(this.meshDict)) {
         if ( !resetBackground && this.meshDict[key].background ) {
           continue;
         }
         if (this.meshDict[key]['pinned'])
           this.meshDict[key]['pinned'] = false;
         var meshobj = this.meshDict[key].object;
         for (var i = 0; i < meshobj.children.length; i++ ) {
           meshobj.children[i].geometry.dispose();
           meshobj.children[i].material.dispose();
         }
         this.meshDict[key].group.remove( meshobj );
         delete meshobj;
         delete this.meshDict[key];
       }
       this.uiVars.neuronNum = 0;
       this.uiVars.synapseNum = 0;
       this.states.highlight = false;
       // this.uiVars.pinnedObjects.clear()
       if ( resetBackground ) {
         this.controls.target0.set(0,0,0);
         this.boundingBox = {'maxY': -100000, 'minY': 100000, 'maxX': -100000, 'minX': 100000, 'maxZ': -100000, 'minZ': 100000};
       }
       //this.controls.reset();
     }

     FFBOMesh3D.prototype._configureCallbacks = function(){
       this.settings.on("change", function(e){
         for(i=0; i<this.groups.back.children.length; i++)
           this.groups.back.children[i].children[1].visible = e["value"];
       }.bind(this), "meshWireframe");
     }

     FFBOMesh3D.prototype.execCommand = function(json) {
       var neuList = json['neurons'] || [];
       var commandList = json['commands'] || [];
       var args = json['args'] || undefined;

       neuList = this.asarray( neuList );
       commandList = this.asarray( commandList );
       for ( var i = 0; i < commandList.length; ++i ) {
         var c = commandList[i].toLowerCase();
         this.commandDispatcher[c].call( this, neuList, args );
       }
     }

     FFBOMesh3D.prototype.addJson = function(json) {
       return new Promise((function(resolve) {
         if ( (json === undefined) || !("ffbo_json" in json) ) {
           console.log( 'mesh json is undefined' );
           return;
         }
         var metadata = {
           "type": undefined,
           "visibility": true,
           "colormap": this._metadata.colormap,
           "colororder": "sequence",
           "showAfterLoadAll": false,
         }
         for (var key in metadata)
           if ( (key in json) && (json[key] !== undefined) )
             metadata[key] = json[key];

         if ( ('reset' in json) && json.reset )
           this.reset();
         /* set colormap */
         var keyList = Object.keys(json.ffbo_json);
         var colorNum, id2float, lut;

         if ( metadata.colororder === "order" ) {
           colorNum = keyList.length;
           id2float = function(i) {return i/colorNum};
         } else if (metadata.colororder === "sequence"){
           id2float = (i) => {return colorSeq(this.uiVars.meshNum - this.uiVars.backNum + i + 1)};
         } else{
           colorNum = this.maxColorNum;
           id2float = function(i) {return getRandomIntInclusive(1, colorNum)/colorNum};
         }

         if ( metadata.colororder === "order" && (colorNum !== this.maxColorNum || metadata.colormap !== "rainbow_gist") ) {
           colorNum = keyList.length;
           lut = new THREE.Lut( metadata.colormap, colorNum);
           lut.setMin( 0 );
           lut.setMax( 1 );
         } else
           lut = this.lut;
         if ( metadata.showAfterLoadAll ){
           this.groups.frontLine.visible = false;
           this.groups.frontCyl.visible = false;
           this.groups.frontSyn.visible = false;
         }
         for ( var i = 0; i < keyList.length; ++i ) {
           var key = keyList[i];
           if (key in this.meshDict ) {
             console.log( 'mesh object already exists... skip rendering...' )
             continue;
           }
           var unit = new PropertyManager(json.ffbo_json[key]);
           unit.boundingBox = Object.assign( {}, this.defaultBoundingBox );

           setAttrIfNotDefined(unit, 'highlight', true);
           setAttrIfNotDefined(unit, 'visibility', true);
           setAttrIfNotDefined(unit, 'background', false);
           setAttrIfNotDefined(unit, 'color', lut.getColor(id2float(i)));
           setAttrIfNotDefined(unit, 'label', getAttr(unit, 'uname', key));
           setAttrIfNotDefined(unit, 'htmllabel', getAttr(unit, 'uname', getAttr(unit, 'label', key)).replaceAll('<', '&lt').replaceAll('>', '&gt'));


           if(unit.background){
             unit.group = this.groups.back;
           } else{
             if(unit['class'] === 'Neuron' || unit['class'] === 'NeuronFragment'){
               if( this.settings.neuron3dMode > 1 )
                 unit.group = this.groups.frontCyl;
               else
                 unit.group = this.groups.frontLine;
             } else{
               unit.group = this.groups.frontSyn;
             }
           }
           if (Array.isArray(unit.color))
             unit.color = new THREE.Color(...unit.color);

           /* read mesh */
           if ( metadata.type === "morphology_json" ) {
             this.loadMorphJSONCallBack(key, unit, metadata.visibility).bind(this)();
           } else if (metadata.type === "gltf") {
            this.loadGLTFCallback(key, unit, metadata.visibility).bind(this)();
           } else if ( ('dataStr' in unit) && ('filename' in unit) ) {
             console.log( 'mesh object has both data string and filename... should only have one... skip rendering' );
             continue;
           } else if ( 'filename' in unit ) {
             unit['filetype'] = unit.filename.split('.').pop();
             var loader = new THREE.FileLoader( this.loadingManager );
             if (unit['filetype'] == "json")
             {
               loader.load(unit.filename, this.loadMeshCallBack(key, unit, metadata.visibility).bind(this));
             }
             else if (unit['filetype'] == "swc" )
               loader.load(unit.filename, this.loadSWCCallBack(key, unit, metadata.visibility).bind(this));
             else {
               console.log( 'mesh object has unrecognized data format... skip rendering' );
               continue;
             }
           } else if ( 'dataStr' in unit ) {
             if (unit['filetype']  == "json")
               this.loadMeshCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
             else if (unit['filetype'] == "swc" )
               this.loadSWCCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
             else {
               console.log( 'mesh object has unrecognized data format... skip rendering' );
               continue;
             }
           } else {
             console.log( 'mesh object has neither filename nor data string... skip rendering' );
             continue;
           }
         }
         resolve();
       }).bind(this));
     }

     FFBOMesh3D.prototype.computeVisibleBoundingBox = function(includeBackground=false){
       this.visibleBoundingBox = Object.assign( {}, this.defaultBoundingBox );
       updated = false;
       for(var key in this.meshDict){
         if( this.meshDict[key].background)
           continue;
         if( this.meshDict[key].visibility ){
           updated = true;
           if ( this.meshDict[key].boundingBox.minX < this.visibleBoundingBox.minX )
             this.visibleBoundingBox.minX = this.meshDict[key].boundingBox.minX;
           if ( this.meshDict[key].boundingBox.maxX > this.visibleBoundingBox.maxX )
             this.visibleBoundingBox.maxX = this.meshDict[key].boundingBox.maxX;
           if ( this.meshDict[key].boundingBox.minY < this.visibleBoundingBox.minY )
             this.visibleBoundingBox.minY = this.meshDict[key].boundingBox.minY;
           if ( this.meshDict[key].boundingBox.maxY > this.visibleBoundingBox.maxY )
             this.visibleBoundingBox.maxY = this.meshDict[key].boundingBox.maxY;
           if ( this.meshDict[key].boundingBox.maxZ < this.visibleBoundingBox.minZ )
             this.visibleBoundingBox.minZ = this.meshDict[key].boundingBox.minZ;
           if ( this.meshDict[key].boundingBox.maxZ > this.visibleBoundingBox.maxZ )
             this.visibleBoundingBox.maxZ = this.meshDict[key].boundingBox.maxZ;
         }
       }
       if(!updated)
         Object.assign(this.visibleBoundingBox, this.boundingBox);
     }

     FFBOMesh3D.prototype.updateObjectBoundingBox = function(obj, x, y, z) {
       if ( x < obj.boundingBox.minX )
         obj.boundingBox.minX = x;
       if ( x > obj.boundingBox.maxX )
         obj.boundingBox.maxX = x;
       if ( y < obj.boundingBox.minY )
         obj.boundingBox.minY = y;
       if ( y > obj.boundingBox.maxY )
         obj.boundingBox.maxY = y;
       if ( z < obj.boundingBox.minZ )
         obj.boundingBox.minZ = z;
       if ( z > obj.boundingBox.maxZ )
         obj.boundingBox.maxZ = z;
     }

     FFBOMesh3D.prototype.updateBoundingBox = function(x,y,z) {
       if ( x < this.boundingBox.minX )
         this.boundingBox.minX = x;
       if ( x > this.boundingBox.maxX )
         this.boundingBox.maxX = x;
       if ( y < this.boundingBox.minY )
         this.boundingBox.minY = y;
       if ( y > this.boundingBox.maxY )
         this.boundingBox.maxY = y;
       if ( z < this.boundingBox.minZ )
         this.boundingBox.minZ = z;
       if ( z > this.boundingBox.maxZ )
         this.boundingBox.maxZ = z;
     }

     FFBOMesh3D.prototype.setAnim = function(data) {
       for (var key in data) {
         if (this.meshDict[key].object === undefined)
           continue;
         this.animOpacity[key] = data[key];
       }
       this.states.animate = true;
     }
     FFBOMesh3D.prototype.stopAnim = function() {
       this.states.animate = false;
     }
     FFBOMesh3D.prototype.animate = function() {

       this.stats.begin()

       this.controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
       if( this.states.mouseOver && this.dispatch.syncControls)
         this.dispatch.syncControls(this)

       this.render();

       this.stats.end()

       requestAnimationFrame( this.animate.bind(this) );

     }

     FFBOMesh3D.prototype.loadMeshCallBack = function(key, unit, visibility) {
       return function (jsonString) {
         
         var json = JSON.parse(jsonString);
         var color = unit['color'];
         var geometry = new THREE.BufferGeometry();

         var vtx = json['vertices'];
         var idx = json['faces'];
         const vertices = [];
         const indices = []
         for (var j = 0; j < vtx.length / 3; j++) {
           var x = parseFloat(vtx[3*j+0]);
           var y = parseFloat(vtx[3*j+1]);
           var z = parseFloat(vtx[3*j+2]);
           vertices.push(x,y,z);
           this.updateObjectBoundingBox(unit, x, y, z);
           this.updateBoundingBox(x,y,z);
         }
         for (var j = 0; j < idx.length/3; j++) {
           indices.push(
                 parseInt(idx[3*j+0]),
                 parseInt(idx[3*j+1]),
                 parseInt(idx[3*j+2])
           );
         }

         geometry.setIndex(indices);
         geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
         geometry.computeVertexNormals();

        delete vertices

         materials  = [
           //new THREE.MeshPhongMaterial( { color: color, flatShading: true, shininess: 0, transparent: true } ),
           new THREE.MeshLambertMaterial( { color: color, transparent: true, side: 2}),//, flatShading: true} ),
           new THREE.MeshBasicMaterial( { color: color, wireframe: true, transparent: true} )
         ];


         var object = THREE.SceneUtils.createMultiMaterialObject( geometry, materials );
         if(! this.settings.meshWireframe )
           object.children[1].visible = false;
         object.visible = visibility;

         this._registerObject(key, unit, object);
       };

     };

     FFBOMesh3D.prototype.loadGLTFCallback = function (key, unit, visibility) {
      var _this = this;
      return function (jsonString) {
        var color = unit['color'];
        var opacity = this.settings.defaultOpacity;
        var loader = new THREE.GLTFLoader();
        loader.load(
          // resource URL
          this._metadata["neuron_mesh"]["url"] + '/' + unit['referenceId'] + '.obj',
          // called when the resource is loaded
          function (gltf) {
            var mesh;
            for (var child of gltf.scene.children[0].children){
              if (child instanceof THREE.Mesh){
                  mesh = child;
                  mesh.material.transparent = true;
                  mesh.material.color = color;
                  mesh.material.opacity = opacity;
                  mesh.geometry.scale(0.008, 0.008, 0.008);
                  mesh.geometry.computeBoundingBox();
                  var object = new THREE.Object3D();
                  object.add(mesh);
                  _this._registerObject(key, unit, object);
              }
            }
          },
          // called while loading is progressing
          function (xhr) {
            // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
          },
          function (error) {
            console.log("Neuron mesh " + unit['referenceId'] + "not found, rendering with mode 0");
            _this.loadMorphJSONCallBack(key, unit, visibility, 0).bind(_this)();
          }
        );
      };
    };

     FFBOMesh3D.prototype.loadSWCCallBack = function(key, unit, visibility) {
       return function(swcString) {
         /*
          * process string
          */
         swcString = swcString.replace(/\r\n/g, "\n");
         var swcLine = swcString.split("\n");
         var len = swcLine.length;
         var swcObj = {};

         swcLine.forEach(function (e) {
           var seg = e.split(' ');
           if (seg.length == 7) {
             swcObj[parseInt(seg[0])] = {
               'type'   : parseInt(seg[1]),
               'x'    : parseFloat(seg[2]),
               'y'    : parseFloat(seg[3]),
               'z'    : parseFloat(seg[4]),
               'radius' : parseFloat(seg[5]),
               'parent' : parseInt(seg[6]),
             };
           }
         });

         var color = unit['color'];
         var geometry  = new THREE.Geometry();

         for (var idx in swcObj ) {
           if (swcObj[idx].parent != -1) {
             var c = swcObj[idx];
             var p = swcObj[swcObj[idx].parent];
             geometry.vertices.push(new THREE.Vector3(c.x,c.y,c.z));
             geometry.vertices.push(new THREE.Vector3(p.x,p.y,p.z));
             geometry.colors.push(color);
             geometry.colors.push(color);
             this.updateObjectBoundingBox(unit, c.x, c.y, c.z);
             this.updateBoundingBox(c.x, c.y, c.z);
           }
         }
         var material = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors, transparent: true, color: color });
         var object = new THREE.Object3D();
         object.add(new THREE.LineSegments(geometry, material, THREE.LineSegments));
         object.visible = visibility;

         this._registerObject(key, unit, object);

       };
     };

     FFBOMesh3D.prototype.loadMorphJSONCallBack = function(key, unit, visibility, mode = undefined) {
        return function() {
          /*
            * process string
            */
          if (mode === undefined || mode > 7 || mode < 0) {
            mode = this.settings.neuron3dMode;
          }
          var swcObj = {};
          var len = unit['sample'].length;
          for (var j = 0; j < len; j++) {
            swcObj[parseInt(unit['sample'][j])] = {
              'type'   : parseInt  (unit['identifier'][j]),
              'x'    : parseFloat(unit['x'][j]),
              'y'    : parseFloat(unit['y'][j]),
              'z'    : parseFloat(unit['z'][j]),
              'radius' : parseFloat(unit['r'][j]),
              'parent' : parseInt  (unit['parent'][j]),
            };
          }

          var color = new THREE.Color(unit['color']);
          var object = new THREE.Object3D();
          var mergedGeometry = undefined;
          var geometryToMerge = [];
          var geometry = undefined;
          var geometryCylinder = undefined;
          var geometrySphere = undefined;
          var cylinders = undefined;
          var spheres = undefined;

          total_seg = 0;
          for (var idx in swcObj ) {
            var c = swcObj[idx];
            if(idx == Math.round(len/2) && unit.position == undefined)
              unit.position = new THREE.Vector3(c.x, c.y, c.z);
            this.updateObjectBoundingBox(unit, c.x, c.y, c.z);
            this.updateBoundingBox(c.x,c.y,c.z);
            if (c.parent != -1) {
              total_seg += 1;
            }
            if (c.type == 1) {
              unit['position'] = new THREE.Vector3(c.x,c.y,c.z);
            }
          }

          if (unit['class'] === 'Neuron' || unit['class'] === 'NeuronFragment') {
            if(mode === 0){
              var matrix = new THREE.Matrix4();
              var materialSphere = new THREE.MeshLambertMaterial( {color: color, transparent: true});
              geometrySphere = new THREE.SphereGeometry(1.0, 8, 8);
          
              var sphere_params = [];
              var n_spheres = 0;
              var vertices = {1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [],
                11: [], 12: [], 13: [], 14: [], 15: [], 16: [], 17: [], 18: [], 19: [], 20: [],
                21: [], 22: [], 23: [], 24: [], 25: [], 26: [], 27: [], 28: [], 29: [], 30: [],
                31: [], 32: [], 33: [], 34: [], 35: [], 36: [], 37: [], 38: [], 39: [], 40: [],
                41: [], 42: [], 43: [], 44: [], 45: [], 46: [], 47: [], 48: [], 49: []
              };

              var bin, defaultBin;
              if (this.settings.defaultRadius <= 1) {
                defaultBin = Math.max(Math.ceil(Math.log10(this.settings.defaultRadius)/0.05)+40, 1);
              } else {
                defaultBin = Math.floor(this.settings.defaultRadius);
              }
              if (defaultBin > 48){
                  defaultBin = 49;
              }
          
              for (var idx in swcObj ) {
                var c = swcObj[idx];
                var p = swcObj[c.parent];
                if(c.type == 1){
                  if (c.radius <= 0){
                    scale = Math.clip(this.settings.defaultSomaRadius, this.settings.SomaRadiusRange);
                  } else {
                    scale = Math.clip(c.radius, this.settings.SomaRadiusRange);
                  }
                  sphere_params.push([c.x, c.y, c.z, scale])
                  n_spheres += 1;
                }else{
                  if (c.radius) {
                    var scale = Math.clip(this.settings.defaultRadius * c.radius, this.settings.RadiusRange);
                    if (scale > 1.0) {
                      bin = Math.floor(scale)+40;
                      
                      if (bin > 48){
                        bin = 49;
                      }
                      scale = bin-40+0.5;
                      sphere_params.push([c.x, c.y, c.z, scale]);
                      n_spheres += 1;
                    }
                  }
                }
  
                if (c.parent != -1) {
                  var p = swcObj[c.parent];
                  if (c.radius) {
                    var scale = Math.clip(this.settings.defaultRadius * c.radius, this.settings.RadiusRange);
                    if (scale <= 1) {
                      bin = Math.max(Math.ceil(Math.log10(scale)/0.05)+40, 1);
                    } else {
                      bin = Math.floor(scale)+40;
                    }
                    if (bin > 48){
                      bin = 49;
                    }
                  } else {
                    bin = defaultBin;
                  }
                  vertices[bin.toString()].push(c.x);
                  vertices[bin.toString()].push(c.y);
                  vertices[bin.toString()].push(c.z);
                  vertices[bin.toString()].push( (c.x+p.x)/2 );
                  vertices[bin.toString()].push( (c.y+p.y)/2 );
                  vertices[bin.toString()].push( (c.z+p.z)/2 );
          
                  if (p.radius) {
                    var scale = Math.clip(this.settings.defaultRadius * p.radius, this.settings.RadiusRange);
                    if (scale <= 1) {
                        bin = Math.max(Math.ceil(Math.log10(scale)/0.05)+40, 1);
                    } else {
                        bin = Math.floor(scale)+40;
                    }
                    if (bin > 48){
                        bin = 49;
                    }
                  } else {
                      bin = defaultBin;
                  }
                  vertices[bin.toString()].push(p.x);
                  vertices[bin.toString()].push(p.y);
                  vertices[bin.toString()].push(p.z);
                  vertices[bin.toString()].push( (c.x+p.x)/2 );
                  vertices[bin.toString()].push( (c.y+p.y)/2 );
                  vertices[bin.toString()].push( (c.z+p.z)/2 );
                }
              }
          
              spheres = new THREE.InstancedMesh( geometrySphere, materialSphere, n_spheres );
              j = 0;
              for (var n of sphere_params){
                matrix.makeScale(n[3], n[3], n[3]);
                matrix.setPosition( n[0], n[1], n[2] );
                spheres.setMatrixAt( j, matrix );
                j += 1;
              }
              object.add(spheres)
          
              var width;
              for (var i = 1; i <= 49; i++){
                if (i <= 40) {
                  width = Math.pow(10, (i-40)*0.05);
                } else {
                  width = i-40+0.5;
                }
                if (vertices[i.toString()].length){
                  geometry = new THREE.LineSegmentsGeometry();
                  geometry.setPositions(vertices[i.toString()]);
                  var material_lines = new THREE.LineMaterial({ transparent: true, linewidth: width*2, color: color.getHex(), dashed: false, worldUnits: true, opacity: this.settings.defaultOpacity, resolution: this.renderer.getSize(new THREE.Vector2()), alphaToCoverage: false}); 
                  var lines = new THREE.LineSegments2(geometry, material_lines)
                  lines.computeLineDistances()
                  object.add(lines)
                }
              }
            } else {
              if(mode > 2){

                var matrix = new THREE.Matrix4();

                if (mode > 3) {
                  if (false) { //experimental 
                    var materialCylinder = new THREE.MeshLambertMaterial( {color: color, transparent: true});
                    geometryCylinder = new THREE.CylinderGeometry( this.settings.defaultRadius, this.settings.defaultRadius, 1.0, 8, 1, 0);
                    cylinders = new THREE.InstancedMesh( geometryCylinder, materialCylinder, total_seg );
                  }
                }
                if (this.settings.neuron3dMode == 5 || this.settings.neuron3dMode == 3) {
                  var materialSphere = new THREE.MeshLambertMaterial( {color: color, transparent: true});
                  geometrySphere = new THREE.SphereGeometry(1.0, 8, 8);
                  // geometrySphere = new THREE.IcosahedronGeometry(1.0, 1);
                  // geometrySphere = new THREE.OctahedronGeometry(1.0, 2)
                  spheres = new THREE.InstancedMesh( geometrySphere, materialSphere, len );
                //spheres.instanceMatrix.setUsage( THREE.DynamicDrawUsage ); // will be updated every frame
                }
                i = 0;
                j = 0;
                for (var idx in swcObj ) {
                  var c = swcObj[idx];
                  var p = swcObj[c.parent];
                  if (c.parent != -1) {
                    if (mode > 3) {
                      var d = new THREE.Vector3((p.x - c.x), (p.y - c.y), (p.z - c.z));
                      if(!p.radius || !c.radius)
                        var geometry = new THREE.CylinderGeometry(Math.clip(this.settings.defaultRadius, this.settings.RadiusRange),
                        Math.clip(this.settings.defaultRadius, this.settings.RadiusRange), d.length(), 9, 1, 0);
                      else
                        var geometry = new THREE.CylinderGeometry(Math.clip(this.settings.defaultRadius*p.radius, this.settings.RadiusRange), Math.clip(this.settings.defaultRadius*c.radius, this.settings.RadiusRange), d.length(), 8, 1, 0);
                      geometry.translate(0, 0.5*d.length(),0);
                      geometry.applyMatrix4( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );
                      geometry.lookAt(d.clone());
                      geometry.translate(c.x, c.y, c.z);

                      geometryToMerge.push(geometry);
                      
                      if (false) { //experimental
                        matrix.setPosition( c.x, c.y, c.z );
                        cylinders.setMatrixAt( i, matrix );
                      }
                      i += 1;
                    }

                    if (mode === 6) {
                      if (p.parent != -1) {
                        p2 = swcObj[p.parent];
                        var a = new THREE.Vector3(0.9*p.x + 0.1*p2.x, 0.9*p.y + 0.1*p2.y, 0.9*p.z + 0.1*p2.z);
                        var b = new THREE.Vector3(0.9*p.x + 0.1*c.x, 0.9*p.y + 0.1*c.y, 0.9*p.z + 0.1*c.z);
                        var curve = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3( p.x, p.y, p.z ), b);
                        if(!p.radius)
                          var geometry = new THREE.TubeGeometry( curve, 8, Math.clip(this.settings.defaultRadius, this.settings.RadiusRange), 4, false );
                        else
                          var geometry = new THREE.TubeGeometry( curve, 8, Math.clip(this.settings.defaultRadius*p.radius, this.settings.RadiusRange), 4, false );
                        geometryToMerge.push(geometry);
                      }
                    }
                  }

                  if (mode === 5 || mode === 3 ) {
                        // render spheres for sphere mode or sphere+cylinder mode
                        if(!c.radius) {
                          if(c.type == 1) {
                            scale = Math.clip(this.settings.defaultSomaRadius, this.settings.SomaRadiusRange);
                            spheres.soma_index = j;
                          } else {
                            scale = Math.clip(this.settings.defaultRadius, this.settings.RadiusRange);
                          }
                        } else {
                          scale = Math.clip(this.settings.defaultRadius*c.radius, this.settings.RadiusRange);
                        }

                        matrix.makeScale(scale, scale, scale);
                        matrix.setPosition( c.x, c.y, c.z );
                        spheres.setMatrixAt( j, matrix );
                        j += 1;
                  }
                }
                
                if(cylinders)
                  object.add( cylinders );
                if(spheres)
                  object.add(spheres);
                if(geometryToMerge.length) {
                  mergedGeometry = BGUtils.mergeBufferGeometries(geometryToMerge, false);
                  for (var n of geometryToMerge) {
                    n.dispose();
                  }
                  delete geometryToMerge;

                  var material_merge = new THREE.MeshLambertMaterial( {color: color, transparent: true});
                  var mesh = new THREE.Mesh(mergedGeometry, material_merge);
                  object.add(mesh);
                }
                
              }
              if (mode <= 3) {
                vertices = [];
                for (var idx in swcObj ) {
                  var c = swcObj[idx];
                  if (c.parent != -1) {
                    var p = swcObj[c.parent];
                    vertices.push(c.x);
                    vertices.push(c.y);
                    vertices.push(c.z);
                    vertices.push(p.x);
                    vertices.push(p.y);
                    vertices.push(p.z);
                  }

                  if (c.type == 1) { // soma
                    if(c.radius)
                      var sphereGeometry = new THREE.SphereGeometry(Math.clip(c.radius, this.settings.SomaRadiusRange), 8, 8 );
                    else
                      var sphereGeometry = new THREE.SphereGeometry(Math.clip(this.settings.defaultSomaRadius, this.settings.SomaRadiusRange), 8, 8 );
                    sphereGeometry.translate( c.x, c.y, c.z );
                    var sphereMaterial = new THREE.MeshLambertMaterial( {color: color, transparent: true} );
                    var soma = new THREE.Mesh( sphereGeometry, sphereMaterial);
                    soma.soma_index = 0;
                    object.add(soma);
                    unit['position'] = new THREE.Vector3(c.x,c.y,c.z);
                  }
                }

                if (mode == 2) {
                  geometry = new THREE.LineSegmentsGeometry()
                  geometry.setPositions(vertices);
                  var material_lines = new THREE.LineMaterial({ transparent: true, linewidth: this.settings.linewidth*2, color: color.getHex(), dashed: false, worldUnits: true, opacity: this.settings.defaultOpacity, resolution: this.renderer.getSize(new THREE.Vector2())}); 
                  var lines = new THREE.LineSegments2(geometry, material_lines)
                  lines.computeLineDistances()
                } else {
                  geometry = new THREE.BufferGeometry();
                  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                  var material_lines = new THREE.LineBasicMaterial({ transparent: true, color: color });
                  var lines = new THREE.LineSegments(geometry, material_lines)
                }
                object.add(lines);

              }
            }
          } else { //if (unit['class'] == 'Synapse') {
          var material_synapse = new THREE.MeshLambertMaterial( {color: color, transparent: true});

          var matrix = new THREE.Matrix4();

          var geometrySphere = new THREE.SphereGeometry( 1.0, 8, 8 );
          // var geometrySphere = new THREE.IcosahedronGeometry( 1.0, 1 );
          // var geometrySphere = new THREE.OctahedronGeometry(1.0, 0);
          spheres = new THREE.InstancedMesh( geometrySphere, material_synapse, len );
          //spheres.instanceMatrix.setUsage( THREE.DynamicDrawUsage ); // will be updated every frame
          
          geometry = new THREE.BufferGeometry();
          vertices = [];
          colors = [];

          var scale;
          var i = 0;
          for (var idx in swcObj ) {
            var c = swcObj[idx];
              if(c.radius)
                scale = Math.clip(c.radius * this.settings.defaultSynapseRadius, this.settings.SynapseRadiusRange);
              else
                if(c.type == 7)
                  scale = Math.clip(this.settings.defaultSynapseRadius, this.settings.SynapseRadiusRange);
                else
                  scale = Math.clip(this.settings.defaultSynapseRadius, this.settings.SynapseRadiusRange)/2;
              matrix.makeScale(scale, scale, scale);
              matrix.setPosition( c.x, c.y, c.z );
              spheres.setMatrixAt( i, matrix );
              i += 1;

              if (c.parent != -1) {
                var p = swcObj[c.parent];
                vertices.push(c.x, c.y, c.z);
                vertices.push(p.x, p.y, p.z);
              }
          }
          spheres.overallScale = this.settings.defaultSynapseRadius;
          object.add( spheres );

          geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          var material_lines = new THREE.LineBasicMaterial({ transparent: true, color: color });
          object.add(new THREE.LineSegments(geometry, material_lines));
        }
         
         object.visible = visibility;
         this._registerObject(key, unit, object);

         /* delete morpology data */
         delete unit['identifier'];
         delete unit['x'];
         delete unit['y'];
         delete unit['z'];
         delete unit['r'];
         delete unit['parent'];
         delete unit['sample'];
         delete unit['type'];

       };
     };


     FFBOMesh3D.prototype._registerObject = function(key, unit, object) {

       object.rid = key; // needed rid for raycaster reference

       unit['rid'] = key;
       unit['object'] = object;
       unit['pinned'] = false;

       if (!unit.hasOwnProperty('position')) {
         unit['position'] = new THREE.Vector3(
           0.5 * (unit.boundingBox.minX + unit.boundingBox.maxX),
           0.5 * (unit.boundingBox.minY + unit.boundingBox.maxY),
           0.5 * (unit.boundingBox.minZ + unit.boundingBox.maxZ)
         );
       }

       // TODO: move the code below to a function
       if(unit['class'] === 'Neuron' || unit['class'] === 'NeuronFragment'){
         if ( this.settings.defaultOpacity !== 1)
           for (var i=0; i < unit['object'].children.length; i++)
             unit['object'].children[i].material.opacity = this.settings.defaultOpacity;
       } else {
         if ( this.settings.synapseOpacity !== 1)
           for (var i=0; i < unit['object'].children.length; i++)
             unit['object'].children[i].material.opacity = this.settings.synapseOpacity;
       }

       this.meshDict[key] = unit;
     }

     FFBOMesh3D.prototype.onDocumentMouseDown = function(event) {
       if (event !== undefined)
         event.preventDefault();
       this.mousedown = true;
       this.mouseDownPosition = { x: event.clientX, y: event.clientY };
       this.isDragging = false;
     }
     FFBOMesh3D.prototype.onDocumentMouseUp = function(event) {
       if (event !== undefined)
         event.preventDefault();
       this.mousedown = false;

       const mouseUpPosition = { x: event.clientX, y: event.clientY };
       const distance = Math.sqrt(
        Math.pow(mouseUpPosition.x - this.mouseDownPosition.x, 2) +
        Math.pow(mouseUpPosition.y - this.mouseDownPosition.y, 2)
       );

       const dragThreshold = 1;
       if (distance > dragThreshold) {
         this.isDragging = true;
       }
     }

     FFBOMesh3D.prototype.onDocumentMouseClick = function( event ) {
       if (event !== undefined)
         event.preventDefault();
      
       if (this.isDragging) {
        return;
       }
      //  if (!this.controls.checkStateIsNone())
      //    return;

       var intersected = this.getIntersection([this.groups.frontSyn, this.groups.frontCyl, this.groups.frontLine]);

       if (intersected != undefined && intersected['highlight']){
           this.select(intersected.rid);
       }
     }

     FFBOMesh3D.prototype.onDocumentMouseDBLClick = function( event ) {
       if (event !== undefined)
         event.preventDefault();

       var intersected = this.getIntersection([this.groups.frontSyn, this.groups.frontCyl, this.groups.frontLine]);

       if (intersected != undefined ) {
         if (!intersected['highlight'])
           return;
         this.togglePin(intersected);
       }
     }

     FFBOMesh3D.prototype.onDocumentMouseDBLClickMobile = function( event ) {
       if (event !== undefined)
         event.preventDefault();
       var intersected = this.getIntersection([this.groups.frontSyn, this.groups.frontCyl, this.groups.frontLine]);

       if (intersected != undefined ) {
         if (!intersected['highlight'])
           return;
         this.togglePin(intersected);
       }
     }

     FFBOMesh3D.prototype.onDocumentMouseMove = function( event ) {
       event.preventDefault();
       this.states.mouseOver = true;
       var rect = this.container.getBoundingClientRect();

       this.uiVars.toolTipPosition.x = event.clientX;
       this.uiVars.toolTipPosition.y = event.clientY;

       this.uiVars.cursorPosition.x = ( (event.clientX - rect.left) / this.container.clientWidth ) * 2 - 1;
       this.uiVars.cursorPosition.y = - ( (event.clientY - rect.top) / this.container.clientHeight ) * 2 + 1;

     }

     FFBOMesh3D.prototype.onDocumentMouseEnter = function( event ) {
       event.preventDefault();

       this.states.mouseOver = true;
     }

     FFBOMesh3D.prototype.onDocumentMouseLeave = function( event ) {
       event.preventDefault();

       this.states.mouseOver = false;

       this.highlight(undefined);
     }
     //
     FFBOMesh3D.prototype.onWindowResize = function() {

       var height = this.container.clientHeight;
       var width = this.container.clientWidth;

       aspect = width/height;
       cam_dir = new THREE.Vector3();
       cam_dir.subVectors(this.camera.position, this.controls.target);
       prevDist = cam_dir.length();
       cam_dir.normalize();

       hspan = prevDist*2*Math.tan(this.prevhfov/2);
       //vspan = prevDist*2*Math.tan(Math.PI*this.fov/2/180);

       this.prevhfov = 2 * Math.atan( Math.tan (Math.PI*this.fov/2/180) * aspect );
       //span = Math.max(ffbomesh.boundingBox.maxX-ffbomesh.boundingBox.minX,ffbomesh.boundingBox.maxY-ffbomesh.boundingBox.minY, ffbomesh.boundingBox.maxZ-ffbomesh.boundingBox.minZ);

       //dist = Math.max(hspan/2/Math.tan(hfov/2), vspan/2/Math.tan(Math.PI*this.fov/2/180));
       dist = hspan/2/Math.tan(this.prevhfov/2);
       this.camera.position.copy(this.controls.target);
       this.camera.position.addScaledVector(cam_dir, dist);

       this.camera.aspect = aspect;
       this.camera.updateProjectionMatrix();

       this.renderer.setSize( width, height );
       this.composer.setSize( width*window.devicePixelRatio,
                              height*window.devicePixelRatio);
       this.effectFXAA.uniforms[ 'resolution' ].value.set(1 / Math.max(width, 1440), 1 / Math.max(height, 900) )

       this.controls.handleResize();
       this.render();
       if(this.dispatch['resize'] !== undefined)
         this.dispatch['resize']();

     }

     var _saveImage = (function () {
       var a = document.createElement("a");
       document.body.appendChild(a);
       a.style = "display: none";
       return function (blob, fileName) {
         url = window.URL.createObjectURL(blob);
         a.href = url;
         a.download = fileName;
         a.click();
         window.URL.revokeObjectURL(url);
       };
     }());

     FFBOMesh3D.prototype.render = function() {

       if (this.states.animate) {
         for (var key in this.meshDict) {
           if (this.meshDict[key].object === undefined)
             continue;
           var x = this.meshDict[key].object.children;
           for (var i in x)
             x[i].material.opacity = this.animOpacity[key] || 0;
         }
       } else if (this.states.highlight) {

       } else {
         for (var key in this.meshDict) {
           if (this.meshDict[key].object != undefined) {
             var x = new Date().getTime();
             if ( this.meshDict[key]['background'] ) {
               var obj = this.meshDict[key].object.children;
               //for ( var i = 0; i < obj.length; ++i )
               obj[0].material.opacity = this.settings.backgroundOpacity +  0.5*this.settings.meshOscAmp*(1+Math.sin(x * .0005));
               obj[1].material.opacity = this.settings.backgroundWireframeOpacity;
             } else {
               //this.meshDict[key].object.children[0].material.opacity = 0.3 - 0.3*Math.sin(x * .0005);
               //this.meshDict[key].object.children[0].material.opacity = 0.8;
             }
           }
         }
       }

       /*
        * show label of mesh object when it intersects with cursor
        */
      //  if (this.controls.checkStateIsNone() && this.states.mouseOver) {
       if (this.states.mouseOver && !this.mousedown) {
         var intersected = this.getIntersection([this.groups.frontSyn, this.groups.frontCyl, this.groups.frontLine, this.groups.back]);
         if (this.uiVars.currentIntersected || intersected) {
            // make sure when hovering over a neuron transits to hovering on neuropil the highlight state is reset.
            if (this.uiVars.currentIntersected !== undefined && intersected !== undefined){
                if (this.uiVars.currentIntersected['rid'] != intersected['rid']) {
                    this.highlight();
                }
            }
            this.uiVars.currentIntersected = intersected;
            // The goal here is to make background highlightable only when using the Neuropil menu.
            // Hovering on neuropil can still show the tooltip, but not highllight it.
            if (intersected !== undefined) {
              if (intersected['background']){
                var pos = this.getNeuronScreenPosition(intersected['rid']);
                this.uiVars.toolTipPosition.x = pos.x;
                this.uiVars.toolTipPosition.y = pos.y;
                this.show3dToolTip(intersected['htmllabel']);
              } else {
                this.highlight(intersected);
              }
            } else { // if intersected is undefined and currentIntersected is defined, must be moving out of highlight
              this.highlight();
            }
          }

       }

       this.composer.render();
       
       if(this._take_screenshot){
         this.renderer.domElement.toBlob(function(b){
           _saveImage(b, "ffbo_screenshot.png")
         })
         this._take_screenshot = false;
       }

       let localToCameraAxesPlacement = new THREE.Vector3(-1.3*this.camera.aspect*this.axis.nearPlaneHeight,-1.2*this.axis.nearPlaneHeight,-0.15);
       let worldAxesPlacement = this.camera.localToWorld(localToCameraAxesPlacement.clone())
       this.axis.position.copy(worldAxesPlacement.addScaledVector(new THREE.Vector3(...this.settings.axisOrigin), -1));
       this.axis.labels.position.copy(worldAxesPlacement);
       for(l=0; l<this.axis.labels.children.length; l++){
          this.axis.labels.children[l].quaternion.copy(this.camera.quaternion);
       }
       
     }

     FFBOMesh3D.prototype.getIntersection = function(groups) {
       if (groups === undefined)
         return undefined;

       var val = undefined;
       var object = undefined;

       this.raycaster.setFromCamera( this.uiVars.cursorPosition, this.camera );

       var quit = false;
       for (const group of groups) {
         var intersects = this.raycaster.intersectObjects( group.children, true);

         for (const ob of intersects) {
           object = ob.object.parent;
           if (object.hasOwnProperty('rid') && object.rid in this.meshDict && object.visible) {
             val =  this.meshDict[object.rid];
             quit = true;
             break;
           }
         }
         if (quit) break;
       }
       return val;
     }

     FFBOMesh3D.prototype.showFrontAll = function() {
       for (var val of this.groups.frontLine.children)
         this.meshDict[val.rid].visibility = true;
       for (var val of this.groups.frontCyl.children)
         this.meshDict[val.rid].visibility = true;
       for (var val of this.groups.frontSyn.children)
         this.meshDict[val.rid].visibility = true;
     };

     FFBOMesh3D.prototype.hideFrontAll = function() {
       for (var val of this.groups.frontLine.children)
         this.meshDict[val.rid].visibility = false;
       for (var val of this.groups.frontCyl.children)
         this.meshDict[val.rid].visibility = false;
       for (var val of this.groups.frontSyn.children)
         this.meshDict[val.rid].visibility = false;
     };

     FFBOMesh3D.prototype.showBackAll = function() {
       for (var val of this.groups.back.children)
         this.meshDict[val.rid].visibility = true;
     };

     FFBOMesh3D.prototype.hideBackAll = function() {
       for (var val of this.groups.back.children)
         this.meshDict[val.rid].visibility = false;
     };

     FFBOMesh3D.prototype.showAll = function() {
       for (var key in this.meshDict)
         this.meshDict[key].visibility = true;
     };

     FFBOMesh3D.prototype.hideAll = function() {
       for (var key in this.meshDict)
         if (!this.meshDict[key]['pinned'])
           this.meshDict[key].visibility = false;
     };

     FFBOMesh3D.prototype.export_settings = function() {
       backgroundColor = '#260226';
       if (this.groups.back.children.length)
         backgroundColor = this.groups.back.children[0].children[0].material.color.toArray();
       if (this.settings.backgroundColor !== undefined)
         backgroundColor = this.settings.backgroundColor;
       set = Object.assign({}, this.settings, {
         lightsHelper: this.lightsHelper.export(),
         postProcessing: {
           fxaa: this.settings.effectFXAA.enabled,
           ssao: this.settings.backrenderSSAO.enabled,
          //  toneMappingMinLum: 1-this.settings.toneMappingPass.brightness,
           bloom: this.settings.bloomPass.enabled,
           bloomRadius: this.settings.bloomPass.radius,
           bloomThreshold: this.settings.bloomPass.threshold,
           bloomStrength: this.settings.bloomPass.strength
         },
         backgroundColor: backgroundColor
       });
       delete set.effectFXAA;
       delete set.backrenderSSAO;
      //  delete set.toneMappingPass;
       delete set.bloomPass;
       delete set.RadiusRange;
	     delete set.SynaspeRadiusRange;
	     delete set.SomaRadiusRange;
       return set;
     }

     FFBOMesh3D.prototype.import_settings = function(settings) {
       settings = Object.assign({}, settings);
       if('lightsHelper' in settings){
         this.lightsHelper.import(settings.lightsHelper);
         delete settings.lightsHelper;
       }
       if('postProcessing' in settings){
         postProcessing = settings.postProcessing;
         delete settings.postProcessing;
         if( postProcessing.fxaa != undefined )
           this.settings.effectFXAA.enabled = postProcessing.fxaa;
         if( postProcessing.ssao != undefined )
           this.settings.backrenderSSAO.enabled = postProcessing.ssao;
        //  if( postProcessing.toneMappingMinLum != undefined )
        //    this.settings.toneMappingPass.brightness = 1-postProcessing.toneMappingMinLum;
        if( postProcessing.bloom != undefined )
           this.settings.bloomPass.enabled = postProcessing.bloom;
         if( postProcessing.bloomRadius != undefined )
           this.settings.bloomPass.radius = postProcessing.bloomRadius;
         if( postProcessing.bloomStrength != undefined )
           this.settings.bloomPass.strength = postProcessing.bloomStrength;
         if( postProcessing.bloomThreshold != undefined )
           this.settings.bloomPass.threshold = postProcessing.bloomThreshold;
       }
       if('backgroundColor' in settings){
         bg = settings.backgroundColor;
         setTimeout((function(){
           this.setBackgroundColor(bg)
         }).bind(this), 4000);
         delete settings.backgroundColor;
       }
       Object.assign(this.settings, settings);
     }

     FFBOMesh3D.prototype.export_state = function() {
       state_metadata = {'color':{},'pinned':{},'visibility':{},'camera':{'position':{},'up':{}},'target':{}};
       state_metadata['camera']['position']['x'] = this.camera.position.x;
       state_metadata['camera']['position']['y'] = this.camera.position.y;
       state_metadata['camera']['position']['z'] = this.camera.position.z;

       state_metadata['camera']['up']['x'] = this.camera.up.x;
       state_metadata['camera']['up']['y'] = this.camera.up.y;
       state_metadata['camera']['up']['z'] = this.camera.up.z;

       state_metadata['target']['x'] = this.controls.target.x;
       state_metadata['target']['y'] = this.controls.target.y;
       state_metadata['target']['z'] = this.controls.target.z;

       state_metadata['pinned'] = Array.from(this.uiVars.pinnedObjects);

       for (var key in this.meshDict) {
         if (this.meshDict.hasOwnProperty(key)) {
           state_metadata['color'][key] = this.meshDict[key].object.children[0].material.color.toArray();
           state_metadata['visibility'][key] = this.meshDict[key].visibility;
         }
       }
       return state_metadata;
     }

     FFBOMesh3D.prototype.import_state = function(state_metadata) {

       this.camera.position.x = state_metadata['camera']['position']['x'];
       this.camera.position.y = state_metadata['camera']['position']['y'];
       this.camera.position.z = state_metadata['camera']['position']['z'];

       this.camera.up.x = state_metadata['camera']['up']['x'];
       this.camera.up.y = state_metadata['camera']['up']['y'];
       this.camera.up.z = state_metadata['camera']['up']['z'];

       this.controls.target.x = state_metadata['target']['x'];
       this.controls.target.y = state_metadata['target']['y'];
       this.controls.target.z = state_metadata['target']['z'];

       this.camera.lookAt(this.controls.target);

       for (var i = 0; i < state_metadata['pinned'].length; ++i) {
         var key = state_metadata['pinned'][i];
         if (this.meshDict.hasOwnProperty(key))
           this.meshDict[key]['pinned'] = true;
       }
       for (var key of Object.keys(state_metadata['visibility'])) {
         if (!this.meshDict.hasOwnProperty(key))
           continue
         this.meshDict[key].visibility = state_metadata['visibility'][key];
         if(this.meshDict[key].background)
           continue
         var meshobj = this.meshDict[key].object;
         var color = state_metadata['color'][key];
         for (var j = 0; j < meshobj.children.length; ++j ) {
           meshobj.children[j].material.color.fromArray( color );
          //  for(var k = 0; k < meshobj.children[j].geometry.colors.length; ++k){
          //    meshobj.children[j].geometry.colors[k].fromArray( color );
          //  }
          //  meshobj.children[j].geometry.colorsNeedUpdate = true;
         }
       }
     }

     FFBOMesh3D.prototype.show = function(id) {

       id = this.asarray( id );

       for (var i = 0; i < id.length; ++i ) {
         if ( !(id[i] in this.meshDict ) )
           continue;
         this.meshDict[id[i]].visibility = true;
       }
     }

     FFBOMesh3D.prototype.hide = function(id) {

       id = this.asarray( id );

       for (var i = 0; i < id.length; ++i ) {
         if ( !(id[i] in this.meshDict ) )
           continue;
         this.meshDict[id[i]].visibility = false;
       }
     }

     FFBOMesh3D.prototype.onAddMesh = function(e) {
       if ( !e.value['background'] ) {
         if(e.value['class'] === 'Neuron' || e.value['class'] === 'NeuronFragment'){
           ++this.uiVars.neuronNum;
         } else if(e.value['class'] === 'Synapse') {
            this.uiVars.synapseNum += e.value['N']
         }
       } else {
         ++this.uiVars.backNum;
       }
       e.value.group.add(e.value.object);
       ++this.uiVars.meshNum;
       this._labelToRid[e.value.label] = e.prop;
     }

     FFBOMesh3D.prototype.onRemoveMesh = function(e) {
       // console.log(e);
       if (this.states.highlight == e.prop)
         this.states.highlight = false;
       if (e.value['pinned'])
         e.value['pinned'] = false;
       var meshobj = e.value.object;

       for (var j = 0; j < meshobj.children.length; ++j ) {
         meshobj.children[j].geometry.dispose();
         meshobj.children[j].material.dispose();
       }

       if ( !e.value['background'] ) {
         if(e.value['class'] === 'Neuron' || e.value['class'] === 'NeuronFragment') {
           --this.uiVars.neuronNum;
        } else if (e.value['class'] === 'Synapse') {
           this.uiVars.synapseNum -= e.value['N'];
        }
       } else {
         --this.uiVars.backNum;
       }
       e.value.group.remove( meshobj );
       --this.uiVars.meshNum;
       delete meshobj;
       delete this._labelToRid[e.value.label]
     }

     FFBOMesh3D.prototype.toggleVis = function(key) {
       if (key in this.meshDict)
         this.meshDict[key].visibility = !this.meshDict[key].visibility;
     }

     FFBOMesh3D.prototype.onUpdateVisibility = function(key) {
        this.meshDict[key]['object'].visible = this.meshDict[key].visibility;
     }

     FFBOMesh3D.prototype.highlight = function(d, updatePos) {
       if (d === undefined || d === false) {
         this.states.highlight = false;
         this.hide3dToolTip();
         return;
       }

       if (Array.isArray(d)) { // only support an array of rids
        rids = [];
        
        for (const rid of d) {
          var v = undefined;
          if (typeof(rid) === 'string' && (rid in this.meshDict)) {
            v = this.meshDict[rid];
          } else {
            if (rid in this._labelToRid) {
              v = this.meshDict[this._labelToRid[rid]];
            } else {
              if (typeof(rid) === 'string' && !d.includes('#')) {
                for (var key in this.meshDict) {
                  if (key.includes('#')) {
                    if (rid === this.meshDict[key].referenceId)
                    {
                      v = this.meshDict[key];
                    }
                  }
                }
              }
            }
          }
          if (v !== undefined && v['highlight'] !== false) {
            rids.push(v['rid']);
          }
        }

        if (rids.length === 0) {
          this.states.highlight = false;
        } else {
          this.states.highlight = rids;
        }
       } else {
          if (typeof(d) === 'string' && (d in this.meshDict)) {
            d = this.meshDict[d];
          } else {
            if (d in this._labelToRid) {
              d = this.meshDict[this._labelToRid[d]];
            } else {
              if (typeof(d) === 'string' && !d.includes('#')) {
                for (var key in this.meshDict) {
                  if (key.includes('#')) {
                    if (d == this.meshDict[key].referenceId)
                    {
                      d = this.meshDict[key];
                    }
                  }
                }
              }
            }
          }

          
          if ((d['highlight']) !== false) {
            this.states.highlight = d['rid'];
          } else
            this.states.highlight = false;
          

          if (updatePos !== undefined && updatePos === true) {
            var pos = this.getNeuronScreenPosition(d['rid']);
            this.uiVars.toolTipPosition.x = pos.x;
            this.uiVars.toolTipPosition.y = pos.y;
          }
          this.show3dToolTip(d['htmllabel']);
       }
     }

     FFBOMesh3D.prototype.onUpdateHighlight = function(e) {

       if (e.old_value)
         if ( Array.isArray(e.old_value) ) {
           for (const rid of e.old_value ) {
            if (rid in this.meshDict){
              this.meshDict[rid]['object']['visible'] = this.meshDict[rid]['visibility'];
            }
           }
         } else {
          this.meshDict[e.old_value]['object']['visible'] = this.meshDict[e.old_value]['visibility'];
         }
       if (e.value === false) {
         this.renderer.domElement.style.cursor = "auto";
       } else {
         this.renderer.domElement.style.cursor = "pointer";

         if (Array.isArray(e.value) ) {
          for (const rid of e.value) {
            this.meshDict[rid]['object']['visible'] = true;
          }
         } else {
          this.meshDict[e.value]['object']['visible'] = true;
         }
       }
     }

     FFBOMesh3D.prototype.updateOpacity = function(e) {
       // Entering highlight mode or highlighted obj change
       if (e.prop == 'highlight'  && this.states.highlight) {
         if ((e !== undefined) && e.old_value) {
          if (Array.isArray(e.old_value)) {
            var list = e.old_value;
          } else {
            var list = [e.old_value];
          }
         } else {
          var list = Object.keys(this.meshDict);
         }
 
         for (const key of list) {
           var val = this.meshDict[key];
           var opacity = val['highlight'] ? this.settings.lowOpacity : this.settings.nonHighlightableOpacity;
           var depthTest = true;
           if (val['pinned']) {
             opacity = this.settings.pinOpacity;
             depthTest = true;
           }
           for (var i in val.object.children) {
              val.object.children[i].material.opacity = opacity;
              val.object.children[i].material.depthTest = depthTest;
           }
         }

         if (Array.isArray(this.states.highlight) ) {
          var list = this.states.highlight;
         } else {
          var list = [this.states.highlight];
         }

         for (const rid of list){
           var val = this.meshDict[rid];

            if (val['background']) {
              val.object.children[0].material.opacity = this.settings.backgroundOpacity;
              val.object.children[1].material.opacity = this.settings.backgroundWireframeOpacity;
                  //val.object.children[0].material.depthTest = false;
                  //val.object.children[1].material.depthTest = false;
            } else {
              for (var i in val.object.children) {
                val.object.children[i].material.opacity = this.settings.highlightedObjectOpacity;
                val.object.children[i].material.depthTest = false;
              }
            }
         }
       } else if (this.states.highlight) {
         return;
       // Either entering pinned mode or pinned mode settings changing
       } else if ((e.prop == 'highlight' && this.states.pinned) ||
                  (e.prop == 'pinned' && e.value && this.uiVars.pinnedObjects.size == 1) ||
                  (( (e.prop == 'pinLowOpacity') || (e.prop == 'pinOpacity')) && this.states.pinned)){
         for (const key of Object.keys(this.meshDict)) {
           var val = this.meshDict[key];
           if (!val['background']){
             var opacity = this.meshDict[key]['pinned'] ? this.settings.pinOpacity : this.settings.pinLowOpacity;
             var depthTest = !this.meshDict[key]['pinned'];
             for (var i in val.object.children) {
                val.object.children[i].material.opacity = opacity;
                val.object.children[i].material.depthTest = depthTest;
             }
           } else {
              val.object.children[0].material.opacity = this.settings.backgroundOpacity;
              val.object.children[1].material.opacity = this.settings.backgroundWireframeOpacity;
           
           }
         }
       }
       // New object being pinned while already in pinned mode
       else if (e.prop == 'pinned' && this.states.pinned){
         for (var i in e.obj.object.children) {
            e.obj.object.children[i].material.opacity = (e.value) ? this.settings.pinOpacity : this.settings.pinLowOpacity;
            e.obj.object.children[i].material.depthTest = !e.value;
         }
       }
       // Default opacity value change in upinned mode or exiting highlight mode
       else if (!this.states.pinned || e.prop == 'highlight'){
         this.resetOpacity();
       }
     }

     FFBOMesh3D.prototype.resetOpacity = function() {
       var val = this.settings.defaultOpacity;
       for (const key of Object.keys(this.meshDict)) {
         if (!this.meshDict[key]['background']){
           if(this.meshDict[key]['class'] === 'Neuron' || this.meshDict[key]['class'] === 'NeuronFragment'){
             for (i in this.meshDict[key].object.children) {
                this.meshDict[key].object.children[i].material.opacity = this.settings.defaultOpacity;
               this.meshDict[key].object.children[i].material.depthTest = true;
               
             }
           } else {
             for (i in this.meshDict[key].object.children) {
               this.meshDict[key].object.children[i].material.opacity = this.settings.synapseOpacity;
               this.meshDict[key].object.children[i].material.depthTest = true;
             }
           }
         } else {
           this.meshDict[key].object.children[0].material.opacity = this.settings.backgroundOpacity;
           this.meshDict[key].object.children[1].material.opacity = this.settings.backgroundWireframeOpacity;
           this.meshDict[key].object.children[0].material.depthTest = true;
           this.meshDict[key].object.children[1].material.depthTest = true;
         }
       }
     }

     FFBOMesh3D.prototype.updateLinewidth = function(e) {
      for (const key of Object.keys(this.meshDict)) {
        if(this.meshDict[key]['class'] === 'Neuron' || this.meshDict[key]['class'] === 'NeuronFragment'){
            for (i in this.meshDict[key].object.children) {
              if (this.meshDict[key].object.children[i].material.type == 'LineMaterial'){
                this.meshDict[key].object.children[i].material.linewidth = e;
              }
            }
          }
        }
     }

     FFBOMesh3D.prototype.updateSynapseRadius = function(e) {
      var matrix = new THREE.Matrix4();
      var new_matrix = new THREE.Matrix4();
      var scale_vec = new THREE.Vector3();
      for (const key of Object.keys(this.meshDict)) {
        if(this.meshDict[key]['class'] === 'Synapse'){
            for (i in this.meshDict[key].object.children) {
              if ( this.meshDict[key].object.children[i].type === 'Mesh' ){
                overallScale = this.meshDict[key].object.children[i].overallScale;
                for(var j = 0; j < this.meshDict[key].object.children[i].count; j++){
                  this.meshDict[key].object.children[i].getMatrixAt(j, matrix);
                  scale_vec.setFromMatrixScale(matrix);
                  new_matrix.makeScale(scale_vec.x/overallScale*e, scale_vec.y/overallScale*e, scale_vec.z/overallScale*e);
                  new_matrix.copyPosition(matrix);
                  this.meshDict[key].object.children[i].setMatrixAt( j, new_matrix );
                }
                this.meshDict[key].object.children[i].instanceMatrix.needsUpdate=true;
                this.meshDict[key].object.children[i].overallScale = e;

              }
            }
          }
        }
        
     }

     FFBOMesh3D.prototype.asarray = function( variable ) {
       if (variable.constructor !== Array )
         variable = [variable];
       return variable;
     }

     FFBOMesh3D.prototype.updatePinned = function(e) {
       if (e.obj['pinned']) {
         this.uiVars.pinnedObjects.add(e.path[0])
       } else {
         this.uiVars.pinnedObjects.delete(e.path[0])
       }
       this.states.pinned = (this.uiVars.pinnedObjects.size > 0);
     }

     FFBOMesh3D.prototype.pin = function( id ) {

       id = this.asarray( id );

       for (var i = 0; i < id.length; ++i ) {
         if ( !(id[i] in this.meshDict ) || this.meshDict[id[i]]['pinned'] )
           continue;
         this.meshDict[id[i]]['pinned'] = true;
       }
     }

     FFBOMesh3D.prototype.unpin = function( id ) {

       id = this.asarray( id );

       for (var i = 0; i < id.length; ++i ) {
         if ( !(id[i] in this.meshDict ) || !this.meshDict[id[i]]['pinned'] )
           continue;
         this.meshDict[id[i]]['pinned'] = false;
       }
     }

     FFBOMesh3D.prototype.getPinned = function() {

       return Array.from(this.uiVars.pinnedObjects)
     }

     FFBOMesh3D.prototype.getUnpinned = function() {

       var list = []
       for (var key of Object.keys(this.meshDict)) {
         if (!this.meshDict[key]['background'] && !this.meshDict[key]['pinned'])
           list.push(key);
       }
       return list;
     }

     FFBOMesh3D.prototype.remove = function( id ) {

       id = this.asarray( id );

       for (var i = 0; i < id.length; ++i ) {
         if ( !(id[i] in this.meshDict ) )
           continue;
         delete this.meshDict[id[i]];
       }
     }

     FFBOMesh3D.prototype.setColor = function( id, color ) {

       id = this.asarray( id );

       for (var i = 0; i < id.length; ++i ) {
         if ( !(id[i] in this.meshDict ) )
           continue;
         var meshobj = this.meshDict[id[i]].object;
         for (var j = 0; j < meshobj.children.length; ++j ) {
           meshobj.children[j].material.color.set( color );
          //  meshobj.children[j].geometry.colorsNeedUpdate = true;
          //  for(var k = 0; k < meshobj.children[j].geometry.attributes.color.array.length; ++k){
          //    meshobj.children[j].geometry.attributes.color.array[k].set( color );
          //  }
         }
         this.meshDict[id[i]].color = new THREE.Color(color);
       }
     }

     FFBOMesh3D.prototype.setBackgroundColor = function( color ) {
       if( Array.isArray( color ) )
         color = new THREE.Color().fromArray( color )
       for (var i = 0; i < this.groups.back.children.length; ++i ) {
         var meshobj = this.groups.back.children[i]
         for (var j = 0; j < meshobj.children.length; ++j ) {
           meshobj.children[j].material.color.set( color );
          //  meshobj.children[j].geometry.colorsNeedUpdate = true;
          //  for(var k = 0; k < meshobj.children[j].geometry.colors.length; ++k){
          //    meshobj.children[j].geometry.colors[k].set( color );
          //  }
         }
       }
     }

     FFBOMesh3D.prototype.resetView = function() {
       if (this._metadata["enablePositionReset"] == true) {
        this.camera.position.z = this._metadata["resetPosition"]['z'];
        this.camera.position.y = this._metadata["resetPosition"]['y'];
        this.camera.position.x = this._metadata["resetPosition"]['x'];
        this.camera.up.z = this._metadata["resetUp"]['z'];
        this.camera.up.y = this._metadata["resetUp"]['y'];
        this.camera.up.x = this._metadata["resetUp"]['x'];
        this.controls.target.x = this._metadata["cameraTarget"]["x"];
        this.controls.target.y = this._metadata["cameraTarget"]["y"];
        this.controls.target.z = this._metadata["cameraTarget"]["z"];
       } else {
        this.controls.target0.x = 0.5*(this.boundingBox.minX + this.boundingBox.maxX );
        this.controls.target0.y = 0.5*(this.boundingBox.minY + this.boundingBox.maxY );
        this.controls.reset();
       }
     }

     FFBOMesh3D.prototype.setSceneBackgroundColor = function (color) {
      this.scenes.back.background.set(color);
    }

     FFBOMesh3D.prototype.resetVisibleView = function () {
       this.computeVisibleBoundingBox();
       this.controls.target.x = 0.5 * (this.visibleBoundingBox.minX + this.visibleBoundingBox.maxX);
      this.controls.target.y = 0.5 * (this.visibleBoundingBox.minY + this.visibleBoundingBox.maxY);
      this.controls.target.z = 0.5 * (this.visibleBoundingBox.minZ + this.visibleBoundingBox.maxZ);
      this.camera.updateProjectionMatrix();
      setTimeout(() => {
      let positions = [
          new THREE.Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.minY, this.visibleBoundingBox.minZ),
          new THREE.Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.minY, this.visibleBoundingBox.maxZ),
          new THREE.Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.minZ),
          new THREE.Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.maxZ),
          new THREE.Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.minY, this.visibleBoundingBox.minZ),
          new THREE.Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.minY, this.visibleBoundingBox.maxZ),
          new THREE.Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.minZ),
          new THREE.Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.maxZ)
      ];

       // From https://stackoverflow.com/a/11771236
        let targetFov = 0.0;
        for (let i = 0; i < 8; i++) {
            let proj2d = positions[i].applyMatrix4(this.camera.matrixWorldInverse);
            let angle = Math.max(Math.abs(Math.atan(proj2d.x / proj2d.z) / this.camera.aspect), Math.abs(Math.atan(proj2d.y / proj2d.z)));
            targetFov = Math.max(targetFov, angle);
        }
        let currentFov = Math.PI * this.fov / 2 / 180;
        let cam_dir = new THREE.Vector3();
        cam_dir.subVectors(this.camera.position, this.controls.target);
        let prevDist = cam_dir.length();
        cam_dir.normalize();
        let dist = prevDist * Math.tan(targetFov) / Math.tan(currentFov);
        let aspect = this.camera.aspect;
        let targetHfov = 2 * Math.atan(Math.tan(targetFov / 2) * aspect);
        let currentHfov = 2 * Math.atan(Math.tan(currentFov / 2) * aspect);
        dist = Math.max(prevDist * Math.tan(targetHfov) / Math.tan(currentHfov), dist);
        this.camera.position.copy(this.controls.target);
        this.camera.position.addScaledVector(cam_dir, dist);
        this.camera.updateProjectionMatrix();
      }, 400);
     }

     FFBOMesh3D.prototype.startCameraMove = function () {
       this.start_target = this.controls.target.clone();
       this.start_position = this.camera.position.clone();
       this.alpha_cam = 0;
       this.ang_cam = 0;
       this.cam_move_strength = 0.01;
       this.start_up = this.controls.object.up.clone();

       this.cam_move = setInterval((function () {
         this.ang_cam = (this.ang_cam - 1 / 180 * Math.PI * this.alpha_cam * this.alpha_cam * this.alpha_cam) % (2 * Math.PI);
         this.alpha_cam = Math.min(1.0, this.alpha_cam + this.cam_move_strength);
         if (this.alpha_cam < 1.0) {
           this.camera.position.z = (this.final_position.z) * this.alpha_cam * this.alpha_cam + (1 - this.alpha_cam * this.alpha_cam) * this.start_position.z;
           this.camera.position.x = (this.final_position.x) * this.alpha_cam * this.alpha_cam + (1 - this.alpha_cam * this.alpha_cam) * this.start_position.x;
           this.camera.position.y = this.final_position.y * this.alpha_cam * this.alpha_cam + (1 - this.alpha_cam * this.alpha_cam) * this.start_position.y;
           this.controls.target.x = this.alpha_cam * this.camera_target.x + (1 - this.alpha_cam) * this.start_target.x;
           this.controls.target.y = this.alpha_cam * this.camera_target.y + (1 - this.alpha_cam) * this.start_target.y;
           this.controls.target.z = this.alpha_cam * this.camera_target.z + (1 - this.alpha_cam) * this.start_target.z;
           this.controls.object.up.x = this.alpha_cam * this.start_up.x + (1 - this.alpha_cam) * this.start_up.x;
           this.controls.object.up.y = this.alpha_cam * this.start_up.y + (1 - this.alpha_cam) * this.start_up.y;
           this.controls.object.up.z = this.alpha_cam * this.start_up.z + (1 - this.alpha_cam) * this.start_up.z;
         } else {
           clearInterval( this.cam_move );
         }
       }).bind(this), 10);

     }

     FFBOMesh3D.prototype.togglePin = function( d ) {
       if (!this._metadata.allowPin)
         return;
       if (typeof(d) === 'string' && (d in this.meshDict)) {
         d = this.meshDict[d];
       }
       d['pinned'] = !d['pinned'];
     }

     FFBOMesh3D.prototype.unpinAll = function() {

       if (!this._metadata.allowPin)
         return;
       for (var key of this.uiVars.pinnedObjects)
         this.meshDict[key]['pinned'] = false;
     }

     FFBOMesh3D.prototype.toggleStats = function( d ) {
       if (this.statsMode) {
         this.stats.showPanel();
         this.statsMode = false;
       } else {
         this.stats.showPanel(0);
         this.statsMode = true;
       }
     }


     FFBOMesh3D.prototype.createInfoPanel = function() {
       this.infoDiv = document.createElement('div');
       this.infoDiv.style.cssText = "position: absolute; text-align: left; height: 30px; top: 26px; left: 5px; font: 12px sans-serif; z-index: 999; padding-right: 5px; padding-left: 5px; border-right: 1px solid #888; border-left: 1px solid #888;pointer-events: none;  color: #aaa; background: transparent; -webkit-transition: left .5s; transition: left .5s; font-weight: 100";
       this.container.appendChild(this.infoDiv);
       this.updateInfoPanel();
     }

     FFBOMesh3D.prototype.updateInfoPanel = function() {
       this.infoDiv.innerHTML = "Number of Neurons: " + this.uiVars.neuronNum + "<br>Number of Synapses: " + this.uiVars.synapseNum;
     }

     FFBOMesh3D.prototype.createUIBtn = function(name, icon, tooltip, func){
       var x = 5 + 20*Object.keys(this.UIBtns).length;
       var btn = document.createElement('a');
       btn.setAttribute("id", "ffboUIbtn-" + name);
       btn.style.cssText = 'position: absolute; text-align: left; height: 15px; top: 6px; left: ' + x + 'px; font: 15px arial; z-index: 1999; border: 0px; none; color: #aaa; background: transparent; -webkit-transition: left .5s; transition: left .5s; cursor: pointer';
       btn.innerHTML = "<i class='fa " + icon + " fa-fw' aria-hidden='true'></i>";
       // this.dispatch[name] = undefined;
       btn.addEventListener("click",
                            (function(){
                              for (var f of this.UIBtns[name]['callbacks'])
                                f();
                            }).bind(this));
       btn.addEventListener("mouseover",
                            (function(event) {
                              event.preventDefault();
                              btn.style.color = "#fff";
                              this.show3dToolTip(tooltip);
                            }).bind(this));
       btn.addEventListener("mouseleave",
                            (function() {
                              btn.style.color = "#aaa";
                              this.hide3dToolTip();
                            }).bind(this));
       this.UIBtns[name] = {dom: btn, callbacks: []};
       this.container.appendChild(this.UIBtns[name]['dom']);
       if (func !== undefined) {
         func = this.asarray(func);
         for (var f of func) {
           this.on(name, f);
         }
       }
     }


     FFBOMesh3D.prototype.createToolTip = function() {
       this.toolTipDiv = document.createElement('div');
       this.toolTipDiv.style.cssText = 'position: fixed; text-align: center; width: auto; min-width: 100px; height: auto; padding: 2px; font: 12px arial; z-index: 999; background: #ccc; border: solid #212121 3px; border-radius: 8px; pointer-events: none; opacity: 0.0; color: #212121';
       this.toolTipDiv.style.transition = "opacity 0.5s";
       this.container.appendChild(this.toolTipDiv);
     }

     FFBOMesh3D.prototype.show3dToolTip = function (d) {
       this.toolTipDiv.style.opacity = .9;
       this.toolTipDiv.innerHTML = d;

       this.domRect = this.renderer.domElement.getBoundingClientRect();
       var toolTipRect = this.toolTipDiv.getBoundingClientRect();

       var left = this.uiVars.toolTipPosition.x + 10;
       if (left + toolTipRect.width > this.domRect.right )
         left = this.domRect.right - 10 - toolTipRect.width;
       var top = this.uiVars.toolTipPosition.y + 10;
       if (top + toolTipRect.height > this.domRect.bottom )
         top = this.uiVars.toolTipPosition.y - 10 - toolTipRect.height;
       this.toolTipDiv.style.left = left + "px";
       this.toolTipDiv.style.top =  top + "px";
     }

     FFBOMesh3D.prototype.hide3dToolTip = function () {
       this.toolTipDiv.style.opacity = 0.0;
     }

     FFBOMesh3D.prototype._getInfo = function (d) {
       return d;
     }

     FFBOMesh3D.prototype.getNeuronScreenPosition = function (id) {

       var vector = this.meshDict[id].position.clone()
       var canvasRect = this.renderer.domElement.getBoundingClientRect();

       // map to normalized device coordinate (NDC) space
       vector.project( this.camera );

       // map to 2D screen space
       vector.x = Math.round( (   vector.x + 1 ) * canvasRect.width  / 2 ) + canvasRect.left;
       vector.y = Math.round( ( - vector.y + 1 ) * canvasRect.height / 2 ) + canvasRect.top;

       return {'x':vector.x, 'y':vector.y};
     }

     FFBOMesh3D.prototype.syncControls = function (ffbomesh) {
       if (this === ffbomesh)
         return;

       this.controls.target.copy( ffbomesh.controls.target );
       this.camera.position.copy( ffbomesh.camera.position );
       this.camera.up.copy( ffbomesh.camera.up );

       this.camera.lookAt( ffbomesh.controls.target );
     }

     THREE.Lut.prototype.addColorMap( 'rainbow_gist', [
       [ 0.000000, 0xff0028 ], [ 0.031250, 0xff0100 ], [ 0.062500, 0xff2c00 ],
       [ 0.093750, 0xff5700 ], [ 0.125000, 0xff8200 ], [ 0.156250, 0xffae00 ],
       [ 0.187500, 0xffd900 ], [ 0.218750, 0xf9ff00 ], [ 0.250000, 0xceff00 ],
       [ 0.281250, 0xa3ff00 ], [ 0.312500, 0x78ff00 ], [ 0.343750, 0x4dff00 ],
       [ 0.375000, 0x22ff00 ], [ 0.406250, 0x00ff08 ], [ 0.437500, 0x00ff33 ],
       [ 0.468750, 0x00ff5e ], [ 0.500000, 0x00ff89 ], [ 0.531250, 0x00ffb3 ],
       [ 0.562500, 0x00ffde ], [ 0.593750, 0x00f4ff ], [ 0.625000, 0x00c8ff ],
       [ 0.656250, 0x009dff ], [ 0.687500, 0x0072ff ], [ 0.718750, 0x0047ff ],
       [ 0.750000, 0x001bff ], [ 0.781250, 0x0f00ff ], [ 0.812500, 0x3a00ff ],
       [ 0.843750, 0x6600ff ], [ 0.875000, 0x9100ff ], [ 0.906250, 0xbc00ff ],
       [ 0.937500, 0xe800ff ], [ 0.968750, 0xff00ea ], [ 1.000000, 0xff00bf ],
     ]);


     THREE.Lut.prototype.addColorMap( 'no_purple', [
       [0.000000, 0xFF4000],
       [0.017544, 0xFF4D00],
       [0.035088, 0xFF5900],
       [0.052632, 0xFF6600],
       [0.070175, 0xFF7300],
       [0.087719, 0xFF8000],
       [0.105263, 0xFF8C00],
       [0.122807, 0xFF9900],
       [0.140351, 0xFFA600],
       [0.157895, 0xFFB300],
       [0.175439, 0xFFBF00],
       [0.192982, 0xFFCC00],
       [0.210526, 0xFFD900],
       [0.228070, 0xFFE500],
       [0.245614, 0xFFF200],
       [0.263158, 0xFFFF00],
       [0.280702, 0xF2FF00],
       [0.298246, 0xE6FF00],
       [0.315789, 0xD9FF00],
       [0.333333, 0xCCFF00],
       [0.350877, 0xBFFF00],
       [0.368421, 0xB3FF00],
       [0.385965, 0xAAFF00],
       [0.403509, 0x8CFF00],
       [0.421053, 0x6EFF00],
       [0.438596, 0x51FF00],
       [0.456140, 0x33FF00],
       [0.473684, 0x15FF00],
       [0.491228, 0x00FF08],
       [0.508772, 0x00FF26],
       [0.526316, 0x00FF44],
       [0.543860, 0x00FF55],
       [0.561404, 0x00FF62],
       [0.578947, 0x00FF6F],
       [0.596491, 0x00FF7B],
       [0.614035, 0x00FF88],
       [0.631579, 0x00FF95],
       [0.649123, 0x00FFA2],
       [0.666667, 0x00FFAE],
       [0.684211, 0x00FFBB],
       [0.701754, 0x00FFC8],
       [0.719298, 0x00FFD4],
       [0.736842, 0x00FFE1],
       [0.754386, 0x00FFEE],
       [0.771930, 0x00FFFB],
       [0.789474, 0x00F7FF],
       [0.807018, 0x00EAFF],
       [0.824561, 0x00DDFF],
       [0.842105, 0x00D0FF],
       [0.859649, 0x00C3FF],
       [0.877193, 0x00B7FF],
       [0.894737, 0x00AAFF],
       [0.912281, 0x009DFF],
       [0.929825, 0x0091FF],
       [0.947368, 0x0084FF],
       [0.964912, 0x0077FF],
       [0.982456, 0x006AFF],
       [1.000000, 0x005EFF],
     ]);
     return FFBOMesh3D;
   });

