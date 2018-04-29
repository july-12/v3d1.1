console.log('TODO: Runtime lightmap generation (+AO merge). Light baking, mix/matching on change.');
console.log('TODO: Dxt3 compression on publish, https://github.com/Makio64/img2dds', 'more https://www.fsdeveloper.com/wiki/index.php?title=DXT_compression_explained');

V3d.Library.Asset = Cik.Utils.Redefine(V3d.Library.Asset, function(instanceProperties){
    return function(sov, object){
        instanceProperties.constructor.call(this, sov, object);
        this.Parse();
    }
});

Object.assign(V3d.Library.Asset.prototype, {

    Smart: function(){
        if(V3d.Library.Asset.controlGroup === undefined) V3d.Library.Asset.controlGroup = new V3f.ControlGroup();

        var scope = this;
        if(this.smart === undefined) {
            this.smart = new V3f.Smart.Asset(this, this.sov.ToString());
            this.smart.onFocusLost.push(function(){
                V3d.Library.Asset.controlGroup.Detach();
            });
            this.smart.onFocus.push(function(){
                V3d.Library.Asset.controlGroup.Attach(scope.view);
            });
        }
        this.smart.Show();
    },

    GetSmartParams: function(){
        // (folderName, target, guiChanged, ...args)

        var folderName = 'Asset';
        var target = this;
        var guiChanged = this.OnGuiChanged;
        var track = ['Smart'];

        return [folderName, target, guiChanged].concat(track);
    },

    Parse: function(){
        
        var scope = this;

        this.view.traverse(function(child){
            child.asset = scope;

            if(child instanceof THREE.Mesh){
                var material = child.material;
                scope.ParseMaterial(material);
            }
        });
    },

    ParseMaterial: function(material){

        this.materials = [];
        this.textures = [];
        
        if(V3d.Library.Asset.materials[material.uuid] === undefined)
            V3d.Library.Asset.materials[material.uuid] = material;
        
        this.materials.push(material);

        var properties = Object.values(material);
        properties.forEach(property => {
            if(property instanceof THREE.Texture){
                var texture = property;
                this.textures.push(texture);
            }
        });
    },

    toJSON: function(){

        var cleanView = this.view.clone(true);
        cleanView.traverse(function(child){
            if(child instanceof THREE.Mesh){
                child.material = child.material.clone();
                var keys = Object.keys(child.material);
                keys.forEach(key => {
                    var property = child.material[key];
                    if(property instanceof THREE.Texture){
                        child.material[key] = property.clone();
                    }
                });
            }
        });

        V3d.Library.Asset.StripTextures(cleanView);
        return {
            sov: this.sov,
            view: cleanView.toJSON()
        };
    }
});

Object.assign(V3d.Library.Asset, {

    materials: {},

    controlGroup: undefined,

    DUMMY_TEX: (function(){
        return new THREE.TextureLoader().load("data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAABkAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAgICAgICAgICAgIDAwMDAwMDAwMDAQEBAQEBAQIBAQICAgECAgMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwP/wAARCAACAAIDAREAAhEBAxEB/8QASgABAAAAAAAAAAAAAAAAAAAACwEBAAAAAAAAAAAAAAAAAAAAABABAAAAAAAAAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AP/B//9k=");
    })(),

    ImageCheck: function(str){
        str = str.toLowerCase();
        return str.indexOf('png') !== -1 || str.indexOf('jpg') !== -1 || str.indexOf('jpeg') !== -1;
    },

    StripTextures: function(object3d){
        if(this.texImages === undefined){
            this.texImages = {};
        }
        var texImages = this.texImages;
        var dummyImage = this.DUMMY_TEX.image;
        var dummyPrefix = this.DUMMY_PREFIX;

        object3d.traverse(function(child){
            if(child instanceof THREE.Mesh){
                var material = child.material;
                var properties = Object.values(material);
                properties.forEach(property => {
                    if(property instanceof THREE.Texture){
                        var texture = property;
                        if(texture.image){
                            var dummify = (texture.uuid.toString().indexOf(dummyPrefix) === -1) && V3d.Library.Asset.ImageCheck(texture.name);
                            if(dummify){
                                var id = texture.name;
                                if(texImages[id] === undefined){
                                    texImages[id] = texture.image;
                                    console.log(id);
                                }

                                texture.image = dummyImage;
                                texture.uuid = dummyPrefix + texture.uuid;
                            }
                        }
                    }
                });
            }
        });
    },
});