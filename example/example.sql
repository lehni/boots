GRANT CREATE,ALTER,SELECT,INSERT,UPDATE,DELETE ON example.* TO example@localhost IDENTIFIED BY 'example';

DROP TABLE IF EXISTS nodes;
CREATE TABLE nodes (
  id int(10) unsigned NOT NULL DEFAULT '0',
  prototype varchar(255) DEFAULT NULL,
  name varchar(255) DEFAULT NULL,
  title varchar(255) DEFAULT NULL,
  visible tinyint(3) unsigned DEFAULT NULL,
  position tinyint(3) unsigned DEFAULT NULL,
  parent_id int(10) unsigned DEFAULT NULL,
  creator_id int(11) DEFAULT NULL,
  creation_date datetime DEFAULT NULL,
  modifier_id int(11) DEFAULT NULL,
  modification_date datetime DEFAULT NULL,
  related_ids varchar(255) DEFAULT NULL,
  text text,
  PRIMARY KEY (id),
  KEY name (name,text(64)),
  FULLTEXT KEY search (name,text)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

INSERT INTO nodes VALUES (0,'Root','welcome','Welcome',1,0,NULL,0,'2007-11-06 15:08:38',0,'2007-11-08 02:51:34',NULL,'Welcome to this simple demonstration.'),(2,'Page','three','Three',1,2,0,0,'2007-11-07 23:26:26',0,'2008-04-07 15:42:41',NULL,'Drei'),(3,'Page','one','One',1,0,0,0,'2007-11-07 23:26:08',0,'2008-04-07 15:58:57',NULL,'Happy Birds:\n\n'),(9,'Page','two','Two',1,1,0,0,'2007-11-07 23:26:18',0,'2008-04-07 15:42:36',NULL,'Zwei');

DROP TABLE IF EXISTS resources;
CREATE TABLE resources (
  id int(10) unsigned NOT NULL DEFAULT '0',
  node_id int(10) unsigned DEFAULT NULL,
  post_id int(10) unsigned DEFAULT NULL,
  prototype varchar(255) DEFAULT NULL,
  name varchar(255) DEFAULT NULL,
  visible tinyint(3) unsigned DEFAULT NULL,
  position tinyint(3) unsigned DEFAULT NULL,
  creator_id int(11) DEFAULT NULL,
  creation_date datetime DEFAULT NULL,
  modifier_id int(11) DEFAULT NULL,
  modification_date datetime DEFAULT NULL,
  extension varchar(16) DEFAULT NULL,
  counter int(10) unsigned DEFAULT NULL,
  version int(10) unsigned DEFAULT NULL,
  width smallint(5) unsigned DEFAULT NULL,
  height smallint(5) unsigned DEFAULT NULL,
  type varchar(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY name (name)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

INSERT INTO resources VALUES (1,3,NULL,'Picture','Happy_Birds.jpg',1,0,0,'2007-11-08 00:14:40',0,'2008-04-07 17:03:39','jpg',0,NULL,500,358,'image');

DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id int(10) unsigned NOT NULL DEFAULT '0',
  name varchar(255) DEFAULT NULL,
  full_name varchar(64) DEFAULT NULL,
  password varchar(255) DEFAULT NULL,
  roles int(10) unsigned DEFAULT NULL,
  email varchar(255) DEFAULT NULL,
  registration_date datetime DEFAULT NULL,
  last_login datetime DEFAULT NULL,
  text text,
  website varchar(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY name (name)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

INSERT INTO users VALUES (0,'admin','Administrator','3f1d3578303c4cff3872a40345a00225f2c8192b',12293,'juerg@scratchdisk.com','2005-01-21 11:01:55','2008-04-07 15:44:43','Sys Admin','http://www.scratchdisk.com');
