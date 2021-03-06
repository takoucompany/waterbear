yepnope({
    load: 'plugins/arduino.css'
});

(function(){
	
    // This file depends on the runtime extensions, which should probably be moved into this namespace rather than made global
    
// expose these globally so the Block/Label methods can find them
window.choice_lists = {
    /*keys: 'abcdefghijklmnopqrstuvwxyz0123456789*+-./'
        .split('').concat(['up', 'down', 'left', 'right',
        'backspace', 'tab', 'return', 'shift', 'ctrl', 'alt', 
        'pause', 'capslock', 'esc', 'space', 'pageup', 'pagedown', 
        'end', 'home', 'insert', 'del', 'numlock', 'scroll', 'meta']),*/
    highlow: ['HIGH', 'LOW'],
    inoutput: ['INPUT', 'OUTPUT'],
    onoff: ['ON', 'OFF'],
    logic: ['true', 'false'],
    digitalpins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,'A0','A1','A2','A3','A4','A5'],
    analoginpins: ['A0','A1','A2','A3','A4','A5'],
    pwmpins: [3, 5, 6, 9, 10, 11],
    baud:[9600, 300, 1200, 2400, 4800, 14400, 19200, 28800, 38400, 57600, 115200],
    analogrefs:['DEFAULT', 'INTERNAL', 'INTERNAL1V1', 'INTERNAL2V56', 'EXTERNAL'],

//yk-------------------------------------
	module_addr:modules.calculatedAddr,
	module_mode:modules.mode 
//yk-------------------------------------

};

window.callback_lists = {
	module_addr:'window.callback.module_addr'
};

window.callback = {
	module_addr:function(e) {
		var list = modules.dataSet[e.value];
		if (list.length == 0) {
			return;
		}
		var nextModes = e.parentNode.parentNode.getElementsByClassName("module_mode");
		var selects = nextModes[0].getElementsByTagName("select");
		if (typeof selects !== "undefined" && e.value !== "undefined") {
			var options = selects[0].childNodes;
			if (typeof options !== "undefined") {
				for (var i = options.length-1 ; i >= 0 ; i--){
					selects[0].removeChild(options[i]);
				}
			}
			var list = modules.dataSet[e.value];
			list.map(function(item){
				var option = document.createElement("option");
				option.appendChild(document.createTextNode(item));
				selects[0].appendChild(option);
	        });
		}
	}
};

window.set_defaultscript = function(script){
    window.defaultscript = script; 
};

window.load_defaultscript = function(script){
    if (typeof window.defaultscript != 'undefined'){
        //console.log("window.defaultscript =", window.defaultscript);
        load_scripts_from_object(window.defaultscript);
    }
};

window.update_scripts_view = function(){
    var blocks = $('.workspace:visible .scripts_workspace > .wrapper');
    var view = $('.workspace:visible .scripts_text_view');
    blocks.write_script(view);
};

function run_scripts(event){
    $('.stage')[0].scrollIntoView();
    var blocks = $('.workspace:visible .scripts_workspace > .trigger');
    $('.stage').replaceWith('<div class="stage"><script>' + blocks.wrap_script() + '</script></div>');
}
$('.run_scripts').click(run_scripts);

jQuery.fn.extend({
  extract_script: function(){
      if (this.length === 0) {return '';}
      if (this.is(':input')) {return this.val();}
      if (this.is('.empty')) {return '// do nothing';}
      return this.map(function(){
          var self = $(this);
          var script = self.data('script');
          if (!script) {return null;}
          var exprs = $.map(self.socket_blocks(), function(elem, idx){return $(elem).extract_script();});
          var blks = $.map(self.child_blocks(), function(elem, idx){return $(elem).extract_script();});
          if (exprs.length){
              // console.log('expressions: %o', exprs);
              var exprf = function(match, offset, s){
                  // console.log('%d args: <%s>, <%s>, <%s>', arguments.length, match, offset, s);
                  var idx = parseInt(match.slice(2,-2), 10) - 1;
                  // console.log('index: %d, expression: %s', idx, exprs[idx]);
                  return exprs[idx];
              };
              script = script.replace(/\{\{\d\}\}/g, exprf);
          }
          if (blks.length){
              var blksf = function(match, offset, s){
                  var idx = parseInt(match.slice(2,-2), 10) - 1;
                  return blks[idx];
              };
              script = script.replace(/\[\[\d\]\]/g, blksf);
          }
          next = self.next_block().extract_script();
          if (script.indexOf('[[next]]') > -1){
              script = script.replace('[[next]]', next);
          }else{
              if (self.is('.step, .trigger')){
                  script = script + '\n' + next;
              }
          }
          return script;
      }).get().join('\n\n');
  },
  wrap_script: function(){
      // wrap the top-level script to prevent leaking into globals
      var script = this.map(function(){return $(this).extract_script();}).get().join('\n\n');
      //return 'var global = new Global();\n(function($){\nvar local = new Local();\n' + script + '\n})(jQuery);';
      return script;
  },
  write_script: function(view){
      view.html('<code><pre class="script_view">' + this.wrap_script() +  '</pre></code>');
  }
});

function test_block(block){
    var name = block.data('klass') + ': ' + block.data('label');
    try{
        eval(block.wrap_script());
        // console.log('passed: %s', name);
        return true;
    }catch(e){
        if (e.name === 'SyntaxError'){
            console.error('failed: %s, %o', name, e);
            return false;
        }else{
            // console.warn('passed with error: %s, %o', name, e);
            return true;
        }
    }
}

function test(){
    var blocks = $('#block_menu .wrapper');
    var total = blocks.length;
    var success = 0;
    var fail = 0;
    console.log('running %d tests', total);
    blocks.each(function(idx, elem){
        setTimeout(function(){
            // console.log('running test %d', idx);
            if(test_block($(elem)))
            {
              success++;
            }
            else
            {
              fail++;
            }
            if( success + fail === total){
                console.log('Ran %d tests, %d successes, %s failures', total, success, fail);
            }
        }, 10);
    });
}
window.test = test;

function clear_scripts(event, force){
    if (force || confirm('Throw out the current script?')){
        $('.workspace:visible > *').empty();
        $('.stage').replaceWith('<div class="stage"></div>');
    }
}

function clear_scripts_default(event, force){
  clear_scripts(event, force);
  load_defaultscript();  
}


$('.clear_scripts').click(clear_scripts_default);


var menus = {
    control: menu('Control', [
        //{
        //    label: 'Setup - When program starts', 
        //    trigger: true, 
        //    script: 'void setup()\n{\n[[next]]\n}\n',
        //    help: 'Start scripts when program starts'
        //},



        {
            label: 'Lua main function ()', 
            trigger: true, 
            containers: 1, 
            slot: false, 
            script: '\n----------------\n--function sToi is prepeared for act_module function \n\nfunction sToi(str_a)\n\tprint(str_a)\n\tptn1 = \":\"\n\tptn2 = \"[0-9,:]\"\n\tidx = 0\n\tstr_ar = \"\"\n\tans = string.find(str_a, ptn1)\n\tif (ans ~= nil) then\n\t\tfor str in string.gmatch(str_a,ptn2) do\n\t\t\tif idx < ans-1 then\n\t\t\t\tstr_ar = str_ar..str\n\t\t\telse\n\t\t\t\treturn str_ar\n\t\t\tend\n\t\t\tidx = idx + 1;\n\t\tend\n\telse\n\t\treturn str_ar\n\tend\n\treturn -1\nend\n\n----------------\n\nfunction kick()\n\n[[1]]\nend\n',
            help: 'Trigger for function and need activate modules'
        },


	{
          	label: '***Finish Lua program***',
		slot: false,  
          	script: 'return -1',
          	help: 'Return'
        },



/*
        {
            label: 'Lua main function ()', 
            trigger: true, 
            containers: 1, 
            slot: false, 
            script: 'function kick()\n\n[[1]]\nend\n',
            help: 'Trigger for main loop'
        },
*/

        //{
        //    label: 'Global Settings', 
        //    trigger: true, 
        //    script: '/*Global Settings*/\n\n[[next]]\n\n',
        //    help: 'Trigger for blocks in global setup'
        //},
        //uniqe id?
        //{
        //    label: 'broadcast [string:ack] message', 
        //    script: '{{1}}();',
        //    help: 'Send a message to all listeners'
        //},
        //{
        //    label: 'when I receive [string:ack] message', 
        //    trigger: true, 
        //    script: 'function {{1}}(){\n[[next]]\n}',
        //    help: 'Trigger for blocks to run when message is received'
        //},
        {
            label: 'while if [boolean]', 
            containers: 1, 
        //    slot: false, 
            script: 'while {{1}} do \n[[1]]\nend',
            help: 'loop until condition fails'
        },


	{
          	label: 'break from while',
		slot: false,  
          	script: ' do\n break \n end',
          	help: 'Return value'
        },



        {
            label: 'if [boolean]', 
            containers: 1, 
            script: 'if {{1}} then \n[[1]]\nend',
            help: 'only run blocks if condition is true'
        },

        {
            label: 'if [boolean]', 
            containers: 2, 
            subContainerLabels: ['else'],
            script: 'if {{1}} then\n[[1]]\n else \n[[2]]\n end',
            help: 'run first set of blocks if condition is true, second set otherwise'
        },
        //{
        //    label: 'repeat until [boolean]', 
        //    script: 'while(!({{1}})){\n[[1]]\n}',
        //    help: 'loop until condition is true'
        //}
    ], false),
    
    timing: menu('Timing', [
        {
            label: 'wait [number:1] secs', 
            script: 'actModule(500, math.floor\({{1}}\), 0)',
            help: 'pause before running subsequent blocks'
        },
/*
        //{
        //    label: 'Milliseconds since program started', 
        //    'type': 'int', 
        //    script: '(millis())',
        //    help: 'int value of time elapsed'
        //},
        //{
        //    label: 'Seconds since program started', 
        //    'type': 'int', 
        //    script: '(int(millis()/1000))',
        //    help: 'int value of time elapsed'
        //}
  */      
    ]),
    
    io: menu('Electronic Interface', [
    /*    {
            label: 'Create digital_output## on Pin [choice:digitalpins]', 
            script: 'digital_output## = "{{1}}"; pinMode(digital_output##, OUTPUT);',
            help: 'Create a named pin set to output',
            returns: {
                label: 'digital_output##',
                script: 'digital_output##',
                type: 'string'
            }
        },
        
        {
          	label: 'Set Digital Pin [string] [choice:highlow]', 
          	script: 'digitalWrite({{1}}, {{2}});',
          	help: 'Write a value to given pin'
        },
        
        {
          	label: 'Digital Pin [string] ON if [boolean]', 
          	script: 'if({{2}} == HIGH)\n{\ndigitalWrite({{1}}, HIGH);\n}\nelse\n{\ndigitalWrite({{1}}, LOW);\n}\n',
          	help: 'Write a boolean value to given pin'
        },
        
        {
            label: 'Create digital_input## on Pin [choice:digitalpins]', 
            script: 'digital_input## = "{{1}}"; pinMode(digital_input##, INPUT);',
            help: 'Create a named pin set to input',
            returns: {
                label: 'digital_input##',
                script: 'digital_input##',
                type: 'string'
            }
        },
        
        {
            label: 'Digital Pin [string]', 
            //label: 'Is Pin [string] HIGH', 
            'type': 'boolean', 
            script: '(digitalRead({{1}}) == HIGH)',
            help: 'Is the digital input pin ON'
        },
        
        
        {
            label: 'Create analog_input## on Pin [choice:analoginpins] ', 
            script: 'analog_input## = "{{1}}"; pinMode(analog_input##, INPUT);',
            help: 'Create a named pin set to input',
        },
*/
//yk-------------------------------------
 	{
            label: 'act_Module  addr : [choice:module_addr] mode : [choice:module_mode] value : [number:0]', 
            script: 'act_module( sToi (\"{{1}}\"), sToi (\"{{2}}\"), {{3}})',
            help: 'Create a named pin set to input',
            
        },
//yk-------------------------------------

//yk-------------------------------------
 	{
            label: 'act_Module  addr : [choice:module_addr] mode : [choice:module_mode] value : [number:0]', 
            'type': 'number', 
            script: 'act_module( sToi (\"{{1}}\"), sToi (\"{{2}}\"), {{3}})',
            help: 'Create a named pin set to input',
            
        },

//yk-------------------------------------
/*        
        {
            label: 'Analog Pin [string]', 
            'type': 'int', 
            script: '(analogRead({{1}}))',
            help: 'Value of analog pin'
        },
        
        {
            label: 'Create analog_output## on Pin [choice:pwmpins]', 
            script: 'analog_output## = "{{1}}"; pinMode(analog_output##, OUTPUT);',
            help: 'Create a named pin set to output',
            returns: {
                label: 'analog_output##',
                script: 'analog_output##',
                type: 'string'
            }
        },
        
        {
          	label: 'Analog [string] outputs [int:255]', 
          	script: 'analogWrite({{1}}, {{2}});',
          	help: 'Set value of a pwm pin'
        }
*/
    ]),
    
    variables: menu('Variables', [
        {
          	label:'[string:var] = [number]',
          	script: "{{1}} = {{2}}",
          	help: 'Change the value of an already created string variable'
        },
        {
          	label:'value of [string:var]',
          	type : 'number',
          	script: "{{1}}",
          	help: 'Get the value of a string variable'
        },

        {
          	label:'value of [string:var]',
          	type : 'boolean',
          	script: "{{1}}",
          	help: 'Get the value of a true or false variable'
        }

      ]),
    operators: menu('Operators', [
        {
            label: '[number:0] < [number:0]', 
            'type': 'boolean', 
            script: "({{1}} < {{2}})",
            help: 'Check if one number is less than another'
        },
        {
            label: '[number:0] = [number:0]', 
            'type': 'boolean', 
            script: "({{1}} == {{2}})",
            help: 'Check if one number is equal to another'
        },
        
        {
            label: '[number:0] > [number:0]', 
            'type': 'boolean', 
            script: "({{1}} > {{2}})",
            help: 'Check if one number is greater than another'
        },
        {
            label: '[boolean:true] and [boolean:true]', 
            'type': 'boolean', 
            script: "({{1}} and {{2}})",
            help: 'Check if both are true'
        },
        {
            label: '[boolean:true] or [boolean:true]', 
            'type': 'boolean', 
            script: "({{1}} or {{2}})",
            help: 'Check if one is true'
        },
        {
            label: 'not [boolean]', 
            'type': 'boolean', 
            script: "(! {{1}})",
            help: 'Not true is false and Not false is true'
        },
        {
            label: '[number:0] mod [number:0]', 
            'type': 'number', 
            script: "({{1}} % {{2}})",
            help: 'Gives the remainder from the division of these two number'
        },
    ]),
    print: menu('Print', [
        
        {
          	label: 'print <br>[any:Message] as a line', 
          	script: "print(\"{{1}}\\n\")",
            help: 'Send a message over the serial connection followed by a line return'
        },

        {
            label: 'Chani text<br>[string:text]<br><br> .. [number:0]<br><br> .. [string:]', 
            'type': 'string', 
            script: "\"..\"{{1}}\" .. {{2}}..\"{{3}}\"..\"",
            help: 'Check if one number is equal to another'
        },



        {
          	label:'print [any:Message] : show value [number:0]',
          	script: "print(\"{{1}} : \"..\({{2}}\)..\"\\n\")",
          	help: 'Change the value of an already created string variable'
        },

	{
          	label: 'Card data name:[string:Card_name] ,<br>data <br>[data:DATA]', 
          	script: "{{1}} =\{{{2}}\}",
          help: 'Preparing for writing text or values to file, and close it.'
        },

        {
            label: '[string:Data_Name]<br><br> = [number:0]', 
            'type': 'data', 
            script: "{{1}} = {{2}}",
            help: 'Check if one number is less than another'
        },

        {
            label: '=chain data<br>[number:0],<br><hr><br>[string:Data_Name] <br><br>= [number:0]', 
            'type': 'number', 
            script: "{{1}}, {{2}} = {{3}}",
            help: 'Check if one number is less than another'
        },



/*
        {
          	label: 'Message Value', 
          	type: 'string',
          	script: "Serial.read()",
          	help: 'Read a message from the serial connection'
        },
*/
    ]),


  file: menu('File', [


        {
          	label: 'File for add aline<br><br> ID:[string:WFile1]  File Name:[string:WFile.txt]', 
          containers: 1, 
          	script: "{{1}}, {{1}}msg = io.open(\"/mut/{{2}}\",\"a\")\n[[1]]\n{{1}}:close()",
          help: 'Preparing for writing text or values to file, and close it.'
        },

        {
          	label:'Write Text to ID:[string:WFile1] <br>TEXT:[string:LineText]',
          	script: "if({{1}}) then\n{{1}}:write(\"{{2}}\\n\")\nelse\nprint({{1}}msg)\nend",
          	help: 'Writing text or values to file.'
        },


        {
            label: 'Chani text<br>[string:text]<br><br> .. [number:0]<br><br> .. [string:]', 
            'type': 'string', 
            script: "\"..\"{{1}}\" .. {{2}}..\"{{3}}\"..\"",
            help: 'Check if one number is equal to another'
        },

        {
          	label: 'File for read a line<br>ID:[string:RFile1]  File name:[string:RFile.txt]', 
          containers: 1, 
          	script: "{{1}}, {{1}}msg = io.open(\"/mut/{{2}}\",\"r\")\n[[1]]\n{{1}}:close()",
          help: 'Preparing for reading text or values from file, and close it.'
        },

        {
          	label:'Read a line from ID:[string:RFile1]  <br>to:[string:Line]',
          	script: "if({{1}}) then\n{{2}} = {{1}}:read(\"*l\")\nelse\nprint({{1}}msg)\nend",
          	help: 'Reading text or values from file.'
        },

    ]),


    math: menu('Math', [

        {
            label: '[number:0] + [number:0]', 
            'type': 'number', 
            script: "({{1}} + {{2}})",
            help: 'Add two numbers'
        },
        {
            label: '[number:0] - [number:0]', 
            'type': 'number', 
            script: "({{1}} - {{2}})",
            help: 'Subtract two numbers'
        },
        {
            label: '[number:0] * [number:0]', 
            'type': 'number', 
            script: "({{1}} * {{2}})",
            help: 'Multiply two numbers'
        },
        {
            label: '[number:0] / [number:0]',
            'type': 'number', 
            script: "({{1}} / {{2}})",
            help: 'Divide two numbers'
        },
        {
            label: 'pick random [number:1] to [number:10]', 
            'type': 'number', 
            script: "(math.random({{1}}, {{2}}))",
            help: 'Generate a random number between two other numbers'
        },
        {
            label: 'set seed for random numbers to [number:1]', 
            script: "(math.randomseed({{1}}))",
            help: ''
        },
       
        {
            label: '[number:0] mod [number:0]', 
            'type': 'number', 
            script: "({{1}} % {{2}})",
            help: 'Gives the remainder from the division of these two number'
        },

        {
            label: 'absolute of [number:10]', 
            'type': 'number', 
            script: "(math.abs({{1}}))",
            help: 'Gives the positive of the number'
        },

        {
            label: ' [number:1]*PI', 
            'type': 'number', 
            script: "({{1}}*math.pi)",
            help: 'Gives the pi = 3.14....'
        },

        {
            label: 'cos( [number:10] ) deg', 
            'type': 'number', 
            script: '(math.cos((180 / {{1}})/ 3.14159))',
            help: 'Gives the cosine of the angle'
        },
        {
            label: 'sin( [number:10] ) deg',  
            'type': 'number', 
            script: '(math.sin((180 / {{1}})/ 3.14159))',
            help: 'Gives the sine of the angle'
        },
        {
            label: 'tan( [number:10] ) deg', 
            'type': 'number', 
            script: '(math.tan((180 / {{1}})/ 3.14159))',
            help: 'Gives the tangent of the angle given'
        },
        {
            label: '[number:10] to the power of [number:2]', 
            'type': 'number', 
            script: '(math.pow({{1}}, {{2}}))',
            help: 'Gives the first number multiplied by itself the second number of times'
        },
        {
            label: 'square root of [number:10]', 
            'type': 'number', 
            script: '(math.sqrt({{1}}))',
            help: 'Gives the two numbers that if multiplied will be equal to the number input'
        },



/*
        {
          	label: 'Message Value', 
          	type: 'string',
          	script: "Serial.read()",
          	help: 'Read a message from the serial connection'
        },
*/
    ])





};

var defaultscript=[{"klass":"control","label":"Global Settings","script":"/*Global Settings*/\u000a\u000a[[next]]\u000a\u000a","containers":0,"trigger":true,"sockets":[],"contained":[],"next":""},{"klass":"control","label":"Setup - When program starts","script":"void setup()\u000a{\u000a[[next]]\u000a}\u000a","containers":0,"trigger":true,"sockets":[],"contained":[],"next":""},{"klass":"control","label":"Main loop","script":"void loop()\u000a{\u000a[[1]]\u000a}\u000a","containers":1,"trigger":true,"sockets":[],"contained":[""],"next":""}];
set_defaultscript(defaultscript);

var demos = [
    {
      title:"AnalogInOutSerial",
      description:"first example in Arduino IDE",
      scripts:[{"klass":"control","label":"Global Settings","script":"/*Global Settings*/\u000a\u000a[[next]]\u000a\u000a","containers":0,"trigger":true,"sockets":[],"contained":[],"next":{"klass":"variables","label":"Create [string:var] set to [string]","script":"String {{1}} = '{{2}}';","containers":0,"sockets":["analogInPin","0"],"contained":[],"next":{"klass":"variables","label":"Create [string:var] set to [string]","script":"String {{1}} = '{{2}}';","containers":0,"sockets":["analogOutPin","9"],"contained":[],"next":{"klass":"variables","label":"Create [string:var] set to [int:0]","script":"int {{1}} = {{2}}'","containers":0,"sockets":["sensorValue","0"],"contained":[],"next":{"klass":"variables","label":"Create [string:var] set to [int:0]","script":"int {{1}} = {{2}}'","containers":0,"sockets":["outputValue","0"],"contained":[],"next":""}}}}},{"klass":"control","label":"Setup - When program starts","script":"void setup()\u000a{\u000a[[next]]\u000a}\u000a","containers":0,"trigger":true,"sockets":[],"contained":[],"next":{"klass":"serial","label":"Setup serial communication at [choice:baud]","script":"Serial.begin({{1}});","containers":0,"sockets":["9600"],"contained":[],"next":""}},{"klass":"control","label":"Main loop","script":"void loop()\u000a{\u000a[[1]]\u000a}\u000a","containers":1,"trigger":true,"sockets":[],"contained":[{"klass":"variables","label":"[string:var] = [int:0]","script":"{{1}} = {{2}};","containers":0,"sockets":["sensorValue",{"klass":"io","label":"Analog Input [string:0]","script":"(analogRead({{1}}))","containers":0,"type":"int","sockets":[{"klass":"variables","label":"value of [string:var]","script":"{{1}}","containers":0,"type":"string","sockets":["analogInPin"],"contained":[],"next":""}],"contained":[],"next":""}],"contained":[],"next":{"klass":"variables","label":"[string:var] = [int:0]","script":"{{1}} = {{2}};","containers":0,"sockets":["outputValue",{"klass":"operators","label":"round [number:10]","script":"(int({{1}}))","containers":0,"type":"int","sockets":[{"klass":"operators","label":"Map [number] from Analog in to Analog out","script":"map({{1}}, 0, 1023, 0, 255)","containers":0,"type":"number","sockets":[{"klass":"variables","label":"value of [string:var]","script":"{{1}}","containers":0,"type":"int","sockets":["sensorValue"],"contained":[],"next":""}],"contained":[],"next":""}],"contained":[],"next":""}],"contained":[],"next":{"klass":"serial","label":"Send [any:Message] as a line","script":"Serial.println({{1}});","containers":0,"sockets":[{"klass":"variables","label":"value of [string:var]","script":"{{1}}","containers":0,"type":"int","sockets":["outputValue"],"contained":[],"next":""}],"contained":[],"next":""}}}],"next":""}]
    }
];
populate_demos_dialog(demos);

})();
