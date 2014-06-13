var touch = {

	trace_buffer: null,

	touched: false,

	touch_locked: false,

	is_mobile: false,

	reset: function(){
		touch.trace_buffer = null;
		touch.touch_locked = false;
		touch.touched = false;
		this.count = 0;
	},

	getPos: function(canvas,e){
		if(e.type=="touchstart" || e.type=="touchmove" || e.type=="touchend"){
			return touch.getTouchPos(canvas,e);
		}
		return touch.getMousePos(canvas,e);
	},

	getMousePos: function(canvas, e) {
		var rect = canvas.getBoundingClientRect();
		return [e.clientX - rect.left, e.clientY - rect.top];
	},

	getTouchPos: function(canvas, e){
		return [e.touches[0].pageX, e.touches[0].pageY];	
	},

	canvasOnDown: function(e){
		e.preventDefault();
		if(touch.state=="trace"){
			touch.touched = true;
			var pos = touch.getPos(this,e);
			var ctx = this.getContext('2d');
			touch.trace_buffer = pos;
			if(touch.trace_buffer.length == touch.trace_buffer_size){
				touch.traceDeltaCallback();
				touch.trace_buffer = null;
			}
		}
	},

	canvasOnMove: function(e){
		e.preventDefault();
		if(touch.state=="trace" && touch.touched && !touch.locked){
			var pos = touch.getPos(this,e);
			var ctx = this.getContext('2d');
			touch.trace_buffer = pos;
			// Lock trace buffer when drawing
			touch.touch_locked = true;
			touch.traceDeltaCallback();
			touch.trace_buffer = null;
			touch.touch_locked = false;
		}	
	},

	canvasOnUp: function(e){
		e.preventDefault();
		if(touch.state=="trace" && touch.touched){
			touch.touched = false;
			touch.traceCallback();
		}	
	}
}