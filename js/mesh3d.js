var isOnMobile = checkOnMobile();

function checkOnMobile() {

    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
    return true;
    else
    return false;
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

function FFBOMesh3D(div_id, data, metadata) {

    /* default metadata */
    this._metadata = {
        "colormap": "rainbow_gist",
        "maxColorNum": 1747591,
        "highlightMode": "rest", /* one: highlight one; rest: deem rest */
        "allowPin": true,
        "allowHighlight": true,
    }
    if ( metadata !== undefined )
    for ( var key in this._metadata )
        if ( (key in metadata) && (metadata[key] !== undefined) )
            this._metadata[key] = metadata[key]

    this.div_id = div_id;

    this.container = document.getElementById( div_id );
    var height = this.container.clientHeight;
    var width = this.container.clientWidth;

    this.fov = 20;

    this.camera = new THREE.PerspectiveCamera( this.fov, width / height, 0.1, 20000 );
    this.camera.position.z = 1800;

        if(width<768 && width/height < 1){
            this.camera.position.z = 3800;
    }
        if(width<768 && width/height >= 1){
            this.camera.position.z =2600;
	    }
    
    /*
    this.camera.position.copy(new THREE.Vector3(-372, -523, 122))
    this.camera.up.copy(new THREE.Vector3(-0.16, 0.22, 0.96))
    */
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( width, height );
    this.container.appendChild(this.renderer.domElement);
    this.canvasRect = this.renderer.domElement.getBoundingClientRect();

    this.scene = new THREE.Scene();
    this.scene.background = null
    this.scene.add( this.camera );

    this.backscene = new THREE.Scene();
    this.backscene.background = new THREE.Color(0x030305);
    this.backscene.add( this.camera );

    this.meshGroup = new THREE.Object3D(); // for raycaster detection
    this.backmeshGroup = new THREE.Object3D();

    this.currentIntersected;

    this.mouse = new THREE.Vector2(-100000,-100000);

    this.isAnim = false;

    this.settings = new PropertyManager({meshWireframe: true});
    this._states = new PropertyManager({pinned: false, highlight: false});
    
    this.controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 2.0;
    this.controls.zoomSpeed = 1.0;
    this.controls.panSpeed = 2.0;
    this.controls.staticMoving = true;
    this.controls.dynamicDampingFactor = 0.3;
    this.controls.addEventListener('change', this.render.bind(this));

    
    this.lightsHelper = new FFBOLightsHelper( this );
    
    this.lightsHelper.addAmbientLight({intensity: 0.1,
				       scene: 'front',
				       key: 'frontAmbient'})
    this.lightsHelper.addAmbientLight({intensity: 0.5,
				       scene: 'back',
				       key: 'backAmbient'})

    this.lightsHelper.addDirectionalLight({intensity: 0.1,
					   position: new THREE.Vector3(0, 0, 5000),
					   scene: 'front',
					   key: 'frontDirectional_1'})
    this.lightsHelper.addDirectionalLight({intensity: 0.8,
					   position: new THREE.Vector3(0, 0, 5000),
					   scene: 'back',
					   key: 'backDirectional_1'})
    this.lightsHelper.addDirectionalLight({intensity: 0.1,
					   position: new THREE.Vector3(0, 0, -5000),
					   scene: 'front',
					   key: 'frontDirectional_2'})
    this.lightsHelper.addDirectionalLight({intensity: 0.8,
					   position: new THREE.Vector3(0, 0, -5000),
					   scene: 'back',
					   key: 'backDirectional_2'})


    
    this.lightsHelper.addSpotLight({posAngle1: 80,
				    posAngle2: 80,
				    scene: 'front',
				    key: 'frontSpot_1'})
    this.lightsHelper.addSpotLight({posAngle1: 80,
				    posAngle2: 80,
				    intensity: 12,
				    scene: 'back',
				    key: 'backSpot_1'})
    this.lightsHelper.addSpotLight({posAngle1: -80,
				    posAngle2: 80,
				    scene: 'front',
				    key: 'frontSpot_2'})
    this.lightsHelper.addSpotLight({posAngle1: -80,
				    posAngle2: 80,
				    intensity: 12,
				    scene: 'back',
				    key: 'backSpot_2'})


    /*

    this.ambientlight = new THREE.AmbientLight( 0xffffff, 0.1 );
    this.backambientlight = new THREE.AmbientLight( 0xffffff, 0.5 );

    this.scene.add( this.ambientlight );
    this.backscene.add( this.backambientlight );
				
    this.frontlight = new THREE.DirectionalLight();
    this.frontlight.position.set( 0, 0, 1 );
    this.backfrontlight = new THREE.DirectionalLight();
    this.backfrontlight.position.set( 0, 0, 1 );
    this.scene.add( this.frontlight );
    this.backscene.add( this.backfrontlight );

    this.backlight = new THREE.DirectionalLight();
    this.backlight.position.set( 0, 0, -5000 );
    this.backbacklight = new THREE.DirectionalLight();
    this.backbacklight.position.set( 0, 0, -5000 );
    this.scene.add( this.backlight );
    this.backscene.add( this.backbacklight );
    */
    
    /*
     * create color map
     */
    this.maxColorNum = this._metadata.maxColorNum;
    this.lut = new THREE.Lut( this._metadata.colormap, this.maxColorNum);
    this.lut.setMin( 0 );
    this.lut.setMax( 1 );

    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onLoad = function() {
        this.controls.target0.x = 0.5*(this.boundingBox.minX + this.boundingBox.maxX );
          this.controls.target0.y = 0.5*(this.boundingBox.minY + this.boundingBox.maxY );
	/*this.controls.target0 = new THREE.Vector3(-334, -120, 19);*/
        this.controls.reset();
        this.meshGroup.visible = true;
    }.bind(this);
    this.scene.add( this.meshGroup );
    this.backscene.add( this.backmeshGroup );

    this.raycaster = new THREE.Raycaster();
    this.raycaster.linePrecision = 3;

    this.container.addEventListener( 'click', this.onDocumentMouseClick.bind(this), false );

    this.container.addEventListener( 'dblclick', this.onDocumentMouseDBLClick.bind(this), false );

    if(isOnMobile){
    $('#' + this.div_id).on( 'taphold', this.onDocumentMouseDBLClick2.bind(this));
    $("body").on("contextmenu", function() { return false; });
    }
    this.container.addEventListener( 'mouseenter', this.onDocumentMouseEnter.bind(this), false );

    this.container.addEventListener( 'mousemove', this.onDocumentMouseMove.bind(this), false );

    this.container.addEventListener( 'mouseleave', this.onDocumentMouseLeave.bind(this), false );

    this.container.addEventListener( 'resize', this.onWindowResize.bind(this), false );

    this.isMouseOver = false;
    this.animOpacity = {};
    this.meshDict = new PropertyManager();
    this.meshNum = 0;
    this.frontNum = 0;
    this.defaultBoundingBox = {'maxY': -100000, 'minY': 100000, 'maxX': -100000, 'minX': 100000, 'maxZ': -100000, 'minZ': 100000};

    this.boundingBox = Object.assign( {}, this.defaultBoundingBox )
    this.visibleBoundingBox = Object.assign( {}, this.defaultBoundingBox )

    this.neurons_3d = false;
    this.mode_3d = 1;
    this.synapse_mode = 1
    
    
    this.createInfoPanel();
    if ( data != undefined && Object.keys(data).length > 0)
        this.addJson( data );

    this._uibtnright = 5;
    this.toolTipPos = new THREE.Vector2();
    this.createToolTip();

    this.isHighlight = false;
    this.highlightedObj = null;

    this._take_screenshot = false
    this.default_opacity = (this._metadata.highlightMode === "rest" ) ? 0.7 : 0.1;
    this.synapse_opacity = 1.0
    this.meshOscAmp = 0.0;
    this.non_highlightable_opacity = 0.1
    this.low_opacity = 0.1
    this.pin_opacity = 0.9
    this.pin_low_opacity = 0.15
    this.highlighted_object_opacity = 1.0
    this.default_radius = 0.5
    this.default_soma_radius = 3.0
    this.default_synapse_radius = 0.3

    this.background_opacity = 0.8
    this.background_wireframe_opacity = 0.07;
    this.renderScene = new THREE.RenderPass( this.scene, this.camera );
    this.renderScene.clear = false;
    this.renderScene.clearDepth = true;
    
    this.backrenderScene = new THREE.RenderPass( this.backscene, this.camera);
    this.backrenderSSAO = new THREE.SSAOPass( this.backscene, this.camera, width, height);
//this.renderScene = new THREE.SSAORenderPass( this.scene, this.camera );
    
    this.effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
    this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / Math.max(width, 1440), 1 / Math.max(height, 900) );

    
    this.bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( width, height ), 0.2, 0.2, 0.3 ); //1.0, 9, 0.5, 512);
    this.bloomPass.renderToScreen = true;

    //this.gammaCorrectionPass = new THREE.ShaderPass( THREE.GammaCorrectionShader );
    //this.gammaCorrectionPass.renderToScreen = true;
    
    this.toneMappingPass = new THREE.AdaptiveToneMappingPass( true, width );
    this.toneMappingPass.setMinLuminance(0.05);
    
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;

    this.composer = new THREE.EffectComposer( this.renderer );
    this.composer.setSize( width, height );
    this.composer.addPass( this.backrenderScene );
    this.composer.addPass( this.backrenderSSAO );
    this.composer.addPass( this.renderScene );
    this.composer.addPass( this.effectFXAA );
    this.composer.addPass( this.toneMappingPass );
    
    this.composer.addPass( this.bloomPass );
    //this.composer.addPass( this.gammaCorrectionPass );
    

    this.passes = {'SSAO': 1, 'FXAA': 3, 'toneMappingPass': 4, 'unrealBloomPass': 5}
    
    this.animate();
    this.pinned = new Set();

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
    this._configureCallbacks();
};

