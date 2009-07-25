Root.inject({
	importBB_action: function() {
		if (User.canEdit(this)) {
			var con = getDBConnection("forum");
			// first import users:
			// clean first, during dev phase...
			var users = root.users.list();
			for (var i in users) {
				if (users[i]._id != 0)
					users[i].remove();
			}
			res.commit();
			var users = con.executeRetrieval("SELECT username, user_posts, FROM_UNIXTIME(user_regdate) as regdate, FROM_UNIXTIME(user_lastvisit) as lastvisit, user_email, user_website, user_from, user_occ, user_interests FROM phpbb_users");
			var usersNode = this.get("Users");
			while (users.next()) {
				var username = users.getColumnItem("username");
				if (!usersNode.get(username)) {
					var posts = users.getColumnItem("user_posts");
					if (username != "Anonymous" && posts > 0) {
						var user = new User();
						user.name = username;
						user.fullName = username;
						user.lastLogin = users.getColumnItem("lastvisit");
						user.registrationDate = users.getColumnItem("regdate");
						user.email = users.getColumnItem("user_email");
						user.website = users.getColumnItem("user_website");
						user.location = users.getColumnItem("user_from");
						user.roles = User.READER | User.EDITOR;
						var occupation = users.getColumnItem("user_occ");
						var interests = users.getColumnItem("user_interests");
						var text = "";
						if (occupation) {
							text = occupation;
						}
						if (interests) {
							if (text) text += ", interested";
							else text += "Interested";
							text += " in " + interests;
						}
						user.text = text;
						usersNode.add(user);
					}
				}
			}
			res.commit();

			var forumsPage = this.get("Forum");
			var forums = con.executeRetrieval("SELECT forum_id, forum_name, forum_desc FROM phpbb_forums");
			while (forums.next()) {
				var id = forums.getColumnItem("forum_id");
				var name = forums.getColumnItem("forum_name");
				var desc = forums.getColumnItem("forum_desc");

				var forum = forumsPage.getOrCreate(name, Forum);
				// remove nodes
				var nodes = forum.list();
				for (var i in nodes)
					nodes[i].remove();
				res.commit();
				forum.text = desc;

				res.write("<br/><br/>" + id + " " + name + " --- " + desc + "<br/>");
				var topics = con.executeRetrieval("SELECT topic_id FROM phpbb_topics WHERE forum_id = " + id);
				while (topics.next()) {
					var id = topics.getColumnItem("topic_id");
					res.write("&nbsp;&nbsp;&nbsp;&nbsp;" + id + "<br/>");
					var posts = con.executeRetrieval("SELECT phpbb_posts.post_id, poster_id, FROM_UNIXTIME(post_time) AS time, post_username, poster_ip, post_subject, post_text FROM phpbb_posts, phpbb_posts_text WHERE topic_id = " + id + " AND phpbb_posts.post_id = phpbb_posts_text.post_id");
					var topic = null;
					while (posts.next()) {
						var post = new Post();
						post.creationDate = post.modificationDate = posts.getColumnItem("time");
						post.title = posts.getColumnItem("post_subject").trim();
						var text = posts.getColumnItem("post_text");
						text = Packages.org.htmlparser.util.Translate.decode(text); // decode html entities
						text = text.replace(/\[code.*?\]([\u0000-\uffff]*?)\[\/code.*?\]/gmi, '<code>$1</code>');
						text = text.replace(/\[quote.*?="(.*?)"\]([\u0000-\uffff]*?)\[\/quote.*?\]/gmi, '<quote $1>$2</quote>'); // quote with name
						text = text.replace(/\[quote.*?\]([\u0000-\uffff]*?)\[\/quote.*?\]/gmi, '<quote>$1</quote>'); // quote without name
						text = text.replace(/\[img.*?\]([\u0000-\uffff]*?)\[\/img.*?\]/gmi, '<img>$1</img>');
						text = text.replace(/\[url.*?=(.*?)\]([\u0000-\uffff]*?)\[\/url.*?\]/gmi, '<url $1>$2</url>'); // url with title
						text = text.replace(/\[url.*?\]([\u0000-\uffff]*?)\[\/url.*?\]/gmi, '<url>$1</url>'); // url without title
						text = text.replace(/\[b.*?\]([\u0000-\uffff]*?)\[\/b.*?\]/gmi, '<b>$1</b>');
						text = text.replace(/\[list.*?\]([\u0000-\uffff]*?)\[\/list.*?\]/gmi, '<list>$1</list>');
						post.text = text;
						post.host = posts.getColumnItem("poster_ip");
						var username = posts.getColumnItem("post_username");
						if (username) {
							post.username = username;
						} else {
							var userId = posts.getColumnItem("poster_id");
							if (userId != -1) {
								var users = con.executeRetrieval("SELECT username FROM phpbb_users WHERE user_id = " + userId);
								if (users.next()) {
									var user = usersNode.get(users.getColumnItem("username"))
									if (user != null) {
										post.creator = user;
										post.modifier = user;
									}
								}
							}
						}
						if (!node) {
							node = forum.addPost(post);
						} else {
							if (!post.title) {
								var title = node.getTitle();
								post.title = title.startsWith("Re: ") ? title : "Re: " + title;
							}
							node.addPost(post);
						}
						res.commit();
						res.write("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + post.creationDate + " " + post.title + " " + post.text + "<br/>");
					}
				}
	 		}
		}
	},

	passwords_action: function() {
		if (User.canEdit(this)) {
			var users = this.users.list();
			for (var i in users) {
				var user = users[i];
				// if (user != session.user)
					user.password = null;
				if (!user.password) {
					var password = "";
					var count = Math.round(Math.random() * 3) + 6;
					var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
					for (var j = 0; j < count; j++) {
						password += chars[Math.floor(Math.random() * chars.length)];
					}
					user.password = user.encryptPassword(password);
					app.log(user.name + " " + password);

					var mail = new Mail();
					mail.setFrom(app.properties.serverEmail);
					mail.setTo(user.name + ' <' + user.email + '>');
					mail.setSubject("// Scriptographer.org: New Login Information //");
					mail.addPart(this.renderTemplate("emailPassword", {
						username: user.name,
						password: password,
					}));
					mail.send();
				}
			}
		}
	}
})
