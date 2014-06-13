var graphics = {
	default_line_width: 4,

	evaluateTrace: function(canvas,trace,target){
		var ctx = canvas.getContext("2d");
		graphics.drawPath(canvas,target);
		var margin = 20;
		var combined_extrema = graphics.getExtrema(trace,target);
		var combined_width = combined_extrema.maxx-combined_extrema.minx+1+2*margin;
		var combined_height = combined_extrema.maxy-combined_extrema.miny+1+2*margin;
		var target_extrema = graphics.getExtrema(target);
		var target_width = target_extrema.maxx-target_extrema.minx+1;
		var target_height = target_extrema.maxy-target_extrema.miny+1;
		var img_data = ctx.getImageData(combined_extrema.minx-margin,combined_extrema.miny-margin,combined_width,combined_height);
		var rgba_array = graphics.reshape(img_data.data,4);
		var on_error = false;
		var on_black = false;
		var last_line_white = false;
		var last_line_blue = false;
		var error_pixels = [];
		for(var i=0; i < combined_height; i++){
			for(var j=0; j < combined_width; j++){
				if(rgba_array[i*combined_width+j][2]>0) {
					if(rgba_array[i*combined_width+j][1]>0){
						if(on_black && (!last_line_white || !on_error)){
							on_error = !on_error;
						}
						last_line_white = true;
						last_line_blue = false;
					} else {
						if(on_black && (!last_line_blue || !on_error)){
							on_error = !on_error;
						}
						last_line_blue = true;
						last_line_white = false;
					}
					on_black = false;
				} else {
					on_black = true;
					if(on_error){
						error_pixels.push([j+combined_extrema.minx-margin,i+combined_extrema.miny-margin]);
					}
				}
			}
			on_error = false;
			last_line_blue = false;
			last_line_white = false;
		}
		graphics.drawDots(canvas,error_pixels,"#FF0000");
		return 1-error_pixels.length/(target_width*target_height);
	},

	getExtrema: function(path1,path2){
		var maxx,maxy,minx,miny;
		if(path2){
			maxx = Math.ceil(Math.max(_.max(path1,function(xy){ return xy[0];})[0],_.max(path2,function(xy){ return xy[0];})[0]));
			maxy = Math.ceil(Math.max(_.max(path1,function(xy){ return xy[1];})[1],_.max(path2,function(xy){ return xy[1];})[1]));
			minx = Math.floor(Math.min(_.min(path1,function(xy){ return xy[0];})[0],_.min(path2,function(xy){ return xy[0];})[0]));
			miny = Math.floor(Math.min(_.min(path1,function(xy){ return xy[1];})[1],_.min(path2,function(xy){ return xy[1];})[1]));
		} else {
			maxx = Math.ceil(_.max(path1,function(xy){ return xy[0];})[0]);
			maxy = Math.ceil(_.max(path1,function(xy){ return xy[1];})[1]);
			minx = Math.floor(_.min(path1,function(xy){ return xy[0];})[0]);
			miny = Math.floor(_.min(path1,function(xy){ return xy[1];})[1]);
		}
		return {maxx:maxx,maxy:maxy,minx:minx,miny:miny};
	},

	drawPath: function(canvas,path,color){
		if(path.length > 1){
			var ctx = canvas.getContext('2d');
			ctx.strokeStyle = color ? color : "#FFFFFF";
			ctx.lineWidth = graphics.default_line_width;
			for(var i = 0; i < path.length-1; i++){
				ctx.beginPath();
				// Integerize floating point coordinates for optimization
				ctx.moveTo((0.5+path[i][0])|0,(0.5+path[i][1])|0);
				ctx.lineTo((0.5+path[i+1][0])|0,(0.5+path[i+1][1])|0);
				ctx.stroke();
			}
		}
	},

	path_animator: {
		animate_path: function(n,delay,callback){
			this.callback = callback;
			this.interval_obj = setInterval($.proxy(function(){this.draw_lines(n)},this),delay);	
		},
		draw_lines: function(n){
			this.ctx.globalAlpha = 1;
			for(var j=0; j < n && this.i < this.path.length-1; this.i++,j++){
				this.ctx.beginPath();
				this.ctx.moveTo(this.path[this.i][0],this.path[this.i][1]);
				this.ctx.lineTo(this.path[this.i+1][0],this.path[this.i+1][1]);
				this.ctx.stroke();
			}
			if(this.i >= this.path.length-1){
				clearInterval(this.interval_obj);
				// level logic
				graphics.fader.clear();
				graphics.fader.ctx = this.ctx;
				graphics.fader.start_fade(15,30,0.2,this.callback);
			}
		}
	},

	lines_animator: {
		// alpha \in [0,1] = interpolation rate
		// beta \in [0,1] = current amount interpolated
		// i = number of iterations so far
		animate_lines: function(alpha,delay){
			this.alpha = alpha;
			this.delta_beta = alpha;
			this.beta = 0;
			this.i = 0;
			this.interval_obj = setInterval($.proxy(function(){this.draw_lines()},this),delay);	
		},
		draw_lines: function(){
			this.ctx.globalAlpha = 0.1;
			this.i++;
			if(this.beta < 0.95){
				this.beta = Math.sqrt(this.i)*this.alpha;
			} else {
				this.beta = 1;
			}
			for(var j=0; j < this.lines.length; j++){
				this.ctx.beginPath();
				this.ctx.moveTo(this.lines[j][0][0],this.lines[j][0][1]);
				this.ctx.lineTo(this.beta*this.lines[j][1][0]+(1-this.beta)*this.lines[j][0][0],
							this.beta*this.lines[j][1][1]+(1-this.beta)*this.lines[j][0][1]);
				this.ctx.stroke();
			}
			if(this.beta > 0.99){
				clearInterval(this.interval_obj);
			}
		}
	},

	fader: {
		start_fade: function(n,delay,alpha,callback){
			this.n = n;
			this.callback = callback;
			this.alpha = alpha;
			this.interval_obj = setInterval($.proxy(function(){this.fade();},this),delay);
		},
		fade: function(){
			this.ctx.fillStyle = "#000000";
			this.ctx.globalAlpha = this.alpha;
			this.ctx.fillRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);
			if(this.n != Infinity && --this.n <= 0){
				this.ctx.fillStyle = "#000000";
				this.ctx.globalAlpha = 1;
				this.ctx.fillRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);
				clearInterval(this.interval_obj);
				this.callback();
			}
		},
		clear: function(){
			clearInterval(this.interval_obj);
		}
	},

	fade: function(canvas,n,delay,callback){
		graphics.fader.ctx = canvas.getContext('2d');
		graphics.fader.start_fade(n,delay,0.2,callback);
	},

	animatePath: function(canvas,path,level,callback,color){
		var ctx = canvas.getContext('2d');
		ctx.strokeStyle = color ? color : "#FFFFFF";
		ctx.lineWidth = graphics.default_line_width;
		graphics.path_animator.i = 0;
		graphics.path_animator.ctx = ctx;
		graphics.path_animator.path = path;	
		graphics.path_animator.animate_path(20,10,callback);
		if(level >= 10){
			graphics.fader.ctx = ctx;
			var delay = 100;
			var alpha = 0.02+(level-10)*0.001;
			setTimeout(function(){
				graphics.fader.start_fade(Infinity,5,alpha);
			},delay);
		}
	},

	animateLines: function(canvas,lines,color){
		var ctx = canvas.getContext('2d');
		ctx.strokeStyle = color ? color : "#FFFFFF";
		ctx.lineWidth = 2;
		graphics.lines_animator.ctx = ctx;
		graphics.lines_animator.lines = lines;	
		graphics.lines_animator.animate_lines(1/Math.sqrt(30),10);
	},

	drawDots: function(canvas,pts,color){
		var ctx=canvas.getContext("2d");
		ctx.fillStyle = color ? color : "#FFFFFF";
		ctx.globalAlpha = 1;
		for(var i=0; i < pts.length; i++){
			ctx.fillRect(pts[i][0],pts[i][1],1,1);
		}
	},

	drawCircles: function(canvas,pts,r,color){
		var ctx=canvas.getContext("2d");
		ctx.strokeStyle = color ? color : "#FFFFFF";
		ctx.globalAlpha = 1;
		for(var i=0; i < pts.length; i++){
			ctx.beginPath();
			ctx.arc(pts[i][0],pts[i][1],r,0,2*Math.PI);
			ctx.stroke();
		}
	},

	drawLines: function(canvas,pts,t,color){
		var ctx=canvas.getContext("2d");
		ctx.lineWidth = t;
		ctx.strokeStyle = color ? color : "#FFFFFF";
		for(var i=0; i < pts.length; i++){
			ctx.beginPath();
			ctx.moveTo(pts[i][0][0],pts[i][0][1]);
			ctx.lineTo(pts[i][1][0],pts[i][1][1]);
			ctx.stroke();
		}
	},

	drawScore: function(canvas,score,color){
		var ctx = canvas.getContext('2d');
		ctx.fillStyle = color ? color : "#FFFFFF";
		ctx.font = "20px Georgia";
		ctx.globalAlpha = 1;
		ctx.fillText(score,20,canvas.height-20);
	},

	drawDeltaScore: function(canvas,delta_score,color){
		var ctx = canvas.getContext('2d');
		ctx.fillStyle = color ? color : "#FFFFFF";
		ctx.font = "20px Georgia";
		ctx.globalAlpha = 1;
		ctx.fillText(delta_score,canvas.width/2-20,canvas.height-20);
	},

	drawLevel: function(canvas,level,color){
		var ctx = canvas.getContext('2d');
		ctx.fillStyle = color ? color : "#FFFFFF";
		ctx.font = "20px Georgia";
		ctx.globalAlpha = 1;
		ctx.fillText(level,canvas.width-30,canvas.height-20);
	},

	paintGray: function(canvas){
		var ctx = canvas.getContext('2d');
		ctx.fillStyle = "#101010";
		ctx.globalAlpha = 1;
		ctx.fillRect(0,0,canvas.width,canvas.height);
	},

	paintBlack: function(canvas){
		var ctx = canvas.getContext('2d');
		ctx.globalAlpha = 1;
		ctx.fillStyle = "#000000";
		ctx.fillRect(0,0,canvas.width,canvas.height);
	},

	reshape: function(uint8array, n){
	    if(uint8array.length % n != 0){
	    	throw new TypeError('Array length must be multiple of the reshape length.');
	    }
	    var result = [];
	    for(var i = 0; i < uint8array.length; i += n){
			result.push(uint8array.subarray(i,i+n));
	    }
	    return result;
	}
};