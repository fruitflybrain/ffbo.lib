// Adapted from https://stackoverflow.com/a/30538574
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

moduleExporter("FFBOLightsHelper", ["three", "propertymanager"], function(THREE, PropertyManager){

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

  function FFBOLightsHelper(camera, controls, scene) {
    lh = new PropertyManager(this);

    lh.camera = camera;
    lh.controls = controls;
    lh.scene = scene;

    lh.on('change', function(e){
      light = this[e['path'][0]];
      if(e['value']){
        light.object.intensity = light._intensity
      }
      else{
        light._intensity = light.object.intensity;
        light.object.intensity = 0;
      }
    }.bind(lh), 'enabled')

    lh._updatePause = false;
    lh.controls.addEventListener("change", function(){
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
    scene = getProperty(properties, 'scene', this.scene);
    color = getProperty(properties, 'color', 0xffffff)
    intensity = getProperty(properties, 'intensity', 1.0)

    key = getProperty(properties, 'key', guidGenerator())
    this[key] = new PropertyManager({object: new THREE.AmbientLight(color, intensity)});
    this[key]._intensity = intensity
    this[key].enabled = true;
    scene.add(this[key].object)
    return this[key]
  }

  FFBOLightsHelper.prototype.addDirectionalLight = function(properties){
    if(properties == undefined)
      properties = {};
    scene = getProperty(properties, 'scene', this.scene);
    color = getProperty(properties, 'color', 0xffffff)
    intensity = getProperty(properties, 'intensity', 1.0)
    position = getProperty(properties, 'position', new THREE.Vector3(0,0,1000))
    target = getProperty(properties, 'target', new THREE.Vector3(0,0,0))

    key = getProperty(properties, 'key', guidGenerator())
    this[key] = new PropertyManager({object: new THREE.DirectionalLight(color, intensity)});
    this[key].object.position.copy(position)
    this[key].object.target.position.copy(target)

    this[key].enabled = true;
    scene.add(this[key].object)
    scene.add(this[key].object.target)
    return this[key]
  }

  FFBOLightsHelper.prototype._updateSpotLight = function(light){
    position = this.camera.position.clone();
    target = this.controls.target.clone();
    position.sub(target);
    dir = position.clone().normalize();

    mul = light.posAngle1 < 0 ?  -1 : 1;
    position.applyAxisAngle(this.camera.up.clone(), light.posAngle1  * (Math.PI / 180));
    position.applyAxisAngle(dir, mul * light.posAngle2  * (Math.PI / 180));
    distance = position.length() * light.distanceFactor;
    position.add(target);

    light.object.position.copy(position);
    light.object.target.position.copy(target);
    light.object.distance = distance;
  }


  FFBOLightsHelper.prototype.addSpotLight = function(properties){
    if(properties == undefined)
      properties = {};
    scene = getProperty(properties, 'scene', this.scene);
    color = getProperty(properties, 'color', 0xffffff)
    intensity = getProperty(properties, 'intensity', 4.0)
    angle = getProperty(properties, 'angle', 1.04)
    decay = getProperty(properties, 'decay', 2.0)
    distanceFactor = getProperty(properties, 'distanceFactor', 2.0 )
    posAngle1 = getProperty(properties, 'posAngle1', 80)
    posAngle2 = getProperty(properties, 'posAngle2', 80)
    track = getProperty(properties, 'track', true)

    key = getProperty(properties, 'key', guidGenerator())
    this[key] = new PropertyManager({object: new THREE.SpotLight(color, intensity)});
    this[key].object.angle = angle;
    this[key].object.decay = decay;

    this[key].enabled = true;
    this[key].distanceFactor = distanceFactor;
    this[key].posAngle1 = posAngle1;
    this[key].posAngle2 = posAngle2;

    this[key].on("change", function(e){
      this._updateSpotLight(e.obj);
    }.bind(this), ["posAngle1", "posAngle2", "distanceFactor"])
    this._updateSpotLight(this[key])


    scene.add(this[key].object)
    scene.add(this[key].object.target)
    this[key].track = track;
    return this[key];
  }

  return FFBOLightsHelper;
});
