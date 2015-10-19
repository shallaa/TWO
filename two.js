/**
 * Created by shallaa on 2015. 10. 18..
 */
var TWO = (function() {
  'use strict';

  var TWO = {};
  var uuid = 0;
  var twoClasses = {};
  var properties = {};

  var define = function define(key, value) {
    TWO[key] = value;
  };

  var $ = function $() {
    var prop = properties[this] || (properties[this] = {});
    var index = 0, count = arguments.length;
    var key, value;

    while(index < count) {
      key = arguments[index++];

      if(index === count) {
        return prop[key];
      }

      value = arguments[index++];

      if(value === null) {
        delete prop[key];
      } else {
        prop[key] = value;
      }
    }

    return value;
  };

  var getProgram = function getProgram(gl) {
    var program = gl.createProgram();

    var shaderSource = '' +
      'uniform vec2 uResolution;' +
      'attribute vec2 aVertexPosition;' +
      'attribute vec3 aRotation;' +
      'attribute vec3 aScale;' +
      'attribute vec3 aColor;' +
      'varying vec3 vColor;' +
      'mat4 scaleMTX( vec3 t ){' +
      '    return mat4( t[0],    0,    0, 0,' +
      '                    0, t[1],    0, 0,' +
      '                    0,    0, t[2], 0,' +
      '                    0,    0,    0, 1 );' +
      '}' +
      'mat4 rotationMTX( vec3 t ){' +
      '    float s = sin(t[0]);' +
      '    float c = cos(t[0]);' +
      '    mat4 m1 = mat4( 1, 0,  0, 0, ' +
      '                    0, c, -s, 0, ' +
      '                    0, s,  c, 0, ' +
      '                    0, 0,  0, 1 );' +
      '    s = sin(t[1]);' +
      '    c = cos(t[1]);' +
      '    mat4 m2 = mat4(  c, 0, s, 0, ' +
      '                     0, 1, 0, 0, ' +
      '                    -s, 0, c, 0, ' +
      '                     0, 0, 0, 1 );' +
      '    s = sin(t[2]);' +
      '    c = cos(t[2]);' +
      '    mat4 m3 = mat4( c, -s, 0, 0, ' +
      '                    s,  c, 0, 0, ' +
      '                    0,  0, 1, 0, ' +
      '                    0,  0, 0, 1 );' +
      '    return m3 * m2 * m1;' +
      '}' +
      'void main(void){' +
      '    vec2 clipSpace = ((aVertexPosition / uResolution) * 2.0) - 1.0;' +
      '    gl_Position = scaleMTX(aScale) * rotationMTX(aRotation) * vec4(clipSpace * vec2(1, -1), 0, 1.0);' +
      '    vColor = aColor;' +
      '}';

    var shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('Error compiling shader: ' + gl.getShaderInfoLog(shader));
    }

    gl.attachShader(program, shader);

    shaderSource = '' +
      'precision mediump float;' +
      'varying vec3 vColor;' +
      'void main(void){' +
      '    gl_FragColor = vec4( vColor, 1.0 );' +
      '}';

    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('Error compiling shader: ' + gl.getShaderInfoLog(shader));
    }

    gl.attachShader(program, shader);

    gl.linkProgram(program);

    if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      alert('Error link program');
    }

    gl.useProgram(program);

    program.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
    program.aRotation       = gl.getAttribLocation(program, 'aRotation');
    program.aScale          = gl.getAttribLocation(program, 'aScale');
    program.aColor          = gl.getAttribLocation(program, 'aColor');
    program.uResolution     = gl.getUniformLocation(program, 'uResolution');

    gl.enableVertexAttribArray(program.aVertexPosition);
    gl.enableVertexAttribArray(program.aRotation);
    gl.enableVertexAttribArray(program.aScale);
    gl.enableVertexAttribArray(program.aColor);

    return program;
  };

  define('extend', function extend(properties) {
    return twoClasses[properties.name] = (function makeClass(name, attributes, initialize, methods) {
      var cls, fn, attr, attrGet, attrSet, k;

      fn = (cls = function cls() {
        Object.defineProperty(this, 'uuid', {value: 'TWO' + (uuid++)});
        initialize.apply(this, Array.prototype.slice.call(arguments));
      }).prototype;

      for(k in methods){
        if(methods.hasOwnProperty(k)) {
          Object.defineProperty(fn, k, {value: methods[k]});
        }
      }

      for(k in attributes) {
        attr = {};
        attrGet = attributes[k].get;
        attrSet = attributes[k].set;

        if(attrGet) {
          attr.get = attrGet;
        }

        if(attrSet) {
          attr.set = attrSet;
        }

        Object.defineProperty(fn, k, attr);
      }

      fn.toString = function toString() {
        return this.uuid;
      };

      fn.$ = $;

      Object.freeze(cls);

      return cls;
    })(properties.name, properties.attributes, properties.initialize, properties.methods);
  });

  define('require', function require(context) {
    var k;
    if(!context) context = {};
    for(k in twoClasses) if(twoClasses.hasOwnProperty(k)) context[k] = twoClasses[k];
    return context;
  });

  TWO.extend({
    name: 'World',

    attributes: {
      'width': {
        get: function getWidth() {
          return this.$('width');
        }
      },
      'height': {
        get: function getHeight() {
          return this.$('height');
        }
      },
      'backgroundColor': {
        get: function getBackgroundColor() {
          return this.$('clearColor');
        },
        set: function setBackgroundColor(backgroundColor) {
          this.$('clearColor', backgroundColor);
        }
      }
    },

    initialize: function(canvas) {
      var gl;
      var program;

      this.$(
        'canvas', canvas,
        'width', canvas.width,
        'height', canvas.height,
        'gl', (function() {
          ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'].some(function(k){
            return gl = canvas.getContext(k);
          });
          return gl;
        })()
      );

      if(gl) {
        this.$(
          'program', program = getProgram(gl),
          'index', 0,

          'vertexBufferData', [],
          'indexBufferData', [],
          'rotationBufferData', [],
          'scaleBufferData', [],
          'colorBufferData', [],

          'vertexBuffer', gl.createBuffer(),
          'indexBuffer', gl.createBuffer(),
          'rotationBuffer', gl.createBuffer(),
          'scaleBuffer', gl.createBuffer(),
          'colorBuffer', gl.createBuffer(),

          'clearColor', {r: 0, g: 0, b: 0, a: 1},

          'needVertexUpdate', false,
          'needIndexUpdate', false,
          'needRotationUpdate', false,
          'needScaleUpdate', false,
          'needColorUpdate', false,
          'needViewportUpdate', false,
          'needClearColorUpdate', true,

          'children', []
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this.$('vertexBuffer'));
        gl.vertexAttribPointer(program.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.$('rotationBuffer'));
        gl.vertexAttribPointer(program.aRotation, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.$('scaleBuffer'));
        gl.vertexAttribPointer(program.aScale, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.$('colorBuffer'));
        gl.vertexAttribPointer(program.aColor, 3, gl.FLOAT, false, 0, 0);

        gl.uniform2f(program.uResolution, this.$('width'), this.$('height'));
      } else {
        alert('WebGL을 지원하지 않는 브라우저!!');
      }
    },

    methods: {
      viewport: function viewport(width, height) {
        if(this.$('width') != width || this.$('height') != height) {
          this.$(
            'width', width,
            'height', height,
            'needViewportUpdate', true
          )
        }
      },
      add: function add(mesh) {
        var index = this.$('index');

        mesh.$('childIndex', index);

        this.$('vertexBufferData', this.$('vertexBufferData').concat(mesh.vertexData));

        this.$('indexBufferData').push(
          index * 4 + 0,
          index * 4 + 1,
          index * 4 + 2,
          index * 4 + 1,
          index * 4 + 2,
          index * 4 + 3
        );

        this.$('rotationBufferData').push(
          mesh.rotationX, mesh.rotationY, 0,
          mesh.rotationX, mesh.rotationY, 0,
          mesh.rotationX, mesh.rotationY, 0,
          mesh.rotationX, mesh.rotationY, 0
        );

        this.$('scaleBufferData').push(
          mesh.scaleX, mesh.scaleY, 1,
          mesh.scaleX, mesh.scaleY, 1,
          mesh.scaleX, mesh.scaleY, 1,
          mesh.scaleX, mesh.scaleY, 1
        );

        this.$('colorBufferData').push(
          mesh.colorR, mesh.colorG, mesh.colorB,
          mesh.colorR, mesh.colorG, mesh.colorB,
          mesh.colorR, mesh.colorG, mesh.colorB,
          mesh.colorR, mesh.colorG, mesh.colorB
        );

        this.$(
          'needVertexUpdate', true,
          'needIndexUpdate', true,
          'needRotationUpdate', true,
          'needScaleUpdate', true,
          'needColorUpdate', true
        );

        this.$('children').push(mesh);
        this.$('index', ++index);
      },
      remove: function(mesh) {

      },
      updateBuffer: function() {
        if(!this.$('vertexBufferData').length) return;

        var children = this.$('children');
        var index = children.length;
        var child;
        var childIndex;
        var childOffset;

        while(index--) {
          child = children[index];

          if(child.$('positionChanged')) {
            var vertexData = child.vertexData;
            var vertexIndex = 0;

            childIndex = child.$('childIndex') * 12;
            childOffset = childIndex + 12;

            for( ; childIndex < childOffset; childIndex++) {
              this.$('vertexBufferData')[childIndex] = vertexData[vertexIndex++];
            }

            this.$('needVertexUpdate', true);
            child.$('positionChanged', false);
          }

          if(child.$('rotationChanged')) {
            var rotationX = child.rotationX;
            var rotationY = child.rotationY;

            childIndex = child.$('childIndex') * 12;
            childOffset = childIndex + 12;

            for( ; childIndex < childOffset; childIndex += 3) {
              this.$('rotationBufferData')[childIndex]     = rotationX;
              this.$('rotationBufferData')[childIndex + 1] = rotationY;
            }

            this.$('needRotationUpdate', true);
            child.$('rotationChanged', false);
          }

          if(child.$('scaleChanged')) {
            var scaleX = child.scaleX;
            var scaleY = child.scaleY;

            childIndex = child.$('childIndex') * 12;
            childOffset = childIndex + 12;

            for( ; childIndex < childOffset; childIndex += 3) {
              this.$('scaleBufferData')[childIndex]     = scaleX;
              this.$('scaleBufferData')[childIndex + 1] = scaleY;
            }

            this.$('needScaleUpdate', true);
            child.$('scaleChanged', false);
          }

          if(child.$('colorChanged')) {
            var colorR = child.colorR;
            var colorG = child.colorG;
            var colorB = child.colorB;

            childIndex = child.$('childIndex') * 12;
            childOffset = childIndex + 12;

            for( ; childIndex < childOffset; childIndex += 3) {
              this.$('colorBufferData')[childIndex]     = colorR;
              this.$('colorBufferData')[childIndex + 1] = colorG;
              this.$('colorBufferData')[childIndex + 2] = colorB;
            }

            this.$('needColorUpdate', true);
            child.$('colorChanged', false);
          }
        }
      },
      render: function() {
        var gl = this.$('gl');

        if(this.$('needViewportUpdate')) {
          var canvas = this.$('canvas');
          var width = this.$('width');
          var height = this.$('height');

          canvas.width = width;
          canvas.height = height;
          canvas.style.width = width + 'px';
          canvas.style.height = height + 'px';

          gl.viewport(0, 0, width, height);
          gl.uniform2f(this.$('program').uResolution, width, height);

          this.$('needViewportUpdate', false);
        }

        this.updateBuffer();

        if(this.$('needClearColorUpdate')) {
          var clearColor = this.$('clearColor');

          gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);

          this.$('needClearColorUpdate', false);
        }

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if(this.$('needVertexUpdate')) {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.$('vertexBuffer'));
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.$('vertexBufferData')), gl.STATIC_DRAW);
          this.$('needVertexUpdate', false);
        }

        if(this.$('needRotationUpdate')) {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.$('rotationBuffer'));
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.$('rotationBufferData')), gl.STATIC_DRAW);
          this.$('needRotationUpdate', false);
        }

        if(this.$('needScaleUpdate')) {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.$('scaleBuffer'));
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.$('scaleBufferData')), gl.STATIC_DRAW);
          this.$('needScaleUpdate', false);
        }

        if(this.$('needColorUpdate')) {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.$('colorBuffer'));
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.$('colorBufferData')), gl.STATIC_DRAW);
          this.$('needColorUpdate', false);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.$('indexBuffer'));

        if(this.$('needIndexUpdate')) {
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.$('indexBufferData')), gl.STATIC_DRAW);
          this.$('needIndexUpdate', false);
        }

        gl.drawElements(gl.TRIANGLES, 6 * this.$('index'), gl.UNSIGNED_SHORT, 0);
      }
    }
  });

  TWO.extend({
    name: 'Sprite',

    attributes: {
      'x': {
        get: function getX() {
          return this.$('x');
        },
        set: function setX(x) {
          this.$('x', x, 'positionChanged', true);
        }
      },
      'y': {
        get: function getY() {
          return this.$('y');
        },
        set: function setY(y) {
          this.$('y', y, 'positionChanged', true);
        }
      },
      'rotationX': {
        get: function getRotationX() {
          return this.$('rotationX');
        },
        set: function setRotationX(rotationX) {
          this.$('rotationX', rotationX, 'rotationChanged', true);
        }
      },
      'rotationY': {
        get: function getRotationY() {
          return this.$('rotationY');
        },
        set: function setRotationY(rotationY) {
          this.$('rotationY', rotationY, 'rotationChanged', true);
        }
      },
      'scaleX': {
        get: function getScaleX() {
          return this.$('scaleX');
        },
        set: function setScaleX(scaleX) {
          this.$('scaleX', scaleX, 'scaleChanged', true);
        }
      },
      'scaleY': {
        get: function getScaleY() {
          return this.$('scaleY');
        },
        set: function setScaleY(scaleY) {
          this.$('scaleY', scaleY, 'scaleChanged', true);
        }
      },
      'colorR': {
        get: function getColorR() {
          return this.$('colorR');
        },
        set: function setColorR(colorR) {
          this.$('colorR', colorR, 'colorChanged', true);
        }
      },
      'colorG': {
        get: function getColorG() {
          return this.$('colorG');
        },
        set: function setColorG(colorG) {
          this.$('colorG', colorG, 'colorChanged', true);
        }
      },
      'colorB': {
        get: function getColorB() {
          return this.$('colorB');
        },
        set: function setColorB(colorB) {
          this.$('colorB', colorB, 'colorChanged', true);
        }
      },
      'vertexData': {
        get: function getVertexData() {
          var x1 = this.$('x');
          var y1 = this.$('y');
          var x2 = x1 + this.$('width');
          var y2 = y1 + this.$('height');

          return [
            x1, y1,
            x1, y2,
            x2, y1,
            x2, y2
          ];
        }
      }
    },

    initialize: function(options) {
      this.$(
        'x', options.x || 0,
        'y', options.y || 0,
        'width', options.width || 0,
        'height', options.height || 0,
        'rotationX', options.rotationX || 0,
        'rotationY', options.rotationY || 0,
        'scaleX', options.scaleX || 1,
        'scaleY', options.scaleY || 1,
        'colorR', options.colorR || 1,
        'colorG', options.colorG || 1,
        'colorB', options.colorB || 1,

        'positionChanged', true,
        'rotationChanged', true,
        'scaleChanged', true,
        'colorChanged', true
      );
    },

    methods: {
      getPosition: function getPosition() {
        return {
          x: this.$('x'),
          y: this.$('y')
        };
      },
      setPosition: function setPosition(position) {
        this.$(
          'x', position.x || this.$('x'),
          'y', position.y || this.$('y'),
          'positionChanged', true
        );
      },
      getRotation: function getRotation() {
        return {
          x: this.$('rotationX'),
          y: this.$('rotationY')
        };
      },
      setRotation: function setRotation(rotation) {
        this.$(
          'rotationX', rotation.x || this.$('rotationX'),
          'rotationY', rotation.y || this.$('rotationY'),
          'rotationChanged', true
        );
      },
      getScale: function getScale() {
        return {
          x: this.$('scaleX'),
          y: this.$('scaleY')
        };
      },
      setScale: function setScale(scale) {
        this.$(
          'scaleX', scale.x || this.$('scaleX'),
          'scaleY', scale.y || this.$('scaleY'),
          'scaleChanged', true
        );
      },
      getColor: function getColor() {
        return {
          r: this.$('colorR'),
          g: this.$('colorG'),
          b: this.$('colorB')
        };
      },
      setColor: function setColor(color) {
        this.$(
          'colorR', color.r || this.$('colorR'),
          'colorG', color.g || this.$('colorG'),
          'colorB', color.b || this.$('colorB'),
          'colorChanged', true
        );
      }
    }
  });

  Object.freeze(TWO);

  return TWO;
})();