FFBOMesh3D.prototype.reset = function(resetBackground) {
    resetBackground = resetBackground || false;
    for (var key in this.meshDict) {
        if ( !resetBackground && this.meshDict[key].background ) {
            continue;
        }
        var meshobj = this.meshDict[key].object;
        for (var i = 0; i < meshobj.children.length; i++ ) {
            meshobj.children[i].geometry.dispose();
            meshobj.children[i].material.dispose();
        }
        --this.meshNum;
        this.meshGroup.remove( meshobj );
        delete meshobj;
        delete this.meshDict[key];
    }
    this.frontNum = 0
    this.isHighlight = false;
    this.highlightedObj = null;
    this.pinned.clear()
    if ( resetBackground ) {
        this.controls.target0.set(0,0,0);
        this.boundingBox = {'maxY': -100000, 'minY': 100000, 'maxX': -100000, 'minX': 100000, 'maxZ': -100000, 'minZ': 100000};
    }
    this.controls.reset();
}

FFBOMesh3D.prototype._configureCallbacks = function(){
    this.settings.on("change", function(e){
	for(i=0; i<this.backmeshGroup.children.length; i++)
	    this.backmeshGroup.children[i].children[1].visible = e["value"];
    }.bind(this), "meshWireframe");
}

FFBOMesh3D.prototype.addCommand = function(json) {
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
    if ( (json === undefined) || !("ffbo_json" in json) ) {
        console.log( 'mesh json is undefined' );
        return;
    }
    var metadata = {
        "type": undefined,
        "visibility": true,
        "colormap": this._metadata.colormap,
        "colororder": "random",
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
    } else {
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
    if ( metadata.showAfterLoadAll )
        this.meshGroup.visible = false;

    var isNAData = (metadata.type === "morphology_json");

    for ( var i = 0; i < keyList.length; ++i ) {
        var key = keyList[i];
        if (key in this.meshDict ) {
            console.log( 'mesh object already exists... skip rendering...' )
            continue;
        }
        this.meshDict[key] = new PropertyManager(json.ffbo_json[key]);
	this.meshDict[key].minX = 1000000;
	this.meshDict[key].maxX = -1000000;
	this.meshDict[key].minY = 1000000;
	this.meshDict[key].maxY = -1000000;
	this.meshDict[key].minZ = 1000000;
	this.meshDict[key].maxZ = -1000000;
	
        this.meshNum += 1;

        if ( !('highlight' in this.meshDict[key]) )
            this.meshDict[key]['highlight'] = true;

        if ( !('background' in this.meshDict[key]) )
            this.meshDict[key]['background'] = false;

        if ( !('color' in this.meshDict[key]) )
            this.meshDict[key]['color'] = lut.getColor( id2float(i) );

        if ( !('label' in this.meshDict[key]) ){
            if ( 'name' in this.meshDict[key] )
		this.meshDict[key]['label'] = this.meshDict[key]['name'];
	    else
		this.meshDict[key]['label'] = key;
	}

        /* read mesh */
        if ( isNAData )
            this.loadMorphJSONCallBack(key, metadata.visibility).bind(this)();
        else {
            if ( ('dataStr' in this.meshDict[key]) && ('filename' in this.meshDict[key]) ) {
                console.log( 'mesh object has both data string and filename... should only have one... skip rendering' );
                continue;
            }
            if ( 'filename' in this.meshDict[key] ) {
                this.meshDict[key]['filetype'] = this.meshDict[key].filename.split('.').pop();
                var loader = new THREE.FileLoader( this.loadingManager );
                if (this.meshDict[key]['filetype'] == "json")
                    loader.load(this.meshDict[key].filename, this.loadMeshCallBack(key, metadata.visibility).bind(this));
                else if (this.meshDict[key]['filetype'] == "swc" )
                    loader.load(this.meshDict[key].filename, this.loadSWCCallBack(key, metadata.visibility).bind(this));
                else {
                    console.log( 'mesh object has unrecognized data format... skip rendering' );
                    continue;
                }
            } else if ( 'dataStr' in this.meshDict[key] ) {
                if (this.meshDict[key]['filetype']  == "json")
                    this.ladMeshCallBack(key, metadata.visibility).bind(this)(this.meshDict[key]['dataStr']);
                else if (this.meshDict[key]['filetype'] == "swc" )
                    this.loadSWCCallBack(key, metadata.visibility).bind(this)(this.meshDict[key]['dataStr']);
                else {
                    console.log( 'mesh object has unrecognized data format... skip rendering' );
                    continue;
                }
            } else {
                console.log( 'mesh object has neither filename nor data string... skip rendering' );
                continue;
            }
        }
    }

    this.updateInfoPanel()

    if ( isNAData ) {
        //this.meshGroup.visible = true;
        //this.controls.target0.x = 0.5*(this.boundingBox.minX + this.boundingBox.maxX );
        //this.controls.target0.y = 0.5*(this.boundingBox.minY + this.boundingBox.maxY );
        //this.controls.reset();
    }
}

FFBOMesh3D.prototype.computeVisibleBoundingBox = function(){
    this.visibleBoundingBox = Object.assign( {}, this.defaultBoundingBox );
    for(var key in this.meshDict){
	if( this.meshDict[key].object.visible ){
	    if ( this.meshDict[key].minX < this.visibleBoundingBox.minX )
		this.visibleBoundingBox.minX = this.meshDict[key].minX;
	    if ( this.meshDict[key].maxX > this.visibleBoundingBox.maxX )
		this.visibleBoundingBox.maxX = this.meshDict[key].maxX;
	    if ( this.meshDict[key].minY < this.visibleBoundingBox.minY )
		this.visibleBoundingBox.minY = this.meshDict[key].minY;
	    if ( this.meshDict[key].maxY > this.visibleBoundingBox.maxY )
		this.visibleBoundingBox.maxY = this.meshDict[key].maxY;
	    if ( this.meshDict[key].maxZ < this.visibleBoundingBox.minZ )
		this.visibleBoundingBox.minZ = this.meshDict[key].minZ;
	    if ( this.meshDict[key].maxZ > this.visibleBoundingBox.maxZ )
		this.visibleBoundingBox.maxZ = this.meshDict[key].maxZ;
	}
    }
}

FFBOMesh3D.prototype.updateObjectBoundingBox = function(key, x, y, z) {
    if ( x < this.meshDict[key].minX )
        this.meshDict[key].minX = x;
    if ( x > this.meshDict[key].maxX )
        this.meshDict[key].maxX = x;
    if ( y < this.meshDict[key].minY )
        this.meshDict[key].minY = y;
    if ( y > this.meshDict[key].maxY )
        this.meshDict[key].maxY = y;
    if ( z < this.meshDict[key].minZ )
        this.meshDict[key].minZ = z;
    if ( z > this.meshDict[key].maxZ )
        this.meshDict[key].maxZ = z;
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
    this.isAnim = true;
}
FFBOMesh3D.prototype.stopAnim = function() {
    this.isAnim = false;
}
FFBOMesh3D.prototype.animate = function() {

    requestAnimationFrame( this.animate.bind(this) );

    this.controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
    if( this.isMouseOver && this.dispatch.syncControls)
        this.dispatch.syncControls(this)

    this.render();
}
FFBOMesh3D.prototype.loadMeshCallBack = function(key, visibility) {
    return function (jsonString) {
	var json = JSON.parse(jsonString);
        var color = this.meshDict[key]['color'];
        var geometry  = new THREE.Geometry();
        var vtx = json['vertices'];
        var idx = json['faces'];
        var len = vtx.length / 3;
        for (var j = 0; j < len; j++) {
            var x = parseFloat(vtx[3*j+0]);
            var y = parseFloat(vtx[3*j+1]);
            var z = parseFloat(vtx[3*j+2]);
            geometry.vertices.push(
                new THREE.Vector3(x,y,z)
            );
	    this.updateObjectBoundingBox(key, x, y, z);
            this.updateBoundingBox(x,y,z);
        }
        for (var j = 0; j < idx.length/3; j++) {
            geometry.faces.push(
                new THREE.Face3(
                    parseInt(idx[3*j+0]),
                    parseInt(idx[3*j+1]),
                    parseInt(idx[3*j+2])
                )
            );
        }

	geometry.mergeVertices();
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();

	materials  = [
	    //new THREE.MeshPhongMaterial( { color: color, flatShading: true, shininess: 0, transparent: true } ),
	    new THREE.MeshLambertMaterial( { color: color, transparent: true, side: 2, flatShading: true} ),
	    new THREE.MeshBasicMaterial( { color: color, wireframe: true, transparent: true} )
	];
	
	
        var group = THREE.SceneUtils.createMultiMaterialObject( geometry, materials );
	if(! this.settings.meshWireframe )
	    group.children[1].visible = false;
        group.visible = visibility;

        this._registerGroup(key, group);
    };

};
FFBOMesh3D.prototype.loadSWCCallBack = function(key, visibility) {
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
                    'type'   : parseInt  (seg[1]),
                    'x'      : parseFloat(seg[2]),
                    'y'      : parseFloat(seg[3]),
                    'z'      : parseFloat(seg[4]),
                    'radius' : parseFloat(seg[5]),
                    'parent' : parseInt  (seg[6]),
                };
            }
        });

        var color = this.meshDict[key]['color'];
        var geometry  = new THREE.Geometry();

        for (var idx in swcObj ) {
            if (swcObj[idx].parent != -1) {
                var c = swcObj[idx];
                var p = swcObj[swcObj[idx].parent];
                geometry.vertices.push(new THREE.Vector3(c.x,c.y,c.z));
                geometry.vertices.push(new THREE.Vector3(p.x,p.y,p.z));
                geometry.colors.push(color);
                geometry.colors.push(color);
		this.updateObjectBoundingBox(key, c.x, c.y, c.z);
                this.updateBoundingBox(c.x, c.y, c.z);
            }
        }
        var material = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors, transparent: true, color: color });
        var group = new THREE.Object3D();
        group.add(new THREE.LineSegments(geometry, material, THREE.LineSegments));
        group.visible = visibility;

        this._registerGroup(key, group);

    };
};

