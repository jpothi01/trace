$(function(){
	function Game(){
		var level = window.localStorage.level;
		this.level = level ? level-1 : 0;
		this.state = "example";
		this.score_thresh = 70;
		var score = window.localStorage.score;
		this.score = parseInt(score) ? parseInt(score) : 0;
		this.trace_buffer = [];
		this.target_path = [];
		this.example_color = "#FFFF00";
		this.trace_color = "#00FF00";
		this.success_color = "#FFFFFF";
		this.success_lines_color = "#00FFFF";
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
		this.level = 0;
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
			[this.trace_buffer[this.trace_buffer.length-1]].concat(touch.trace_buffer) :
			touch.trace_buffer;
		graphics.drawPath(this.canvas,buffer,this.trace_color);
		this.trace_buffer = this.trace_buffer.concat(touch.trace_buffer);
	}

	Game.prototype.evaluateTrace = function(){
		if(this.trace_buffer.length > 0){
			this.setState("evaluate");
			var evaluation = paths.evaluateTrace(this.trace_buffer,this.target_path,this.canvas_diag);
			var delta_score = evaluation.score;
			var lines = evaluation.lines;
			this.score += delta_score;
			graphics.drawPath(this.canvas,this.target_path,this.example_color);
			if(delta_score >= this.score_thresh){
				graphics.animateLines(this.canvas,lines,this.success_lines_color);
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
		if(!high_score || (this.score > high_score)){
			window.localStorage.high_score = this.score;
		} 
	}

	function start(){
		$(".startpage").css("display","none");
		$(".gameplay").css("display","inline");
		new Game;
	}

	$(".btn-start").click(start);
	var high_score = window.localStorage.high_score;
	if(!high_score){
		high_score = 0;
	}
	$("#highscore").text(high_score);

	$('.btn-start').css("margin-top",window.innerHeight/3-60);
});