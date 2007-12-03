ALTER TABLE  `nodes` CHANGE  `ID`  `id` INT( 10 ) UNSIGNED NOT NULL DEFAULT  '0',
CHANGE  `prototype`  `prototype` VARCHAR( 255 ) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
CHANGE  `create_date`  `creation_date` DATETIME NULL DEFAULT NULL ,
CHANGE  `modify_date`  `modification_date` DATETIME NULL DEFAULT NULL;

ALTER TABLE  `links` CHANGE  `id`  `id` INT( 10 ) UNSIGNED NOT NULL DEFAULT  '0',
CHANGE  `from_id`  `from_id` INT( 10 ) UNSIGNED NULL DEFAULT  '',
CHANGE  `to_id`  `to_id` INT( 10 ) UNSIGNED NULL DEFAULT  ''