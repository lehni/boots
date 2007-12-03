function setProperties_macro(param) {
	this.setProperties(param);
}

function setProperty_macro(param) {
	this.setProperties(param);
}

function ignoreLinks_macro(param) {
	if (!this.ignoreLinks()) {
		this.clearLinks();
		this.setProperty("ignoreLinks", "true");
	}
}

function setTemplate_macro(param) {
	this.setProperty("template", param.node);
	root.clearTemplateCaches();
}

function setData_macro(param) {
	res.data[param.name] = param.render ? 
		this.renderSkinAsString(createSkin(this.parseWiki(param.value), false)) :
		param.value;
}

function setTarget_macro(param) {
	this.setProperty("target", param.name);
}

function data_macro(param) {
	var data = res.data[param.name];
	if (data) res.write(data);
	else if (param['default']) res.write(param['default']);
}

function macro_macro(param) {
	var name = param.name + '_macro';
	if (this[name]) this[name](param);
}

function title_macro(param) {
	res.write(this.name);
}

function creationDate_macro(param) {
	res.write('<span class="date">');
	res.write(app.data.dateFormat.format(this.creationDate));
	res.write('</span>');
}

function renderTitle_macro(param) {
	var font = KernedFont.getInstance(getProperty(param.font));
	var text = this.name;
	if (param.append) text += param.append;
	font.setSize(param.size ? parseFloat(param.size) : 16);
	font.setCharSpacing(param.charSpacing ? parseFloat(param.charSpacing) : 0);
	var filename = encodeMD5(font.getUniqueString() + param.bgColor + param.color + text) + ".gif";
	var file = new File(getProperty("imagesDir") + filename);
	if (!file.exists()) {
		var desc = font.layoutGlyphs(text);
		var width = Math.round(desc.width), height = Math.round(desc.height);
		var image = new Image(width, height);
		var g2d = image.getGraphics();
		g2d.setColor(param.bgColor ? java.awt.Color.decode(param.bgColor) : java.awt.Color.white);
		g2d.fillRect(0, 0, width, height);
		g2d.setColor(param.color ? java.awt.Color.decode(param.color) : java.awt.Color.black);
		g2d.setRenderingHints(font.getRenderingHints());
		font.drawGlyphs(g2d, desc, 0, 0);
		image.reduceColors(16, false, true);
		image.setTransparentPixel(image.getPixel(0, 0));
		image.saveAs(file.getPath(), 1, true);
		image.dispose();
	} else {
		var info = Image.getInfo(file);
		if (info) {
			var width = info.getWidth();
			var height = info.getHeight();
		}
	}
	res.write('<img src="');
	res.write(getProperty('imagesUri'));
	res.write(filename);
	res.write('" width="');
	res.write(width);
	res.write('" height="');
	res.write(height);
	res.write('" alt="" border="0">');
}

function link_macro(param) {
	var node = this.findNode(param.node);
	if (node) {
		if (param.activeClass && (node == this || param.anchestorMode == "true" && this.isParentOf(node))) {
			res.write('<span class="');
			res.write(param.activeClass);
			res.write('">');
			res.encode(param.title ? param.title : node.name);
			res.write('</span>');
		} else node.renderLink(param.title);
	} else this.renderCreateLink(param.node);
}

function path_macro(param) {
	this.checkDelimiter(param);
	var link = param.dontLink != "true";
	for (var i = 0; i < path.length; i++) {
		if (i > 0) res.write(param.delimiter);
		var obj = path[i];
		if (i < path.length - 1 && link) obj.renderLink();
		else if (obj != null && obj.renderLink != null) res.write(obj.name);
	}
}

function info_macro(param) {
	if (session.user != null || param.showUsersToGuests == "true") {
		if (this.creator) {
			res.write("Created by <a href=\"" + this.creator.href() + "\">" + this.creator.name + "</a>");
		}
		if (this.modifier) {
			res.write(", last edited by <a href=\"" + this.modifier.href() + "\">" + this.modifier.name + "</a>, " + app.data.dateFormat.format(this.modificationDate));
		} else {
			res.write(", " + app.data.dateFormat.format(this.creationDate));
		}
	} else {
			res.write("Last edited on " + app.data.dateFormat.format(this.getEditDate()));
	}
}

function url_macro(param) {
    return this.href();
}

function include_macro(param) {
	var node = this.findNode(param.node);
	var encode = param.encode;
	if (encode) encode = encode == "true";
    if (node) node.renderText(param.asNode == "true" ? null : this, encode);
	else this.renderCreateLink(param.node);
}

function backlinks_macro(param) {
	this.checkDelimiter(param);
	var backlinks = this.backlinks.list();
	if (param.title && backlinks.length > 0 || param.none) {
		res.write(param.title);
		res.write(param.delimiter);
	}
	if (backlinks.length > 0) {
		var first = true;
		for(var i in backlinks) {
			var obj = backlinks[i].from;
			if (obj != null) {
				if (first) first = false;
				else res.write(param.delimiter);
				obj.renderLink();
			}
		}
	} else {
		res.write(param.none);
	}
}

function redirect_macro(param) {
	var node = this.findNode(param.node);
	if (node != null) {
		res.redirect(node.href());
	}
}

function googleVideo_macro(param) {
	res.push();
	res.write('<embed style="width:');
	res.write(param.width ? param.width : 400);
	res.write('px; height:');
	res.write(param.height ? param.height : 326);
	res.write('px;" id="VideoPlayback" align="middle" type="application/x-shockwave-flash" src="http://video.google.com/googleplayer.swf?videoUrl=');
	res.write(param.url);
	res.write('" llowScriptAccess="sameDomain" quality="best" bgcolor="#ffffff" scale="noScale" wmode="window" salign="TL"  FlashVars="playerMode=embedded"></embed>');
	res.data.attachment = res.pop();
}