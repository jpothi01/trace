$(function(){
	function Game(){
		var level = window.localStorage.level;
		this.level = level ? level-1 : -1;
		this.state = "example";
		var score = window.localStorage.score;
		this.score = parseInt(score) ? parseInt(score) : 0;
		this.trace_buffer = [];
		this.target_path = [];
		this.cancel_trace_thresh = 200;
		this.example_color = "#FFFF00";
		this.trace_color = "#00FF00";
		this.success_thresh = 70;
		this.highsuccess_thresh = 80;
		this.veryhighsuccess_thresh = 85;
		this.success_color = "#FFFFFF";
		this.success_lines_color = "#FFFFFF";
		this.highsuccess_lines_color = "00FFFF";
		this.veryhighsuccess_lines_color = "#FF00FF";
		this.error_color = "#FF0000";
		this.error_lines_color = "#FF0000";
		this.init();
	}

	Game.prototype.init = function(){
		this.canvas = $('#maincanvas')[0];
		this.canvas.width  = window.innerWidth;
	  	this.canvas.height = window.innerHeight-50;
	  	this.canvas_diag = Math.sqrt(this.canvas.width*this.canvas.width+this.canvas.height*this.canvas.height);
	  	this.canvas.addEventListener('mousedown',touch.canvasOnDown);
	  	this.canvas.addEventListener('touchstart',touch.canvasOnDown);
	  	this.canvas.addEventListener('mousemove',touch.canvasOnMove);
	  	this.canvas.addEventListener('touchmove',touch.canvasOnMove);
	  	this.canvas.addEventListener('mouseup',touch.canvasOnUp);
	  	this.canvas.addEventListener('touchend',touch.canvasOnUp);
	  	this.display_canvas = $('#displaycanvas')[0];
	  	this.display_canvas.width  = window.innerWidth;
	  	this.display_canvas.height = 50;
	  	graphics.exampleCallback = $.proxy(this.getTrace,this);
	  	touch.traceDeltaCallback = $.proxy(this.getTraceDelta,this);
	  	touch.traceCallback = $.proxy(this.evaluateTrace,this);
	  	touch.reset();
	  	this.nextLevel();
	}

	Game.prototype.nextLevel = function(){
		this.level++;
		this.save();
		this.trace_buffer = [];
		this.target_path = [];
		touch.reset();
		graphics.paintBlack(this.canvas);
		graphics.paintBlack(this.display_canvas);
		graphics.drawLevel(this.display_canvas,this.level);
		graphics.drawScore(this.display_canvas,this.score);
		this.showExample();
	}

	Game.prototype.startOver = function(){
		this.level = -1;
		this.score = 0;
		this.nextLevel();
	}

	Game.prototype.showExample = function(){
		this.setState("example");
		var verts = null;
	  	while(verts==null){
	  		verts = paths.generatePathSkeleton(this.level,this.canvas.width,this.canvas.height,50);
	  	}
		this.target_path = paths.buildTargetPath(verts);
		graphics.animatePath(this.canvas,this.target_path,this.level,graphics.exampleCallback,this.example_color);
	}

	Game.prototype.getTrace = function(){
		graphics.paintBlack(this.canvas);
		this.setState("trace");
	}

	Game.prototype.getTraceDelta = function(){
		var buffer = this.trace_buffer.length > 0 ? 
			[this.trace_buffer[this.trace_buffer.length-1], touch.trace_buffer]:
			[touch.trace_buffer];
		// Protect against laggy UI by cancelling trace if touch samples are far apart
		this.trace_buffer.push(touch.trace_buffer);
		if(buffer.length > 1){
			if(paths.dist(buffer[0],buffer[1]) > this.cancel_trace_thresh){
				touch.reset();
				this.trace_buffer = [];
				graphics.paintBlack(this.canvas);
			} else {
				graphics.drawPath(this.canvas,buffer,this.trace_color);
			}
		}
	}

	Game.prototype.evaluateTrace = function(){
		// Require at least 5 touch samples to prevent accidental touches from ruining game
		if(this.trace_buffer.length > 5){
			this.setState("evaluate");
			var evaluation = paths.evaluateTrace(this.trace_buffer,this.target_path,Math.min(this.canvas.width,this.canvas.height));
			var delta_score = evaluation.score;
			var lines = evaluation.lines;
			this.score += delta_score;
			graphics.drawPath(this.canvas,this.target_path,this.example_color);
			if(delta_score >= this.success_thresh){
				if(delta_score >= this.veryhighsuccess_thresh) {
					graphics.animateLines(this.canvas,lines,this.veryhighsuccess_lines_color);
				} else if (delta_score >= this.highsuccess_thresh) { 
					graphics.animateLines(this.canvas,lines,this.highsuccess_lines_color);
				} else {
					graphics.animateLines(this.canvas,lines,this.success_lines_color);
				}
				graphics.drawDeltaScore(this.display_canvas,delta_score,this.success_color);
				setTimeout($.proxy(function(){
					graphics.fade(this.canvas,20,20,$.proxy(this.nextLevel,this));
				},this),700);
			} else {
				graphics.animateLines(this.canvas,lines,this.error_lines_color);
				graphics.drawDeltaScore(this.display_canvas,delta_score,this.error_color);
				setTimeout($.proxy(function(){
					graphics.fade(this.canvas,20,20,$.proxy(this.startOver,this));
				},this),700);
			}
		} else {
			graphics.paintBlack(this.canvas);
		}
	}

	Game.prototype.setState = function(s){
		this.state = s;
		touch.state = s;
	}

	Game.prototype.save = function(){
		window.localStorage.level = this.level;
		window.localStorage.score = this.score;
		var high_score = window.localStorage.high_score;
		var high_level = window.localStorage.high_level;
		if(!high_score || (this.score > high_score)){
			window.localStorage.high_score = this.score;
		} 
		if(!high_level || (this.level > high_level)){
			window.localStorage.high_level = this.level;
		}
	}

	function start(){
		$(".startpage").css("display","none");
		$(".gameplay").css("display","inline");
		new Game;
	}

	$(".btn-start").click(start);
	var high_score = window.localStorage.high_score;
	var high_level = window.localStorage.high_level;
	if(!high_score){
		high_score = 0;
	}
	if(!high_level){
		high_level = 0;
	}
	$("#highscore").text(high_score);
	$("#highlevel").text(high_level);

	$('.btn-start').css("margin-top",window.innerHeight/3-60);
});
