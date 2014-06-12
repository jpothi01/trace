PI = Math.PI;

var paths = {


	evaluateTrace: function(trace,target,screen_diag){
		var n = Math.floor(target.length/trace.length);
		var target_downsampled = paths.downsamplePath(target,n,trace.length);
		var coupling_sequence = paths.frechetDist(trace,target_downsampled);
		var lines = _.map(coupling_sequence,function(ij){
			return [trace[ij[0]],target_downsampled[ij[1]]];
		});
		var frechet_dist = _.reduce(lines,function(memo,el){
			return memo + paths.dist(el[0],el[1]);
		},0)/lines.length;
		var alpha = 0.01; 
		return {score:Math.floor(100-100*Math.min(6*frechet_dist/screen_diag,1)),lines:lines};
	},

	// adapted from http://www.mathworks.com/matlabcentral/fileexchange/31922-discrete-frechet-distance
	frechetDist: function(P,Q){

		function c(i,j){
			var CAij;
		    // coupling search function
		    if (CA[i][j]>-1){
		        // don't update CA in this case
		        CAij = CA[i][j];
		    } else if (i==0 && j==0){
		        CA[i][j] = paths.dist(P[0],Q[0]);     // update the CA permanent
		        CAij = CA[i][j];                    // set the current relevant value
		    } else if (i>0 && j==0){
		        CA[i][j] = Math.max( c(i-1,0), paths.dist(P[i],Q[0]) );
		        CAij = CA[i][j];
		    } else if (i==0 && j>0){
		        CA[i][j] = Math.max( c(0,j-1), paths.dist(P[0],Q[j]) );
		        CAij = CA[i][j];
		    } else if (i>0 && j>0){
		        CA[i][j] = Math.max( _.min([c(i-1,j), c(i-1,j-1), c(i,j-1)]),
		            paths.dist(P[i],Q[j]) );
		        CAij = CA[i][j];
		    } else {
		        CA[i][j] = Infinity;
		    }
		    return CAij;
		}

		// initialize CA to a matrix of -1s
		var CA = numeric.rep([P.length,Q.length],-1);

		var cm = c(P.length-1,Q.length-1);

		// obtain coupling measure via backtracking procedure
	    var cSq = numeric.rep([Q.length+P.length+1,2],0);    // coupling sequence
	    var CApad = [numeric.rep([Q.length+1],Infinity)].concat(
	    	 _.map(_.zip(numeric.rep([P.length,1],Infinity),CA),_.flatten));  // pad CA
	    Pi=P.length; Qi=Q.length; count=0;  // counting variables
	    while (Pi!=1 || Qi!=1){
	        // step down CA gradient
	        var m = _.min([{ix:0,v:CApad[Pi-1][Qi]},
	        				{ix:1,v:CApad[Pi-1][Qi-1]},
	        				{ix:2,v:CApad[Pi][Qi-1]}],function(el){
	        					return el.v;
	        				});
	        var v = m.v;
	        var ix = m.ix;
	        if(ix==0){
	            cSq[count] = [Pi-1,Qi];
	            Pi--;
	        } else if (ix==1){
	            cSq[count] = [Pi-1,Qi-1];
	            Pi--; Qi--;
	        } else if (ix==2){
	            cSq[count] = [Pi,Qi-1];
	            Qi--;
	        }
	        count++;
	    }
	    // format output: remove extra zeroes, reverse order, subtract off
	    // padding value, and add in the last point
	    var ind = _.indexOf(_.pluck(cSq,0),0);
	    if(ind>-1){
		    cSq = cSq.slice(0,ind);
		}
		cSq.reverse();
		cSq = _.map(cSq,function(xy){return [xy[0]-1,xy[1]-1];});
		cSq.push([P.length-1,Q.length-1]);
	    return cSq;
	},

	downsampleDist: function(path1,path2){
		return _.reduce(_.zip(path1,path2),function(memo,el){
					return memo+paths.dist(el[0],el[1]);
				},0);
	},

	downsamplePath: function(path,n,length){
		var result = [];
		for(var i=0; i < path.length; i++){
			if(i%n==0){
				result.push(path[i]);
			}
		}
		if(result.length > length){
			result = result.slice(0,length);
		}
		return result;
	},

	generatePathSkeleton: function(level,width,height,margin){
		var verts = [];
		var min_verts = 7;
		var mean_intervert_length = Math.min(height,width)/3;
		var var_intervert_length = 20*20;
		// Theta mean between pi/5 and pi/3, use logistic function
		var l = (level-1)/5;
		var e = Math.exp(l);
		var mean_theta = PI/5+e/(10+e)*PI*3/10;
		var angle_switching_freq = Math.random();//e/(10+e)*0.5;
		angle_switching_freq = 0;
		var var_theta = 25/49*mean_theta*mean_theta;
		var start = [Math.random()*(width/2-2*margin)+margin, Math.random()*(height/2-2*margin)+margin];
		var prevTheta = PI;
		verts.push(start);
		var i = 0;
		while(i < min_verts|| paths.dist(start,verts[i]) > mean_intervert_length){
			var theta = paths.gaussianSample(mean_theta,var_theta);
			if(Math.random() < angle_switching_freq){
				theta *= -1;
			}
			var length = paths.gaussianSample(mean_intervert_length,var_intervert_length);
			x = verts[i][0]+length*Math.cos(prevTheta+theta);
			y = height-verts[i][1]+length*Math.sin(prevTheta+theta);
			if(x < margin || y < margin || x > width-margin || y > height-margin){
				return null;
			}
			prevTheta += theta;
			verts.push([x, height-y]);
			i++;
		}
		verts.push(verts[0]);
		return verts;
	},

	dist: function(v,w){
		return Math.sqrt((v[0]-w[0])*(v[0]-w[0])+(v[1]-w[1])*(v[1]-w[1]));
	},

	gaussianSample: function(mean,variance) {
		var dist = new Gaussian(mean,variance);
		return dist.ppf(Math.random());
	},

	buildTargetPath: function(verts){
		return paths.cubicBezierSpline(verts,200);
	},

	// http://www.particleincell.com/blog/2012/bezier-splines/
	cubicBezierSpline: function(knots,m){
		var px = paths.computeControlPoints(_.map(knots,function(xy){return xy[0];}));
		var py = paths.computeControlPoints(_.map(knots,function(xy){return xy[1];}));
		var result = [];
		var n_bezier = knots.length-1;
		for(var i=0; i < n_bezier; i++){
			var p1 = [px.p1[i],py.p1[i]];
			var p2 = [px.p2[i],py.p2[i]];
			var control_pts = [knots[i],p1,p2,knots[i+1]];
			var bezier_curve = paths.bezierCurve(3,control_pts,m);
			//drawPoints($('#maincanvas')[0],[p1,p2],color);
			result = result.concat(bezier_curve);
		}
		return result;
	},

	computeControlPoints: function(knots){
		var n = knots.length-1;
		var p1 = new Array(n);
		var p2 = new Array(n);

		// Find p1 using Thomas algorithm
		var a = new Array(n);
		var b = new Array(n);
		var c = new Array(n);
		var d = new Array(n);
		a[0] = 0;
		b[0] = 2;
		c[0] = 1;
		d[0] = knots[0]+2*knots[1];
		for(var i=1; i < n-1; i++){
			a[i] = 1;
			b[i] = 4;
			c[i] = 1;
			d[i] = 4*knots[i] + 2*knots[i+1];
		}
		a[n-1] = 2;
		b[n-1] = 7;
		c[n-1] = 0;
		d[n-1] = 8*knots[n-1]+knots[n];

		c[0] = c[0]/b[0];
		d[0] = d[0]/b[0];
		for(var i=1; i < n; i++){
			if(i < n-1) {
				c[i] = c[i]/(b[i]-a[i]*c[i-1]);
			}
			d[i] = (d[i]-a[i]*d[i-1])/(b[i]-a[i]*c[i-1]);
		}

		p1[n-1] = d[n-1];
		for(var i=n-2; i >= 0; i--){
			p1[i] = d[i] - c[i]*p1[i+1];
		}

		// Calculate p2
		for(var i=0; i < n-1; i++){
			p2[i] = 2*knots[i+1] - p1[i+1];
		}
		p2[n-1] = 0.5*(knots[n]+p1[n-1]);

		return {p1:p1,p2:p2};
	},

	bezierCurve: function(degree,control_pts,m){
		if(degree==0){
			return numeric.rep([m],control_pts[0]);
		}
		var b1 = paths.bezierCurve(degree-1,control_pts.slice(0,degree),m);
		var b2 = paths.bezierCurve(degree-1,control_pts.slice(1,degree+1),m);
		var t = numeric.transpose([numeric.linspace(0,1,m),numeric.linspace(0,1,m)]);
		var t_bar = numeric.transpose([numeric.linspace(1,0,m),numeric.linspace(1,0,m)]);
		return numeric.add(numeric.mul(t_bar,b1),numeric.mul(t,b2));
	}
};