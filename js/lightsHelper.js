function guidGenerator() {
    var S4 = function() {
	return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function getProperty(properties, propertyName, def){
    if(propertyName in properties)
	return properties[propertyName]
    else
	return def
    
}

function FFBOLightsHelper(ffbomesh) {
    lh = new PropertyManager(this);

    lh.ffbomesh = ffbomesh;
    
    lh.on('change', function(e){
	light = this[e['path'][0]];
	if(e['value']){
	    light.intensity = light._intensity
	}
	else{
	    light._intensity = light.intensity;
            light.intensity = 0;
	}
    }.bind(lh), 'enabled')

    lh._updatePause = false;
    lh.ffbomesh.controls.addEventListener("change", function(){
	if(this._updatePause)
	    return;
	this._updatePause = true;
	setTimeout(function(){
	    for( k in this )
		if(this[k].type == "SpotLight")
		    if( this[k].track )
			this._updateSpotLight( this[k] );
	    this._updatePause = false;
	}.bind(this), 20);
    }.bind(lh));
    return lh
}



FFBOLightsHelper.prototype.addAmbientLight = function(properties){
    if(properties == undefined)
	properties = {};
    sceneMap = {'back': this.ffbomesh.backscene,
		'front': this.ffbomesh.scene}	       
    scene = sceneMap[getProperty(properties, 'scene', 'front')];
    color = getProperty(properties, 'color', 0xffffff)
    intensity = getProperty(properties, 'intensity', 1.0)
    
    key = getProperty(properties, 'key', guidGenerator())
    this[key] = new PropertyManager(new THREE.AmbientLight(color, intensity));
    this[key]._intensity = intensity
    this[key].enabled = true;
    scene.add(this[key])
    return this[key]
}

FFBOLightsHelper.prototype.addDirectionalLight = function(properties){
    if(properties == undefined)
	properties = {};
    sceneMap = {'back': this.ffbomesh.backscene,
		'front': this.ffbomesh.scene}	       
    scene = sceneMap[getProperty(properties, 'scene', 'front')];
    color = getProperty(properties, 'color', 0xffffff)
    intensity = getProperty(properties, 'intensity', 1.0)
    position = getProperty(properties, 'position', new THREE.Vector3(0,0,1000))
    target = getProperty(properties, 'target', new THREE.Vector3(0,0,0))
    
    key = getProperty(properties, 'key', guidGenerator())
    this[key] = new PropertyManager(new THREE.DirectionalLight(color, intensity));
    this[key].position.copy(position)
    this[key].target.position.copy(target)
    scene.add(this[key])
    scene.add(this[key].target)
    return this[key]
}

FFBOLightsHelper.prototype._updateSpotLight = function(light){
    position = this.ffbomesh.camera.position.clone();
    target = this.ffbomesh.controls.target.clone();
    position.sub(target);
    dir = position.clone().normalize();

    mul = light.posAngle1 < 0 ?  -1 : 1;
    position.applyAxisAngle(this.ffbomesh.camera.up.clone(), light.posAngle1  * (Math.PI / 180));
    position.applyAxisAngle(dir, mul * light.posAngle2  * (Math.PI / 180));
    distance = position.length() * light.distanceFactor;
    position.add(target);

    light.position.copy(position);
    light.target.position.copy(target);
    light.distance = distance;
}


FFBOLightsHelper.prototype.addSpotLight = function(properties){
    if(properties == undefined)
	properties = {};
    sceneMap = {'back': this.ffbomesh.backscene,
		'front': this.ffbomesh.scene}	       
    scene = sceneMap[getProperty(properties, 'scene', 'front')];
    color = getProperty(properties, 'color', 0xffffff)
    intensity = getProperty(properties, 'intensity', 4.0)
    angle = getProperty(properties, 'angle', 1.04)
    decay = getProperty(properties, 'decay', 2.0)
    distanceFactor = getProperty(properties, 'distanceFactor', 2.0 )
    posAngle1 = getProperty(properties, 'posAngle1', 80)
    posAngle2 = getProperty(properties, 'posAngle2', 80)
    track = getProperty(properties, 'track', true)
    
    key = getProperty(properties, 'key', guidGenerator())
    this[key] = new PropertyManager(new THREE.SpotLight(color, intensity));
    this[key].angle = angle;
    this[key].decay = decay;
    this[key].enabled = true;
	
    this[key].distanceFactor = distanceFactor;
    this[key].posAngle1 = posAngle1;
    this[key].posAngle2 = posAngle2;
    
    this[key].on("change", function(e){
	this._updateSpotLight(e.obj);
    }.bind(this), ["posAngle1", "posAngle2", "distanceFactor"])
    this._updateSpotLight(this[key])
    
	
    scene.add(this[key])
    scene.add(this[key].target)
    this[key].track = track;
    return this[key];
}