FFBOMesh3D.prototype.loadMorphJSONCallBack = function(key, visibility) {
    return function() {
	/*
	 * process string
	 */
	var swcObj = {};
	var len = this.meshDict[key]['sample'].length;
	for (var j = 0; j < len; j++) {
            swcObj[parseInt(this.meshDict[key]['sample'][j])] = {
		'type'   : parseInt  (this.meshDict[key]['identifier'][j]),
		'x'      : parseFloat(this.meshDict[key]['x'][j]),
		'y'      : parseFloat(this.meshDict[key]['y'][j]),
		'z'      : parseFloat(this.meshDict[key]['z'][j]),
		'radius' : parseFloat(this.meshDict[key]['r'][j]),
		'parent' : parseInt  (this.meshDict[key]['parent'][j]),
            };
	}
	
	var color = this.meshDict[key]['color'];
	var group = new THREE.Object3D();
	var pointGeometry = undefined;
	var mergedGeometry = undefined;
	var geometry = undefined;
	
	for (var idx in swcObj ) {
            var c = swcObj[idx];
	    this.updateObjectBoundingBox(key, c.x, c.y, c.z);
            this.updateBoundingBox(c.x,c.y,c.z);
            if (c.parent != -1) {
		var p = swcObj[c.parent];
		if(this.neurons_3d){
		    if(mergedGeometry == undefined)
			mergedGeometry = new THREE.Geometry()
		    var d = new THREE.Vector3((p.x - c.x), (p.y - c.y), (p.z - c.z));
		    if(!p.radius || !c.radius)
			var geometry = new THREE.CylinderGeometry(this.default_radius, this.default_radius, d.length(), 4, 1, 0);
		    else
			var geometry = new THREE.CylinderGeometry(p.radius, c.radius, d.length(), 8, 1, 0);
		    geometry.translate(0, 0.5*d.length(),0);
		    geometry.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );
		    geometry.lookAt(d.clone());
		    geometry.translate((c.x+c.x)/2 , -0.0*d.length()+(c.y + c.y)/2, (c.z + c.z)/2 );
		    
		    
		    mergedGeometry.merge(geometry);
		    delete geometry
		    
		    if(this.mode_3d == 2){
			var geometry = new THREE.SphereGeometry(c.radius, 8, 8);
			geometry.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );
			geometry.lookAt(d);
			geometry.translate((c.x+c.x)/2 , (c.y + c.y)/2, (c.z + c.z)/2 );
			
			mergedGeometry.merge(geometry);
			delete geometry
		    }
		    else if(this.mode_3d == 3){
			if(p.parent != -1){
			    p2 = swcObj[p.parent];
			    var a = new THREE.Vector3(0.9*p.x + 0.1*p2.x, 0.9*p.y + 0.1*p2.y, 0.9*p.z + 0.1*p2.z); 
			    var b = new THREE.Vector3(0.9*p.x + 0.1*c.x, 0.9*p.y + 0.1*c.y, 0.9*p.z + 0.1*c.z); 
			    var curve = new THREE.QuadraticBezierCurve3(
				a,
				new THREE.Vector3( p.x, p.y, p.z ),
				b,
			    );
			    var geometry = new THREE.TubeGeometry( curve, 8, p.radius, 4, false );
			    mergedGeometry.merge(geometry);
			    delete geometry
			}
		    }
		    
		}
		else{
		    if(geometry == undefined)
			geometry = new THREE.Geometry();
		    geometry.vertices.push(new THREE.Vector3(c.x,c.y,c.z));
		    geometry.vertices.push(new THREE.Vector3(p.x,p.y,p.z));
		    geometry.colors.push(color);
		    geometry.colors.push(color);
		}
            }
            if (c.type == 1) {
		if(c.radius)
		    var sphereGeometry = new THREE.SphereGeometry(c.radius, 8, 8 );
		else
		    var sphereGeometry = new THREE.SphereGeometry(this.default_soma_radius, 8, 8 );
		sphereGeometry.translate( c.x, c.y, c.z );
		var sphereMaterial = new THREE.MeshLambertMaterial( {color: color, transparent: true} );
		group.add(new THREE.Mesh( sphereGeometry, sphereMaterial));
		this.meshDict[key]['position'] = new THREE.Vector3(c.x,c.y,c.z);
            }
	    if (c.type == -1) {
		if(this.synapse_mode==1){
		    if(mergedGeometry == undefined)
			mergedGeometry = new THREE.Geometry()

		    if(c.radius)
			var sphereGeometry = new THREE.SphereGeometry(c.radius, 8, 8 );
		    else
			var sphereGeometry = new THREE.SphereGeometry(this.default_synapse_radius, 8, 8 );
		    sphereGeometry.translate( c.x, c.y, c.z );
		    //var sphereMaterial = new THREE.MeshLambertMaterial( {color: color, transparent: true} );
		    //group.add(new THREE.Mesh( sphereGeometry, sphereMaterial));
		    mergedGeometry.merge(sphereGeometry);
		    this.meshDict[key]['position'] = new THREE.Vector3(c.x,c.y,c.z);
		}
		else{
		    if(pointGeometry == undefined)
			pointGeometry = new THREE.Geometry();
		    pointGeometry.vertices.push(new THREE.Vector3(c.x, c.y, c.z));
		}
	    }
	}
	if(pointGeometry){
	    var pointMaterial = new THREE.PointsMaterial( { color: color, size:this.default_synapse_radius, lights:true } );
	    var points = new THREE.Points(pointGeometry, pointMaterial);
	    group.add(points);
	}
	if(mergedGeometry){
	    var material = new THREE.MeshLambertMaterial( {color: color, transparent: true});
	    //var modifier = new THREE.SimplifyModifier();
	    
	    //simplified = modifier.modify( mergedGeometry, geometry.vertices.length * 0.25 | 0 )
	    var mesh = new THREE.Mesh(mergedGeometry, material);
	    //var mesh = new THREE.Mesh(simplified, material);
	    
	    group.add(mesh);
	}
	if(geometry){
	    var material = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors, transparent: true, color: color });
	    group.add(new THREE.LineSegments(geometry, material));
	}
	group.visible = visibility;
	this._registerGroup(key, group);

	/* delete morpology data */
	delete this.meshDict[key]['identifier'];
	delete this.meshDict[key]['x'];
	delete this.meshDict[key]['y'];
	delete this.meshDict[key]['z'];
	delete this.meshDict[key]['r'];
	delete this.meshDict[key]['parent'];
	delete this.meshDict[key]['sample'];
	delete this.meshDict[key]['type'];
    };
};

