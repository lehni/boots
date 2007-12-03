function getProperty(name) {
	var prop = this.properties.get(name);
	return prop != null ? prop.value : null;
}

function setProperty(name, value) {
	var prop = this.properties.get(name);
	if (prop == null) {
		prop = new Property(name);
		this.properties.add(prop);
	}
	prop.value = value;
	prop.cache.changed = true; // used in updateProperties() !
}

function setProperties(list) {
	for (var i in list)
		this.setProperty(i, list[i]);
}

function ignoreLinks() {
	return this.getProperty('ignoreLinks') == 'true';
}

function updateProperties() {
	// the text has changed, maybe some old properties are not valuable any longer (no longer set):
	var oldProperties = this.properties.list();
	// unset the changed flags:
	for (var i in oldProperties) {
		oldProperties[i].cache.changed = false;
	}
	// creates and updates the properties:
	this.renderTextAsString();
	// now see which one still have the changed flag unset!
	for (var i in oldProperties) {
		var prop = oldProperties[i];
		if (!prop.cache.changed) {
			if (prop.name == "template")
				this.clearTemplateCache();
			prop.remove();
		}
	}
}
