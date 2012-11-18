
//Orval Board
//moduleAddress.js
//Supported by Euiseong Ha

moduleAddress = {
	addr : ["-","36:ProximitySensor","44:VariableLight","46:SimpleLED","48:PhotoSensor","50:DistanceSensor","52:Temperature"],
	dataSet : {	
		"-" : ['-'],
		"36:ProximitySensor" : ['1:CheckExistence'],
		"44:VariableLight" : ['1:Set_12bit_0-4095','2:Set_0-100%'],
		"46:SimpleLED" : ['1:Set_Bit_Data'],
		"48:PhotoSensor" : ['1:Read_12bit_0-4095','2:Read_0-100%'],
		"50:DistanceSensor" : ['1:Read_12bit_0-4095','2:Read_0-100%'],
		"52:Temperature" : ['1:Read_12bit_0-4095','2:Read_0-100%']
		},
	mode:['-']
}