FFBOMesh3D.prototype._registerGroup = function(key, group) {

    /* create label for tooltip if not provided */
    group.name = this.meshDict[key].label;
    group.uid = key;

    group = new PropertyManager(group);
    this.meshDict[key]['object']  = group
    this.meshDict[key]['pinned']  = false;
    //group = this.meshDict[key]['object'];
    /*
    if ( !this.meshDict[key]['background'] ) {
        ++this.frontNum;
        for (var i=0; i < this.meshDict[key]['object'].children.length; i++)
            this.meshDict[key]['object'].children[i].material.depthTest = false;
    }
    */
    if(!('morph_type' in this.meshDict[key]) || (this.meshDict[key]['morph_type'] != 'Synapse SWC')){
	if ( this.default_opacity !== 1)
            for (var i=0; i < this.meshDict[key]['object'].children.length; i++)
		this.meshDict[key]['object'].children[i].material.opacity = this.default_opacity;    
    }
    else{
	if ( this.synapse_opacity !== 1)
            for (var i=0; i < this.meshDict[key]['object'].children.length; i++)
		this.meshDict[key]['object'].children[i].material.opacity = this.synapse_opacity;    
    }
	
    if ( !this.meshDict[key]['background'] ) {
	if(!('morph_type' in this.meshDict[key]) || (this.meshDict[key]['morph_type'] != 'Synapse SWC'))
	    ++this.frontNum;
	this.meshGroup.add( group );
    }
    else{
	this.backmeshGroup.add(group)
    }

}
FFBOMesh3D.prototype.initTimeliner = function() {
    this.timelinerJson = {};
    for (var key in this.meshDict)
        this.timelinerJson[key] = 0;
    this.timeliner = new Timeliner(this.timelinerJson);
    /*
     * load a dummy animation script
     */
    var dummyAnimJson = {
        "version":"1.2.0",
        "modified":"Mon Dec 08 2014 10:41:11 GMT+0800 (SGT)",
        "title":"Untitled",
        "ui": {"totalTime": 1},
        "layers":[]
    }
    for (var key in this.meshDict) {
        var dict = {"name": key, "values": [{"time":0.01, "value":0.55}], "_value":0, "_color":"#6ee167"};
        dummyAnimJson["layers"].push(dict);
    }
    this.timeliner.load(dummyAnimJson);
}

