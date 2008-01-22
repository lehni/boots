DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
  id int(10) unsigned NOT NULL default '0',
  prototype varchar(255) default NULL,
  topic_id int(10) unsigned default NULL,
  creator_id int(10) unsigned default NULL,
  creation_date datetime default NULL,
  modifier_id int(10) unsigned default NULL,
  modification_date datetime default NULL,
  username varchar(32) default NULL,
  email varchar(255) default NULL,
  website varchar(255) default NULL,
  title varchar(64) default NULL,
  text text,
  host varchar(255) default NULL,
  is_first tinyint(3) unsigned default NULL,
  PRIMARY KEY  (id),
  KEY index (topic_id,is_first),
  FULLTEXT KEY search (username,email,website,title,text)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
