/*!
	Virtual Sky
	(c) Stuart Lowe, Las Cumbres Observatory Global Telescope
	A browser planetarium using HTML5's <canvas>.
*/
/*
	USAGE: See http://slowe.github.io/VirtualSky/
		
	OPTIONS (default values in brackets):
		id ('starmap') - The ID for the HTML element where you want the sky inserted
		projection ('polar') - The projection type as 'polar', 'stereo', 'lambert', 'equirectangular', or 'ortho'
		width (500) - Set the width of the sky unless you've set the width of the element
		height (250) - Set the height of the sky unless you've set the height of the element
		planets - either an object containing an array of planets or a JSON file
		magnitude (5) - the magnitude limit of displayed stars
		longitude (53.0) - the longitude of the observer
		latitude (-2.5) - the latitude of the observer
		clock (now) - a Javascript Date() object with the starting date/time
		background ('rgba(0,0,0,0)') - the background colour
		transparent (false) - make the sky background transparent
		color ('rgb(255,255,255)') - the text colour
		az (180) - an azimuthal offset with 0 = north and 90 = east
		ra (0 <= x < 360) - the RA for the centre of the view in gnomic projection
		dec (-90 < x < 90) - the Declination for the centre of the view in gnomic projection
		negative (false) - invert the default colours i.e. to black on white
		ecliptic (false) - show the Ecliptic line
		meridian (false) - show the Meridian line
		gradient (true) - reduce the brightness of stars near the horizon
		cardinalpoints (true) - show/hide the N/E/S/W labels
		constellations (false) - show/hide the constellation lines
		constellationlabels (false) - show/hide the constellation labels
		constellationboundaries (false) - show/hide the constellation boundaries (IAU)
		constellationwidth (0.75) - pixel width of the constellation lines
		constellationboundarieswidth (0.75) - pixel width of the constellation boundary lines
		showstars (true) - show/hide the stars
		showstarlabels (false) - show/hide the star labels for brightest stars
		showplanets (true) - show/hide the planets
		showplanetlabels (true) - show/hide the planet labels
		showorbits (false) - show/hide the orbits of the planets
		showgalaxy (false) - show/hide an outline of the plane of the Milky Way
		showdate (true) - show/hide the date and time
		showposition (true) - show/hide the latitude/longitude
		ground (false) - show/hide the local ground (for full sky projections)
		keyboard (true) - allow keyboard controls
		mouse (true) - allow mouse controls
		gridlines_az (false) - show/hide the azimuth/elevation grid lines
		gridlines_eq (false) - show/hide the RA/Dec grid lines
		gridlines_gal (false) - show/hide the Galactic Coordinate grid lines
		gridstep (30) - the size of the grid step when showing grid lines
		gridlineswidth (0.75) - pixel width of the grid lines
		galaxywidth (0.75) - pixel width of the galaxy outline
		live (false) - update the display in real time
		fontsize - set the font size in pixels if you want to over-ride the auto sizing
		fontfamily - set the font family using a CSS style font-family string otherwise it inherits from the container element
		objects - a semi-colon-separated string of recognized object names to display e.g. "M1;M42;Horsehead Nebula" (requires internet connection)
*/
(function(S) {

    /*@cc_on
    // Fix for IE's inability to handle arguments to setTimeout/setInterval
    // From http://webreflection.blogspot.com/2007/06/simple-settimeout-setinterval-extra.html
    (function(f){
    	window.setTimeout =f(window.setTimeout);
    	window.setInterval =f(window.setInterval);
    })(function(f){return function(c,t){var a=[].slice.call(arguments,2);return f(function(){c.apply(this,a)},t)}});
    @*/
    // Define a shortcut for checking variable types
    function is(a, b) { return typeof a === b; }

    function isEventSupported(eventName) {
        var el = document.createElement('div');
        eventName = 'on' + eventName;
        var isSupported = (eventName in el);
        if (!isSupported) {
            el.setAttribute(eventName, 'return;');
            isSupported = typeof el[eventName] == 'function';
        }
        el = null;
        return isSupported;
    }


    // Add extra stuQuery functions
    stuQuery.prototype.val = function(v) {
        if (this[0]) {
            if (typeof v === "undefined") return this[0].value || S(this[0]).attr('value');
            else return S(this[0]).attr('value', v || '');
        }
        return "";
    };
    stuQuery.prototype.hide = function() {
        for (var i = 0; i < this.length; i++) S(this[i]).css({ 'display': 'none' });
    };
    stuQuery.prototype.show = function() {
        for (var i = 0; i < this.length; i++) S(this[i]).css({ 'display': 'block' });
    };
    stuQuery.prototype.animate = function(end, ms, fn) {
        var anim, i, p;
        var initial = new Array(this.length);
        var els = new Array(this.length);
        var props = JSON.stringify(end);

        // Create a structure of starting values
        for (i = 0; i < this.length; i++) {
            els[i] = S(this[i]);
            initial[i] = JSON.parse(props);
            for (p in initial[i]) {
                if (initial[i][p]) initial[i][p] = parseFloat(els[i].css(p));
            }
        }

        var start = new Date();
        var _obj = this;

        function change() {
            var i, p, v, f;
            var elapsed = new Date() - start;
            f = (elapsed < ms) ? (elapsed / ms) : 1;
            for (i = 0; i < _obj.length; i++) {
                v = JSON.parse(JSON.stringify(initial[i]));
                for (p in v) {
                    if (f >= 1) v[p] = end[p].toFixed(4);
                    else v[p] = (initial[i][p] + (f * (end[p] - initial[i][p]))).toFixed(4);
                }
                els[i].css(v);
            }
            if (f >= 1) {
                clearInterval(anim);
                if (typeof fn === "function") fn.call(_obj);
            }
        }
        anim = setInterval(change, 25);
        return;
    };
    stuQuery.prototype.fadeIn = function(ms, fn) {
        return this.animate({ 'opacity': 1 }, ms, fn);
    };
    stuQuery.prototype.fadeOut = function(ms, fn) {
        return this.animate({ 'opacity': 0 }, ms, fn);
    };

    // Get the URL query string and parse it
    S.query = function() {
        var r = { length: 0 };
        var q = location.search;
        if (q && q != '#') {
            // remove the leading ? and trailing &
            q.replace(/^\?/, '').replace(/\&$/, '').split('&').forEach(function(e) {
                var key = e.split('=')[0];
                var val = e.split('=')[1];
                // convert floats
                if (/^-?[0-9.]+$/.test(val)) val = parseFloat(val);
                if (val == "true") val = true;
                if (val == "false") val = false;
                if (/^\?[0-9\.]+$/.test(val)) val = parseFloat(val); // convert floats
                r[key] = val;
            });
        }
        return r;
    };

    // Full Screen API - http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
    var fullScreenApi = {
            supportsFullScreen: false,
            isFullScreen: function() { return false; },
            requestFullScreen: function() {},
            cancelFullScreen: function() {},
            fullScreenEventName: '',
            prefix: ''
        },
        browserPrefixes = 'webkit moz o ms khtml'.split(' ');

    // check for native support
    if (typeof document.cancelFullScreen != 'undefined') {
        fullScreenApi.supportsFullScreen = true;
    } else if (typeof document['msExitFullscreen'] != 'undefined') {
        fullScreenApi.prefix = 'ms';
        fullScreenApi.supportsFullScreen = true;
    } else {
        // check for fullscreen support by vendor prefix
        for (var i = 0, il = browserPrefixes.length; i < il; i++) {
            fullScreenApi.prefix = browserPrefixes[i];
            if (typeof document[fullScreenApi.prefix + 'CancelFullScreen'] != 'undefined') {
                fullScreenApi.supportsFullScreen = true;
                break;
            }
        }
    }

    // update methods to do something useful
    if (fullScreenApi.supportsFullScreen) {
        fullScreenApi.fullScreenEventName = fullScreenApi.prefix + 'fullscreenchange';

        fullScreenApi.isFullScreen = function() {
            switch (this.prefix) {
                case '':
                    return document.fullScreen;
                case 'webkit':
                    return document.webkitIsFullScreen;
                case 'ms':
                    return document.msFullscreenElement != null;
                default:
                    return document[this.prefix + 'FullScreen'];
            }
        };
        fullScreenApi.requestFullScreen = function(el) {
            return (this.prefix === '') ? el.requestFullScreen() : ((this.prefix === 'ms') ? el.msRequestFullscreen() : el[this.prefix + 'RequestFullScreen']());
        };
        fullScreenApi.cancelFullScreen = function(el) {
            switch (this.prefix) {
                case '':
                    return document.cancelFullScreen();
                case 'ms':
                    return document.msExitFullscreen();
                default:
                    return document[this.prefix + 'CancelFullScreen']();
            }
        };
    }

    // export api
    window.fullScreenApi = fullScreenApi;
    // End of Full Screen API

    /*! VirtualSky */
    function VirtualSky(input) {

        this.version = "0.7.4";

        this.ie = false;
        this.excanvas = (typeof G_vmlCanvasManager != 'undefined') ? true : false;
        /*@cc_on
        this.ie = true
        @*/

        // Identify the default base directory
        this.setDir = function() {
            var d = S('script[src*=virtualsky]').attr('src')[0].match(/^.*\//);
            this.dir = d && d[0] || "";
            return;
        };
        this.getDir = function(pattern) {
            if (typeof pattern !== "string") pattern = "virtualsky";
            var d = S('script[src*=' + pattern + ']').attr('src');
            if (typeof d === "string") d = [d];
            if (d.length < 1) d = [""];
            d = d[0].match(/^.*\//);
            return d && d[0] || "";
        };

        this.q = S.query(); // Query string
        this.setDir(); // Set the default base directory
        this.dir = this.getDir(); // the JS file path
        this.langurl = this.dir + "lang/%LANG%.json"; // The location of the language files

        this.id = ''; // The ID of the canvas/div tag - if none given it won't display
        this.gradient = true; // Show the sky gradient
        this.magnitude = 5; // Limit for stellar magnitude
        this.background = "rgba(0,0,0,0)"; // Default background colour is transparent
        this.color = ""; // Default background colour is chosen automatically
        this.wide = 0; // Default width if not set in the <canvas> <div> or input argument
        this.tall = 0;

        // Constants
        this.d2r = Math.PI / 180;
        this.r2d = 180.0 / Math.PI;

        // Set location on the Earth
        this.setLongitude(-119.86286);
        this.setLatitude(34.4326);

        // Toggles
        this.spin = false;
        this.cardinalpoints = true; // Display N, E, S and W.
        this.constellation = { lines: false, boundaries: false, labels: false }; // Display constellations
        this.meteorshowers = false; // Display meteor shower radiants
        this.negative = false; // Invert colours to make it better for printing
        this.showgalaxy = false; // Display the Milky Way
        this.showstars = true; // Display current positions of the stars
        this.showstarlabels = false; // Display names for named stars
        this.showplanets = true; // Display current positions of the planets
        this.showplanetlabels = true; // Display names for planets
        this.showorbits = false; // Display the orbital paths of the planets
        this.showdate = true; // Display the current date
        this.showposition = true; // Display the longitude/latitude
        this.scalestars = 1; // A scale factor by which to increase the star sizes
        this.ground = false;
        this.grid = { az: false, eq: false, gal: false, step: 30 }; // Display grids
        this.gal = { 'processed': false, 'lineWidth': 0.75 };
        this.ecliptic = false; // Display the Ecliptic
        this.meridian = false; // Display the Meridian
        this.keyboard = true; // Allow keyboard controls
        this.mouse = true; // Allow mouse controls
        this.islive = false; // Update the sky in real time
        this.fullscreen = false; // Should it take up the full browser window
        this.transparent = false; // Show the sky background or not
        this.fps = 10; // Number of frames per second when animating
        this.credit = (location.host == "lco.global" && location.href.indexOf("/embed") < 0) ? false : true;
        this.callback = { geo: '', mouseenter: '', mouseout: '', contextmenu: '', cursor: '', click: '' };
        this.lookup = {};
        this.keys = [];
        this.base = "";
        this.az_step = 0;
        this.az_off = 0;
        this.ra_off = 0;
        this.dc_off = 0;
        this.fov = 30;
        this.plugins = [];
        this.calendarevents = [];
        this.events = {}; // Let's add some default events

        // Projections
        this.projections = {
            'polar': {
                title: 'Polar projection',
                azel2xy: function(az, el, w, h) {
                    var radius = h / 2;
                    var r = radius * ((Math.PI / 2) - el) / (Math.PI / 2);
                    return { x: (w / 2 - r * Math.sin(az)), y: (radius - r * Math.cos(az)), el: el };
                },
                xy2azel: function(x, y, w, h) {
                    var radius = h / 2;

                    var X = w / 2 - x;
                    var Y = radius - y;
                    // X = r * Math.sin(az)
                    // Y = r * Math.cos(az)
                    r = Math.sqrt(X * X + Y * Y);
                    // r = radius*((Math.PI/2)-el)/(Math.PI/2);
                    // el = (Math.PI/2) - r * (Math.PI/2) / radius
                    var el = (Math.PI / 2) - r * (Math.PI / 2) / radius;
                    if (el < 0) {
                        return undefined;
                    }
                    var az = Math.atan2(X, Y);
                    return [az, el];
                },
                polartype: true,
                atmos: true
            },
            'fisheye': {
                title: 'Fisheye polar projection',
                azel2xy: function(az, el, w, h) {
                    var radius = h / 2;
                    var r = radius * Math.sin(((Math.PI / 2) - el) / 2) / 0.70710678; // the field of view is bigger than 180 degrees
                    return { x: (w / 2 - r * Math.sin(az)), y: (radius - r * Math.cos(az)), el: el };
                },
                xy2azel: function(x, y, w, h) {
                    var radius = h / 2;

                    var X = w / 2 - x;
                    var Y = radius - y;
                    r = Math.sqrt(X * X + Y * Y);
                    if (r > radius) {
                        return undefined;
                    }
                    var el = Math.PI / 2 - 2 * Math.asin(r * 0.70710678 / radius);
                    var az = Math.atan2(X, Y);
                    return [az, el];
                },
                polartype: true,
                atmos: true
            },
            'ortho': {
                title: 'Orthographic polar projection',
                azel2xy: function(az, el, w, h) {
                    var radius = h / 2;
                    var r = radius * Math.cos(el);
                    return { x: (w / 2 - r * Math.sin(az)), y: (radius - r * Math.cos(az)), el: el };
                },
                xy2azel: function(x, y, w, h) {
                    var radius = h / 2;

                    var X = w / 2 - x;
                    var Y = radius - y;
                    r = Math.sqrt(X * X + Y * Y);
                    if (r > radius) {
                        return undefined;
                    }
                    var el = Math.acos(r / radius);
                    var az = Math.atan2(X, Y);
                    return [az, el];
                },
                polartype: true,
                atmos: true
            },
            'stereo': {
                title: 'Stereographic projection',
                azel2xy: function(az, el, w, h) {
                    var f = 0.42;
                    var sinel1 = 0;
                    var cosel1 = 1;
                    var cosaz = Math.cos((az - Math.PI));
                    var sinaz = Math.sin((az - Math.PI));
                    var sinel = Math.sin(el);
                    var cosel = Math.cos(el);
                    var k = 2 / (1 + sinel1 * sinel + cosel1 * cosel * cosaz);
                    return { x: (w / 2 + f * k * h * cosel * sinaz), y: (h - f * k * h * (cosel1 * sinel - sinel1 * cosel * cosaz)), el: el };
                },
                xy2azel: function(x, y, w, h) {
                    var f = 0.42;
                    var sinel1 = 0;
                    var cosel1 = 1;
                    var X = (x - w / 2) / h;
                    var Y = (h - y) / h;
                    var R = f;

                    var P = Math.sqrt(X * X + Y * Y);
                    var c = 2 * Math.atan2(P, 2 * R);

                    var el = Math.asin(Math.cos(c) * sinel1 + Y * Math.sin(c) * cosel1 / P);
                    var az = Math.PI + Math.atan2(X * Math.sin(c), P * cosel1 * Math.cos(c) - Y * sinel1 * Math.sin(c));

                    return [az, el];
                },
                atmos: true
            },
            'lambert': {
                title: 'Lambert projection',
                azel2xy: function(az, el, w, h) {
                    var cosaz = Math.cos((az - Math.PI));
                    var sinaz = Math.sin((az - Math.PI));
                    var sinel = Math.sin(el);
                    var cosel = Math.cos(el);
                    var k = Math.sqrt(2 / (1 + cosel * cosaz));
                    return { x: (w / 2 + 0.6 * h * k * cosel * sinaz), y: (h - 0.6 * h * k * (sinel)), el: el };
                },
                xy2azel: function(x, y, w, h) {
                    var X = (x - w / 2) / (0.6 * h);
                    var Y = (h - y) / (0.6 * h);

                    var p = Math.sqrt(X * X + Y * Y);
                    if (p > 2 || p < -2) {
                        return undefined;
                    }
                    var c = 2 * Math.asin(p / 2);

                    var el = Math.asin(Y * Math.sin(c) / p);
                    var az = Math.PI + Math.atan2(X * Math.sin(c), p * Math.cos(c));

                    return [az, el];
                },
                atmos: true
            },
            'gnomic': {
                title: 'Gnomic projection',
                azel2xy: function(az, el) {
                    if (el >= 0) {
                        var pos = this.azel2radec(az, el);
                        return this.radec2xy(pos.ra * this.d2r, pos.dec * this.d2r, [el, az]);
                    } else {
                        return { x: -1, y: -1, el: el };
                    }
                },
                radec2xy: function(ra, dec, coords) {

                    var cd, cd0, sd, sd0, dA, A, F, scale;

                    // Only want to project the sky around the map centre
                    if (Math.abs(dec - this.dc_off) > this.maxangle) return { x: -1, y: -1, el: -1 };
                    var ang = this.greatCircle(this.ra_off, this.dc_off, ra, dec);
                    if (ang > this.maxangle) return { x: -1, y: -1, el: -1 };

                    if (!coords) coords = this.coord2horizon(ra, dec);

                    // Should we show things below the horizon?
                    if (this.ground && coords[0] < -1e-6) return { x: -1, y: -1, el: coords[0] * this.r2d };

                    // number of pixels per degree in the map
                    scale = this.tall / this.fov;

                    cd = Math.cos(dec);
                    cd0 = Math.cos(this.dc_off);
                    sd = Math.sin(dec);
                    sd0 = Math.sin(this.dc_off);

                    dA = ra - this.ra_off;
                    dA = inrangeAz(dA);

                    A = cd * Math.cos(dA);
                    F = scale * this.r2d / (sd0 * sd + A * cd0);

                    return { x: (this.wide / 2) - F * cd * Math.sin(dA), y: (this.tall / 2) - F * (cd0 * sd - A * sd0), el: coords[0] * this.r2d };
                },
                xy2radec: function(x, y) {

                    // number of pixels per degree in the map
                    var scale = this.tall / this.fov;

                    var X = ((this.wide / 2) - x) / (scale * this.r2d);
                    var Y = ((this.tall / 2) - y) / (scale * this.r2d);

                    var p = Math.sqrt(X * X + Y * Y);
                    var c = Math.atan(p);

                    var dec = Math.asin(Math.cos(c) * Math.sin(this.dc_off) + Y * Math.sin(c) * Math.cos(this.dc_off) / p);
                    var ra = this.ra_off + Math.atan2(X * Math.sin(c), (p * Math.cos(this.dc_off) * Math.cos(c) - Y * Math.sin(this.dc_off) * Math.sin(c)));

                    // Only want to project the sky around the map centre
                    if (Math.abs(dec - this.dc_off) > this.maxangle) return undefined;
                    var ang = this.greatCircle(this.ra_off, this.dc_off, ra, dec);
                    if (ang > this.maxangle) return undefined;

                    var coords = this.coord2horizon(ra, dec);

                    // Should we show things below the horizon?
                    if (this.ground && coords[0] < -1e-6) return undefined;

                    return { ra: ra, dec: dec };
                },
                draw: function() {
                    if (!this.transparent) {
                        this.ctx.fillStyle = (this.hasGradient()) ? "rgba(0,15,30, 1)" : ((this.negative) ? this.col.white : this.col.black);
                        this.ctx.fillRect(0, 0, this.wide, this.tall);
                        this.ctx.fill();
                    }
                },
                isVisible: function(el) {
                    return true;
                },
                atmos: false,
                fullsky: true
            },
            'equirectangular': {
                title: 'Equirectangular projection',
                azel2xy: function(az, el, w, h) {
                    while (az < 0) az += 2 * Math.PI;
                    az = (az) % (Math.PI * 2);
                    return { x: (((az - Math.PI) / (Math.PI / 2)) * h + w / 2), y: (h - (el / (Math.PI / 2)) * h), el: el };
                },
                xy2azel: function(x, y, w, h) {
                    var az = (Math.PI / 2) * (x - w / 2) / h + Math.PI;
                    if (az < 0 || az > 2 * Math.PI) {
                        return undefined;
                    }
                    var el = (Math.PI / 2) * (h - y) / h;
                    return [az, el];
                },
                maxb: 90,
                atmos: true
            },
            'mollweide': {
                title: 'Mollweide projection',
                radec2xy: function(ra, dec) {
                    var dtheta, x, y, coords, sign, outside, normra;
                    var thetap = Math.abs(dec);
                    var pisindec = Math.PI * Math.sin(Math.abs(dec));
                    // Now iterate to correct answer
                    for (var i = 0; i < 20; i++) {
                        dtheta = -(thetap + Math.sin(thetap) - pisindec) / (1 + Math.cos(thetap));
                        thetap += dtheta;
                        if (dtheta < 1e-4) break;
                    }
                    normra = (ra + this.d2r * this.az_off) % (2 * Math.PI) - Math.PI;
                    outside = false;
                    x = -(2 / Math.PI) * (normra) * Math.cos(thetap / 2) * this.tall / 2 + this.wide / 2;
                    if (x > this.wide) outside = true;
                    sign = (dec >= 0) ? 1 : -1;
                    y = -sign * Math.sin(thetap / 2) * this.tall / 2 + this.tall / 2;
                    coords = this.coord2horizon(ra, dec);
                    return { x: (outside ? -100 : x % this.wide), y: y, el: coords[0] * this.r2d };
                },
                xy2radec: function(x, y) {
                    var X = (this.wide / 2 - x) * Math.sqrt(2) * 2 / this.tall;
                    var Y = (this.tall / 2 - y) * Math.sqrt(2) * 2 / this.tall;

                    var theta = Math.asin(Y / Math.sqrt(2));
                    var dec = Math.asin((2 * theta + Math.sin(2 * theta)) / Math.PI);
                    if (Math.abs(X) > 2 * Math.sqrt(2) * Math.cos(theta)) {
                        // Out of bounds
                        return undefined;
                    }
                    var ra = Math.PI - (this.d2r * this.az_off) + Math.PI * X / (2 * Math.sqrt(2) * Math.cos(theta));
                    return { ra: ra, dec: dec };
                },
                draw: function() {
                    var c = this.ctx;
                    c.moveTo(this.wide / 2, this.tall / 2);
                    c.beginPath();
                    var x = this.wide / 2 - this.tall;
                    var y = 0;
                    var w = this.tall * 2;
                    var h = this.tall;
                    var kappa = 0.5522848;
                    var ox = (w / 2) * kappa; // control point offset horizontal
                    var oy = (h / 2) * kappa; // control point offset vertical
                    var xe = x + w; // x-end
                    var ye = y + h; // y-end
                    var xm = x + w / 2; // x-middle
                    var ym = y + h / 2; // y-middle
                    c.moveTo(x, ym);
                    c.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
                    c.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
                    c.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
                    c.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
                    c.closePath();
                    if (!this.transparent) {
                        c.fillStyle = (this.hasGradient()) ? "rgba(0,15,30, 1)" : ((this.negative) ? this.col.white : this.col.black);
                        c.fill();
                    }
                },
                altlabeltext: true,
                fullsky: true,
                atmos: false
            },
            'planechart': {
                title: 'Planechart projection',
                radec2xy: function(ra, dec) {
                    ra = inrangeAz(ra);
                    var normra = (ra + this.d2r * this.az_off) % (2 * Math.PI) - Math.PI;
                    var x = -(normra / (2 * Math.PI)) * this.tall * 2 + this.wide / 2;
                    var y = -(dec / Math.PI) * this.tall + this.tall / 2;
                    var coords = this.coord2horizon(ra, dec);
                    return { x: x, y: y, el: coords[0] * this.r2d };
                },
                xy2radec: function(x, y) {
                    var normra = (this.wide / 2 - x) * 2 * Math.PI / (this.tall * 2);
                    if (Math.abs(normra) > Math.PI) {
                        return undefined;
                    }
                    var ra = normra + Math.PI - this.d2r * this.az_off;
                    var dec = Math.PI * (this.tall / 2 - y) / this.tall;
                    return { ra: ra, dec: dec };
                },
                draw: function() {
                    if (!this.transparent) {
                        this.ctx.fillStyle = (this.hasGradient()) ? "rgba(0,15,30, 1)" : ((this.negative) ? this.col.white : this.col.black);
                        this.ctx.fillRect((this.wide / 2) - (this.tall), 0, this.tall * 2, this.tall);
                        this.ctx.fill();
                    }
                },
                fullsky: true,
                atmos: false
            }
        };

        // Data for stars < mag 4.5 or that are a vertex for a constellation line - 20 kB [id, mag, right ascension, declination]
        // index with Hipparcos number
        this.stars = this.convertStarsToRadians([
            [677, 2.1, 2.097, 29.09],
            // Many more ...
        ]);

        // Data for star names to display (if showstarlabels is set to true) - indexed by Hipparcos number
        this.starnames = {};

        // Add the stars to the lookup
        this.lookup.star = [];
        for (i = 0; i < this.stars.length; i++) this.lookup.star.push({ 'ra': this.stars[i][2], 'dec': this.stars[i][3], 'label': this.stars[i][0], 'mag': this.stars[i][1] });

        // Define extra files (JSON/JS)
        this.file = {
            stars: this.dir + "stars.json", // Data for faint stars - 54 kB
            lines: this.dir + "lines_latin.json", // Data for constellation lines - 12 kB
            boundaries: this.dir + "boundaries.json", // Data for constellation boundaries - 20 kB
            showers: this.dir + "showers.json", // Data for meteor showers - 4 kB
            galaxy: this.dir + "galaxy.json", // Data for milky way - 12 kB
            planets: this.dir + "virtualsky-planets.js" // Plugin for planet ephemeris - 12kB
        };

        this.hipparcos = {}; // Define our star catalogue
        this.updateClock(new Date()); // Define the 'current' time
        this.fullsky = false; // Are we showing the entire sky?

        // Define the colours that we will use
        this.colours = {
            'normal': {
                'txt': "rgb(255,255,255)",
                'black': "rgb(0,0,0)",
                'white': "rgb(255,255,255)",
                'grey': "rgb(100,100,100)",
                'stars': 'rgb(255,255,255)',
                'sun': 'rgb(255,215,0)',
                'moon': 'rgb(150,150,150)',
                'cardinal': 'rgba(163,228,255, 1)',
                'constellation': "rgba(180,180,255,0.8)",
                'constellationboundary': "rgba(255,255,100,0.6)",
                'showers': "rgba(100,255,100,0.8)",
                'galaxy': "rgba(100,200,255,0.5)",
                'az': "rgba(100,100,255,0.4)",
                'eq': "rgba(255,100,100,0.4)",
                'ec': 'rgba(255,0,0,0.4)',
                'gal': 'rgba(100,200,255,0.4)',
                'meridian': 'rgba(25,255,0,0.4)',
                'pointers': 'rgb(200,200,200)'
            },
            'negative': {
                'txt': "rgb(0,0,0)",
                'black': "rgb(0,0,0)",
                'white': "rgb(255,255,255)",
                'grey': "rgb(100,100,100)",
                'stars': 'rgb(0,0,0)',
                'sun': 'rgb(0,0,0)',
                'moon': 'rgb(0,0,0)',
                'cardinal': 'rgba(0,0,0,1)',
                'constellation': "rgba(0,0,0,0.8)",
                'constellationboundary': "rgba(0,0,0,0.6)",
                "showers": "rgba(0,0,0,0.8)",
                'galaxy': "rgba(0,0,0,0.5)",
                'az': "rgba(0,0,255,0.6)",
                'eq': "rgba(255,100,100,0.8)",
                'ec': 'rgba(255,0,0,0.6)',
                'gal': 'rgba(100,200,255,0.8)',
                'meridian': 'rgba(0,255,0,0.6)'
            }
        };

        // Keep a copy of the inputs
        this.input = input;

        // Overwrite our defaults with input values
        this.init(input);

        // Country codes at http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
        this.language = (typeof this.q.lang === "string") ? this.q.lang : (typeof this.setlang === "string" ? this.setlang : (navigator) ? (navigator.userLanguage || navigator.systemLanguage || navigator.language || browser.language) : "");
        var fromqs = (typeof this.q.lang === "string" || typeof this.setlang === "string");
        this.langs = {
            'ar': { "language": { "name": "&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;", "alignment": "right" } },
            'cs': { "language": { "name": "&#268;e&#353;tina", "alignment": "left" } },
            'en': { "language": { "name": "English", "alignment": "left" } },
            'es': { "language": { "name": "Espa&#241;ol", "alignment": "left" } },
            'fr': { "language": { "name": "Fran&#231;ais", "alignment": "left" } },
            'it': { "language": { "name": "Italiano", "alignment": "left" } },
            'nl': { "language": { "name": "Nederlands", "alignment": "left" } },
            'pt': { "language": { "name": "Portugu&#234;s", "alignment": "left" } },
        }; // The contents of the language will be loaded from the JSON language file
        this.lang = this.langs.en; // default

        if (typeof this.polartype == "undefined") this.selectProjection('polar'); // Set the default projection

        // Update the colours
        this.updateColours();

        // Load the language file
        this.loadLanguage(this.language, '', fromqs);

        // Define some VirtualSky styles
        var v, a, b, r, s, p, k, c, bs;
        v = '.virtualsky';
        a = '#f0f0f0';
        b = '#fcfcfc';
        k = 'background';
        c = k + '-color';
        p = 'padding';
        this.padding = 4;
        bs = 'box-shadow:0px 0px 20px rgba(255,255,255,0.5);';

        function br(i) { return 'border-radius:' + i + ';-moz-border-radius:' + i + ';-webkit-border-radius:' + i + ';'; }
        r = br('0em');
        s = br('3px');
        S('head').append('<style type="text/css">' +
            v + '_help { ' + p + ':10px;' + c + ':white;' + r + '} ' +
            v + '_help ul { list-style:none;margin:0px;' + p + ':0px; } ' +
            v + '_infobox { ' + c + ':' + a + ';color:black;' + p + ':5px;' + r + bs + '} ' +
            v + '_infobox img {} ' +
            v + '_infocredit {color:white;float:left;font-size:0.8em;' + p + ':5px;position:absolute;} ' +
            v + 'form { position:absolute;z-index:20;display:block;overflow:hidden;' + c + ':#ddd;' + p + ':10px;' + bs + r + ' } ' +
            v + '_dismiss { float:right;' + p + ': 0 5px 0 5px;margin:0px;font-weight:bold;cursor:pointer;color:black;margin-right:-5px;margin-top:-5px; } ' +
            v + 'form input,' + v + 'form .divider { display:inline-block;font-size:1em;text-align:center;margin-right:2px; } ' + v + 'form .divider { margin-top: 5px; ' + p + ': 2px;} ' +
            v + 'button { ' + k + ':#e9e9e9; width: 1.5em; line-height: 1.5em; color: ' + a + '; cursor: pointer; display: block; padding: 0px; text-align: center; color: #000000; font-size: 1em; } ' +
            v + '_help_key:active{ ' + k + ':#e9e9e9; } ' +
            v + '_help_key:hover{ border-color: #b0b0b0; } ' +
            v + '_help_key { cursor:pointer;display:inline-block;text-align:center;' +
            k + ':' + a + ';' + k + ':-moz-linear-gradient(top,' + a + ',' + b + ');' +
            k + ':-webkit-gradient(linear,center top,center bottom,from(' + a + '),to(' + b + '));' +
            s + '-webkit-' + k + '-clip:' + p + '-box;-moz-' + k + '-clip:' + p + ';' + k + '-clip:' +
            p + '-box;color:#303030;border:1px solid #e0e0e0;border-bottom-width:2px;white-space:nowrap;font-family:monospace' +
            ';' + p + ':1px 6px;font-size:1.1em;}</style>');

        this.pointers = []; // Define an empty list of pointers/markers

        // Internal variables
        this.dragging = false;
        this.x = "";
        this.y = "";
        this.theta = 0;
        this.skygrad = null;
        this.infobox = "virtualsky_infobox";
        this.container = '';
        this.times = this.astronomicalTimes();
        if (this.id) this.createSky();

        // Find out where the Sun and Moon are
        p = this.moonPos(this.times.JD);
        this.moon = p.moon;
        this.sun = p.sun;

        if (this.islive) var interval = window.setInterval(function(sky) { sky.setClock('now'); }, 1000, this);

        return this;
    }

    VirtualSky.prototype.init = function(d) {
        if (!d) return this;
        var q = location.search;
        var key, val, i;

        if (q && q != '#') {
            var bits = q.replace(/^\?|\&$/g, '').split('&'); // remove the leading ? and trailing &
            for (i = 0; i < bits.length; i++) {
                key = bits[i].split('=')[0];
                val = bits[i].split('=')[1];
                // convert floats
                if (/^-?[0-9.]+$/.test(val)) val = parseFloat(val);
                if (val == "true") val = true;
                if (val == "false") val = false;
                // apply only first key occurency
                if (d[key] === undefined) d[key] = val;
            }
        }
        var n = "number";
        var s = "string";
        var b = "boolean";
        var o = "object";
        var f = "function";


        // Overwrite defaults with variables passed to the function
        // directly mapped variables
        var pairs = {
            id: s,
            gradient: b,
            cardinalpoints: b,
            negative: b,
            meteorshowers: b,
            showstars: b,
            scalestars: n,
            showstarlabels: b,
            starnames: o,
            showplanets: b,
            showplanetlabels: b,
            showorbits: b,
            showgalaxy: b,
            showdate: b,
            showposition: b,
            keyboard: b,
            mouse: b,
            ground: b,
            ecliptic: b,
            meridian: b,
            magnitude: n,
            clock: o,
            background: s,
            color: s,
            fov: n,
            objects: s,
            base: s,
            fullscreen: b,
            credit: b,
            transparent: b,
            plugins: o,
            lang: s
        };
        for (key in pairs)
            if (is(d[key], pairs[key]))
                this[key] = d[key];

            // Undirectly paired values
        if (is(d.projection, s)) this.selectProjection(d.projection);
        if (is(d.constellations, b)) this.constellation.lines = d.constellations;
        if (is(d.constellationboundaries, b)) this.constellation.boundaries = d.constellationboundaries;
        if (is(d.constellationlabels, b)) this.constellation.labels = d.constellationlabels;
        if (is(d.constellationwidth, n)) this.constellation.lineWidth = d.constellationwidth;
        if (is(d.constellationboundarieswidth, n)) this.constellation.boundaryWidth = d.constellationboundarieswidth;
        if (is(d.gridlines_az, b)) this.grid.az = d.gridlines_az;
        if (is(d.gridlines_eq, b)) this.grid.eq = d.gridlines_eq;
        if (is(d.gridlines_gal, b)) this.grid.gal = d.gridlines_gal;
        if (is(d.gridstep, n)) this.grid.step = d.gridstep;
        if (is(d.gridlineswidth, n)) this.grid.lineWidth = d.gridlineswidth;
        if (is(d.galaxywidth, n)) this.gal.lineWidth = d.galaxywidth;
        if (is(d.longitude, n)) this.setLongitude(d.longitude);
        if (is(d.latitude, n)) this.setLatitude(d.latitude);
        if (is(d.clock, s)) this.updateClock(new Date(d.clock.replace(/%20/g, ' ')));
        if (is(d.az, n)) this.az_off = (d.az % 360) - 180;
        if (is(d.ra, n)) this.setRA(d.ra);
        if (is(d.dec, n)) this.setDec(d.dec);
        if (is(d.planets, s)) this.file.planets = d.planets;
        if (is(d.planets, o)) this.planets = d.planets;
        if (is(d.lines, s)) this.file.lines = d.lines;
        if (is(d.lines, o)) this.lines = d.lines;
        if (is(d.boundaries, s)) this.file.boundaries = d.boundaries;
        if (is(d.boundaries, o)) this.boundaries = d.boundaries;
        if (is(d.width, n)) this.wide = d.width;
        if (is(d.height, n)) this.tall = d.height;
        if (is(d.live, b)) this.islive = d.live;
        if (is(d.lang, s) && d.lang.length == 2) this.language = d.lang;
        if (is(d.fontfamily, s)) this.fntfam = d.fontfamily.replace(/%20/g, ' ');
        if (is(d.fontsize, s)) this.fntsze = d.fontsize;
        if (is(d.lang, s)) this.setlang = d.lang;
        if (is(d.callback, o)) {
            if (is(d.callback.geo, f)) this.callback.geo = d.callback.geo;
            if (is(d.callback.click, f)) this.callback.click = d.callback.click;
            if (is(d.callback.mouseenter, f)) this.callback.mouseenter = d.callback.mouseenter;
            if (is(d.callback.mouseout, f)) this.callback.mouseout = d.callback.mouseout;
            if (is(d.callback.cursor, f)) this.callback.cursor = d.callback.cursor;
            if (is(d.callback.contextmenu, f)) this.callback.contextmenu = d.callback.contextmenu;
        }
        return this;
    };

    // Load the specified language
    // If it fails and this was the long variation of the language (e.g. "en-gb" or "zh-yue"), try the short version (e.g. "en" or "zh")
    VirtualSky.prototype.loadLanguage = function(l, fn, fromquerystring) {
        l = l || this.language;
        var lang = "";
        if (this.langs[l]) lang = l;
        if (!lang) {
            // Try loading a short version of the language code
            l = (l.indexOf('-') > 0 ? l.substring(0, l.indexOf('-')) : l.substring(0, 2));
            if (fromquerystring) {
                // If it was set in the query string we try it
                lang = l;
            } else {
                // If it was just from the browser settings, we'll limit to known translations
                if (this.langs[l]) lang = l;
            }
        }
        l = lang;
        if (!l) l = "en"; // Use English as a default if we haven't got a language here
        var url = this.langurl.replace('%LANG%', l);
        this.loadJSON(
            url,
            function(data) {
                this.langcode = l;
                this.langs[l] = data;
                this.langs[l].loaded = true;

                // Update any starnames
                if (data.starnames) {
                    for (var n in data.starnames) {
                        if (data.starnames[n]) this.starnames[n] = data.starnames[n];
                    }
                }

                this.changeLanguage(l);
                if (typeof fn === "function") fn.call(this);
            },
            function(data) {},
            function(e) {
                // If we tried to load the short version of the language and it failed, 
                // default to English (unless we were trying to get English in which 
                // case something is very wrong).
                if (l != "en") this.loadLanguage('en', fn);
            }
        );
        return this;
    };
    // Change the active language
    VirtualSky.prototype.changeLanguage = function(code, fn) {
        if (this.langs[code]) {
            if (!this.langs[code].loaded) this.loadLanguage(code, fn);
            else {
                this.lang = this.langs[code];
                this.langcode = code;
                this.drawImmediate();
                if (typeof fn === "function") fn.call(this);
            }
            return this;
        }
        this.lang = this.langs.en;
        return this;
    };
    VirtualSky.prototype.htmlDecode = function(input) {
        if (!input) return "";
        var e = document.createElement('div');
        e.innerHTML = input;
        return e.childNodes[0].nodeValue;
    };
    VirtualSky.prototype.getPhrase = function(key, key2) {
        if (key === undefined) return undefined;
        if (key === "constellations") {
            if (key2 && is(this.lang.constellations[key2], "string"))
                return this.htmlDecode(this.lang.constellations[key2]);
        } else if (key === "planets") {
            if (this.lang.planets && this.lang.planets[key2]) return this.htmlDecode(this.lang.planets[key2]);
            else return this.htmlDecode(this.lang[key2]);
        } else return this.htmlDecode(this.lang[key]) || this.htmlDecode(this.langs.en[key]) || "";
    };
    VirtualSky.prototype.resize = function(w, h) {
        if (!this.canvas) return;
        if (!w || !h) {
            if (this.fullscreen) {
                this.canvas.css({ 'width': 0, 'height': 0 });
                w = window.innerWidth;
                h = window.innerHeight;
                this.canvas.css({ 'width': w + 'px', 'height': h + 'px' });
            } else {
                // We have to zap the width of the canvas to let it take the width of the container
                this.canvas.css({ 'width': 0, 'height': 0 });
                w = this.container.outerWidth();
                h = this.container.outerHeight();
                this.canvas.css({ 'width': w + 'px', 'height': h + 'px' });
            }
        } else {
            // Set the container size
            this.container.css({ 'width': w + 'px', 'height': h + 'px' });
        }
        if (w == this.wide && h == this.tall) return;
        this.setWH(w, h);
        this.positionCredit();
        this.updateSkyGradient();
        this.drawImmediate();
        this.container.css({ 'font-size': this.fontsize() + 'px' });
        this.trigger('resize', { vs: this });
    };
    VirtualSky.prototype.setWH = function(w, h) {
        if (!w || !h) return;
        this.c.width = w;
        this.c.height = h;
        this.wide = w;
        this.tall = h;
        this.changeFOV();
        // DEPRECATED // Bug fix for IE 8 which sets a width of zero to a div within the <canvas>
        // DEPRECATED if(this.ie && S.browser.version == 8) $('#'+this.idinner).find('div').css({'width':w,'height':h});
        this.canvas.css({ 'width': w + 'px', 'height': h + 'px' });
    };
    VirtualSky.prototype.changeFOV = function(delta) {
        var fov = this.fov;
        if (delta > 0) fov /= 1.05;
        else if (delta < 0) fov *= 1.05;
        return this.setFOV(fov);
    };
    VirtualSky.prototype.setFOV = function(fov) {
        if (fov > 60 || typeof fov !== "number") this.fov = 60;
        else if (fov < 1) this.fov = 1;
        else this.fov = fov;
        this.maxangle = this.d2r * this.fov * Math.max(this.wide, this.tall) / this.tall;
        this.maxangle = Math.min(this.maxangle, Math.PI / 2);
        return this;
    };
    // Some pseudo-jQuery
    VirtualSky.prototype.hide = function() { this.container.hide(); return this; };
    VirtualSky.prototype.show = function() { this.container.show(); return this; };
    VirtualSky.prototype.toggle = function() { this.container.toggle(); return this; };
    // Our stars are stored in decimal degrees so we will convert them here
    VirtualSky.prototype.convertStarsToRadians = function(stars) {
        for (var i = 0; i < stars.length; i++) {
            stars[i][2] *= this.d2r;
            stars[i][3] *= this.d2r;
        }
        return stars;
    };
    VirtualSky.prototype.load = function(t, file, fn) {
        return this.loadJSON(file, function(data) {
            if (t == "stars") {
                this.starsdeep = true;
                this.stars = this.stars.concat(this.convertStarsToRadians(data.stars));
                // Add the stars to the lookup
                this.lookup.star = [];
                for (i = 0; i < this.stars.length; i++) this.lookup.star.push({ 'ra': this.stars[i][2], 'dec': this.stars[i][3], 'label': this.stars[i][0], 'mag': this.stars[i][1] });
            } else { this[t] = data[t]; }
            this.draw();
            this.trigger("loaded" + (t.charAt(0).toUpperCase() + t.slice(1)), { data: data });
        }, fn);
    };
    VirtualSky.prototype.loadJSON = function(file, callback, complete, error) {
        if (typeof file !== "string") return this;
        var dt = file.match(/\.json$/i) ? "json" : "script";
        if (dt == "script") {
            // If we are loading an external script we need to make sure we initiate 
            // it first. To do that we will re-write the callback that was provided.
            var tmp = callback;
            callback = function(data) {
                // Initialize any plugins
                for (var i = 0; i < this.plugins.length; ++i) {
                    if (typeof this.plugins[i].init == "function") this.plugins[i].init.call(this);
                }
                tmp.call(this, data);
            };
        }
        var config = {
            dataType: dt,
            "this": this,
            success: callback,
            complete: complete || function() {},
            error: error || function() {}
        };
        if (dt == "json") config.jsonp = 'onJSONPLoad';
        if (dt == "script") config.cache = true; // Use a cached version
        S(document).ajax(this.base + file, config);
        return this;
    };

    VirtualSky.prototype.debug = function(msg) {
        if (S('#debug').length == 1) {
            var id = 'debug-' + (new Date()).valueOf();
            S('#debug').append('<span id="' + id + '">' + msg + '</span> ');
            setTimeout(function() { S('#' + id).remove(); }, 1000);
        }
        return this;
    };

    VirtualSky.prototype.checkLoaded = function() {

        // Get the planet data
        if (!this.planets && this.showplanets) this.load('planets', this.file.planets);

        // Get the constellation line data
        if (!this.lines && this.constellation.lines) this.load('lines', this.file.lines);

        // Get the constellation line data
        if (!this.boundaries && this.constellation.boundaries) this.load('boundaries', this.file.boundaries);

        // Get the meteor showers
        if (!this.showers && this.meteorshowers) this.load('showers', this.file.showers);

        // Get the Milky Way
        if (!this.galaxy && this.showgalaxy) this.load('galaxy', this.file.galaxy);

        return this;
    };

    VirtualSky.prototype.createSky = function() {
        this.container = S('#' + this.id);
        this.times = this.astronomicalTimes();

        if (this.q.debug) S('body').append('<div style="position: absolute;bottom:0px;right:0px;padding: 0.25em 0.5em;background-color:white;color:black;max-width: 50%;" id="debug"></div>');
        if (this.fntfam) this.container.css({ 'font-family': this.fntfam });
        if (this.fntsze) this.container.css({ 'font-size': this.fntsze });

        if (this.container.length == 0) {
            // No appropriate container exists. So we'll make one.
            S('body').append('<div id="' + this.id + '"></div>');
            this.container = S('#' + this.id);
        }
        this.container.css('position', 'relative');
        var _obj = this;
        window.onresize = function() { _obj.resize(); };

        this.checkLoaded();

        // Get the faint star data
        this.changeMagnitude(0);

        var o;

        // Add named objects to the display
        if (this.objects) {
            // To stop lookUp being hammered, we'll only lookup a maximum of 5 objects
            // If you need more objects (e.g. for the Messier catalogue) build a JSON
            // file containing all the results one time only.
            var ob = this.objects.split(';');

            // Build the array of JSON requests
            for (o = 0; o < ob.length; o++) ob[o] = ((ob[o].search(/\.json$/) >= 0) ? { 'url': ob[o], 'src': 'file', 'type': 'json' } : { 'url': 'https://www.strudel.org.uk/lookUP/json/?name=' + ob[o], 'src': 'lookup', 'type': 'jsonp' });

            // Loop over the requests
            var lookups = 0;
            var ok = true;
            for (o = 0; o < ob.length; o++) {
                if (ob[o].src == "lookup") lookups++;
                if (lookups > 5) ok = false;
                if (ok || ob[o].src != "lookup") {
                    S(document).ajax(ob[o].url, {
                        dataType: ob[o].type,
                        "this": this,
                        success: function(data) {
                            // If we don't have a length property, we only have one result so make it an array
                            if (typeof data.length === "undefined") data = [data];
                            // Loop over the array of objects
                            for (var i = 0; i < data.length; i++) {
                                // The object needs an RA and Declination
                                if (data[i] && data[i].dec && data[i].ra) {
                                    this.addPointer({
                                        ra: data[i].ra.decimal,
                                        dec: data[i].dec.decimal,
                                        label: data[i].target.name,
                                        colour: this.col.pointers
                                    });
                                }
                                // Update the sky with all the points we've added
                                this.draw();
                            }
                        }
                    });
                }
            }
        }

        // If the Javascript function has been passed a width/height
        // those take precedence over the CSS-set values
        if (this.wide > 0) this.container.css({ 'width': this.wide + 'px' });
        this.wide = this.container.width();
        if (this.tall > 0) this.container.css({ 'height': this.tall + 'px' });
        this.tall = this.container.height() - 0;

        // Add a <canvas> to it with the original ID
        this.idinner = this.id + '_inner';
        this.container.html('<canvas id="' + this.idinner + '" style="display:block;"></canvas>');
        this.canvas = S('#' + this.idinner);
        this.c = document.getElementById(this.idinner);
        // For excanvas we need to initialise the newly created <canvas>
        if (this.excanvas)
            this.c = G_vmlCanvasManager.initElement(this.c);

        if (this.c && this.c.getContext) {
            this.setWH(this.wide, this.tall);
            var ctx = this.ctx = this.c.getContext('2d');
            ctx.clearRect(0, 0, this.wide, this.tall);
            ctx.beginPath();
            var fs = this.fontsize();
            ctx.font = fs + "px Helvetica";
            ctx.fillStyle = 'rgb(0,0,0)';
            ctx.lineWidth = 1.5;
            var loading = 'Loading sky...';
            ctx.fillText(loading, (ctx.wide - ctx.measureText(loading).width) / 2, (this.tall - fs) / 2);
            ctx.fill();

            var contextMenuHandler = (!this.callback.contextmenu) ? undefined : {
                longPressStart: function(x, y) {
                    contextMenuHandler.longPressStop();
                    this.longPressTimer = window.setTimeout(function() {
                        this.longPressTimer = undefined;
                        this.dragging = false;
                        this.x = "";
                        this.y = "";
                        this.theta = "";
                        contextMenuHandler.click(x, y);
                    }, 400 /** 400ms for long press */ );
                }.bind(this),
                longPressStop: function() {
                    if (this.longPressTimer !== undefined) {
                        window.clearTimeout(this.longPressTimer);
                        this.longPressTimer = undefined;
                    }
                }.bind(this)
            };

            function getXYProperties(e, sky) {
                e.matched = sky.whichPointer(e.x, e.y);
                var skyPos = sky.xy2radec(e.x, e.y);
                if (skyPos) {
                    e.ra = skyPos.ra / sky.d2r;
                    e.dec = skyPos.dec / sky.d2r;
                }
                return e;
            }

            function getXY(sky, o, el, e) {
                e.x = o.pageX - el.offset().left - window.scrollX;
                e.y = o.pageY - el.offset().top - window.scrollY;
                return getXYProperties(e, sky);
            }

            S("#" + this.idinner).on('click', { sky: this }, function(e) {
                e.data.sky.debug('click');
                var p = getXY(e.data.sky, e.originalEvent, this, e);
                if (p.matched) e.data.sky.toggleInfoBox(p.matched);
                if (p.matched >= 0) S(e.data.sky.canvas).css({ cursor: 'pointer' });
                if (e.data.sky.callback.click) e.data.sky.callback.click.call(e.data.sky, getXY(e.data.sky, e.originalEvent, this, e));
            }).on('contextmenu', { sky: this }, function(e) {
                if (e.data.sky.callback.contextmenu) {
                    e.preventDefault();
                    e.data.sky.callback.contextmenu.call(e.data.sky, getXY(e.data.sky, e.originalEvent, this, e));
                }
            }).on('dblclick', { sky: this }, function(e) {
                e.data.sky.debug('dblclick');
                e.data.sky.toggleFullScreen();
            }).on('mousemove', { sky: this }, function(e) {
                e.preventDefault();
                e.data.sky.debug('mousemove');
                var s = e.data.sky;
                var x = e.originalEvent.layerX;
                var y = e.originalEvent.layerY;
                var theta, f, dr, matched;
                if (s.mouse) s.canvas.css({ cursor: 'move' });
                if (s.dragging && s.mouse) {
                    if (s.polartype) {
                        theta = Math.atan2(y - s.tall / 2, x - s.wide / 2);
                        if (!s.theta) s.theta = theta;
                        s.az_off -= (s.theta - theta) * s.r2d;
                        s.theta = theta;
                    } else if (s.projection.id == "gnomic") {
                        f = 0.0015 * (s.fov * s.d2r);
                        dr = 0;
                        if (typeof s.x == "number") dr = Math.min(Math.abs(s.x - x) * f / (Math.cos(s.dc_off)), Math.PI / 36);
                        if (typeof s.y == "number") s.dc_off -= (s.y - y) * f;
                        s.ra_off -= (s.x - x > 0 ? 1 : -1) * dr;
                        s.dc_off = inrangeEl(s.dc_off);
                    } else {
                        if (typeof s.x == "number") s.az_off += (s.x - x) / 4;
                    }
                    s.az_off = s.az_off % 360;
                    s.x = x;
                    s.y = y;
                    s.draw();
                    s.canvas.css({ cursor: '-moz-grabbing' });
                } else {
                    matched = s.whichPointer(x, y);
                    s.toggleInfoBox(matched);
                }
                if (typeof s.callback.cursor == "function") {
                    var p = getXY(e.data.sky, e.originalEvent, this, e);
                    e.data.sky.callback.cursor.call(this, p);
                }
            }).on('mousedown', { sky: this }, function(e) {
                if (e.originalEvent.buttons === 1) {
                    e.data.sky.debug('mousedown');
                    e.data.sky.dragging = true;
                } else if (e.originalEvent.buttons === 2) {
                    this.trigger('contextmenu', e);
                }
            }).on('mouseup', { sky: this }, function(e) {
                e.data.sky.debug('mouseup');
                var s = e.data.sky;
                s.dragging = false;
                s.x = "";
                s.y = "";
                s.theta = "";
            }).on('mouseout', { sky: this }, function(e) {
                e.data.sky.debug('mouseout');
                var s = e.data.sky;
                s.dragging = false;
                s.mouseover = false;
                s.x = "";
                s.y = "";
                if (typeof s.callback.mouseout == "function") s.callback.mouseout.call(s);
            }).on('mouseenter', { sky: this }, function(e) {
                e.data.sky.debug('mouseenter');
                var s = e.data.sky;
                s.mouseover = true;
                if (typeof s.callback.mouseenter == "function") s.callback.mouseenter.call(s);
            }).on('touchmove', { sky: this }, function(e) {
                e.preventDefault();
                if (contextMenuHandler) contextMenuHandler.longPressStop();
                var s = e.data.sky;
                var x = e.originalEvent.touches[0].pageX;
                var y = e.originalEvent.touches[0].pageY;
                e.data.sky.debug('touchmove ' + x + ',' + y + ' ' + s.x + ',' + s.y + '');
                var theta, f, dr;
                if (s.dragging) {
                    if (s.polartype) {
                        theta = Math.atan2(y - s.tall / 2, x - s.wide / 2);
                        if (!s.theta) s.theta = theta;
                        s.az_off -= (s.theta - theta) * s.r2d;
                        s.theta = theta;
                    } else if (s.projection.id == "gnomic") {
                        f = 0.0015 * (s.fov * s.d2r);
                        dr = 0;
                        if (typeof s.x == "number")
                            dr = Math.min(Math.abs(s.x - x) * f / (Math.cos(s.dc_off)), Math.PI / 36);
                        if (typeof s.y == "number")
                            s.dc_off -= (s.y - y) * f;
                        s.ra_off -= (s.x - x > 0 ? 1 : -1) * dr;
                        s.dc_off = inrangeEl(s.dc_off);
                    } else {
                        if (typeof s.x == "number")
                            s.az_off += (s.x - x) / 4;
                    }
                    s.az_off = s.az_off % 360;
                    s.x = x;
                    s.y = y;
                    s.draw();
                }
            }).on('touchstart', { sky: this }, function(e) {
                e.data.sky.debug('touchstart');
                e.data.sky.dragging = true;
                if (contextMenuHandler) {
                    var x = e.originalEvent.touches[0].pageX;
                    var y = e.originalEvent.touches[0].pageY;
                    x = x - this.offset().left - window.scrollX;
                    y = y - this.offset().top - window.scrollY;
                    contextMenuHandler.longPressStart(x, y);
                    if (e.data.sky.callback.click) {
                        e.x = x;
                        e.y = y;
                        e.data.sky.callback.click.call(e.data.sky, getXYProperties(e, e.data.sky));
                    }
                }
            }).on('touchend', { sky: this }, function(e) {
                e.data.sky.debug('touchend');
                e.data.sky.dragging = false;
                e.data.sky.x = "";
                e.data.sky.y = "";
                e.data.sky.theta = "";
                if (contextMenuHandler) contextMenuHandler.longPressStop();
            }).on((isEventSupported('mousewheel') ? 'mousewheel' : 'wheel'), { sky: this }, function(e) {
                e.preventDefault();
                e.data.sky.debug('mousewheel');
                var delta = -(e.originalEvent.deltaY || e.originalEvent.wheelDelta);
                if (!delta) delta = 0;
                var s = e.data.sky;
                if (s.mouse && s.projection.id == "gnomic") {
                    s.changeFOV(delta).draw();
                    return false;
                } else return true;
            });
            S(document).on('keypress', { sky: this }, function(ev, b) {
                if (!ev) ev = window.event;
                var e = ev.originalEvent;
                var code = e.keyCode || e.charCode || e.which || 0;
                ev.data.sky.keypress(code, ev.originalEvent);
            });
        }

        this.registerKey('a', function() { this.toggleAtmosphere(); }, 'atmos');
        this.registerKey('g', function() { this.toggleGround(); }, 'ground');
        this.registerKey('h', function() { this.cycleProjection(); }, 'projection');
        this.registerKey('i', function() { this.toggleNegative(); }, 'neg');
        this.registerKey(',', function() { this.toggleEcliptic(); }, 'ec');
        this.registerKey(';', function() { this.toggleMeridian(); }, 'meridian');
        this.registerKey('e', function() { this.toggleGridlinesEquatorial(); }, 'eq');
        this.registerKey('z', function() { this.toggleGridlinesAzimuthal(); }, 'az');
        this.registerKey('m', function() { this.toggleGridlinesGalactic(); }, 'gal');
        this.registerKey('M', function() { this.toggleGalaxy(); }, 'galaxy');
        this.registerKey('q', function() { this.toggleCardinalPoints(); }, 'cardinal');
        this.registerKey('s', function() { this.toggleStars(); }, 'stars');
        this.registerKey('S', function() { this.toggleStarLabels(); }, 'starlabels');
        this.registerKey('u', function() { this.togglePlanetLabels(); }, 'sollabels');
        this.registerKey('p', function() { this.togglePlanetHints(); }, 'sol');
        this.registerKey('o', function() { this.toggleOrbits(); }, 'orbits');
        this.registerKey('c', function() { this.toggleConstellationLines(); }, 'con');
        this.registerKey('v', function() { this.toggleConstellationLabels(); }, 'names');
        this.registerKey('b', function() { this.toggleConstellationBoundaries(); }, 'conbound');
        this.registerKey('R', function() { this.toggleMeteorShowers(); }, 'meteorshowers');
        this.registerKey('1', function() { this.toggleHelp(); });
        this.registerKey('8', function() { this.setClock('now').calendarUpdate(); }, 'reset');
        this.registerKey('j', function() { if (!this.islive) this.spinIt("down"); }, 'slow');
        this.registerKey('k', function() { this.spinIt(0); }, 'stop');
        this.registerKey('l', function() { if (!this.islive) this.spinIt("up"); }, 'fast');
        this.registerKey('-', function() { this.setClock(-86400).calendarUpdate(); }, 'subtractday');
        this.registerKey('=', function() { this.setClock(86400).calendarUpdate(); }, 'addday');
        this.registerKey('[', function() { this.setClock(-86400 * 7).calendarUpdate(); }, 'subtractweek');
        this.registerKey(']', function() { this.setClock(86400 * 7).calendarUpdate(); }, 'addweek');
        this.registerKey(37, function() {
            this.az_off -= 2;
            this.draw();
        }, 'azleft'); // left
        this.registerKey(39, function() {
            this.az_off += 2;
            this.draw();
        }, 'azright'); // right
        this.registerKey(38, function() { this.changeMagnitude(0.25); }, 'magup'); // up
        this.registerKey(40, function() { this.changeMagnitude(-0.25); }, 'magdown'); // down
        this.registerKey(63, function() { this.toggleHelp(); });

        this.drawImmediate();
    };

    VirtualSky.prototype.changeMagnitude = function(m) {
        if (typeof m !== "number")
            return this;
        this.magnitude += m;
        if (!this.starsdeep && this.magnitude > 4)
            this.load('stars', this.file.stars);
        else
            this.draw();
        return this;
    };

    VirtualSky.prototype.toggleHelp = function() {
        var v = "virtualsky";
        if (S('.' + v + '_dismiss').length > 0) S('.' + v + '_dismiss').trigger('click');
        else {
            // Build the list of keyboard options
            var o = '';
            var i;
            for (i = 0; i < this.keys.length; i++) {
                if (this.keys[i].txt)
                    o += '<li>' +
                    '<strong class="' + v + '_help_key ' + v + '_' + this.keys[i].txt + '">' + this.keys[i].str + '</strong> &rarr; <a href="#" class="' + v + '_' + this.keys[i].txt + '" style="text-decoration:none;">' + this.getPhrase(this.keys[i].txt) + '</a>' +
                    '</li>';
            }
            this.container.append('<div class="' + v + '_help">' +
                '<div class="' + v + '_dismiss" title="' + this.getPhrase('close') + '">&times;</div>' +
                '<div style="margin-bottom: 0.5em;">' + this.getPhrase('keyboard') + '</div>' +
                '<div class="' + v + '_helpinner"><ul></ul></div>' +
                '<div style="font-size:0.8em;margin-top: 0.5em;">' + this.lang.title + ': ' + this.version + '</div>' +
                '</div>');

            var hlp = S('.' + v + '_help');
            var h = hlp.outerHeight();

            // Add the keyboard option list
            hlp.find('ul').html(o);

            // Set the maximum height for the list and add a scroll bar if necessary
            S('.' + v + '_helpinner').css({ 'overflow': 'auto', 'max-height': (this.tall - h) + 'px' });

            // Add the events for each keyboard option
            for (i = 0; i < this.keys.length; i++) {
                if (this.keys[i].txt)
                    S('.' + v + '_' + this.keys[i].txt)
                    .on('click', { fn: this.keys[i].fn, me: this }, function(e) {
                        e.preventDefault();
                        e.data.fn.call(e.data.me);
                    });
            }

            // Create a lightbox
            this.createLightbox(S('.' + v + '_help'));

            S('.' + v + '_help, .' + v + '_bg').on('mouseout', { sky: this }, function(e) { e.data.sky.mouseover = false; }).on('mouseenter', { sky: this }, function(e) { e.data.sky.mouseover = true; });
        }
    };
    // Register keyboard commands and associated functions
    VirtualSky.prototype.registerKey = function(charCode, fn, txt) {
        if (!is(fn, "function")) return this;
        if (!is(charCode, "object")) charCode = [charCode];
        var aok, ch, c, i, alt, str;
        for (c = 0; c < charCode.length; c++) {
            alt = false;
            if (typeof charCode[c] == "string") {
                if (charCode[c].indexOf('alt') == 0) {
                    str = charCode[c];
                    alt = true;
                    charCode[c] = charCode[c].substring(4);
                } else {
                    str = charCode[c];
                }
                ch = charCode[c].charCodeAt(0);
            } else {
                ch = charCode[c];
                var arrows = { 37: "left", 38: "up", 39: "right", 40: "down" };
                str = this.getPhrase(arrows[ch]) || String.fromCharCode(ch);
            }
            aok = true;
            for (i = 0; i < this.keys.length; i++) { if (this.keys.charCode == ch && this.keys.altKey == alt) aok = false; }
            if (aok) {
                this.keys.push({
                    'str': str,
                    'charCode': ch,
                    'char': String.fromCharCode(ch),
                    'fn': fn,
                    'txt': txt,
                    'altKey': alt
                });
            }
        }
        return this;
    };

    // Work out if the keypress has a function that needs to be called.
    VirtualSky.prototype.keypress = function(charCode, event) {
        if (!event) event = { altKey: false };
        if (this.mouseover && this.keyboard) {
            for (var i = 0; i < this.keys.length; i++) {
                if (this.keys[i].charCode == charCode && event.altKey == this.keys[i].altKey) {
                    this.keys[i].fn.call(this, { event: event });
                    break;
                }
            }
        }
    };

    VirtualSky.prototype.nearestObject = function(x, y) {
        var i, e, t, d, ang, nearest;
        e = {};
        e.matched = this.whichPointer(x, y);
        var skyPos = this.xy2radec(x, y);
        if (skyPos) {
            e.ra = skyPos.ra / this.d2r;
            e.dec = skyPos.dec / this.d2r;
        }
        d = 1e100;
        nearest = {};
        for (t in this.lookup) {
            if (this.lookup[t]) {
                for (i = 0; i < this.lookup[t].length; i++) {
                    ang = this.greatCircle(skyPos.ra, skyPos.dec, this.lookup[t][i].ra, this.lookup[t][i].dec);
                    if (ang < d) {
                        nearest = { 'distance': ang, 'label': this.lookup[t][i].label + '', 'type': t, 'data': this.lookup[t][i] };
                        d = ang;
                    }
                }
            }
        }
        nearest.distance /= this.d2r;
        if (nearest.type == "star") nearest.label = this.lang.starnames[nearest.label] || 'HIP' + nearest.label;
        return nearest;
    };

    VirtualSky.prototype.whichPointer = function(x, y) {
        for (var i = 0; i < this.pointers.length; i++)
            if (Math.abs(x - this.pointers[i].x) < 5 && Math.abs(y - this.pointers[i].y) < 5)
                return i;

        return -1;
    };
    VirtualSky.prototype.toggleInfoBox = function(i) {
        if (this.pointers.length == 0 || i >= this.pointers.length || (i >= 0 && !this.pointers[i].html))
            return this;

        if (S('#' + this.id + '_' + this.infobox).length <= 0)
            this.container.append('<div id="' + this.id + '_' + this.infobox + '" class="' + this.infobox + '" style="display:none;"></div>');
        var el = S('#' + this.id + '_' + this.infobox);
        if (i >= 0 && this.isVisible(this.pointers[i].el) && this.pointers[i].x > 0 && this.pointers[i].y > 0 && this.pointers[i].x < this.wide && this.pointers[i].y < this.tall) {
            el.html(this.pointers[i].html);
            var x = Math.round(this.pointers[i].x - Math.round(el.outerWidth() / 2)) + 'px';
            var y = Math.round(this.pointers[i].y - Math.round(el.outerHeight() / 2)) + 'px';
            el.css({ 'position': 'absolute', 'left': x, 'top': y, 'z-index': 10, 'display': 'block' });
        } else {
            el.css({ 'display': 'none' });
        }
    };
    // compute horizon coordinates from utc, ra, dec
    // ra, dec in radians
    // lat, lon in  degrees
    // results returned in hrz_altitude, hrz_azimuth
    VirtualSky.prototype.coord2horizon = function(ra, dec) {
        var ha, alt, az, sd, sl, cl;
        // compute hour angle in degrees
        ha = (Math.PI * this.times.LST / 12) - ra;
        sd = Math.sin(dec);
        sl = Math.sin(this.latitude.rad);
        cl = Math.cos(this.latitude.rad);
        // compute altitude in radians
        alt = Math.asin(sd * sl + Math.cos(dec) * cl * Math.cos(ha));
        // compute azimuth in radians
        // divide by zero error at poles or if alt = 90 deg (so we should've already limited to 89.9999)
        az = Math.acos((sd - Math.sin(alt) * sl) / (Math.cos(alt) * cl));
        // choose hemisphere
        if (Math.sin(ha) > 0) az = 2 * Math.PI - az;
        return [alt, az];
    };

    // compute ra,dec coordinates from utc, horizon coords
    // ra, dec in radians
    // results returned in hrz_altitude, hrz_azimuth
    VirtualSky.prototype.horizon2coord = function(coords) {
        // Return angle in [0, 2 * PI[
        function Map2PI(angle) {
            var n;
            var pipi = Math.PI * 2;
            if (angle < 0.0) {
                n = Math.floor(angle / pipi);
                return (angle - n * pipi);
            } else if (angle >= pipi) {
                n = Math.floor(angle / pipi);
                return (angle - n * pipi);
            } else return (angle);
        }

        // Return angle in [-PI, PI[
        function MapPI(angle) {
            var angle2PI = Map2PI(angle);
            if (angle2PI >= Math.PI) return (angle2PI - 2 * Math.PI);
            else return (angle2PI);
        }

        function convertAltAzToALTAZ3D(i) {
            var x = Math.sin(i.alt);
            const cs = Math.cos(i.alt);
            var z = cs * Math.cos(i.az);
            var y = cs * Math.sin(i.az);
            return [x, y, z];
        }

        function rotate(xyz /*: number[]*/ , axis /*: RotationDefinition*/ , angle /*:number*/ ) {
            const axes = [
                [1, 2],
                [0, 2],
                [0, 1]
            ];
            const a = axes[axis.id][0];
            const b = axes[axis.id][1];
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const ret = JSON.parse(JSON.stringify(xyz)); // Minify can't cope with ... notation

            ret[a] = xyz[a] * cos - xyz[b] * sin;
            ret[b] = xyz[b] * cos + xyz[a] * sin;

            return ret;
        }

        function convertALTAZ3DToAltAz(xyz) {
            return { 'alt': MapPI(Math.asin(xyz[0])), 'az': Map2PI(Math.atan2(xyz[1], xyz[2])) };
        }
        const xyz = convertAltAzToALTAZ3D({ az: coords[1], alt: coords[0] });
        const rotated = rotate(xyz, { id: 1 }, Math.PI / 2 + this.latitude.rad);
        const res = convertALTAZ3DToAltAz(rotated);

        return { ra: MapPI(res.az) + (Math.PI * this.times.LST / 12), dec: -res.alt };
    };

    function inrangeAz(a, deg) {
        if (deg) {
            while (a < 0) a += 360;
            while (a > 360) a -= 360;
        } else {
            var twopi = (2 * Math.PI);
            while (a < 0) a += twopi;
            while (a > twopi) a -= twopi;
        }
        return a;
    }

    function inrangeEl(a, deg) {
        if (deg) {
            if (a >= 90) a = 89.99999;
            if (a <= -90) a = -89.99999;
        } else {
            if (a >= Math.PI / 2) a = (Math.PI / 2) * 0.999999;
            if (a <= -Math.PI / 2) a = (-Math.PI / 2) * 0.999999;
        }
        return a;
    }
    VirtualSky.prototype.selectProjection = function(proj) {
        if (this.projections[proj]) {
            this.projection = this.projections[proj];
            this.projection.id = proj;
            this.fullsky = this.projection.fullsky == true;
            this.polartype = this.projection.polartype == true;

            // Set coordinate transforms

            // Convert AZ,EL -> X,Y
            // Inputs: az (rad), el (rad), width (px), height (px)
            if (typeof this.projection.azel2xy === "function") {
                this.azel2xy = this.projection.azel2xy;
            } else {
                this.azel2xy = function(az, el, w, h) {
                    if (!w) w = this.wide;
                    if (!h) h = this.tall;
                    if (az < 0) az += 360;
                    return { x: -1, y: -1, el: -1 };
                };
            }

            // Convert AZ,EL -> RA,Dec
            // Inputs: az (rad), el (rad)
            // Output: { ra: ra (deg), dec: dec (deg) }
            if (typeof this.projection.azel2radec === "function") {
                this.azel2radec = this.projection.azel2radec;
            } else {
                this.azel2radec = function(az, el) {
                    var xt, yt, r, l;
                    l = this.latitude.rad;
                    xt = Math.asin(Math.sin(el) * Math.sin(l) + Math.cos(el) * Math.cos(l) * Math.cos(az));
                    r = (Math.sin(el) - Math.sin(l) * Math.sin(xt)) / (Math.cos(l) * Math.cos(xt));
                    if (r > 1) r = 1;
                    yt = Math.acos(r);
                    if (Math.sin(az) > 0.0) yt = Math.PI * 2 - yt;
                    xt *= this.r2d;
                    yt *= this.r2d;
                    yt = (this.times.LST * 15 - yt + 360) % 360.0;
                    return { ra: yt, dec: xt };
                };
            }

            if (this.ctx) this.updateSkyGradient();

            this.updateColours();

            // Draw update label
            if (this.container) {
                var s = (this.lang.projections && this.lang.projections[proj]) ? this.lang.projections[proj] : this.projections[proj].title;
                if (S('.' + this.id + '_projection').length > 0) S('.' + this.id + '_projection').remove();
                this.container.append('<div class="' + this.id + '_projection">' + s + '</div>');
                var elem = S('.' + this.id + '_projection');
                elem.on('mouseover', { me: this }, function(e) { e.data.me.mouseover = true; })
                    .css({
                        'position': 'absolute',
                        'padding': 0,
                        'height': '2em',
                        'top': '50%',
                        'left': '50%',
                        'transform': 'translate3D(-50%,-50%,0)',
                        'text-align': 'center',
                        'line-height': '2em',
                        'z-index': 20,
                        'font-size': '1.5em',
                        'display': 'block',
                        'overflow': 'hidden',
                        'background-color': 'transparent',
                        'color': (this.negative ? this.col.black : this.col.white),
                        'opacity': 1
                    });
                setTimeout(function(e) {
                    e.fadeOut(1000, function() { this.remove(); });
                }, 500, elem);
            }
        }
    };
    // Cycle through the map projections
    VirtualSky.prototype.cycleProjection = function() {
        var usenext = false;
        var proj = this.projection.id;
        var i = 0;
        var firstkey;
        for (var key in this.projections) {
            if (this.projections[key]) {
                if (i == 0) firstkey = key;
                if (usenext) {
                    proj = key;
                    break;
                }
                if (key == this.projection.id) usenext = true;
                i++;
            }
        }
        if (proj == this.projection.id) proj = firstkey;
        this.drawImmediate(proj);
    };
    // Update the sky colours
    VirtualSky.prototype.updateColours = function() {
        // We need to make a copy of the correct colour palette otherwise it'll overwrite it
        this.col = JSON.parse(JSON.stringify(((this.negative) ? this.colours.negative : this.colours.normal)));
        //this.col = $.extend(true, {}, ((this.negative) ? this.colours.negative : this.colours.normal));
        if (this.color == "") {
            if ((this.polartype || this.projection.altlabeltext))
                this.col.txt = this.col.grey;
        } else {
            this.col.txt = this.color;
        }
    };

    VirtualSky.prototype.isVisible = function(el) {
        if (typeof this.projection.isVisible === "function") return this.projection.isVisible.call(el);
        if (!this.fullsky) return (el > 0);
        else return (this.ground) ? (el > 0) : true;
    };
    VirtualSky.prototype.isPointBad = function(p) {
        return p.x == -1 && p.y == -1;
    };
    // Return a structure with the Julian Date, Local Sidereal Time and Greenwich Sidereal Time
    VirtualSky.prototype.astronomicalTimes = function(clock, lon) {
        clock = clock || this.clock;
        lon = lon || this.longitude.deg;
        var JD, JD0, S, T, T0, UT, A, GST, d, LST;
        JD = this.getJD(clock);
        JD0 = Math.floor(JD - 0.5) + 0.5;
        S = JD0 - 2451545.0;
        T = S / 36525.0;
        T0 = (6.697374558 + (2400.051336 * T) + (0.000025862 * T * T)) % 24;
        if (T0 < 0) T0 += 24;
        UT = (((clock.getUTCMilliseconds() / 1000 + clock.getUTCSeconds()) / 60) + clock.getUTCMinutes()) / 60 + clock.getUTCHours();
        A = UT * 1.002737909;
        T0 += A;
        GST = T0 % 24;
        if (GST < 0) GST += 24;
        d = (GST + lon / 15.0) / 24.0;
        d = d - Math.floor(d);
        if (d < 0) d += 1;
        LST = 24.0 * d;
        return { GST: GST, LST: LST, JD: JD };
    };
    // Uses algorithm defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
    VirtualSky.prototype.moonPos = function(JD, sun) {
        var d2r, lo, Po, No, i, e, l, Mm, N, C, Ev, sinMo, Ae, A3, Mprimem, Ec, A4, lprime, V, lprimeprime, Nprime, lppNp, sinlppNp, y, x, lm, Bm;
        d2r = this.d2r;
        JD = JD || this.times.JD;
        sun = sun || this.sunPos(JD);
        lo = 91.929336; // Moon's mean longitude at epoch 2010.0
        Po = 130.143076; // mean longitude of the perigee at epoch
        No = 291.682547; // mean longitude of the node at the epoch
        i = 5.145396; // inclination of Moon's orbit
        e = 0.0549; // eccentricity of the Moon's orbit
        l = (13.1763966 * sun.D + lo) % 360;
        if (l < 0) l += 360;
        Mm = (l - 0.1114041 * sun.D - Po) % 360;
        if (Mm < 0) Mm += 360;
        N = (No - 0.0529539 * sun.D) % 360;
        if (N < 0) N += 360;
        C = l - sun.lon;
        Ev = 1.2739 * Math.sin((2 * C - Mm) * d2r);
        sinMo = Math.sin(sun.Mo * d2r);
        Ae = 0.1858 * sinMo;
        A3 = 0.37 * sinMo;
        Mprimem = Mm + Ev - Ae - A3;
        Ec = 6.2886 * Math.sin(Mprimem * d2r);
        A4 = 0.214 * Math.sin(2 * Mprimem * d2r);
        lprime = l + Ev + Ec - Ae + A4;
        V = 0.6583 * Math.sin(2 * (lprime - sun.lon) * d2r);
        lprimeprime = lprime + V;
        Nprime = N - 0.16 * sinMo;
        lppNp = (lprimeprime - Nprime) * d2r;
        sinlppNp = Math.sin(lppNp);
        y = sinlppNp * Math.cos(i * d2r);
        x = Math.cos(lppNp);
        lm = Math.atan2(y, x) / d2r + Nprime;
        Bm = Math.asin(sinlppNp * Math.sin(i * d2r)) / d2r;
        if (lm > 360) lm -= 360;
        return { moon: { lon: lm, lat: Bm }, sun: sun };
    };
    // Uses algorithm defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
    VirtualSky.prototype.sunPos = function(JD) {
        var D, eg, wg, e, N, Mo, v, lon, lat;
        D = (JD - 2455196.5); // Number of days since the epoch of 2010 January 0.0
        // Calculated for epoch 2010.0. If T is the number of Julian centuries since 1900 January 0.5 = (JD-2415020.0)/36525
        eg = 279.557208; // mean ecliptic longitude in degrees = (279.6966778 + 36000.76892*T + 0.0003025*T*T)%360;
        wg = 283.112438; // longitude of the Sun at perigee in degrees = 281.2208444 + 1.719175*T + 0.000452778*T*T;
        e = 0.016705; // eccentricity of the Sun-Earth orbit in degrees = 0.01675104 - 0.0000418*T - 0.000000126*T*T;
        N = ((360 / 365.242191) * D) % 360;
        if (N < 0) N += 360;
        Mo = (N + eg - wg) % 360; // mean anomaly in degrees
        if (Mo < 0) Mo += 360;
        v = Mo + (360 / Math.PI) * e * Math.sin(Mo * Math.PI / 180);
        lon = v + wg;
        if (lon > 360) lon -= 360;
        lat = 0;
        return { lat: lat, lon: lon, Mo: Mo, D: D, N: N };
    };
    // Input is Julian Date
    // Uses method defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
    VirtualSky.prototype.meanObliquity = function(JD) {
        if (!JD) JD = this.times.JD;
        var T, T2, T3;
        T = (JD - 2451545.0) / 36525; // centuries since 2451545.0 (2000 January 1.5)
        T2 = T * T;
        T3 = T2 * T;
        return (23.4392917 - 0.0130041667 * T - 0.00000016667 * T2 + 0.0000005027778 * T3) * this.d2r;
    };
    // Take input in radians, decimal Sidereal Time and decimal latitude
    // Uses method defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
    VirtualSky.prototype.ecliptic2azel = function(l, b, LST, lat) {
        if (!LST) {
            this.times = this.astronomicalTimes();
            LST = this.times.LST;
        }
        if (!lat) lat = this.latitude.rad;
        var sl, cl, sb, cb, v, e, ce, se, Cprime, s, ST, cST, sST, B, r, sphi, cphi, A, w, theta, psi;
        sl = Math.sin(l);
        cl = Math.cos(l);
        sb = Math.sin(b);
        cb = Math.cos(b);
        v = [cl * cb, sl * cb, sb];
        e = this.meanObliquity();
        ce = Math.cos(e);
        se = Math.sin(e);
        Cprime = [
            [1.0, 0.0, 0.0],
            [0.0, ce, -se],
            [0.0, se, ce]
        ];
        s = this.vectorMultiply(Cprime, v);
        ST = LST * 15 * this.d2r;
        cST = Math.cos(ST);
        sST = Math.sin(ST);
        B = [
            [cST, sST, 0],
            [sST, -cST, 0],
            [0, 0, 1]
        ];
        r = this.vectorMultiply(B, s);
        sphi = Math.sin(lat);
        cphi = Math.cos(lat);
        A = [
            [-sphi, 0, cphi],
            [0, -1, 0],
            [cphi, 0, sphi]
        ];
        w = this.vectorMultiply(A, r);
        theta = Math.atan2(w[1], w[0]);
        psi = Math.asin(w[2]);
        return { az: theta, el: psi };
    };
    // Convert from ecliptic l,b -> RA,Dec
    // Inputs: l (rad), b (rad), Julian date
    VirtualSky.prototype.ecliptic2radec = function(l, b, JD) {
        var e = this.meanObliquity();
        var sl = Math.sin(l);
        var cl = Math.cos(l);
        var sb = Math.sin(b);
        var cb = Math.cos(b);
        var tb = Math.tan(b);
        var se = Math.sin(e);
        var ce = Math.cos(e);
        var ra = Math.atan2((sl * ce - tb * se), (cl));
        var dec = Math.asin(sb * ce + cb * se * sl);
        // Make sure RA is positive
        if (ra < 0) ra += Math.PI + Math.PI;
        return { ra: ra, dec: dec };
    };
    // Convert Ecliptic coordinates to x,y position
    // Inputs: l (rad), b (rad), local sidereal time
    // Returns [x, y (,elevation)]
    VirtualSky.prototype.ecliptic2xy = function(l, b, LST) {
        LST = LST || this.times.LST;
        var pos;
        if (typeof this.projection.ecliptic2xy === "function") return this.projection.ecliptic2xy.call(this, l, b, LST);
        else {
            if (this.fullsky) {
                pos = this.ecliptic2radec(l, b);
                return this.radec2xy(pos.ra, pos.dec);
            } else {
                pos = this.ecliptic2azel(l, b, LST);
                var el = pos.el * this.r2d;
                pos = this.azel2xy(pos.az - (this.az_off * this.d2r), pos.el, this.wide, this.tall);
                pos.el = el;
                return pos;
            }
        }
        return 0;
    };

    // Convert RA,Dec -> X,Y
    // Inputs: RA (rad), Dec (rad)
    // Returns [x, y (,elevation)]
    VirtualSky.prototype.radec2xy = function(ra, dec) {
        if (typeof this.projection.radec2xy === "function") return this.projection.radec2xy.call(this, ra, dec);
        else {
            var coords = this.coord2horizon(ra, dec);
            // Only return coordinates above the horizon
            //if(coords[0] > 0){
            var pos = this.azel2xy(coords[1] - (this.az_off * this.d2r), coords[0], this.wide, this.tall);
            return { x: pos.x, y: pos.y, az: coords[1] * this.r2d, el: coords[0] * this.r2d };
            //}
        }
        return 0;
    };

    // Returns {ra (rad), dec (rad)}
    VirtualSky.prototype.xy2radec = function(x, y) {
        if (typeof this.projection.xy2radec === "function") return this.projection.xy2radec.call(this, x, y);
        else if (typeof this.projection.xy2azel === "function") {
            var azel = this.projection.xy2azel(x, y, this.wide, this.tall);
            if (azel === undefined) {
                return undefined;
            }

            var coords = [azel[1], azel[0] + (this.az_off * this.d2r)];

            return this.horizon2coord(coords);
        } else {
            return undefined;
        }
    };

    // Dummy function - overwritten in selectProjection
    // Convert AZ,EL -> X,Y
    // Inputs: az (degrees), el (degrees), width (px), height (px)
    // Output: { x: x, y: y }
    VirtualSky.prototype.azel2xy = function(az, el, w, h) { return { x: -1, y: -1 }; };

    // Dummy functions - overwritten in selectProjection
    // Convert AZ,EL -> RA,Dec
    // Inputs: az (rad), el (rad)
    // Output: { ra: ra (deg), dec: dec (deg) }
    VirtualSky.prototype.azel2radec = function(az, el) { return { ra: 0, dec: 0 }; };

    // Convert Galactic -> x,y
    // Inputs: longitude (rad), latitude (rad)
    VirtualSky.prototype.gal2xy = function(l, b) {
        var pos = this.gal2radec(l, b);
        return this.radec2xy(pos[0], pos[1]);
    };

    // Convert Galactic -> J2000
    // Inputs: longitude (rad), latitude (rad)
    VirtualSky.prototype.gal2radec = function(l, b) {
        // Using SLALIB values
        return this.Transform([l, b], [-0.054875539726, 0.494109453312, -0.867666135858, -0.873437108010, -0.444829589425, -0.198076386122, -0.483834985808, 0.746982251810, 0.455983795705], false);
    };

    // Input is a two element position (degrees) and rotation matrix
    // Output is a two element position (degrees)
    VirtualSky.prototype.Transform = function(p, rot, indeg) {
        if (indeg) {
            p[0] *= this.d2r;
            p[1] *= this.d2r;
        }
        var cp1 = Math.cos(p[1]);
        var m = [Math.cos(p[0]) * cp1, Math.sin(p[0]) * cp1, Math.sin(p[1])];
        var s = [m[0] * rot[0] + m[1] * rot[1] + m[2] * rot[2], m[0] * rot[3] + m[1] * rot[4] + m[2] * rot[5], m[0] * rot[6] + m[1] * rot[7] + m[2] * rot[8]];
        var r = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
        var b = Math.asin(s[2] / r); // Declination in range -90 -> +90
        var cb = Math.cos(b);
        var a = Math.atan2(((s[1] / r) / cb), ((s[0] / r) / cb));
        if (a < 0) a += Math.PI * 2;
        if (indeg) return [a * this.r2d, b * this.r2d];
        else return [a, b];
    };
    // Convert from B1875 to J2000
    // Using B = 1900.0 + (JD − 2415020.31352) / 365.242198781 and p73 Practical Astronomy With A Calculator
    VirtualSky.prototype.fk1tofk5 = function(a, b) {
        // Convert from B1875 -> J2000
        return this.Transform([a, b], [0.9995358730015703, -0.02793693620138929, -0.012147682028606801, 0.027936935758478665, 0.9996096732234282, -0.00016976035344812515, 0.012147683047201562, -0.00016968744936278707, 0.9999261997781408]);
    };
    VirtualSky.prototype.vectorMultiply = function(A, B) {
        if (B.length > 0) {
            // 2D (3x3)x(3x3) or 1D (3x3)x(3x1)
            if (B[0].length > 0) return [
                [(A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0]), (A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1]), (A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2])],
                [(A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0]), (A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1]), (A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2])],
                [(A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0]), (A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1]), (A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2])]
            ];
            else return [(A[0][0] * B[0] + A[0][1] * B[1] + A[0][2] * B[2]), (A[1][0] * B[0] + A[1][1] * B[1] + A[1][2] * B[2]), (A[2][0] * B[0] + A[2][1] * B[1] + A[2][2] * B[2])];
        }
    };
    VirtualSky.prototype.setFont = function() { this.ctx.font = this.fontsize() + "px " + this.canvas.css('font-family'); };
    VirtualSky.prototype.fontsize = function() {
        if (this.fntsze) return parseInt(this.fntsze);
        var m = Math.min(this.wide, this.tall);
        return (m < 600) ? ((m < 500) ? ((m < 350) ? ((m < 300) ? ((m < 250) ? 9 : 10) : 11) : 12) : 14) : parseInt(this.container.css('font-size'));
    };
    VirtualSky.prototype.positionCredit = function() {
        this.container.find('.' + this.id + '_credit').css({ position: 'absolute', top: (parseFloat(this.tall) - this.padding - this.fontsize()) + 'px', left: this.padding + 'px' });
    };
    VirtualSky.prototype.updateSkyGradient = function() {
        var s = null;
        if (this.ctx && this.hasGradient()) {
            if (this.projection.polartype) {
                if (typeof this.ctx.createRadialGradient === "function") {
                    s = this.ctx.createRadialGradient(this.wide / 2, this.tall / 2, 0, this.wide / 2, this.tall / 2, this.tall / 2);
                    s.addColorStop(0, 'rgba(0,0,0,1)');
                    s.addColorStop(0.7, 'rgba(0,0,0,0.2)');
                    s.addColorStop(1, 'rgba(0,50,80,0.3)');
                }
            } else {
                s = this.ctx.createLinearGradient(0, 0, 0, this.tall);
                s.addColorStop(0.0, 'rgba(0,30,50,0.1)');
                s.addColorStop(0.7, 'rgba(0,30,50,0.35)');
                s.addColorStop(1, 'rgba(0,50,80,0.6)');
            }
        }
        this.skygrad = s;
        return this;
    };

    VirtualSky.prototype.draw = function() {
        // Redraw within 20ms. Used to avoid redraw pilling up, introducing vast lag
        if (this.pendingRefresh !== undefined) return;
        this.pendingRefresh = window.setTimeout(this.drawImmediate.bind(this), 20);
    };

    VirtualSky.prototype.drawImmediate = function(proj) {
        // Don't bother drawing anything if there is no physical area to draw on
        if (this.pendingRefresh !== undefined) {
            window.clearTimeout(this.pendingRefresh);
            this.pendingRefresh = undefined;
        }

        if (this.wide <= 0 || this.tall <= 0) return this;
        if (!(this.c && this.c.getContext)) return this;

        if (proj !== undefined) this.selectProjection(proj);
        var white = this.col.white;
        var black = this.col.black;
        var i, off, clockstring, metric_clock, positionstring, metric_pos;

        // Shorthands
        var c = this.ctx;
        var d = this.container;

        c.moveTo(0, 0);
        c.clearRect(0, 0, this.wide, this.tall);
        c.fillStyle = (this.polartype || this.fullsky) ? this.background : ((this.negative) ? white : black);
        c.fillRect(0, 0, this.wide, this.tall);
        c.fill();

        if (this.polartype) {
            c.moveTo(this.wide / 2, this.tall / 2);
            c.closePath();
            c.beginPath();
            c.arc(this.wide / 2, this.tall / 2, -0.5 + this.tall / 2, 0, Math.PI * 2, true);
            c.closePath();
            if (!this.transparent) {
                c.fillStyle = (this.hasGradient()) ? "rgba(0,15,30, 1)" : ((this.negative) ? white : black);
                c.fill();
            }
            c.lineWidth = 0.5;
            c.strokeStyle = black;
            c.stroke();
        } else if (typeof this.projection.draw === "function") this.projection.draw.call(this);

        if (this.hasGradient()) {
            if (!this.skygrad) {
                this.updateSkyGradient();
            } else {
                c.beginPath();
                c.fillStyle = this.skygrad;
                // draw shapes
                if (this.projection.polartype) {
                    c.arc(this.wide / 2, this.tall / 2, this.tall / 2, 0, 2 * Math.PI, false);
                    c.fill();
                } else c.fillRect(0, 0, this.wide, this.tall);
                c.closePath();
            }
        }

        this.startClip()
            .drawGridlines("az")
            .drawGridlines("eq")
            .drawGridlines("gal")
            .drawGalaxy()
            .drawConstellationLines()
            .drawConstellationBoundaries()
            .drawStars()
            .drawEcliptic()
            .drawMeridian()
            .drawPlanets()
            .drawMeteorShowers()
            .endClip()
            .drawCardinalPoints();

        for (i = 0; i < this.pointers.length; i++) this.highlight(i);

        var txtcolour = (this.color != "") ? (this.color) : this.col.txt;
        var fontsize = this.fontsize();

        c.fillStyle = txtcolour;
        c.lineWidth = 1.5;
        this.setFont();
        this.container.css({ 'font-size': this.fontsize() + 'px', 'position': 'relative' });

        // Time line
        if (this.showdate) {
            clockstring = this.clock.toDateString() + ' ' + this.clock.toLocaleTimeString();
            metric_clock = this.drawText(clockstring, this.padding, this.padding + fontsize);
        }

        // Position line
        if (this.showposition) {
            positionstring = Math.abs(this.latitude.deg).toFixed(2) + ((this.latitude.rad > 0) ? this.getPhrase('N') : this.getPhrase('S')) + ', ' + Math.abs(this.longitude.deg).toFixed(2) + ((this.longitude.rad > 0) ? this.getPhrase('E') : this.getPhrase('W'));
            metric_pos = this.drawText(positionstring, this.padding, this.padding + fontsize + fontsize);
        }

        // Credit line
        if (this.credit) {
            var credit = this.getPhrase('power');
            var metric_credit = this.drawText(credit, this.padding, this.tall - this.padding);
            // Float a transparent link on top of the credit text
            if (d.find('.' + this.id + '_credit').length == 0) d.append('<div class="' + this.id + '_credit"><a href="http://slowe.github.io/VirtualSky/" target="_parent" title="Las Cumbres Observatory">' + this.getPhrase('powered') + '</a></div>');
            d.find('.' + this.id + '_credit').css({ padding: 0, 'z-index': 20, display: 'block', overflow: 'hidden', 'background-color': 'transparent' });
            d.find('.' + this.id + '_credit a').css({ display: 'block', width: Math.ceil(metric_credit) + 'px', height: fontsize + 'px' });
            this.positionCredit();
        }
        if (this.showhelp) {
            var helpstr = '?';
            if (d.find('.' + this.id + '_help').length == 0)
                d.append('<div class="' + this.id + '_help"><a href="#">' + helpstr + '</a></div>')
                .find('.' + this.id + '_help')
                .css({
                    position: 'absolute',
                    'padding': this.padding + 'px',
                    'z-index': 20,
                    display: 'block',
                    overflow: 'hidden',
                    'background-color': 'transparent',
                    'right': 0 + 'px',
                    'top': 0 + 'px'
                }).find('a').css({
                    'text-decoration': 'none',
                    color: txtcolour
                }).on('click', { me: this }, function(e) { e.data.me.toggleHelp(); });
            d.find('.' + this.id + '_help').find('a').css({ color: txtcolour });
        }
        // Make help button
        if (this.container.find('.' + this.id + '_btn_help').length == 0) {
            this.container.append('<div class="' + this.id + '_btn_help virtualskybutton" title="' + this.getPhrase('help') + '">?</div>');
            off = S('#' + this.idinner).position();
            this.container.find('.' + this.id + '_btn_help').css({
                'position': 'absolute',
                'top': (off.top + this.padding) + 'px',
                'right': this.padding + 'px',
                'z-index': 20
            }).on('click', { me: this }, function(e) {
                e.data.me.toggleHelp();
            });
        }
        if (this.container.find('.' + this.id + '_clock').length == 0) {
            this.container.append('<div class="' + this.id + '_clock" title="' + this.getPhrase('datechange') + '">' + clockstring + '</div>');
            off = S('#' + this.idinner).position();
            this.container.find('.' + this.id + '_clock').css({
                'position': 'absolute',
                'padding': 0 + 'px',
                'width': Math.round(metric_clock) + 'px',
                cursor: 'pointer',
                top: (off.top + this.padding) + 'px',
                left: (off.left + this.padding) + 'px',
                'z-index': 20,
                display: 'block',
                overflow: 'hidden',
                'background-color': 'transparent',
                color: 'transparent'
            }).on('click', { sky: this }, function(e) {
                var s = e.data.sky;
                var id = s.id;
                var hid = '#' + id;
                var v = "virtualsky";
                if (S(hid + '_calendar').length == 0) {
                    var w = 280;
                    if (s.wide < w) w = s.wide;
                    s.container.append(
                        '<div id="' + id + '_calendar" class="' + v + 'form">' +
                        '<div style="" id="' + id + '_calendar_close" class="' + v + '_dismiss" title="' + s.getPhrase('close') + '">&times;</div>' +
                        '<div style="text-align:center;margin:2px;">' + s.getPhrase('date') + '</div>' +
                        '<div style="text-align:center;">' +
                        '<input type="date" id="' + id + '_date" value="' + (s.clock.getFullYear() + '-' + ((s.clock.getMonth() < 9 ? "0" : "") + (s.clock.getMonth() + 1)) + '-' + (s.clock.getDate() < 10 ? "0" : "") + s.clock.getDate()) + '" />' +
                        '<input type="time" id="' + id + '_time" value="' + (s.clock.getHours() < 10 ? '0' : '') + s.clock.getHours() + ':' + (s.clock.getMinutes() < 10 ? '0' : '') + s.clock.getMinutes() + '" />' +
                        '</div>' +
                        '</div>');
                    S(hid + '_calendar').css({ width: w });
                    S(hid + '_calendar input').on('change', { sky: s }, function(e) {
                        var d = S('#' + id + '_date').val();
                        var t = S('#' + id + '_time').val();
                        e.data.sky.updateClock(new Date(parseInt(d.substr(0, 4)), parseInt(d.substr(5, 2)) - 1, parseInt(d.substr(8, 2)), parseInt(t.substr(0, 2)), parseInt(t.substr(3, 2)), 0, 0));
                        e.data.sky.calendarUpdate();
                        e.data.sky.draw();
                    });
                }
                s.createLightbox(S(hid + '_calendar'));
                S(hid + '_year').val(s.clock.getFullYear());
                S(hid + '_month').val(s.clock.getMonth() + 1);
                S(hid + '_day').val(s.clock.getDate());
                S(hid + '_hours').val(s.clock.getHours());
                S(hid + '_mins').val(s.clock.getMinutes());
            });
        }

        if (S('.' + this.id + '_position').length == 0) {
            this.container.append('<div class="' + this.id + '_position" title="' + this.getPhrase('positionchange') + '">' + positionstring + '</div>');
            S('.' + this.id + '_position').on('click', { sky: this }, function(e) {
                var s = e.data.sky;
                var id = s.id;
                var hid = '#' + id;
                var v = "virtualsky";
                if (S(hid + '_geo').length == 0) {
                    var w = 310;
                    var narrow = '';
                    if (s.wide < w) {
                        narrow = '<br style="clear:both;margin-top:20px;" />';
                        w = w / 2;
                    }
                    s.container.append(
                        '<div id="' + id + '_geo" class="' + v + 'form">' +
                        '<div id="' + id + '_geo_close" class="' + v + '_dismiss" title="' + s.getPhrase('close') + '">&times;</div>' +
                        '<div style="text-align:center;margin:2px;">' + s.getPhrase('position') + '</div>' +
                        '<div style="text-align:center;">' +
                        '<input type="text" id="' + id + '_lat" value="" style="padding-right:10px!important;">' +
                        '<div class="divider">' + s.getPhrase('N') + '</div>' +
                        narrow + '<input type="text" id="' + id + '_long" value="" />' +
                        '<div class="divider">' + s.getPhrase('E') + '</div>' +
                        '</div>' +
                        '</div>');
                    S(hid + '_geo').css({ width: w + 'px', 'align': 'center' });
                    S(hid + '_geo input').css({ width: '6em' });
                }
                s.createLightbox(S(hid + '_geo'), {
                    'close': function(e) {
                        if (this.vs) this.vs.setGeo(S(hid + '_lat').val() + ',' + S(hid + '_long').val()).setClock(0).draw();
                    }
                });
                S(hid + '_lat').val(s.latitude.deg);
                S(hid + '_long').val(s.longitude.deg);
                if (typeof s.callback.geo == "function") s.callback.geo.call(s);
            });
        }

        off = S('#' + this.idinner).position();
        S('.' + this.id + '_position').css({
            position: 'absolute',
            padding: 0,
            'width': Math.round(metric_pos) + 'px',
            cursor: 'pointer',
            top: (off.top + this.padding + fontsize) + 'px',
            left: (off.left + this.padding) + 'px',
            'z-index': 20,
            display: 'block',
            overflow: 'hidden',
            'background-color': 'transparent',
            color: 'transparent'
        });
        return this;
    };
    VirtualSky.prototype.startClip = function() {
        if (this.polartype) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(this.wide / 2, this.tall / 2, -0.5 + this.tall / 2, 0, Math.PI * 2, true);
            this.ctx.clip();
        }
        return this;
    };
    VirtualSky.prototype.endClip = function() {
        if (this.polartype) this.ctx.restore();
        return this;
    };
    VirtualSky.prototype.createLightbox = function(lb, opts) {
        if (!lb.length) return this;
        if (!opts) opts = {};

        function Lightbox(lb, vs, opts) {
            this.lb = lb;
            this.vs = vs;
            this.opts = opts || {};

            var n = "virtualsky_bg";
            if (this.vs.container.find('.' + n).length == 0) this.vs.container.append('<div class="' + n + '" style="position:absolute;z-index:99;left:0px;top:0px;right:0px;bottom:0px;background-color:rgba(0,0,0,0.7);"></div>');
            var bg = this.vs.container.find('.' + n);
            if (bg.length > 0) bg.show();
            this.bg = bg;
            this.vs.container.find('.virtualsky_dismiss').on('click', { lb: this }, function(e) { e.data.lb.close(); });
            bg.on('click', { lightbox: this }, function(e) { e.data.lightbox.close(); });
            // Update lightbox when the screen is resized
            this.vs.on('resize', function(e) { if (this.lightbox) this.lightbox.resize(); });
            // Set positions
            this.resize();

            return this;
        }
        Lightbox.prototype.resize = function() {
            function columize(wide, tall) {
                // Make each li as wide as it needs to be so we can calculate the widest
                this.lb.css({ 'width': '100%' });
                // Remove positioning so we can work out sizes
                this.lb.find('ul').css({ 'width': '' }).find('li').css({ 'display': 'inline-block', 'margin-left': '0px', 'width': '' });
                var w = this.lb.parent().width();
                var bar = 24;
                var li = this.lb.find('ul li');
                var mx = 1;
                for (var i = 0; i < li.length; i++) mx = Math.max(mx, S(li[i]).outerWidth());
                // If the list items are wider than the space we have we turn them
                // into block items otherwise set their widths to the maximum width.
                var n = Math.floor(w / (mx + bar));
                if (n > 1) {
                    if (n > 3) n = 3;
                    this.lb.find('li').css({ 'width': (100 / n) + '%', 'border-left': Math.floor(bar / 2) + 'px solid transparent', 'box-sizing': 'border-box' });
                    this.lb.find('li:nth-child(' + n + 'n+1)').css({ 'margin-left': '0px' });
                } else {
                    this.lb.find('li').css({ 'display': 'block', 'width': '' });
                }
                this.lb.find('ul').css({ 'width': '100%' }).parent().css({ 'width': (w <= 500 ? '100%' : Math.min(w - bar, (mx + bar / 2) * n + bar) + 'px') });
                this.lb.css({ 'width': (w <= 500 ? '100%' : '') });
            }
            columize.call(this, this.vs.wide, this.vs.tall);
            this.lb.css({ 'position': 'relative', left: '50%', top: '50%', 'transform': 'translate3d(-50%,-50%,0)', 'max-height': '100%', 'box-sizing': 'border-box', 'z-index': 100, 'position': 'absolute' });
            return this;
        };
        Lightbox.prototype.close = function() {
            // Trigger any close function provided
            if (typeof this.opts.close === "function") this.opts.close.call(this);

            // Now remove the lightbox DOM
            this.lb.remove();
            this.bg.remove();
            this.vs.lightbox = null;
            return this;
        };

        this.lightbox = new Lightbox(lb, this, opts);

        return this;
    };

    VirtualSky.prototype.drawStars = function() {

        if (!this.showstars && !this.showstarlabels) return this;
        var mag, i, p, d, atmos, fovf;
        var c = this.ctx;
        c.beginPath();
        c.fillStyle = this.col.stars;
        this.az_off = (this.az_off + 360) % 360;
        atmos = this.hasAtmos();
        fovf = Math.sqrt(30 / this.fov);
        var f = 1;
        if (this.negative) f *= 1.4;
        if (typeof this.scalestars === "number" && this.scalestars != 1) f *= this.scalestars;
        if (this.projection.id === "gnomic") f *= fovf;

        for (i = 0; i < this.stars.length; i++) {
            if (this.stars[i][1] < this.magnitude) {
                mag = this.stars[i][1];
                p = this.radec2xy(this.stars[i][2], this.stars[i][3]);
                if (this.isVisible(p.el) && !isNaN(p.x) && !this.isPointBad(p)) {
                    d = 0.8 * Math.max(3 - mag / 2.1, 0.5);
                    // Modify the 'size' of the star by how close to the horizon it is
                    // i.e. smaller when closer to the horizon
                    if (atmos) d *= Math.exp(-(90 - p.el) * 0.01);
                    d *= f;
                    c.moveTo(p.x + d, p.y);
                    if (this.showstars) c.arc(p.x, p.y, d, 0, Math.PI * 2, true);
                    if (this.showstarlabels && this.starnames[this.stars[i][0]]) this.drawLabel(p.x, p.y, d, "", this.htmlDecode(this.starnames[this.stars[i][0]]));
                }
            }
        }
        c.fill();

        return this;
    };

    VirtualSky.prototype.hasAtmos = function() {
        return (typeof this.projection.atmos === "boolean") ? (this.gradient ? this.projection.atmos : this.gradient) : this.gradient;
    };

    VirtualSky.prototype.hasGradient = function() {
        return (this.hasAtmos() && !this.fullsky && !this.negative) ? true : false;
    };

    // When provided with an array of Julian dates, ra, dec, and magnitude this will interpolate to the nearest
    // data = [jd_1, ra_1, dec_1, mag_1, jd_2, ra_2, dec_2, mag_2....]
    VirtualSky.prototype.interpolate = function(jd, data) {
        var mindt = jd; // Arbitrary starting value in days
        var mini = 0; // index where we find the minimum
        for (var i = 0; i < data.length; i += 4) {
            // Find the nearest point to now
            var dt = (jd - data[i]);
            if (Math.abs(dt) < Math.abs(mindt)) {
                mindt = dt;
                mini = i;
            }
        }
        var dra, ddec, dmag, pos_2, pos_1, fract;
        if (mindt >= 0) {
            pos_2 = mini + 1 + 4;
            pos_1 = mini + 1;
            fract = mindt / Math.abs(data[pos_2 - 1] - data[pos_1 - 1]);
        } else {
            pos_2 = mini + 1;
            pos_1 = mini + 1 - 4;
            fract = (1 + (mindt) / Math.abs(data[pos_2 - 1] - data[pos_1 - 1]));
        }
        // We don't want to attempt to find positions beyond the edges of the array
        if (pos_2 > data.length || pos_1 < 0) {
            dra = data[mini + 1];
            ddec = data[mini + 2];
            dmag = data[mini + 3];
        } else {
            dra = (Math.abs(data[pos_2] - data[pos_1]) > 180) ? (data[pos_1] + (data[pos_2] + 360 - data[pos_1]) * fract) % 360 : (data[pos_1] + (data[pos_2] - data[pos_1]) * fract) % 360;
            ddec = data[pos_1 + 1] + (data[pos_2 + 1] - data[pos_1 + 1]) * fract;
            dmag = data[pos_1 + 2] + (data[pos_2 + 2] - data[pos_1 + 2]) * fract;
        }
        return { ra: dra, dec: ddec, mag: dmag };
    };
    VirtualSky.prototype.drawPlanets = function() {

        if (!this.showplanets && !this.showplanetlabels && !this.showorbits) return this;
        if (!this.planets || this.planets.length <= 0) return this;
        var ra, dec, mag, pos, p;
        var c = this.ctx;
        var oldjd = this.jd;
        this.jd = this.times.JD;

        var colour = this.col.grey;
        var maxl = this.maxLine();
        this.lookup.planet = [];
        for (p = 0; p < this.planets.length; p++) {
            // We'll allow 2 formats here:
            // [Planet name,colour,ra,dec,mag] or [Planet name,colour,[jd_1, ra_1, dec_1, mag_1, jd_2, ra_2, dec_2, mag_2....]]
            if (!this.planets[p]) continue;
            if (this.planets[p].length == 3) {
                // Find nearest JD
                if (this.planets[p][2].length % 4 == 0) {
                    if (this.jd > this.planets[p][2][0] && this.jd < this.planets[p][2][(this.planets[p][2].length - 4)]) {
                        var interp = this.interpolate(this.jd, this.planets[p][2]);
                        ra = interp.ra;
                        dec = interp.dec;
                        mag = interp.mag;
                    } else {
                        continue; // We don't have data for this planet so skip to the next
                    }
                }
            } else {
                ra = this.planets[p][2];
                dec = this.planets[p][3];
            }
            this.lookup.planet.push({ 'ra': ra * this.d2r, 'dec': dec * this.d2r, 'label': (this.lang.planets ? this.lang.planets[this.planets[p][0]] : "?") });
            pos = this.radec2xy(ra * this.d2r, dec * this.d2r);

            if (!this.negative) colour = this.planets[p][1];
            if (typeof colour === "string") c.strokeStyle = colour;

            if ((this.showplanets || this.showplanetlabels) && this.isVisible(pos.el) && mag < this.magnitude && !this.isPointBad(pos)) {
                var d = 0;
                if (mag !== undefined) {
                    d = 0.8 * Math.max(3 - mag / 2, 0.5);
                    if (this.hasAtmos()) d *= Math.exp(-((90 - pos.el) * this.d2r) * 0.6);
                }
                if (d < 1.5) d = 1.5;
                this.drawPlanet(pos.x, pos.y, d, colour, this.planets[p][0]);
            }

            if (this.showorbits && mag < this.magnitude) {
                c.beginPath();
                c.lineWidth = 0.5;
                this.setFont();
                c.lineWidth = 1;
                var previous = { x: -1, y: -1, el: -1 };
                for (i = 0; i < this.planets[p][2].length - 4; i += 4) {
                    var point = this.radec2xy(this.planets[p][2][i + 1] * this.d2r, this.planets[p][2][i + 2] * this.d2r);
                    if (previous.x > 0 && previous.y > 0 && this.isVisible(point.el)) {
                        c.moveTo(previous.x, previous.y);
                        // Basic error checking: points behind us often have very long lines so we'll zap them
                        if (Math.abs(point.x - previous.x) < maxl) {
                            c.lineTo(point.x, point.y);
                        }
                    }
                    previous = point;
                }
                c.stroke();
            }
        }

        // Sun & Moon
        if (this.showplanets || this.showplanetlabels) {

            // Only recalculate the Moon's ecliptic position if the time has changed
            if (oldjd != this.jd) {
                p = this.moonPos(this.jd);
                this.moon = p.moon;
                this.sun = p.sun;
            }
            // Draw the Sun
            if (this.sun) {
                pos = this.ecliptic2xy(this.sun.lon * this.d2r, this.sun.lat * this.d2r, this.times.LST);
                if (this.isVisible(pos.el) && !this.isPointBad(pos)) {
                    this.drawPlanet(pos.x, pos.y, 5, this.col.sun, "sun");
                    this.lookup.sun = [this.ecliptic2radec(this.sun.lon * this.d2r, this.sun.lat * this.d2r, this.times.LST)];
                    this.lookup.sun[0].label = this.lang.sun;
                }
            }
            // Draw Moon last as it is closest
            if (this.moon) {
                pos = this.ecliptic2xy(this.moon.lon * this.d2r, this.moon.lat * this.d2r, this.times.LST);
                if (this.isVisible(pos.el) && !this.isPointBad(pos)) {
                    this.drawPlanet(pos.x, pos.y, 5, this.col.moon, "moon");
                    this.lookup.moon = [this.ecliptic2radec(this.moon.lon * this.d2r, this.moon.lat * this.d2r, this.times.LST)];
                    this.lookup.moon[0].label = this.lang.moon;
                }
            }

        }
        return this;
    };
    VirtualSky.prototype.drawPlanet = function(x, y, d, colour, label) {
        var c = this.ctx;
        c.beginPath();
        c.fillStyle = colour;
        c.strokeStyle = colour;
        c.moveTo(x + d, y + d);
        if (this.showplanets) c.arc(x, y, d, 0, Math.PI * 2, true);
        label = this.getPhrase('planets', label);
        if (this.showplanetlabels) this.drawLabel(x, y, d, colour, label);
        c.fill();
        return this;
    };
    VirtualSky.prototype.drawText = function(txt, x, y) {
        this.ctx.beginPath();
        this.ctx.fillText(txt, x, y);
        return this.ctx.measureText(txt).width;
    };
    // Helper function. You'll need to wrap it with a this.ctx.beginPath() and a this.ctx.fill();
    VirtualSky.prototype.drawLabel = function(x, y, d, colour, label) {
        if (label === undefined) return this;
        var c = this.ctx;
        if (colour.length > 0) c.fillStyle = colour;
        c.lineWidth = 1.5;
        var xoff = d;
        if ((this.polartype) && c.measureText) xoff = -c.measureText(label).width - 3;
        if ((this.polartype) && x < this.wide / 2) xoff = d;
        c.fillText(label, x + xoff, y - (d + 2));
        return this;
    };
    VirtualSky.prototype.drawConstellationLines = function(colour) {
        if (!(this.constellation.lines || this.constellation.labels)) return this;
        if (!colour) colour = this.col.constellation;
        var x = this.ctx;
        x.beginPath();
        x.strokeStyle = colour;
        x.fillStyle = colour;
        x.lineWidth = (this.constellation.lineWidth || 0.75);
        var fontsize = this.fontsize();
        this.setFont();
        if (typeof this.lines !== "object") return this;
        var pos, posa, posb, a, b, l, idx1, idx2, s;
        var maxl = this.maxLine();
        for (var c = 0; c < this.lines.length; c++) {
            if (this.constellation.lines) {
                for (l = 3; l < this.lines[c].length; l += 2) {
                    a = -1;
                    b = -1;
                    idx1 = '' + this.lines[c][l] + '';
                    idx2 = '' + this.lines[c][l + 1] + '';
                    if (!this.hipparcos[idx1]) {
                        for (s = 0; s < this.stars.length; s++) {
                            if (this.stars[s][0] == this.lines[c][l]) {
                                this.hipparcos[idx1] = s;
                                break;
                            }
                        }
                    }
                    if (!this.hipparcos[idx2]) {
                        for (s = 0; s < this.stars.length; s++) {
                            if (this.stars[s][0] == this.lines[c][l + 1]) {
                                this.hipparcos[idx2] = s;
                                break;
                            }
                        }
                    }
                    a = this.hipparcos[idx1];
                    b = this.hipparcos[idx2];
                    if (a >= 0 && b >= 0 && a < this.stars.length && b < this.stars.length) {
                        posa = this.radec2xy(this.stars[a][2], this.stars[a][3]);
                        posb = this.radec2xy(this.stars[b][2], this.stars[b][3]);
                        if (this.isVisible(posa.el) && this.isVisible(posb.el)) {
                            if (!this.isPointBad(posa) && !this.isPointBad(posb)) {
                                // Basic error checking: constellations behind us often have very long lines so we'll zap them
                                if (Math.abs(posa.x - posb.x) < maxl && Math.abs(posa.y - posb.y) < maxl) {
                                    x.moveTo(posa.x, posa.y);
                                    x.lineTo(posb.x, posb.y);
                                }
                            }
                        }
                    }
                }
            }

            if (this.constellation.labels) {
                pos = this.radec2xy(this.lines[c][1] * this.d2r, this.lines[c][2] * this.d2r);
                if (this.isVisible(pos.el)) {
                    var label = this.getPhrase('constellations', this.lines[c][0]);
                    var xoff = (x.measureText) ? -x.measureText(label).width / 2 : 0;
                    x.fillText(label, pos.x + xoff, pos.y - fontsize / 2);
                    x.fill();
                }
            }
        }
        x.stroke();
        return this;
    };

    // Draw the boundaries of constellations
    // Input: colour (e.g. "rgb(255,255,0)")
    // We should have all the boundary points stored in this.boundaries. As many of the constellations
    // will share boundaries we don't want to bother drawing lines that we've already done so we will 
    // keep a record of the lines we've drawn as we go. As some segments may be large on the sky we will
    // interpolate a few points between so that boundaries follow the curvature of the projection better.
    // As the boundaries are in FK1 we will calculate the J2000 positions once and keep them cached as
    // this speeds up the re-drawing as the user moves the sky. We assume that the user's session << time
    // between epochs.
    VirtualSky.prototype.drawConstellationBoundaries = function(colour) {
        if (!this.constellation.boundaries) return this;
        if (!colour) colour = this.col.constellationboundary;
        this.ctx.beginPath();
        this.ctx.strokeStyle = colour;
        this.ctx.fillStyle = colour;
        this.ctx.lineWidth = (this.constellation.boundaryWidth || 0.75);
        this.ctx.lineCap = "round";
        if (typeof this.boundaries !== "object") return this;
        var posa, posb, a, b, l, c, d, atob, btoa, move, i, j, ra, dc, dra, ddc, points;
        // Keys defining a line in both directions
        atob = "";
        btoa = "";
        var n = 5;
        var maxl = this.maxLine(5);
        // Create a holder for the constellation boundary points i.e. a cache of position calculations
        if (!this.constellation.bpts) this.constellation.bpts = new Array(this.boundaries.length);
        // We'll record which boundary lines we've already processed
        var cbdone = [];
        for (c = 0; c < this.boundaries.length; c++) {
            if (typeof this.boundaries !== "string" && c < this.boundaries.length) {

                if (this.constellation.bpts[c]) {
                    // Use the old array
                    points = this.constellation.bpts[c];
                } else {
                    // Create a new array of points
                    points = [];
                    for (l = 1; l < this.boundaries[c].length; l += 2) {
                        b = [this.boundaries[c][l], this.boundaries[c][l + 1]];
                        if (a) {
                            atob = a[0] + ',' + a[1] + '-' + b[0] + ',' + b[1];
                            btoa = b[0] + ',' + b[1] + '-' + a[0] + ',' + a[1];
                        }
                        if (l > 1) {
                            move = (cbdone[atob] || cbdone[btoa]);
                            if (typeof move === "undefined") move = true;
                            ra = (b[0] - a[0]) % 360;
                            if (ra > 180) ra = ra - 360;
                            if (ra < -180) ra = ra + 360;
                            dc = (b[1] - a[1]);

                            // If we've already done this line we'll only calculate 
                            // two points on the line otherwise we'll do 5
                            n = (move) ? 5 : 2;
                            if (ra / 2 > n) n = parseInt(ra);
                            if (dc / 2 > n) n = parseInt(dc);

                            dra = ra / n;
                            ddc = dc / n;

                            for (i = 1; i <= n; i++) {
                                ra = a[0] + (i * dra);
                                if (ra < 0) ra += 360;
                                dc = a[1] + (i * ddc);
                                // Convert to J2000
                                d = this.fk1tofk5(ra * this.d2r, dc * this.d2r);
                                points.push([d[0], d[1], move]);
                            }
                        }
                        // Mark this line as drawn
                        cbdone[atob] = true;
                        cbdone[btoa] = true;
                        a = b;
                    }
                    this.constellation.bpts[c] = points;
                }
                posa = null;
                // Now loop over joining the points
                for (i = 0; i <= points.length; i++) {
                    j = (i == points.length) ? 0 : i;
                    posb = this.radec2xy(points[j][0], points[j][1]);
                    if (posa && this.isVisible(posa.el) && this.isVisible(posb.el) && points[j][2]) {
                        if (!this.isPointBad(posa) && !this.isPointBad(posb)) {
                            // Basic error checking: constellations behind us often have very long lines so we'll zap them
                            if (Math.abs(posa.x - posb.x) < maxl && Math.abs(posa.y - posb.y) < maxl) {
                                this.ctx.moveTo(posa.x, posa.y);
                                this.ctx.lineTo(posb.x, posb.y);
                            }
                        }
                    }
                    posa = posb;
                }
            }
        }
        cbdone = [];
        this.ctx.stroke();
        return this;
    };
    VirtualSky.prototype.drawGalaxy = function(colour) {
        if (!this.galaxy || !this.showgalaxy) return this;
        if (!colour) colour = this.col.galaxy;
        this.ctx.beginPath();
        this.ctx.strokeStyle = colour;
        this.ctx.fillStyle = colour;
        this.ctx.lineWidth = (this.gal.lineWidth || 0.75);
        this.ctx.lineJoin = "round";
        var p, pa, pb, i, c, maxl, dx, dy;
        maxl = this.maxLine(5);

        for (c = 0; c < this.galaxy.length; c++) {

            // We will convert all the galaxy outline coordinates to radians
            if (!this.gal.processed) {
                for (i = 1; i < this.galaxy[c].length; i++) this.galaxy[c][i] *= this.d2r;
            }

            // Get a copy of the current shape
            p = this.galaxy[c].slice(0);

            // Get the colour (first element)
            p.shift();
            // Set the initial point to null
            pa = null;

            // Now loop over joining the points
            for (i = 0; i < p.length; i += 2) {
                pb = this.radec2xy(p[i], p[i + 1]);
                if (i == 0) this.ctx.moveTo(pb.x, pb.y);
                else {
                    dx = Math.abs(pa.x - pb.x);
                    dy = Math.abs(pa.y - pb.y);
                    if (!isNaN(dx) && !isNaN(dy)) {
                        // Basic error checking: if the line is very long we need to normalize to other side of sky
                        if (dx >= maxl || dy >= maxl) this.ctx.moveTo(pb.x, pb.y);
                        this.ctx.lineTo(pb.x, pb.y);
                    } else {
                        this.ctx.moveTo(pb.x, pb.y);
                    }
                }
                pa = pb;
            }
        }
        // We've converted the galaxy to radians
        this.gal.processed = true;
        this.ctx.stroke();
        return this;
    };
    VirtualSky.prototype.drawMeteorShowers = function(colour) {
        if (!this.meteorshowers || typeof this.showers === "string") return this;
        if (!colour) colour = this.col.showers;
        var pos, label, xoff, c, d, p, start, end, dra, ddc, f;
        c = this.ctx;
        c.beginPath();
        c.strokeStyle = colour;
        c.fillStyle = colour;
        c.lineWidth = (this.grid.lineWidth || 0.75);
        var fs = this.fontsize();
        this.setFont();
        var y = this.clock.getFullYear();
        this.lookup.meteorshower = [];
        for (var s in this.showers) {
            if (this.showers[s]) {
                d = this.showers[s].date;
                p = this.showers[s].pos;
                start = new Date(y, d[0][0] - 1, d[0][1]);
                end = new Date(y, d[1][0] - 1, d[1][1]);
                if (start > end && this.clock < start) start = new Date(y - 1, d[0][0] - 1, d[0][1]);
                if (this.clock > start && this.clock < end) {
                    dra = (p[1][0] - p[0][0]);
                    ddc = (p[1][1] - p[0][1]);
                    f = (this.clock - start) / (end - start);
                    pos = this.radec2xy((this.showers[s].pos[0][0] + (dra * f)) * this.d2r, (this.showers[s].pos[0][1] + (ddc * f)) * this.d2r);

                    if (this.isVisible(pos.el)) {
                        label = this.htmlDecode(this.showers[s].name);
                        xoff = (c.measureText) ? -c.measureText(label).width / 2 : 0;
                        c.moveTo(pos.x + 2, pos.y);
                        c.arc(pos.x, pos.y, 2, 0, Math.PI * 2, true);
                        c.fillText(label, pos.x + xoff, pos.y - fs / 2);
                        this.lookup.meteorshower.push({ 'ra': (this.showers[s].pos[0][0] + (dra * f)) * this.d2r, 'dec': (this.showers[s].pos[0][1] + (ddc * f)) * this.d2r, 'label': label });
                    }
                }
            }
        }
        c.fill();
        return this;
    };

    VirtualSky.prototype.drawEcliptic = function(colour) {
        if (!this.ecliptic) return this;
        if (!colour || typeof colour != "string") colour = this.col.ec;
        var c = this.ctx;
        var step = 2 * this.d2r;
        c.beginPath();
        c.strokeStyle = colour;
        c.lineWidth = 3;
        var maxl = this.maxLine();

        var old = { x: -1, y: -1, moved: false };
        for (var a = 0; a < Math.PI * 2; a += step) old = joinpoint(this, "ec", a, 0, old, maxl);

        c.stroke();
        return this;
    };

    VirtualSky.prototype.drawMeridian = function(colour) {
        if (!this.meridian) return this;
        if (!colour || typeof colour != "string") colour = this.col.meridian;
        var c = this.ctx;
        var a, b;
        var minb = 0;
        var maxb = (typeof this.projection.maxb === "number") ? this.projection.maxb * this.d2r : Math.PI / 2;
        var step = 2 * this.d2r;
        var maxl = this.maxLine();
        c.beginPath();
        c.strokeStyle = colour;
        c.lineWidth = 2;

        var old = { x: -1, y: -1, moved: false };
        for (b = minb, a = 0; b <= maxb; b += step) old = joinpoint(this, "az", Math.PI, b, old, maxl);
        for (b = maxb, a = 0; b >= minb; b -= step) old = joinpoint(this, "az", 0, b, old, maxl);

        c.stroke();
        return this;
    };

    // type can be "az" or "eq"
    VirtualSky.prototype.drawGridlines = function(type, step, colour) {
        if (!type || !this.grid[type]) return this;
        if (typeof colour !== "string") colour = this.col[type];
        if (typeof step !== "number") step = this.grid.step;

        var maxb, minb, maxl, old, a, b, c, oldx, oldy, bstep;
        c = this.ctx;
        oldx = 0;
        oldy = 0;
        c.beginPath();
        c.strokeStyle = colour;
        c.lineWidth = (this.grid.lineWidth || 1);
        bstep = 2;
        if (type == "az") {
            maxb = (typeof this.projection.maxb === "number") ? this.projection.maxb : 90 - bstep;
            minb = 0;
        } else {
            maxb = 90 - bstep;
            minb = -maxb;
        }
        maxl = this.maxLine(5);
        old = { x: -1, y: -1, moved: false };
        step *= this.d2r;
        bstep *= this.d2r;
        minb *= this.d2r;
        maxb *= this.d2r;
        // Draw grid lines in elevation/declination/latitude
        for (a = 0; a < Math.PI * 2; a += step) {
            old.moved = false;
            for (b = minb; b <= maxb; b += bstep) old = joinpoint(this, type, a, b, old, maxl);
        }
        c.stroke();
        c.beginPath();
        if (type == "az") {
            minb = 0;
            maxb = 90 - bstep * this.r2d;
        } else {
            minb = -90 + step * this.r2d;
            maxb = 90;
        }
        minb *= this.d2r;
        maxb *= this.d2r;
        old = { x: -1, y: -1, moved: false };
        // Draw grid lines in azimuth/RA/longitude
        for (b = minb; b < maxb; b += step) {
            old.moved = false;
            for (a = 0; a <= 2 * Math.PI; a += bstep) old = joinpoint(this, type, a, b, old, maxl);
        }
        c.stroke();
        return this;
    };

    VirtualSky.prototype.drawCardinalPoints = function() {
        if (!this.cardinalpoints) return this;
        var i, x, y, pos, ang, f, m, r;
        var azs = new Array(0, 90, 180, 270);
        var d = [this.getPhrase('N'), this.getPhrase('E'), this.getPhrase('S'), this.getPhrase('W')];
        var pt = 15;
        var c = this.ctx;
        c.beginPath();
        c.fillStyle = this.col.cardinal;
        var fontsize = this.fontsize();
        for (i = 0; i < azs.length; i++) {
            if (c.measureText) {
                m = c.measureText(d[i]);
                r = (m.width > fontsize) ? m.width / 2 : fontsize / 2;
            } else r = fontsize / 2;
            ang = (azs[i] - this.az_off) * this.d2r;
            if (this.polartype) {
                f = (this.tall / 2) - r * 1.5;
                x = -f * Math.sin(ang);
                y = -f * Math.cos(ang);
                x = isFinite(x) ? this.wide / 2 + x - r : 0;
                y = isFinite(y) ? this.tall / 2 + y + r : 0;
            } else {
                pos = this.azel2xy(ang, 0, this.wide, this.tall);
                x = isFinite(pos.x) ? pos.x - r : 0;
                y = isFinite(pos.y) ? pos.y - pt / 2 : 0;
                if (x < 0 || x > this.wide - pt) x = -r;
            }
            if (x > 0) c.fillText(d[i], x, y);
        }
        c.fill();

        return this;
    };

    // Assume decimal Ra/Dec
    VirtualSky.prototype.highlight = function(i, colour) {
        var p = this.pointers[i];
        if (this.pointers[i].ra && this.pointers[i].dec) {
            colour = p.colour || colour || "rgba(255,0,0,1)";
            if (this.negative) colour = this.getNegative(colour);
            var pos = this.radec2xy(p.ra * this.d2r, p.dec * this.d2r);
            var c = this.ctx;
            if (this.isVisible(pos.el)) {
                p.az = pos.az;
                p.el = pos.el;
                p.x = pos.x;
                p.y = pos.y;
                c.fillStyle = colour;
                c.strokeStyle = colour;
                c.beginPath();
                // Draw a square to distinguish from other objects
                // c.arc(p.x,p.y,p.d/2,0,2*Math.PI);
                c.fillRect(p.x - p.d / 2, p.y - p.d / 2, p.d, p.d);
                c.fill();
                this.drawLabel(p.x, p.y, p.d, colour, p.label);
            }
        }
        return this;
    };

    // Function to join the dots
    function joinpoint(s, type, a, b, old, maxl) {
        var x, y, show, c, pos;
        c = s.ctx;
        if (type == "az") pos = s.azel2xy((a - s.az_off * s.d2r), b, s.wide, s.tall);
        else if (type == "eq") pos = s.radec2xy(a, b);
        else if (type == "ec") pos = s.ecliptic2xy(a, b, s.times.LST);
        else if (type == "gal") pos = s.gal2xy(a, b);
        x = pos.x;
        y = pos.y;
        if (type == "az") show = true;
        else show = ((s.isVisible(pos.el)) ? true : false);
        if (show && isFinite(x) && isFinite(y)) {
            if (type == "az") {
                if (!old.moved || Math.sqrt(Math.pow(old.x - x, 2) + Math.pow(old.y - y, 2)) > s.tall / 2) c.moveTo(x, y);
                c.lineTo(x, y);
                old.moved = true;
            } else {
                // If the last point on s contour is more than a canvas width away
                // it is probably supposed to be behind us so we won't draw a line 
                if (!old.moved || Math.sqrt(Math.pow(old.x - x, 2) + Math.pow(old.y - y, 2)) > maxl) {
                    c.moveTo(x, y);
                    old.moved = true;
                } else c.lineTo(x, y);
            }
            old.x = x;
            old.y = y;
        }
        return old;
    }

    VirtualSky.prototype.maxLine = function(f) {
        if (this.projection.id === "gnomic") return this.tall;
        if (typeof f !== "number") f = 3;
        return this.tall / f;
    };

    // Expects a latitude,longitude string (comma separated)
    VirtualSky.prototype.setGeo = function(pos) {
        if (typeof pos !== "string") return this;
        pos = pos.split(',');
        this.setLatitude(pos[0]);
        this.setLongitude(pos[1]);
        return this;
    };

    // Input: latitude (deg)
    VirtualSky.prototype.setLatitude = function(l) {
        this.latitude = { 'deg': parseFloat(l), 'rad': inrangeEl(parseFloat(l) * this.d2r) };
        return this;
    };

    // Input: longitude (deg)
    VirtualSky.prototype.setLongitude = function(l) {
        this.longitude = { 'deg': parseFloat(l), 'rad': parseFloat(l) * this.d2r };
        while (this.longitude.rad <= -Math.PI) this.longitude.rad += 2 * Math.PI;
        while (this.longitude.rad > Math.PI) this.longitude.rad -= 2 * Math.PI;
        return this;
    };


    VirtualSky.prototype.toggleFullScreen = function() {
        if (fullScreenApi.isFullScreen()) {
            fullScreenApi.cancelFullScreen(this.container[0]);
            this.fullscreen = false;
            this.container.removeClass('fullscreen');
        } else {
            fullScreenApi.requestFullScreen(this.container[0]);
            this.fullscreen = true;
            this.container.addClass('fullscreen');
        }

        return this;
    };

    VirtualSky.prototype.setRADec = function(r, d) {
        return this.setRA(r).setDec(d);
    };

    VirtualSky.prototype.setRA = function(r) {
        this.ra_off = (r % 360) * this.d2r;
        return this;
    };

    VirtualSky.prototype.setDec = function(d) {
        this.dc_off = d * this.d2r;
        return this;
    };

    // Pan the view to the specified RA,Dec
    // Inputs: RA (deg), Dec (deg), duration (seconds)
    VirtualSky.prototype.panTo = function(ra, dec, s) {
        if (!s) s = 1000;
        if (typeof ra !== "number" || typeof dec !== "number") return this;
        this.panning = { s: { ra: this.ra_off * this.r2d, dec: this.dc_off * this.r2d }, e: { ra: ra, dec: dec }, duration: s, start: new Date() };
        this.panning.dr = this.panning.e.ra - this.panning.s.ra;
        this.panning.dd = this.panning.e.dec - this.panning.s.dec;
        if (this.panning.dr > 180) this.panning.dr = -(360 - this.panning.dr);
        if (this.panning.dr < -180) this.panning.dr = (360 + this.panning.dr);
        return this.panStep();
    };

    // shim layer with setTimeout fallback
    window.requestAnimFrame = (function() {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback) { window.setTimeout(callback, 1000 / 60); };
    })();

    // Animation step for the panning
    VirtualSky.prototype.panStep = function() {
        var ra, dc;
        var now = new Date();
        var t = (now - this.panning.start) / this.panning.duration;
        ra = this.panning.s.ra + (this.panning.dr) * (t);
        dc = this.panning.s.dec + (this.panning.dd) * (t);

        // Still animating
        if (t < 1) {
            // update and draw
            this.setRADec(ra, dc).draw();
            var _obj = this;
            // request new frame
            requestAnimFrame(function() { _obj.panStep(); });
        } else {
            // We've ended
            this.setRADec(this.panning.e.ra, this.panning.e.dec).draw();
        }
        return this;
    };

    VirtualSky.prototype.liveSky = function(pos) {
        this.islive = !this.islive;
        if (this.islive) interval = window.setInterval(function(sky) { sky.setClock('now'); }, 1000, this);
        else {
            if (interval !== undefined) clearInterval(interval);
        }
        return this;
    };

    VirtualSky.prototype.start = function() {
        this.islive = true;
        // Clear existing interval
        if (interval !== undefined) clearInterval(interval);
        interval = window.setInterval(function(sky) { sky.setClock('now'); }, 1000, this);
    };
    VirtualSky.prototype.stop = function() {
        this.islive = false;
        // Clear existing interval
        if (interval !== undefined) clearInterval(interval);
    };
    // Increment the clock by the amount specified
    VirtualSky.prototype.advanceTime = function(by, wait) {
        if (by === undefined) {
            this.updateClock(new Date());
        } else {
            by = parseFloat(by);
            if (!wait) wait = 1000 / this.fps; // ms between frames
            var fn = function(vs, by) { vs.setClock(by); };
            clearInterval(this.interval_time);
            clearInterval(this.interval_calendar);
            this.interval_time = window.setInterval(fn, wait, this, by);
            // Whilst animating we'll periodically check to see if the calendar events need calling
            this.interval_calendar = window.setInterval(function(vs) { vs.calendarUpdate(); }, 1000, this);
        }
        return this;
    };
    // Send a Javascript Date() object and update the clock
    VirtualSky.prototype.updateClock = function(d) {
        this.clock = d;
        this.times = this.astronomicalTimes();
    };
    // Call any calendar-based events
    VirtualSky.prototype.calendarUpdate = function() {
        for (var e = 0; e < this.calendarevents.length; e++) {
            if (is(this.calendarevents[e], "function")) this.calendarevents[e].call(this);
        }
        return this;
    };
    VirtualSky.prototype.setClock = function(seconds) {
        if (seconds === undefined) {
            return this;
        }
        if (typeof seconds === "string") {
            seconds = convertTZ(seconds);
            if (!this.input.clock) {
                if (seconds === "now") this.updateClock(new Date());
                else this.updateClock(new Date(seconds));
            } else {
                this.updateClock((typeof this.input.clock === "string") ? this.input.clock.replace(/%20/g, ' ') : this.input.clock);
                if (typeof this.clock === "string") this.updateClock(new Date(this.clock));
            }
        } else if (typeof seconds === "object") {
            this.updateClock(seconds);
        } else {
            this.updateClock(new Date(this.clock.getTime() + seconds * 1000));
        }
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleAtmosphere = function() {
        this.gradient = !this.gradient;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleStars = function() {
        this.showstars = !this.showstars;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleStarLabels = function() {
        this.showstarlabels = !this.showstarlabels;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleNegative = function() {
        this.negative = !this.negative;
        this.col = this.colours[(this.negative ? "negative" : "normal")];
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleConstellationLines = function() {
        this.constellation.lines = !this.constellation.lines;
        this.checkLoaded();
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleConstellationBoundaries = function() {
        this.constellation.boundaries = !this.constellation.boundaries;
        this.checkLoaded();
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleConstellationLabels = function() {
        this.constellation.labels = !this.constellation.labels;
        this.checkLoaded();
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleCardinalPoints = function() {
        this.cardinalpoints = !this.cardinalpoints;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleGridlinesAzimuthal = function() {
        this.grid.az = !this.grid.az;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleGridlinesEquatorial = function() {
        this.grid.eq = !this.grid.eq;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleGridlinesGalactic = function() {
        this.grid.gal = !this.grid.gal;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleEcliptic = function() {
        this.ecliptic = !this.ecliptic;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleMeridian = function() {
        this.meridian = !this.meridian;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleGround = function() {
        this.ground = !this.ground;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleGalaxy = function() {
        this.showgalaxy = !this.showgalaxy;
        this.checkLoaded();
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleMeteorShowers = function() {
        this.meteorshowers = !this.meteorshowers;
        this.checkLoaded();
        this.draw();
        return this;
    };
    VirtualSky.prototype.togglePlanetHints = function() {
        this.showplanets = !this.showplanets;
        this.draw();
        return this;
    };
    VirtualSky.prototype.togglePlanetLabels = function() {
        this.showplanetlabels = !this.showplanetlabels;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleOrbits = function() {
        this.showorbits = !this.showorbits;
        this.draw();
        return this;
    };
    VirtualSky.prototype.toggleAzimuthMove = function(az) {
        if (this.az_step === 0) {
            this.az_step = (typeof az === "number") ? az : -1;
            this.moveIt();
        } else {
            this.az_step = 0;
            if (this.timer_az !== undefined) clearTimeout(this.timer_az);
        }
        return this;
    };
    VirtualSky.prototype.addPointer = function(input) {
        // Check if we've already added this
        var style, url, img, label, credit;
        var matched = -1;
        var p;
        for (var i = 0; i < this.pointers.length; i++) {
            if (this.pointers[i].ra == input.ra && this.pointers[i].dec == input.dec && this.pointers[i].label == input.label) matched = i;
        }
        // Hasn't been added already
        if (matched < 0) {
            input.ra *= 1; // Correct for a bug
            input.dec *= 1;
            i = this.pointers.length;
            p = input;
            p.d = is(p.d, "number") ? p.d : 5;
            if (typeof p.html !== "string") {
                style = p.style || "width:128px;height:128px;";
                url = p.url || "http://server1.wikisky.org/v2?ra=" + (p.ra / 15) + "&de=" + (p.dec) + "&zoom=6&img_source=DSS2";
                img = p.img || 'http://server7.sky-map.org/imgcut?survey=DSS2&w=128&h=128&ra=' + (p.ra / 15) + '&de=' + p.dec + '&angle=0.25&output=PNG';
                label = p.credit || "View in Wikisky";
                credit = p.credit || "DSS2/Wikisky";
                p.html = p.html ||
                    '<div class="virtualsky_infocredit">' +
                    '<a href="' + url + '" style="color: white;">' + credit + '</a>' +
                    '</div>' +
                    '<a href="' + url + '" style="display:block;' + style + '">' +
                    '<img src="' + img + '" style="border:0px;' + style + '" title="' + label + '" />' +
                    '</a>';
            }
            this.pointers[i] = p;
        }
        return (this.pointers.length);
    };
    VirtualSky.prototype.changeAzimuth = function(inc) {
        this.az_off += (typeof inc === "number") ? inc : 5;
        this.draw();
        return this;
    };
    VirtualSky.prototype.moveIt = function() {
        // Send 'this' context to the setTimeout function so we can redraw
        this.timer_az = window.setTimeout(function(mysky) {
            mysky.az_off += mysky.az_step;
            mysky.draw();
            mysky.moveIt();
        }, 100, this);
        return this;
    };
    VirtualSky.prototype.spinIt = function(tick, wait) {
        if (typeof tick === "number") this.spin = (tick == 0) ? 0 : (this.spin + tick);
        else {
            var t = 1.0 / this.fps;
            var s = 2;
            // this.spin is the number of seconds to update the clock by 
            if (this.spin == 0) this.spin = (tick == "up") ? t : -t;
            else {
                if (Math.abs(this.spin) < 1) s *= 2;
                if (this.spin > 0) this.spin = (tick == "up") ? (this.spin * s) : (this.spin / s);
                else if (this.spin < 0) this.spin = (tick == "up") ? (this.spin / s) : (this.spin * s);
                if (this.spin < t && this.spin > -t) this.spin = 0;
            }
        }
        if (this.interval_time !== undefined)
            clearInterval(this.interval_time);
        if (this.spin != 0)
            this.advanceTime(this.spin, wait);
        return this;
    };
    VirtualSky.prototype.getOffset = function(el) {
        var _x = 0;
        var _y = 0;
        while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
            _x += el.offsetLeft - el.scrollLeft;
            _y += el.offsetTop - el.scrollTop;
            el = el.parentNode;
        }
        return { top: _y, left: _x };
    };
    VirtualSky.prototype.getJD = function(clock) {
        // The Julian Date of the Unix Time epoch is 2440587.5
        if (!clock) clock = this.clock;
        return (clock.getTime() / 86400000.0) + 2440587.5;
    };
    VirtualSky.prototype.getNegative = function(colour) {
        var end = (colour.indexOf("rgb") == 0) ? (colour.lastIndexOf(")")) : 0;
        if (end == 0) return colour;
        var rgb = colour.substring(colour.indexOf("(") + 1, end).split(",");
        return (rgb.length == 3) ? ('rgb(' + (255 - rgb[0]) + ',' + (255 - rgb[1]) + ',' + (255 - rgb[2]) + ')') : ('rgba(' + (255 - rgb[0]) + ',' + (255 - rgb[1]) + ',' + (255 - rgb[2]) + ',' + (rgb[3]) + ')');
    };
    // Calculate the Great Circle angular distance (in radians) between two points defined by d1,l1 and d2,l2
    VirtualSky.prototype.greatCircle = function(l1, d1, l2, d2) {
        return Math.acos(Math.cos(d1) * Math.cos(d2) * Math.cos(l1 - l2) + Math.sin(d1) * Math.sin(d2));
    };

    // Bind events
    VirtualSky.prototype.on = function(ev, fn) {
        if (typeof ev !== "string" || typeof fn !== "function") return this;
        if (this.events[ev]) this.events[ev].push(fn);
        else this.events[ev] = [fn];
        return this;
    };
    VirtualSky.prototype.bind = function(ev, fn) {
        return this.on(ev, fn);
    };
    // Trigger a defined event with arguments. This is meant for internal use
    // sky.trigger("zoom",args)
    VirtualSky.prototype.trigger = function(ev, args) {
        if (typeof ev !== "string") return;
        if (typeof args !== "object") args = {};
        var o = [];
        var _obj = this;
        if (typeof this.events[ev] === "object")
            for (i = 0; i < this.events[ev].length; i++)
                if (typeof this.events[ev][i] === "function")
                    o.push(this.events[ev][i].call(_obj, args));
        if (o.length > 0) return o;
    };

    // Some useful functions
    function convertTZ(s) {
        function formatHour(h) {
            var s = (h >= 0 ? "+" : "-");
            h = Math.abs(h);
            var m = (h - Math.floor(h)) * 60;
            h = Math.floor(h);
            return s + (h < 10 ? "0" + h : h) + (m < 10 ? "0" + m : m);
        }
        var tzs = {
            A: 1,
            ACDT: 10.5,
            ACST: 9.5,
            ADT: -3,
            AEDT: 11,
            AEST: 10,
            AKDT: -8,
            AKST: -9,
            AST: -4,
            AWST: 8,
            B: 2,
            BST: 1,
            C: 3,
            CDT: -5,
            CEDT: 2,
            CEST: 2,
            CET: 1,
            CST: -6,
            CXT: 7,
            D: 4,
            E: 5,
            EDT: -4,
            EEDT: 3,
            EEST: 3,
            EET: 2,
            EST: -5,
            F: 6,
            G: 7,
            GMT: 0,
            H: 8,
            HAA: -3,
            HAC: -5,
            HADT: -9,
            HAE: -4,
            HAP: -7,
            HAR: -6,
            HAST: -10,
            HAT: -2.5,
            HAY: -8,
            HNA: -4,
            HNC: -6,
            HNE: -5,
            HNP: -8,
            HNR: -7,
            HNT: -3.5,
            HNY: -9,
            I: 9,
            IST: 9,
            JST: 9,
            K: 10,
            L: 11,
            M: 12,
            MDT: -6,
            MESZ: 2,
            MEZ: 1,
            MST: -7,
            N: -1,
            NDT: -2.5,
            NFT: 11.5,
            NST: -3.5,
            O: -2,
            P: -3,
            PDT: -7,
            PST: -8,
            Q: -4,
            R: -5,
            S: -6,
            T: -7,
            U: -8,
            UTC: 0,
            UT: 0,
            V: -9,
            W: -10,
            WEDT: 1,
            WEST: 1,
            WET: 0,
            WST: 8,
            X: -11,
            Y: -12,
            Z: 0
        };
        // Get location of final space character
        var i = s.lastIndexOf(' ');
        // Replace the time zone with the +XXXX version
        if (i > 0 && tzs[s.substr(i + 1)]) {
            return s.substring(0, i) + " " + formatHour(tzs[s.substr(i + 1)]);
        }
        return s;
    }


    S.virtualsky = function(placeholder, input) {
        if (typeof input === "object") input.container = placeholder;
        else {
            if (typeof placeholder === "string") input = { container: placeholder };
            else input = placeholder;
        }
        if (!input) input = {};
        input.plugins = S.virtualsky.plugins;
        return new VirtualSky(input);
    };

    S.virtualsky.plugins = [];

})(S);