FFBOMesh3D.prototype.onDocumentMouseClick = function( event ) {
    if (event !== undefined)
        event.preventDefault();

    if (!this.controls.checkStateIsNone())
        return;

    this.raycaster.setFromCamera( this.mouse, this.camera );

    var intersects = this.raycaster.intersectObjects( this.meshGroup.children, true);
    if ( intersects.length > 0 ) {
        this.currentIntersected = intersects[0].object.parent;
        /* find first object that can be highlighted (skip  mesh) */
        for (var i = 1; i < intersects.length; i++ ) {
            var x = intersects[i].object.parent;
            if (this.meshDict[x.uid]['highlight']) {
                this.currentIntersected = x;
                break;
            }
        }
    }
    if (this.dispatch['click'] != undefined && this.currentIntersected != undefined ) {
        var x = this.currentIntersected;
        if (this.meshDict[x.uid]['highlight'])
            this.dispatch['click']([x.name, x.uid]);
    }
}

FFBOMesh3D.prototype.onDocumentMouseDBLClick = function( event ) {
    if (event !== undefined)
        event.preventDefault();

    if (this.currentIntersected != undefined ) {
        var x = this.currentIntersected;
        if (!this.meshDict[x.uid]['highlight'])
            return;
        this.togglePin(x.uid);
        if (this.dispatch['dblclick'] !== undefined )
            this.dispatch['dblclick'](x.uid, x.name, this.meshDict[x.uid]['pinned']);
    }
}

FFBOMesh3D.prototype.onDocumentMouseDBLClick2 = function( event ) {
    if (event !== undefined)
    event.preventDefault();
    this.raycaster.setFromCamera( this.mouse, this.camera );
    currInt = undefined;
    var intersects = this.raycaster.intersectObjects( this.meshGroup.children, true);
    if ( intersects.length > 0 ) {
    currInt = intersects[0].object.parent;
    /* find first object that can be highlighted (skip  mesh) */
    for (var i = 1; i < intersects.length; i++ ) {
        var x = intersects[i].object.parent;
        if (this.meshDict[x.uid]['highlight']) {
        currInt = x;
        break;
        }
    }
    }
    if (currInt != undefined ) {
    var x = currInt;
    if (!this.meshDict[x.uid]['highlight'])
        return;

    this.togglePin(x.uid);
    if (this.dispatch['dblclick'] !== undefined )
        this.dispatch['dblclick'](x.uid, x.name, this.meshDict[x.uid]['pinned']);
    }
}

FFBOMesh3D.prototype.onDocumentMouseMove = function( event ) {
    event.preventDefault();

    var rect = this.container.getBoundingClientRect();

    this.toolTipPos.x = event.clientX;
    this.toolTipPos.y = event.clientY;

    this.mouse.x = ( (event.clientX - rect.left) / this.container.clientWidth ) * 2 - 1;
    this.mouse.y = - ( (event.clientY - rect.top) / this.container.clientHeight ) * 2 + 1;

}

FFBOMesh3D.prototype.onDocumentMouseEnter = function( event ) {
    event.preventDefault();

    this.isMouseOver = true;
}

