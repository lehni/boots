Root.inject({
	convert_action: function() {
		if (User.canEdit(this)) {
			return;
			var con = getDBConnection('main');
			/*
			// Scripts
			var scripts = con.executeRetrieval('SELECT id, name FROM resources where name like "%.js"');
			while (scripts.next()) {
				var id = scripts.getColumnItem('id');
				var name = scripts.getColumnItem('name').match(/(.*)\.js/)[1];
				if (/\s/.test(name)) name += ' ';
				else if (/-/.test(name)) name += '-';
				else if (/_/.test(name)) name += '_';
				else name += '-';
				name += 'previous.js';
				con.executeCommand('UPDATE resources SET name = "' + name + '" WHERE id = ' + id + ';');
				res.write(name + '<br>');
			}
			*/
			// User role flags
			var users = con.executeRetrieval('SELECT id, roles FROM users');
			while (users.next()) {
				var id = users.getColumnItem('id');
				var roles = users.getColumnItem('roles');
				var oldRoles = {
					1: User.READER,
					2: /* User.EDITOR | */ User.POSTER, // Degrade old Editors to Posters on SG
					4: User.ADMINISTRATOR,
					8: User.SUPERUSER,
					16: User.DISABLED,
					32: User.UNVERIFIED
				};
				var newRoles = 0;
				oldRoles.each(function(newFlag, oldFlag) {
					if (roles & oldFlag)
						newRoles |= newFlag;
				});
				con.executeCommand('UPDATE users SET roles = ' + newRoles + ' WHERE id = ' + id + ';');
			}
			// Topics
			var nodeId = con.executeRetrieval('SELECT MAX(id) + 1 FROM nodes;');
			if (nodeId.next())
				nodeId = parseInt(nodeId.getColumnItem(1));
			var topics = con.executeRetrieval('SELECT id, prototype, name, visible, position, node_id, CAST(creator_id AS CHAR) AS creator_id, creation_date, CAST(modifier_id AS CHAR) AS modifier_id, modification_date, topic_ids, CAST(int_1 AS CHAR) AS int_1 FROM topics');
			var dateFormat = 'yyyy-MM-dd hh:mm:ss';
			while (topics.next()) {
				var creator = topics.getColumnItem('creator_id'), modifier = topics.getColumnItem('modifier_id');
				var creation = topics.getColumnItem('creation_date'), modification = topics.getColumnItem('modification_date');
				var related = topics.getColumnItem('topic_ids');
				var int_1 = topics.getColumnItem('int_1');
				var query = 'INSERT into nodes (id, prototype, name, visible, position, parent_id, creator_id, creation_date, modifier_id, modification_date, related_ids, int_1) VALUES(' +
					'"' + nodeId + '", ' +
					'"' + topics.getColumnItem("prototype") + '", ' +
					'"' + topics.getColumnItem("name") + '", ' +
					'"' + topics.getColumnItem("visible") + '", ' +
					'"' + topics.getColumnItem("position") + '", ' +
					'"' + topics.getColumnItem("node_id") + '", ' +
					(creator != null ? creator : 'null') + ', ' +
					(creation ? '"' + creation.format(dateFormat) + '" ' : 'null') + ', ' +
					(modifier != null ? modifier : 'null') + ', ' +
					(modification ? '"' + modification.format(dateFormat) + '" ' : 'null') + ', ' +
					(related ? '"' + related + '" ' : 'null') + ', ' +
					(int_1 != null ? int_1 : 'null') +
				');';
				con.executeCommand(query);
				res.write(query);
				var error = con.getLastError();
				if (error)
					res.write(error);
				var topicId = topics.getColumnItem('id');
				con.executeCommand('UPDATE posts SET node_id = ' + nodeId + ' WHERE topic_id = ' + topicId + ';');
				con.executeCommand('UPDATE notifications SET node_id = ' + nodeId + ' WHERE topic_id = ' + topicId + ';');
				con.executeCommand('UPDATE resources SET node_id = ' + nodeId + ' WHERE topic_id = ' + topicId + ';');
				nodeId++;
			}
		}
	}
});
