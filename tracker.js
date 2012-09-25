var config = require('./config');
var net = require('net');
var mysql_driver = require('mysql');

var mysql = mysql_driver.createConnection(config.db);
mysql.connect();

// Set the timezone to UTC as that's what comes back from the tracker
mysql.query("SET time_zone = '"+config.time_offset+"'");

// This stores the previous point by IMEI to prevent DB duplication
var cache = {};

// Build the cache
var csql = "SELECT * FROM (SELECT imei,lon,lat FROM logs ORDER BY id DESC) sub GROUP BY imei";
mysql.query(csql, function(err, rows, fields) {
	for (key in rows) {
		cache[rows[key].imei] = {};
		cache[rows[key].imei].lon = rows[key].lon;
		cache[rows[key].imei].lat = rows[key].lat;
	}
});

var server = net.createServer(function(c) {
	console.log('Client connected from ' + c.remoteAddress);

	var buffer,hash_expected,replened;

	var reset = function() {
		buffer = '';
		hash_expected = 6;
		replened = false;
	}
	reset();

	c.on('data', function(data) {
		var str = data.toString();

		for (var i = 0; i < str.length; i++) {
			var char = str.charAt(i);

			if (char == '#') {
				hash_expected--;
			}

			buffer += char;

			if (hash_expected == 0) {
				if (!replened) {
					hash_expected += (parseInt(str.charAt(i+1)) * 4) + 2;
					replened = true;
				}
				else {
					var split = buffer.split('#');

					var datum = {
						'imei'      : split[1],
						'data_type' : split[5],
						'points'    : [],						
					};

					for (var j = 0; j < parseInt(split[6]); j++) {
						offset = 6 + (j * 4);

						var loc_split = split[offset + 2].split(',');

						function date(part) {
							var date = split[offset + 3];

							return date.substring(part * 2, (part * 2) + 2);
						}
						function time(part) {
							var time = split[offset + 4];

							return time.substring(part * 2, (part * 2) + 2);
						}
						function convert_coord(coord, direction) {
							var dot = coord.indexOf('.');

							var deg = parseInt(coord.substring(0, dot - 2));
							var mins = parseFloat(coord.substring(dot - 2));

							return (deg + (mins / 60)) * ((direction == 'S' || direction == 'W') ? -1 : 1);
						}

						datum.points.push({
							'type'      : split[offset + 1],
							'lon'       : convert_coord(loc_split[0], loc_split[1]),
							'lat'       : convert_coord(loc_split[2], loc_split[3]),
							'speed'     : parseFloat(loc_split[4]),
							'direction' : parseFloat(loc_split[5]),
							'date'      : '20'+date(2)+'-'+date(1)+'-'+date(0),
							'time'      : time(0)+':'+time(1)+':'+time(2),
						});
					}

					var val_strings = [];
					var new_end = 0;
					for (key in datum.points) {
						// Ignore invalid points
						if (!isNaN(datum.points[key].lon) && !isNaN(datum.points[key].lat)) {
							if (cache.hasOwnProperty(datum.imei) && cache[datum.imei].lon == datum.points[key].lon && cache[datum.imei].lat == datum.points[key].lat) {
								new_end = datum.points[key].date+' '+datum.points[key].time;
							}
							else {
								if (cache.hasOwnProperty(datum.imei)) {
									var lat_orig = cache[datum.imei].lat;
									var lon_orig = cache[datum.imei].lon;
									var lat_cur = datum.points[key].lat;
									var lon_cur = datum.points[key].lon;
									
									val_strings.push('("'+datum.imei+'","'+datum.points[key].type+'",'+datum.points[key].lon+','+datum.points[key].lat+','+datum.points[key].speed+','+datum.points[key].direction+',UNIX_TIMESTAMP("'+datum.points[key].date+' '+datum.points[key].time+'"),UNIX_TIMESTAMP("'+datum.points[key].date+' '+datum.points[key].time+'"), (((ACOS(SIN('+lat_orig+' * PI() / 180) * SIN('+lat_cur+' * PI() / 180) + COS('+lat_orig+' * PI() / 180) * COS('+lat_cur+' * PI() / 180) * COS(('+lon_orig+' - '+lon_cur+') * PI() / 180)) * 180 / PI()) * 60 * 1.1515) * 1609.344))');
								}
								else {
									val_strings.push('("'+datum.imei+'","'+datum.points[key].type+'",'+datum.points[key].lon+','+datum.points[key].lat+','+datum.points[key].speed+','+datum.points[key].direction+',UNIX_TIMESTAMP("'+datum.points[key].date+' '+datum.points[key].time+'"),UNIX_TIMESTAMP("'+datum.points[key].date+' '+datum.points[key].time+'"), 0)');
								}
								
								cache[datum.imei] = {lon: datum.points[key].lon, lat: datum.points[key].lat};
							}
						}
					}

					if (val_strings.length) {
						var sql = 'INSERT INTO logs (imei,type,lon,lat,speed,direction,start_ts,end_ts,distance_moved) VALUES ' + val_strings.join(',');
						try {
							mysql.query(sql);
						}
						catch(err) {
							console.log(err);
						}

						console.log("Logged");
					}
					else if (new_end) {
						var sql = 'UPDATE logs SET end_ts=UNIX_TIMESTAMP("'+new_end+'"), time_at_point=(UNIX_TIMESTAMP("'+new_end+'")-start_ts) WHERE imei="'+datum.imei+'" ORDER BY id DESC LIMIT 1';

						try {
							mysql.query(sql);
						}
						catch(err) {
							console.log(err);
						}

						console.log("Updated TS");
					}
					else {
						console.log("Failed to Log");
					}

					reset();
				}
			}
		}
	});
});

server.listen(5674, function() { //'listening' listener
	console.log('Server Bound');
});
