// http://github.com/jayfresh/AjaxReq
var AjaxReq = {};
AjaxReq.ajax = function(args) {
	if(AjaxReq.proxyURL) {
		args.url = AjaxReq.proxyURL+encodeURIComponent(args.url);
		args.url += "&nocache=" + Math.random(); // avoid caching of any proxied request
	}
	if(window.Components && window.netscape && window.netscape.security && document.location.protocol.indexOf("http") == -1) {
		window.netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
	}
	try {
		return jQuery.ajax(args);
	} catch(ex) {
		var errorMsg = "problem with AjaxReq ajax request";
		if(console && console.error) {
			console.error(errorMsg,ex);
		} else {
			alert(errorMsg+": "+ex.message);
		}
		return false;
	}
};

var boroughs = {
	"barnet": ["N2", "N3", "N10", "N11", "N12", "N14", "N20", "NW2", "NW4", "NW7", "NW9", "NW11"],
	"bexley": ["SE2"],
	"brent": ["NW2", "NW6", "NW9", "NW10"],
	"bromley": ["SE9", "SE19", "SE20"],
	"camden": ["N19", "NW1", "NW3", "NW5", "NW6", "NW8", "W1", "WC1"],
	"city of london": ["EC1", "EC2", "EC3", "EC4"],
	"city of westminster": ["NW8", "W1", "W11", "WC2", "SW1"],
	"croydon": ["SE19", "SE25", "SW16"],
	"ealing": ["NW10", "W3", "W5", "W7", "W13"],
	"enfield": ["N9", "N11", "N13", "N14", "N18", "N22"],
	"greenwich": ["SE2", "SE3", "SE7", "SE9", "SE10", "SE18", "SE28"],
	"hackney": ["E2", "E5", "E8", "E9", "E15", "EC2", "N1", "N16"],
	"hammersmith and fulham": ["NW10", "SW6", "W6", "W12"],
	"haringey": ["N4", "N6", "N8", "N10", "N15", "N17"],
	"hounslow": ["W4"],
	"islington": ["EC1", "N1", "N5", "N7", "N19", "WC1"],
	"kensington and chelsea": ["SW1", "SW3", "SW5", "SW7", "SW10", "W8", "W10", "W11", "W14"],
	"lambeth": ["SE1", "SE11", "SE19", "SE24", "SE27", "SW2", "SW4", "SW8"],
	"lewisham": ["SE3", "SE4", "SE6", "SE8", "SE12", "SE13", "SE14", "SE21", "SE23", "SE26"],
	"merton": ["SW17", "SW19", "SW20"],
	"newham": ["E3", "E6", "E7", "E12", "E13", "E15", "E16"],
	"redbridge": ["E11", "E12", "E18"],
	"richmond": ["SW13", "SW14"],
	"southwark": ["SE1", "SE5", "SE15", "SE16", "SE17", "SE21", "SE22"],
	"tower hamlets": ["E1", "E2", "E3", "E14"],
	"waltham forest": ["E4", "E10", "E11", "E17"],
	"wandsworth": ["SW8", "SW11", "SW12", "SW15", "SW16", "SW17", "SW18", "SW19"],
	"westminster": ["NW1", "SW1", "W1", "W2", "W9", "W10", "WC1", "WC2"]
};

var postalAreas = {};
for(var i in boroughs) {
	for(var j=0, jl=boroughs[i].length, area; j<jl; j++) {
		area = boroughs[i][j];
		if(!postalAreas[area]) {
			postalAreas[area] = [];
		}
		postalAreas[area].push(i);
	}
}

var checkPostalAreas = function(areas,postcode) {
	var areaMatches = [];
	var GLocalSearch = function(callback) {
		var url = "http://ajax.googleapis.com/ajax/services/search/local?v=1.0&q=pub,"+postcode+",london";
		console.log(url);
		var searchCallback = function(data,status) {
			console.log(data);
			if(data) {
				var results = eval('(' + data + ')');
				results = results.responseData.results;
				var city;
				for(var i=0,il=results.length;i<il;i++) {
					city = results[i].city.toLowerCase();
					console.log("from address, city: "+city);
					for(var j=0,jl=areas.length;j<jl;j++) {
						console.log("an area in this postcode: "+areas[j]);
						if(areas[j].indexOf(city)!==-1) {
							areaMatches.push(areas[j]);
						}
					}
				}
			} else {
				console.log('no data returned by GLocalSearch');
			}
			callback();
		};
		AjaxReq.ajax({
			url: url,
			success: searchCallback,
			error: function() {
				console.log("error",arguments);
			}
		});
	};
	GLocalSearch(function() {
		console.log(areaMatches);
		$('#results').text(areaMatches.toString());
	});
};

var getBorough = function(postcode, callback) {
	var url = "http://policeapi.rkh.co.uk/api/geocode-crime-area?key=rewiredcrime&q="+postcode;
	var searchCallback = function(responseText) {
		if(responseText) {
			var areaRegex = /<area-id>(.*?)<\/area-id>/igm;
			var matches = areaRegex.exec(responseText);
			var area_id;
			var count = 0;
			while(matches) {
				console.log(matches);
				count++;
				if(count==2) { // this is specific to this use-case of looking for Boroughs
					area_id = matches[1];
				}
				matches = areaRegex.exec(responseText);
			}
			console.log('looked for area, found: '+area_id);
			var resolveAreaId = function(id) {
				var url = "http://policeapi.rkh.co.uk/api/crime-area?key=rewiredcrime&force=metropolitan&area="+id;
				var idSearchCallback = function(responseText) {
					if(responseText) {
						var nameRegex = /<name>(.*?)<\/name>/;
						var matches = nameRegex.exec(responseText);
						var borough = matches[1]
							.replace(/<!\[CDATA\[|\]\]>/,"");
						console.log('looked for borough, found: '+borough);
						callback(borough);
					}
				};
				AjaxReq.ajax({
					url: url,
					dataType: "text",
					success: idSearchCallback,
					error: function() {
						console.log("error",arguments);
					}
				});
			};
			resolveAreaId(area_id);
		}
	};
	AjaxReq.ajax({
		url: url,
		dataType: "text",
		success: searchCallback,
		error: function() {
			console.log("error",arguments);
		}
	});
};


$(document).ready(function() {
	$('#postcodeLookup').click(function() {
		var postcode = $('#postcode').val().replace(/ /g,"").toUpperCase();
		var lastBit = postcode.substring(postcode.length-3);
		var firstBit = postcode.substring(0,postcode.length-3);
		postcode = firstBit + " " + lastBit;
		//var postalAreaList = postalAreas[firstBit];
		//checkPostalAreas(postalAreaList,postcode);
		getBorough(postcode, function(borough) {
			$('#results').text(borough);
		});
		return false;
	});
});