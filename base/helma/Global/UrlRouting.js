/**
 * UrlRouting
 * 
 * The base controller for handling UrlRouting from the outside.
 * Prototypes only need to interface with this global object.
 */

/*
UrlRouting.draw(this, {
	"archive/$year/$month/$day": {
		handler: "archive",
		month: null,
		day: null,
		requirements: {
			year: /\d{4}/,
			month: /\d{2}/
			day: /\d{2}/
		}
	},

	"another/route": {
		...
	}
});

The syntax is pretty close to Rails.
In the path description (the string describing the route),
every path part that starts with a '$' sign is a variable.
For variables, further options are available:
In order to make the variables optional, assign them a null value,
as seen in the example above for month and day.
Please note that null values can only assigned from right to left.
In "requirements", regular expressions can be specified for checking of values.
So only if year in the example is actually a 4-char number,
the handler will be called.
Otherwise, the default error message will be displayed
(in case no other route will be responsible for the url).

In order to handle the defined routes,
you specify the getChildElement(name) function like this:

function getChildElement(name) {
	// first your normal getChildElement stuff, or the following,
	// if you didn't specify anything up to now.
	var obj = this.get(name);
	// in case obj is null, let's try the routes:
	if (!obj)
		obj = UrlRouting.handle(this, name);
	return obj;
}
*/

var UrlRouting = {
	
	/**
	 * Installs one or more routes for the prototype 
	 * to be called from the prototype scope
	 */
	draw: function(prototype, routes) {
		if (!prototype.routes) {
			prototype.routes = {
				// mapped routes ar routes where the first 
				// part of the path is a string that clearly specifies
				// the root of a route.
				mapped: {},
				// unmapped routes are route where the first
				// part of the path is a variable
				unmapped: []
			};
		}
		var protoRoutes = prototype.routes;
		for (var path in routes) {
			// create a route object for each passed path
			var route = new Route(path, routes[path]);
			if (route.parts.length > 0) {
				// see if it's a mapped or an unmapped route
				if (!route.parts[0].isParameter) {
					var name = route.parts[0].name;
					// there might be more than one mapped route with the same root.
					// so create a array of routes for each mapped name
					if (!protoRoutes.mapped[name])
						protoRoutes.mapped[name] = [];
					protoRoutes.mapped[name].push(route);
				} else {
					protoRoutes.unmapped.push(route);
				}
			}
		}
	},
	
	/**
	 * to be called from object.getChildElement(name)
	 */ 
	handle: function(object, name) {
		// handle mapped and unmapped routes differently
		var routes = object.__proto__.routes;
		if (routes) {
			var mapped = routes.mapped[name];
			if (mapped != null) {
				// mapped is an array containing one or more routes that share the same first path part
				return new RouteHandler(object, mapped, name);
			} else {
				// RouteHandler will have to handle all unmapped routes and find the fitting ones
				return new RouteHandler(object, routes.unmapped).getChildElement(name);
			}
		}
	}
};

/**
 * Route
 * 
 * Prototype for storing one single route.
 */

/**
 * Creates the Route object. the passed path is parsed and split into single parts. 
 * Each part might be a variable or a string part.
 * Vairable parts may have requirements specified as regular expressions.
 */
function Route(path, route) {
	var parts = path.split("/");
	var requirements = route.requirements;
	for (var i = 0; i < parts.length; i++) {
		var name = parts[i];
		var part = {
			isParameter: name.startsWith("$")
		};
		if (part.isParameter) {
			name = name.substring(1);

			if (requirements && requirements[name])
				part.requirement = requirements[name];
				
			part.nullAllowed = route[name] === null;
		}
		part.name = name;
		parts[i] = part;
	}
	this.path = path;
	this.parts = parts;
	this.action = route.action;
	this.handler = route.handler;
}

/**
 * Matches the given route level against a name.
 * Returns true if the route allows the name on that level, false otherwise.
 */