FFBOMesh3D.prototype.onDocumentMouseLeave = function( event ) {
    event.preventDefault();

    this.isMouseOver = false;

    this.hide3dToolTip();
    this.resume();
}
//
FFBOMesh3D.prototype.onWindowResize = function() {

    this.canvasRect = this.renderer.domElement.getBoundingClientRect();

    var height = this.container.clientHeight;
    var width = this.container.clientWidth;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( width, height );
    this.composer.setSize( width, height );
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

    if (this.isAnim) {
        for (var key in this.meshDict) {
            if (this.meshDict[key].object === undefined)
                continue;
            var x = this.meshDict[key].object.children;
            for (var i in x)
                x[i].material.opacity = this.animOpacity[key] || 0;
        }
    } else if (this.isHighlight) {

    } else {
        for (var key in this.meshDict) {
            if (this.meshDict[key].object != undefined) {
                var x = new Date().getTime();
                if ( this.meshDict[key]['background'] ) {
                    var obj = this.meshDict[key].object.children;
                    //for ( var i = 0; i < obj.length; ++i )
                    obj[0].material.opacity = this.background_opacity +  0.5*this.meshOscAmp*(1+Math.sin(x * .0005));
		    obj[1].material.opacity = this.background_wireframe_opacity;
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
    if (this.controls.checkStateIsNone()) {
        this.raycaster.setFromCamera( this.mouse, this.camera );

        var intersects = this.raycaster.intersectObjects( this.meshGroup.children, true);
        if ( intersects.length > 0 ) {
            this.currentIntersected = intersects[0].object.parent;
            /* find first object that can be highlighted (skip  mesh) */
            for (var i = 1; i < intersects.length; i++ ) {
                var x = intersects[i].object.parent;
                if (this.meshDict[x.uid]['highlight']) {
                    this.currentIntersected = x;
                    break;
                }
            }
            if ( this.currentIntersected !== undefined ) {
                this.show3dToolTip(this.currentIntersected.name);
                this.highlight(this.currentIntersected.uid);
            }
        } else {
            if ( this.currentIntersected !== undefined ) {
                this.hide3dToolTip();
                this.resume();
            }
            this.currentIntersected = undefined;
        }
    }

    this.composer.render();
    if(this._take_screenshot){
	this.renderer.domElement.toBlob(function(b){
	    _saveImage(b, "ffbo_screenshot.png")
	})
	this._take_screenshot = false;
    }
    //this.renderer.render( this.scene, this.camera );
}

FFBOMesh3D.prototype.showAll = function() {
    for (var key in this.meshDict)
        this.meshDict[key].object.visible = true;
    if(this.dispatch['showAll'] !== undefined)
	this.dispatch['showAll']();
};

FFBOMesh3D.prototype.hideAll = function() {
    for (var key in this.meshDict)
        if (!this.meshDict[key]['pinned'])
            this.meshDict[key].object.visible = false;
    if(this.dispatch['hideAll'] !== undefined)
	this.dispatch['hideAll']();
};

FFBOMesh3D.prototype.export_state = function() {

    state_metadata = {'color':{},'pin':{},'visible':{},'camera':{'position':{},'up':{}},'target':{}};
    state_metadata['camera']['position']['x'] = this.camera.position.x;
    state_metadata['camera']['position']['y'] = this.camera.position.y;
    state_metadata['camera']['position']['z'] = this.camera.position.z;

    state_metadata['camera']['up']['x'] = this.camera.up.x;
    state_metadata['camera']['up']['y'] = this.camera.up.y;
    state_metadata['camera']['up']['z'] = this.camera.up.z;

    state_metadata['target']['x'] = this.controls.target.x;
    state_metadata['target']['y'] = this.controls.target.y;
    state_metadata['target']['z'] = this.controls.target.z;

    state_metadata['pin'] = Array.from(this.pinned);

    for (var key in this.meshDict) {
    if (this.meshDict.hasOwnProperty(key)) {
        state_metadata['color'][key] = this.meshDict[key].object.children[0].material.color.toArray();
        state_metadata['visible'][key] = this.meshDict[key].object.visible;
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

    this.pin(state_metadata['pin'])

    for (var key in state_metadata['color']) {
    if (this.meshDict.hasOwnProperty(key)) {
        var meshobj = this.meshDict[key].object;
        var color = state_metadata['color'][key];
        for (var j = 0; j < meshobj.children.length; ++j ) {
        meshobj.children[j].material.color.fromArray( color );
        for(var k = 0; k < meshobj.children[j].geometry.colors.length; ++k){
            meshobj.children[j].geometry.colors[k].fromArray( color );
        }
        meshobj.children[j].geometry.colorsNeedUpdate = true;

        }
        meshobj.visible = state_metadata['visible'][key];
    }
    }


}

FFBOMesh3D.prototype.show = function(id) {

    id = this.asarray( id );

    for (var i = 0; i < id.length; ++i ) {
        if ( !(id[i] in this.meshDict ) )
            continue;
        this.meshDict[id[i]].object.visible = true;
        if (this.highlightedObj !== null && this.highlightedObj[0] == id[i])
            this.highlightedObj[1] = true;
    }
}

FFBOMesh3D.prototype.hide = function(id) {

    id = this.asarray( id );

    for (var i = 0; i < id.length; ++i ) {
        if ( !(id[i] in this.meshDict ) )
            continue;
        this.meshDict[id[i]].object.visible = false;
        if (this.highlightedObj !== null && this.highlightedObj[0] == id[i])
            this.highlightedObj[1] = false;
    }
}

FFBOMesh3D.prototype.toggleVis = function(key) {
    if (key in this.meshDict)
        this.meshDict[key].object.visible = !this.meshDict[key].object.visible;
}

FFBOMesh3D.prototype.highlight = function(d) {

    if (!this._metadata.allowHighlight)
        return;
    if (!(d in this.meshDict) || !(this.meshDict[d]['highlight']))
        return;
    if (this.highlightedObj !== null  && d !== this.highlightedObj[0])
        this.resume();

    this.renderer.domElement.style.cursor = "pointer";
    this.highlightedObj = [d, this.meshDict[d].object.visible];
    if ( this._metadata.highlightMode === "rest" ) {
        for (var key in this.meshDict) {
            //if (this.meshDict[key]['pinned'])
            //    continue;
            // TODO:
            var val = (this.meshDict[key]['highlight']) ? this.low_opacity : this.non_highlightable_opacity;
	    depthTest = true;
            if (this.meshDict[key]['pinned']){
                val = this.pin_opacity;
		depthTest = false
	    }
            for (i in this.meshDict[key].object.children){
                this.meshDict[key].object.children[i].material.opacity = val;
		this.meshDict[key].object.children[i].material.depthTest = depthTest;
	    }
        }
    }
    for (i in this.meshDict[d].object.children){
        this.meshDict[d].object.children[i].material.opacity = this.highlighted_object_opacity;
        this.meshDict[d].object.children[i].material.depthTest = false;
    }
    this.meshDict[d].object.visible = true;
    this.isHighlight = true;
}

FFBOMesh3D.prototype.resume = function() {

    if (this.pinned.size === 0){
        this.resetOpacity();
	return;
    }
    for( var key in this.meshDict ){
	if (!this.meshDict[key]['background']){
	    val = this.meshDict[key]['pinned'] ? this.pin_opacity : this.pin_low_opacity;
	    depthTest = this.meshDict[key]['pinned'] ? false : true;
	    for (i in this.meshDict[key].object.children){
		this.meshDict[key].object.children[i].material.opacity = val;
		this.meshDict[key].object.children[i].material.depthTest = depthTest;
	    }
	}
	else{
	    //for (i in this.meshDict[key].object.children)
	    this.meshDict[key].object.children[0].material.opacity = this.background_opacity;
	    this.meshDict[key].object.children[1].material.opacity = this.background_wireframe_opacity;
	}
    }
    if (!this._metadata.allowHighlight)
        return;
    if (this.highlightedObj === null)
        return;

    var d = this.highlightedObj[0];
    var x = this.meshDict[d].object.children;
    var val;
    if (!this.meshDict[d]['pinned']) {
        this.meshDict[d].object.visible = this.highlightedObj[1];
        this.highlightedObj = null;
        val = ( this._metadata.highlightMode === "rest") ? this.pin_low_opacity : this.default_opacity;
    } else
        val = ( this._metadata.highlightMode === "rest") ? this.pin_opacity : this.default_opacity;
    for (i in x)
        x[i].material.opacity = val;
    this.isHighlight = false;
    this.renderer.domElement.style.cursor = "auto";
}


FFBOMesh3D.prototype.resetOpacity = function() {
    var val = this.default_opacity;
    //if (this.pinnedNum > 0)
    //    val = 0.2;
    //reset
    for (var key in this.meshDict) {
        //if (!this.meshDict[key]['highlight'])
        //    continue;
        //var op = (this.meshDict[key]['pinned']) ? 0.6 : val;
	if (!this.meshDict[key]['background']){
	    if(!('morph_type' in this.meshDict[key]) || (this.meshDict[key]['morph_type'] != 'Synapse SWC'))
		for (i in this.meshDict[key].object.children)
		    this.meshDict[key].object.children[i].material.opacity = this.default_opacity;
	    else
		for (i in this.meshDict[key].object.children)
		    this.meshDict[key].object.children[i].material.opacity = this.synapse_opacity;
	}
	else{
	    //for (i in this.meshDict[key].object.children)
	    this.meshDict[key].object.children[0].material.opacity = this.background_opacity;
	    this.meshDict[key].object.children[1].material.opacity = this.background_wireframe_opacity;
	}

    }
}

FFBOMesh3D.prototype.asarray = function( variable ) {
    if (variable.constructor !== Array )
        variable = [variable];
    return variable;
}

FFBOMesh3D.prototype.pin = function( id ) {

    id = this.asarray( id );

    for (var i = 0; i < id.length; ++i ) {
        if ( !(id[i] in this.meshDict ) || this.meshDict[id[i]]['pinned'] )
            continue;
        this.meshDict[id[i]]['pinned'] = true;
        this.pinned.add(id[i])
    }
}

FFBOMesh3D.prototype.unpin = function( id ) {

    id = this.asarray( id );

    for (var i = 0; i < id.length; ++i ) {
        if ( !(id[i] in this.meshDict ) || !this.meshDict[id[i]]['pinned'] )
            continue;
        this.meshDict[id[i]]['pinned'] = false;
        this.pinned.delete(id[i])
    }
    if (this.pinned.size == 0)
        this.resetOpacity();
}

FFBOMesh3D.prototype.remove = function( id ) {
    
    id = this.asarray( id );
    
    for (var i = 0; i < id.length; ++i ) {
        if ( !(id[i] in this.meshDict ) )
            continue;
        var meshobj = this.meshDict[id[i]].object;
        for (var j = 0; j < meshobj.children.length; ++j ) {
            meshobj.children[j].geometry.dispose();
            meshobj.children[j].material.dispose();
        }
        --this.meshNum;
        if ( !this.meshDict[id[i]]['background'] ) {
            if(!('morph_type' in this.meshDict[id[i]]) || (this.meshDict[id[i]]['morph_type'] != 'Synapse SWC'))
		--this.frontNum;
        }
        this.meshGroup.remove( meshobj );
        delete meshobj;
        delete this.meshDict[id[i]];
	
        if (this.highlightedObj !== null && this.highlightedObj[0] === id[i])
            this.highlightedObj = null;
        if (this.pinned.has(id[i]))
            this.pinned.delete(id[i])
    }
    if (this.pinned.size == 0)
        this.resetOpacity();
}

FFBOMesh3D.prototype.setColor = function( id, color ) {

    id = this.asarray( id );

    for (var i = 0; i < id.length; ++i ) {
        if ( !(id[i] in this.meshDict ) )
            continue;
        var meshobj = this.meshDict[id[i]].object;
        for (var j = 0; j < meshobj.children.length; ++j ) {
            meshobj.children[j].material.color.set( color );
            meshobj.children[j].geometry.colorsNeedUpdate = true;
            for(var k = 0; k < meshobj.children[j].geometry.colors.length; ++k){
            meshobj.children[j].geometry.colors[k].set( color );
            }
        }
	this.meshDict[id[i]].color = new THREE.Color(color);
    }
    
}

FFBOMesh3D.prototype.setBackgroundColor = function( color ) {

    for (var i = 0; i < this.backmeshGroup.children.length; ++i ) {
        var meshobj = this.backmeshGroup.children[i]
        for (var j = 0; j < meshobj.children.length; ++j ) {
            meshobj.children[j].material.color.set( color );
            meshobj.children[j].geometry.colorsNeedUpdate = true;
            for(var k = 0; k < meshobj.children[j].geometry.colors.length; ++k){
		meshobj.children[j].geometry.colors[k].set( color );
            }
        }
    }
}

FFBOMesh3D.prototype.resetView = function() {
    this.controls.target0.x = 0.5*(this.boundingBox.minX + this.boundingBox.maxX );
    this.controls.target0.y = 0.5*(this.boundingBox.minY + this.boundingBox.maxY );
    this.controls.reset();
}

FFBOMesh3D.prototype.resetVisibleView = function() {
    this.computeVisibleBoundingBox();
    this.controls.target.x = 0.5*(this.visibleBoundingBox.minX + this.visibleBoundingBox.maxX );
    this.controls.target.y = 0.5*(this.visibleBoundingBox.minY + this.visibleBoundingBox.maxY );
    //this.controls.reset();
}

FFBOMesh3D.prototype.togglePin = function( id ) {

    if (!this._metadata.allowPin)
        return;
    this.meshDict[id]['pinned'] = !this.meshDict[id]['pinned'];
    if (this.meshDict[id]['pinned']) {
        this.pinned.add(id)
    } else {
        this.pinned.delete(id)
    }

    if (this.pinned.size == 0)
        this.resetOpacity();
}

FFBOMesh3D.prototype.unpinAll = function() {

    if (!this._metadata.allowPin)
        return;
    for (var key of this.pinned)
        this.meshDict[key]['pinned'] = false;
    this.pinned.clear();
    this.resetOpacity();
}


FFBOMesh3D.prototype.createInfoPanel = function() {
    this.infoDiv = document.createElement('div');
    this.infoDiv.style.cssText = 'position: absolute; text-align: left; height: 15px; top: 6px; right: 5px; font: 12px sans-serif; z-index: 999; padding-right: 5px; padding-left: 5px; border-right: 1px solid #888; border-left: 1px solid #888;pointer-events: none;  color: #aaa; background: transparent; -webkit-transition: left .5s; transition: left .5s; font-weight: 100';
    this.container.appendChild(this.infoDiv);
}

FFBOMesh3D.prototype.createUIBtn = function(name, icon, tooltip){
    this.UIBtns[name] = document.createElement('a');
    this.UIBtns[name].style.cssText = 'position: absolute; text-align: right; height: 15px; top: 25px; right: ' + this._uibtnright + 'px; font: 15px arial; z-index: 999; border: 0px; none; color: #aaa; background: transparent; -webkit-transition: left .5s; transition: left .5s; cursor: pointer';
    this.UIBtns[name].innerHTML = "<i class='fa " + icon + "' aria-hidden='true'></i>";
    this.dispatch[name] = undefined;
    this.UIBtns[name].addEventListener("click", (function(){this.dispatch[name]()}).bind(this));
    this.UIBtns[name].addEventListener("mouseover", (function() {
        this.UIBtns[name].style.color = "#fff";
        this.show3dToolTip(tooltip);
    }).bind(this));
    this.UIBtns[name].addEventListener("mouseleave", (function() {
        this.UIBtns[name].style.color = "#aaa";
        this.hide3dToolTip();
    }).bind(this));
    this.container.appendChild(this.UIBtns[name]);
    this._uibtnright += 20;
}

FFBOMesh3D.prototype.updateInfoPanel = function() {
    this.infoDiv.innerHTML = "Number of Neurons: " + this.frontNum;
}

FFBOMesh3D.prototype.createToolTip = function() {
    this.toolTipDiv = document.createElement('div');
    this.toolTipDiv.style.cssText = 'position: fixed; text-align: center; width: auto; min-width: 100px; height: auto; padding: 2px; font: 12px arial; z-index: 999; background: #ccc; border: solid #212121 3px; border-radius: 8px; pointer-events: none; opacity: 0.0; color: #212121';
    this.toolTipDiv.style.transition = "opacity 0.5s";
    document.body.appendChild(this.toolTipDiv);
}

FFBOMesh3D.prototype.show3dToolTip = function (d) {
    this.toolTipDiv.innerHTML = this.dispatch.getInfo(d);
    this.toolTipDiv.style.opacity = .9;

    this.domRect = this.renderer.domElement.getBoundingClientRect();
    var toolTipRect = this.toolTipDiv.getBoundingClientRect();

    var left = this.toolTipPos.x + 10;
    if (left + toolTipRect.width > this.domRect.right )
        left = this.domRect.right - 10 - toolTipRect.width;
    var top = this.toolTipPos.y + 10;
    if (top + toolTipRect.height > this.domRect.bottom )
        top = this.toolTipPos.y - 10 - toolTipRect.height;
    this.toolTipDiv.style.left = left + "px";
    this.toolTipDiv.style.top =  top + "px";
}

FFBOMesh3D.prototype.hide3dToolTip = function () {
    this.toolTipDiv.style.opacity = 0.0;
    //console.log("hide tool tip");
}

FFBOMesh3D.prototype._getInfo = function (d) {
    return d;
}

FFBOMesh3D.prototype.getNeuronScreenPosition = function (id) {

    var vector = this.meshDict[id].position.clone()
    this.canvasRect = this.renderer.domElement.getBoundingClientRect();

    // map to normalized device coordinate (NDC) space
    vector.project( this.camera );

    // map to 2D screen space
    vector.x = Math.round( (   vector.x + 1 ) * this.canvasRect.width  / 2 ) + this.canvasRect.left;
    vector.y = Math.round( ( - vector.y + 1 ) * this.canvasRect.height / 2 ) + this.canvasRect.top;

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
[ 0.000000, '0xff0028' ], [ 0.031250, '0xff0100' ], [ 0.062500, '0xff2c00' ],
[ 0.093750, '0xff5700' ], [ 0.125000, '0xff8200' ], [ 0.156250, '0xffae00' ],
[ 0.187500, '0xffd900' ], [ 0.218750, '0xf9ff00' ], [ 0.250000, '0xceff00' ],
[ 0.281250, '0xa3ff00' ], [ 0.312500, '0x78ff00' ], [ 0.343750, '0x4dff00' ],
[ 0.375000, '0x22ff00' ], [ 0.406250, '0x00ff08' ], [ 0.437500, '0x00ff33' ],
[ 0.468750, '0x00ff5e' ], [ 0.500000, '0x00ff89' ], [ 0.531250, '0x00ffb3' ],
[ 0.562500, '0x00ffde' ], [ 0.593750, '0x00f4ff' ], [ 0.625000, '0x00c8ff' ],
[ 0.656250, '0x009dff' ], [ 0.687500, '0x0072ff' ], [ 0.718750, '0x0047ff' ],
[ 0.750000, '0x001bff' ], [ 0.781250, '0x0f00ff' ], [ 0.812500, '0x3a00ff' ],
[ 0.843750, '0x6600ff' ], [ 0.875000, '0x9100ff' ], [ 0.906250, '0xbc00ff' ],
[ 0.937500, '0xe800ff' ], [ 0.968750, '0xff00ea' ], [ 1.000000, '0xff00bf' ],
]);


THREE.Lut.prototype.addColorMap( 'no_purple', [
    [0.000000, '0xFF4000'],
    [0.017544, '0xFF4D00'],
    [0.035088, '0xFF5900'],
    [0.052632, '0xFF6600'],
    [0.070175, '0xFF7300'],
    [0.087719, '0xFF8000'],
    [0.105263, '0xFF8C00'],
    [0.122807, '0xFF9900'],
    [0.140351, '0xFFA600'],
    [0.157895, '0xFFB300'],
    [0.175439, '0xFFBF00'],
    [0.192982, '0xFFCC00'],
    [0.210526, '0xFFD900'],
    [0.228070, '0xFFE500'],
    [0.245614, '0xFFF200'],
    [0.263158, '0xFFFF00'],
    [0.280702, '0xF2FF00'],
    [0.298246, '0xE6FF00'],
    [0.315789, '0xD9FF00'],
    [0.333333, '0xCCFF00'],
    [0.350877, '0xBFFF00'],
    [0.368421, '0xB3FF00'],
    [0.385965, '0xAAFF00'],
    [0.403509, '0x8CFF00'],
    [0.421053, '0x6EFF00'],
    [0.438596, '0x51FF00'],
    [0.456140, '0x33FF00'],
    [0.473684, '0x15FF00'],
    [0.491228, '0x00FF08'],
    [0.508772, '0x00FF26'],
    [0.526316, '0x00FF44'],
    [0.543860, '0x00FF55'],
    [0.561404, '0x00FF62'],
    [0.578947, '0x00FF6F'],
    [0.596491, '0x00FF7B'],
    [0.614035, '0x00FF88'],
    [0.631579, '0x00FF95'],
    [0.649123, '0x00FFA2'],
    [0.666667, '0x00FFAE'],
    [0.684211, '0x00FFBB'],
    [0.701754, '0x00FFC8'],
    [0.719298, '0x00FFD4'],
    [0.736842, '0x00FFE1'],
    [0.754386, '0x00FFEE'],
    [0.771930, '0x00FFFB'],
    [0.789474, '0x00F7FF'],
    [0.807018, '0x00EAFF'],
    [0.824561, '0x00DDFF'],
    [0.842105, '0x00D0FF'],
    [0.859649, '0x00C3FF'],
    [0.877193, '0x00B7FF'],
    [0.894737, '0x00AAFF'],
    [0.912281, '0x009DFF'],
    [0.929825, '0x0091FF'],
    [0.947368, '0x0084FF'],
    [0.964912, '0x0077FF'],
    [0.982456, '0x006AFF'],
    [1.000000, '0x005EFF'],
]);
