/**
 * Base functionality for shader setup/destroy.
 * Copyright Metrological, 2017
 */
class ShaderProgram {

    constructor(vertexShaderSource, fragmentShaderSource) {

        this.vertexShaderSource = vertexShaderSource;
        this.fragmentShaderSource = fragmentShaderSource;

        this._program = null;

        this._uniformLocations = new Map();
        this._attributeLocations = new Map();

        this._currentUniformValues = {};

        this._pendingUniformValues = {};
        this._pendingUniformFunctions = {};
        this._pendingCount = 0
    }

    compile(gl) {
        if (this._program) return;

        this.gl = gl;

        this._program = gl.createProgram();

        let glVertShader = this._glCompile(gl.VERTEX_SHADER, this.vertexShaderSource);
        let glFragShader = this._glCompile(gl.FRAGMENT_SHADER, this.fragmentShaderSource);

        gl.attachShader(this._program, glVertShader);
        gl.attachShader(this._program, glFragShader);
        gl.linkProgram(this._program);

        // if linking fails, then log and cleanup
        if (!gl.getProgramParameter(this._program, gl.LINK_STATUS)) {
            console.error('Error: Could not initialize shader.');
            console.error('gl.VALIDATE_STATUS', gl.getProgramParameter(this._program, gl.VALIDATE_STATUS));
            console.error('gl.getError()', gl.getError());

            // if there is a program info log, log it
            if (gl.getProgramInfoLog(this._program) !== '') {
                console.warn('Warning: gl.getProgramInfoLog()', gl.getProgramInfoLog(this._program));
            }

            gl.deleteProgram(this._program);
            this._program = null;
        }

        // clean up some shaders
        gl.deleteShader(glVertShader);
        gl.deleteShader(glFragShader);
    }

    _glCompile(type, src) {
        let shader = this.gl.createShader(type);

        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.log('Type: ' + (type === this.gl.VERTEX_SHADER ? 'vertex shader' : 'fragment shader') );
            console.log(this.gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    getUniformLocation(name) {
        let location = this._uniformLocations.get(name);
        if (location === undefined) {
            location = this.gl.getUniformLocation(this._program, name);
            this._uniformLocations.set(name, location);
        }

        return location;
    }

    getAttribLocation(name) {
        let location = this._attributeLocations.get(name);
        if (location === undefined) {
            location = this.gl.getAttribLocation(this._program, name);
            this._attributeLocations.set(name, location);
        }

        return location;
    }

    destroy() {
        if (this._program) {
            this.gl.deleteProgram(this._program);
            this._program = null;
        }
    }

    get glProgram() {
        return this._program;
    }

    get compiled() {
        return !!this._program;
    }

    _valueEquals(v1, v2) {
        // Uniform value is either a typed array or a numeric value.
        if (v1.length && v2.length) {
            for (let i = 0, n = v1.length; i < n; i++) {
                if (v1[i] !== v2[i]) return false
            }
            return true
        } else {
            return (v1 === v2)
        }
    }

    _valueClone(v) {
        if (v.length) {
            return v.slice(0)
        } else {
            return v
        }
    }

    setUniformValue(name, value, glFunction) {
        let v = this._currentUniformValues[name];
        if (v === undefined || !this._valueEquals(v, value)) {
            this._pendingUniformValues.set(name, this._valueClone(value))
            this._pendingUniformFunctions.set(name, glFunction)
            this._pendingCount++
        }
    }

    hasUniformUpdates() {
        return (this._pendingCount > 0)
    }

    commitUniformUpdates() {
        let names = Object.keys(this._currentUniformValues)
        names.forEach(name => {
            this._pendingUniformFunctions[name](this.getUniformLocation(name), this._pendingUniformValues[name])
        })
        this._pendingUniformValues = {}
        this._pendingUniformValues = {}
        this._pendingCount = 0
    }

}

module.exports = ShaderProgram