Route.prototype.match = function(level, name) {
	var part = this.parts[level];
	if (part != null) {
		if (part.isParameter) {
			if (part.requirement) return part.requirement.test(name);
			else return true;
		} else {
			return part.name == name;
		}
	}
}

/**
 * RouteHandler
 * 
 * for each incoming request, a RouteHandler object is created. The same object is used for handling all 
 * calls to getChildElement within one request. The object is keeping track of the path level and 
 * the valid routes for the request.
 */ 

function RouteHandler(object, routes, firstLevel) {
	// clone the array as it's modified afterwards
	this.object = object;
	this.routes = routes.concat([]);
	// first level is set for mapped routes, which all share at least the first level
	if (firstLevel != null) {
		this.path = [firstLevel];
		this.level = 1;
	} else {
		this.path = [];
		this.level = 0;
	}
}

/**
 * getChildElement is called by Helma to determine the object on the next level. RoutHandler returns
 * either itself if there's at least one valid route, or null, which signifies that we can't go on
 * with that request and an error should be displayed.
 */
RouteHandler.prototype.getChildElement = function(name) {
	// on each level of the route, just find at least one matching route, remove the unmatching ones
	var routes = this.routes;
	for (var i = routes.length - 1; i >= 0; i--) {
		if (!routes[i].match(this.level, name))
			routes.splice(i, 1);
	}
	// if all routes are ruled out, return null, otherwise continue with the next level in the path
	if (routes.length > 0) {
		this.level++;
		this.path.push(name);
		return this;
	} else {
		return null;
	}
}

/**
 * The main_action is called if the request found it's target. It might be that still none
 * of the routes fit as they might require more parameters. This is validated and the
 * default notfound error is displayed in case it was not found.
 */
RouteHandler.prototype.main_action = function() {
	User.autoLogin(); // ADDED!
	var routes = this.routes;
	// see if all parts in the route do match (or are allowed to be null)
 	for (var i = routes.length - 1; i >= 0; i--) {
		var parts = routes[i].parts;
		for (var j = this.level; j < parts.length; j++) {
			if (!parts[j].nullAllowed) {
				routes.splice(i, 1);
				break;
			}
		}
	}
	var found = false;
	if (routes.length > 0) {
		// if there are still more than one, take the first and report
		// wrong routing setup to user through log:
		if (routes.length > 1) {
			res.push();
			res.writeln("UrlRouting Error: More than one route possible:");
			for (var i = 0; i < routes.length; i++) {
				res.writeln(routes[i].path);
			}
			app.log(res.pop());
		}

		var route = routes[0];
		var parts = route.parts;
		var path = this.path;
		
		if (route.action != null) {
			// a route may call an action, in which case the values are converted to req.data values
			var action = this.object[route.action + "_action"];
			if (action != null) {
				// set up the req.data values
				for (var i = 0; i < path.length; i++) {
					if (parts[i].isParameter) {
						req.data[parts[i].name] = path[i];
					}
				}
			 	action.apply(this.object);
				found = true;
			}
		} else if (route.handler != null) {
			// if it's calling a handler, a argument list is set up and passed when calling the handler function
			var handler = this.object[route.handler];
			if (handler != null) {
				// fill arguments list:
				var args = [];
				for (var i = 0; i < path.length; i++) {
					if (parts[i].isParameter) {
						args.push(path[i]);
					}
				}
				var obj = handler.apply(this.object, args);
				// handler can either handle the request itself or return an object to take care of this
				// call main action:
				if (obj) {
					if (obj.main_action)
						obj.main_action();
					found = true;
				} else if (obj === undefined) {
					// handler did not return anything -> it handled the request itself
					found = true;
				}
			}
		}
	}
	
	if (!found) {
		res.status = 404;
		// simulate error handling behavior in RequestEvaluator.java
		var action = root[getProperty("notfound", "notfound") + "_action"];
		if (action != null) {
			action.apply(root);
		} else {
			res.write("<html><body><h3>Error in application ");
			res.write(app.name);
			res.write("</h3>Object not found.</body></html>");
		}
	}
}
