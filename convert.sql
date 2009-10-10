# 1.

ALTER TABLE nodes ADD visible TINYINT UNSIGNED NULL AFTER name;
ALTER TABLE topics ADD visible TINYINT UNSIGNED NULL AFTER name;
ALTER TABLE resources ADD visible TINYINT UNSIGNED NULL AFTER name;

UPDATE nodes SET visible = 1 WHERE position IS NOT NULL;
UPDATE topics SET visible = 1 WHERE position IS NOT NULL;
# all resources should be visible (only thumbnails for now)
UPDATE resources SET visible = 1 ;

# 2. add related_ids to general nodes

ALTER TABLE nodes ADD related_ids VARCHAR( 255 ) NULL AFTER modification_date;

# 3. before execution of convert

ALTER TABLE posts ADD node_id INT UNSIGNED NULL AFTER topic_id;
ALTER TABLE posts DROP INDEX `index` , ADD INDEX `index` ( `node_id` , `is_first` );

ALTER TABLE resources ADD node_id INT UNSIGNED NULL AFTER topic_id;

ALTER TABLE notifications ADD node_id INT UNSIGNED NULL AFTER topic_id;

ALTER TABLE users CHANGE `role` `roles` INT( 10 ) UNSIGNED NULL DEFAULT NULL;

# 4. execute scriptographer/convert to convert topic -> node

# 5. after execution of convert

ALTER TABLE posts DROP topic_id;
ALTER TABLE resources DROP topic_id;
ALTER TABLE notifications DROP topic_id;
DROP TABLE topics;

# 6. resources

ALTER TABLE resources CHANGE string type VARCHAR( 255 ) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL;

# 7. remove RefMember nodes and posts

DELETE posts FROM posts, nodes WHERE posts.node_id = nodes.id AND nodes.prototype = 'RefMember';
DELETE FROM nodes WHERE prototype = 'RefMember';

# 8. title / name
ALTER TABLE nodes ADD title VARCHAR( 64 ) NULL AFTER related_ids;
UPDATE nodes SET title = name;
# lower case names
UPDATE nodes SET name = LOWER(name);

# 9. empty search
TRUNCATE TABLE search;

# 10. position -> int
ALTER TABLE  `nodes` CHANGE  `position`  `position` INT UNSIGNED NULL DEFAULT NULL;
ALTER TABLE  `resources` CHANGE  `position`  `position` INT UNSIGNED NULL DEFAULT NULL;
