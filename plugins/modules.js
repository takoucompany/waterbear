modules = {
	init : function() {
		modules.addr = moduleAddress.addr;
		modules.mode = moduleAddress.mode;
		modules.dataSet = moduleAddress.dataSet;
		if( typeof modules.calculatedAddr === "undefined") {
			modules.calculatedAddr = new Array();
			for(var i = 0; i <= moduleAddress.addr.length; i++) {
				if (typeof moduleAddress.dataSet[modules.addr[i]] !== "undefined") {
					if(moduleAddress.dataSet[modules.addr[i]].length != 0) {
						modules.calculatedAddr.push(modules.addr[i]);
					}
				}
			}
		}
	},
};
modules.init();
