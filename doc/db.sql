CREATE TABLE IF NOT EXISTS `logs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `imei` varchar(32) NOT NULL,
  `type` varchar(3) NOT NULL,
  `lon` decimal(20,16) NOT NULL,
  `lat` decimal(20,16) NOT NULL,
  `distance_moved` int(10) unsigned NOT NULL,
  `speed` int(10) unsigned NOT NULL,
  `direction` int(10) unsigned NOT NULL,
  `start_ts` int(10) unsigned NOT NULL,
  `end_ts` int(10) unsigned NOT NULL,
  `time_at_point` int(10) unsigned NOT NULL,
  `speed_fixed` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `imei` (`imei`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1;
