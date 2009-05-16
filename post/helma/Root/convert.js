Root.inject({
	convert_action: function() {
		if (User.canEdit(this)) {
			var con = getDBConnection("main");
			var nodeId = con.executeRetrieval("SELECT MAX(id) + 1 FROM nodes;");
			if (nodeId.next())
				nodeId = parseInt(nodeId.getColumnItem(1));
			var topics = con.executeRetrieval("SELECT id, prototype, name, visible, position, node_id, CAST(creator_id AS CHAR) AS creator_id, creation_date, CAST(modifier_id AS CHAR) AS modifier_id, modification_date, topic_ids, CAST(int_1 AS CHAR) AS int_1 FROM topics");
			var dateFormat = "yyyy-MM-dd hh:mm:ss";
			while (topics.next()) {
				var creator = topics.getColumnItem("creator_id"), modifier = topics.getColumnItem("modifier_id");
				var creation = topics.getColumnItem("creation_date"), modification = topics.getColumnItem("modification_date");
				var related = topics.getColumnItem("topic_ids");
				var int_1 = topics.getColumnItem("int_1");
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
				var topicId = topics.getColumnItem("id");
				con.executeCommand('UPDATE posts SET node_id = ' + nodeId + ' WHERE topic_id = ' + topicId + ';');
				con.executeCommand('UPDATE notifications SET node_id = ' + nodeId + ' WHERE topic_id = ' + topicId + ';');
				con.executeCommand('UPDATE resources SET node_id = ' + nodeId + ' WHERE topic_id = ' + topicId + ';');
				nodeId++;
			}
		}
	}
});
