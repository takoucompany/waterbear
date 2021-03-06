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

        {
            label: 'Lua main function ()', 
            trigger: true, 
            containers: 1, 
            slot: false, 
            script: 'function kick()\n\n[[1]]\nend\n',
            help: 'Trigger for main loop'
        },


	{
          	label: '***Finish Lua program***',
		slot: false,  
          	script: 'return -1',
          	help: 'Return'
        },



        {
            label: 'for loop : times [number:10]', 
            containers: 1, 
        //    slot: false, 
            script: 'for forloop =1\, {{1}} do\n[[1]]\nend',
            help: 'loop until condition fails'
        },

	{
          	label: 'break from loop',
		slot: false,  
          	script: ' do\n break \n end',
          	help: 'break command'
        },



        {
            label: 'if [string:value = 10]', 
            containers: 1, 
            script: 'if {{1}} then \n[[1]]\nend',
            help: 'only run blocks if condition is true'
        },

        {
            label: 'if [string:value = 10]', 
            containers: 2, 
            subContainerLabels: ['else'],
            script: 'if {{1}} then\n[[1]]\n else \n[[2]]\n end',
            help: 'run first set of blocks if condition is true, second set otherwise'
        },


        {
          	label:'[string:value] = [string:1 + 1 - 2 * 3 / 3]',
          	script: "{{1}} = {{2}}",
          	help: 'Change the value of an already created string variable'
        },


    ], false),
    
    timing: menu('Timing', [
        {
            label: 'wait [number:1] secs', 
            script: 'act_module(\"(500)\", \"(0)\",\"{{1}}\")',
            help: 'pause before running subsequent blocks'
        },

        {
            label: 'wait [number:1] msecs', 
//            script: 'act_module(\"(501)\", \"(0)\",math.floor\({{1}}\))',
            script: 'act_module(\"(501)\", \"(0)\",\"{{1}}\")',
            help: 'pause before running subsequent blocks'
        },

    ]),
    
    io: menu('Electronic Interface', [
    //yk-------------------------------------
 	{
            label: 'act_Module  addr : [choice:module_addr] mode : [choice:module_mode] value : [string:0]', 
            script: 'act_module(\"({{1}})\",\"({{2}})\", \"\"..({{3}})..\"\")',
            help: 'Create a named pin set to input',
            
        },

 	{
            label: 'get raw data [string:value]  = act_Module  addr : [choice:module_addr] mode : [choice:module_mode] value : [string:0]', 
            script: '{{1}} = act_module(\"({{2}})\",\"({{3}})\", \"\"..({{4}})..\"\")',
            help: 'Create a named pin set to input',
            
        },
/*
        {
          	label:'value [string:value]',
          	type : 'string',
          	script: "\"..{{1}}..\"",
          	help: 'Get the value of a string variable'
        },
*/

//yk-------------------------------------

//yk-------------------------------------
/* 	{
            label: 'act_Module  addr : [choice:module_addr] mode : [choice:module_mode] value : [string:0]', 
            'type': 'number', 
            script: 'act_module(\"({{1}})\",\"({{2}})\", \"{{3}}\")',
            help: 'Create a named pin set to input',
            
        },
*/


//yk-------------------------------------
    ]),
 /*   
    variables: menu('Variables', [
        {
          	label:'[string:value] = [string:1 + 2]',
          	script: "{{1}} = {{2}}",
          	help: 'Change the value of an already created string variable'
        },

        {
          	label:'value of [string:value]',
          	type : 'number',
          	script: "{{1}}",
          	help: 'Get the value of a string variable'
        },

        {
          	label:'value of [string:value]',
          	type : 'boolean',
          	script: "{{1}}",
          	help: 'Get the value of a true or false variable'
        }


      ]),

*/

    print: menu('Print', [
                


        {
          	label: 'LCD print    <br>[any:Text]', 
            script: 'act_module(\"(40:LCD)\",\"{{1}}\", \"1\")',
            help: 'Send a message to LCD'
        },


        {
          	label: 'LCD clear', 
            script: 'act_module(\"(40:LCD)\",\"(clear)\", \"2\")',
            help: 'clear LCD'
        },



        
        {
          	label: 'JTAG print <br>[any:Text]', 
          	script: "print(\"{{1}}\\n\")",
            help: 'Send a message over the serial connection followed by a line return'
        },

        {
            label: 'Chani text<br>[string:text] .. [string:value]<br><br> .. [any:text]', 
            'type': 'any', 
            script: "\"..\"{{1}}\" .. {{2}}..\"{{3}}\"..\"",
            help: 'Check if one number is equal to another'
        },

        {
            label: 'Value to Text[string:value]', 
            'type': 'any', 
            script: "\"..\"({{1}})\"..\"",
            help: 'Check if one number is equal to another'
        },



    ]),


  file: menu('File', [


        {
          	label:'SAVE filename:[string:file.txt] <br>Add Line:[any:Text]',
          	script: "act_module(\"(600)\",\"/home/httpd/{{1}}\",\"{{2}}\\n\")",
          	help: 'Writing text or values to file.'
        },

/*
        {
          	label:'Use only Red Brock in this box<br>SAVE filename:[string:file.txt]', 
	          containers: 1, 
         		script: "act_module(\"(600)\",\"/home/httpd/{{1}}\",\"[[1]]\")",          			help: 'Use only Red Brock in this box.'
        },

        {
          	label:'text line:[any:text]', 
		script: "\"..\"{{1}}\\n\"..\"",
		help: 'Writing text or values to file.'
        },
*/
        {
            label: 'Chani text<br>[string:text1] .. [string:value]<br><br> .. [any:text2]', 
            'type': 'any', 
            script: "\"..\"{{1}}\".. ({{2}})..\"{{3}}\"..\"",
            help: 'Check if one number is equal to another'
        },

        {
          	label:'Delete filename:[string:file.txt]',
          	script: "act_module(\"(601)\",\"/home/httpd/{{1}}\",\"0\")",
          	help: 'Write file name.'
        },

    ]),


    math: menu('Math', [

        {
          	label:'[string:value] = [number:set math brock]',
          	script: "{{1}} = {{2}}",
          	help: 'Change the value of an already created string variable'
        },


        {
            label: '[string:value]', 
            'type': 'number', 
            script: "{{1}}",
            help: 'You can write simple value'
        },

        {
            label: 'raw data to mV [number:0]mV', 
            'type': 'number', 
            script: "({{1}} * (3300 / 4095))",
            help: 'change value to voltage'
        },

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
            label: 'absolute of [number: -10]', 
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
