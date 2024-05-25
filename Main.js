
function CreateCanvas(){
    var canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    document.body.style.margin = '0px';
    document.body.style.overflow = 'hidden';
    return canvas.getContext('2d');
}

function FindAllScripts(){
    function FindScripts(scripts, script, depth, total){
        script.depthx = depth;
        script.depthy = total.value;
        scripts.push(script);
        if(script.inputs && script.inputs.length > 0){
            for(var i of script.inputs){
                if(!scripts.includes(i)){
                    FindScripts(scripts, i, depth+1, total);
                }
            }
        }
        else{
            total.value++;
        }
    }

    function SetParents(scripts){
        for(var script of scripts){
            script.parents = [];
        }
        for(var script of scripts){
            if(script.inputs){
                for(var i of script.inputs){
                    i.parents.push(script);
                }
            }
        }
    }
    
    function FindMaxAtDepthX(scripts, depthx){
        var maxy;
        for(var script of scripts){
            if(script.depthx == depthx){
                if(maxy == undefined || script.depthy>maxy){
                    maxy = script.depthy;
                }
            }
        }
        return maxy;
    }

    var scripts = [];
    var total = {value:0};
    FindScripts(scripts, root, 0, total);
    SetParents(scripts);
    for(var s of scripts){
        s.x = window.innerWidth-(s.depthx+1)*120;
        var range = FindMaxAtDepthX(scripts, s.depthx);
        s.y = s.depthy*24 + window.innerHeight*0.5 - range*12;
    }
    return scripts;
}

function Draw(){
    var scripts = FindAllScripts();
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,window.innerWidth,window.innerHeight);
    ctx.font = '18px Arial';
    for(var s of scripts){
        if(s.inputs){
            for(var i of s.inputs){
                ctx.strokeStyle = 'cyan';
                ctx.beginPath();
                ctx.lineWidth = 3;
                ctx.moveTo(deltax+s.x, deltay+s.y+10);
                ctx.lineTo(deltax+i.x+100, deltay+i.y+10);
                ctx.stroke();
            }
        }
    }
    for(var s of scripts){
        var rectFillStyle = 'rgb(200,200,200)';
        var textFillStyle = 'rgb(50,50,50)';
        if(s.type == 'GetVariable' || s.type =='text' || s.type == 'number'){
            rectFillStyle = 'rgb(100,100,255)';
            if(s.type == 'GetVariable'){
                textFillStyle = 'rgb(200,255,200)';
            }
            else if(s.type == 'text'){
                textFillStyle = 'rgb(255,240,0)';
            }
            if(s.type == 'number'){
                textFillStyle = 'rgb(200,200,255)';
            }
        }
        else if(s.type == '?'){
            rectFillStyle = 'rgb(150,200,250)';
        }
        else if(s.type == '[]' || s.type == '...' || s.type == '=>'){
            rectFillStyle = 'rgb(150,255,200)';
        }
        else if(binaryOps.includes(s.type)){
            rectFillStyle = 'rgb(255,150,255)';
        }
        ctx.fillStyle = rectFillStyle;
        ctx.fillRect(deltax+s.x, deltay+s.y, 100, 20);
        ctx.fillStyle = textFillStyle;
        if(s.value){
            ctx.fillText(s.value, deltax+s.x, deltay+s.y+15);
        }
        else{
            ctx.fillText(s.type, deltax+s.x, deltay+s.y+15);
        }
        if(selected == s){
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.strokeRect(deltax+s.x, deltay+s.y, 100, 20);
        }
    }
    ctx.fillStyle = 'cyan';
    ctx.fillText(text,0,60);
}

var frame = 0;
var mousedragging = false;
var dragFromScript;
var deltax = 0;
var deltay = 0;
var mouseposx;
var mouseposy;
var text = '';
var updateFunc;
var root = {type:'Root', inputs:[]};
var functions = [];
var binaryOps = [];
var selected = root;
var ctx = CreateCanvas();


function Awake(){
    function AddFunction(name, args, code){
        functions.push({name, args, code});
    }

    AddFunction('Canvas', ['objects'], `
    for(var o of objects){
        if(o.type == 'FillRect'){
            ctx.fillStyle = 'rgb('+o.color.r+','+o.color.g+','+o.color.b+')'; 
            ctx.fillRect(o.rect.x,o.rect.y,o.rect.w,o.rect.h);
        }
        else if(o.type == 'FillText'){
            ctx.fillStyle = 'rgb('+o.color.r+','+o.color.g+','+o.color.b+')'; 
            ctx.font = o.fontsize+'px Arial';
            ctx.fillText(o.text, o.position.x, o.position.y);
        }
        else if(o.type == 'FillCircle'){
            ctx.fillStyle = 'rgb('+o.color.r+','+o.color.g+','+o.color.b+')'; 
            ctx.beginPath();
            ctx.arc(o.position.x, o.position.y, o.radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    `);
    AddFunction('Print', ['value'], 'console.log(value);');
    AddFunction('Range', ['length'], `
    var result = [];
    for(var i=0;i<length;i++){
        result.push(i);
    }
    return result;
    `);
    AddFunction('Map', ['input', 'lambda'], `
    var result = [];
    for(var i of input){
        result.push(lambda(i));
    }
    return result;
    `);
    AddFunction('Random', [], 'return Math.random();');
    AddFunction('Rect', ['x','y','w','h'], 'return {x,y,w,h};');
    AddFunction('Vector2', ['x','y'], 'return {x,y};');
    AddFunction('Color', ['r','g','b'], 'return {r,g,b};');
    AddFunction('FillRect', ['rect','color'], "return {type:'FillRect',rect,color};");
    AddFunction('FillCircle', ['position','radius','color'], "return {type:'FillCircle',position,radius,color};");
    AddFunction('FillText', ['position','text','fontsize','color'], "return {type:'FillText',position,text,fontsize,color};");
    binaryOps.push('+', '*', '/', '-', '%');
}

function IsDigit(c){
    return c>='0' && c<='9';
}

function FindSelected(script){
    if(script.inputs){
        for(var i of script.inputs){
            var selected = FindSelected(i);
            if(selected){
                return selected;
            }
        }
    }
    if(script.type == '?'){
        return script;
    }
}

function Run(){
    function Emit(){
        var scriptsUsed = [];
        var functionsUsed = [];
        var variables = [];

        function EmitArgs(func){
            var result = '';
            for(var i=0;i<func.args.length;i++){
                result+=func.args[i];
                if(i<func.args.length-1){
                    result+=',';
                }
            }
            return result;
        }

        function CreateVariableToEmit(script){
            if(script.parents.length>1){
                var scriptUsed = scriptsUsed.find(s=>s.script == script);
                if(scriptUsed){
                    return scriptUsed.varname;
                }
                var varname = 'variable'+variables.length; 
                variables.push('var '+varname+'='+EmitScript(script)+';\n');
                scriptsUsed.push({script, varname});
                return varname;
            }
            return EmitScript(script);
        }
    
        function EmitScript(script){
            function EmitParams(){
                var result = '';
                for(var i=0;i<script.inputs.length;i++){
                    result+=CreateVariableToEmit(script.inputs[i]);
                    if(i<script.inputs.length-1){
                        result+=',';
                    }
                }
                return result;
            }
            var type = script.type;
            if(type == 'Root'){
                var result = '';
                for(var i of script.inputs){
                    result+=CreateVariableToEmit(i)+';\n';
                }
                return result;
            }
            else if(type == 'number'){
                return script.value;
            }
            else if(type == 'text'){
                return '"'+script.value+'"';
            }
            else if(binaryOps.includes(type)){
                return '('+CreateVariableToEmit(script.inputs[0]) + type + CreateVariableToEmit(script.inputs[1])+')';
            }
            else if(type == '[]'){
                return '['+EmitParams()+']';
            }
            else if(type == '=>'){
                return '('+script.inputs[0].value+')=>{return '+CreateVariableToEmit(script.inputs[1])+';}';
            }
            else if(type == '...'){
                return '...'+CreateVariableToEmit(script.inputs[0]);
            }
            else if(type == 'GetVariable'){
                return script.value;
            }
            else{
                var func = functions.find(f=>f.name == type);
                if(func){
                    if(!functionsUsed.includes(func)){
                        functionsUsed.push(func);
                    }
                    return func.name+'('+EmitParams()+')';
                }
                else{
                    throw 'Cant find type: '+type;
                }
            }
        }
        var emittedCode = EmitScript(root);        
        var funcsCode = '';
        for(var f of functionsUsed){
            funcsCode += 'function '+f.name+'('+EmitArgs(f)+'){\n'+f.code+'}\n';
        }
        var emittedVariables = '';
        for(var v of variables){
            emittedVariables+=v;
        }
        return funcsCode + emittedVariables + emittedCode;
    }
    var code = Emit();
    updateFunc = new Function('ctx', 'frame', code);
}

function ReplaceScript(type, value, numinputs){
    selected.type = type;
    selected.value = value;
    selected.inputs = [];
    for(var i=0;i<numinputs;i++){
        selected.inputs.push({type:'?'});
    }
    selected = FindSelected(root);
}

function JArray(...inputs){
    return inputs;
}

function ContainsRect(x,y,w,h,px,py){
    return px>x && py>y && (px<x+w) && (py<y+h);
}

function Resize(){
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
}

function MouseDown(){
    var script = FindScript();
    if(script){
        dragFromScript = script;
    }
    else{
        mousedragging = true;
    }
}

function MouseUp(){
    if(dragFromScript){
        var script = FindScript();
        if(script){
            var dragToScript = script;
            if(dragFromScript.type == '?'){
                for(var p of dragFromScript.parents){
                    var index = p.inputs.findIndex(i=>dragFromScript==i);
                    p.inputs[index] = dragToScript;
                }
            }
            dragFromScript = undefined;
        }
    }
    mousedragging = false;
}

function MouseMove(e){
    if(mousedragging){
        deltax-=mouseposx - e.clientX;
        deltay-=mouseposy - e.clientY;
    }
    mouseposx = e.clientX;
    mouseposy = e.clientY;
}

function RemoveUnnecessaryFieldsInScript(script){
    var newScript = {type:script.type};
    if(script.value){
        newScript.value = script.value;
    }
    if(script.inputs){
        newScript.inputs = script.inputs.map(s=>RemoveUnnecessaryFieldsInScript(s));
    }
    return newScript;
}

function FileLoader(rect, oninput){
    function ReadFileContents(){
        var file = input.files[0]
        var reader = new FileReader()
        reader.onload = function() {
            oninput(reader.result);
        }
        reader.readAsText(file)
    }
    var input = document.createElement('input');
    input.type = 'file';
    input.style.position = 'absolute';
    input.style.left = rect.x;
    input.style.top = rect.y;
    input.style.width = rect.width;
    input.style.height = rect.height;
    input.oninput = ReadFileContents;
    return input;
}

function SaveFile(filename, text){
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function Save(){
    SaveFile('file.json', JSON.stringify(RemoveUnnecessaryFieldsInScript(root)));
}

function FindScript(){
    var scripts = FindAllScripts();
    for(var s of scripts){
        if(ContainsRect(s.x+deltax, s.y+deltay, 100, 30, mouseposx, mouseposy)){
            return s;
        }
    }
}

function Update(){
    Draw();
    if(updateFunc){
        updateFunc(ctx, frame);
    }
    frame++;
    requestAnimationFrame(Update);
}

function KeyDown(e){
    if(e.ctrlKey){
        if(e.key == '='){
            var s = FindScript();
            if(s && (s.type == '[]' || s.type == 'Root')){
                s.inputs.push({type:'?'});
                selected = FindSelected(root);
            }
        }
        else if(e.key == 'r'){
            Run();
            return;
        }
        else if(e.key == 'Backspace'){
            var s = FindScript();
            if(s){
                selected = s;
                ReplaceScript('?', undefined, 0);
            }
        }
        else if(e.key == 's'){
            Save();
        }
        else if(e.key == 'Enter'){
            var s = FindScript();
            if(s){
                if(functions.find(f=>f.name == text)){
                    s.type = text;
                }
                else if(binaryOps.includes(text)){
                    s.type = text;
                }
            }
        }
        else if(e.key == 'i'){
            var index = parseInt(text);
            text = '';
            var s = FindScript();
            if(s && (s.type == '[]' || s.type == 'Root')){
                s.inputs.splice(index, 0, {type:'?'});
            }
        }
    }
    else{
        if(e.key == 'Enter'){
            var func = functions.find(f=>f.name == text);
            if(func){
                ReplaceScript(func.name, undefined, func.args.length);
            }
            else if(text.length>1 && text[0] == '"' && text[text.length-1] == '"'){
                ReplaceScript('text', text.substring(1, text.length-1), 0);
            }
            else if(IsDigit(text[0])){
                ReplaceScript('number', text, 0);
            }
            else if(binaryOps.includes(text)){
                ReplaceScript(text, undefined, 2);
            }
            else if(text == '[]'){
                ReplaceScript('[]', undefined, 0);
            }
            else if(text == '=>'){
                ReplaceScript('=>', undefined, 2);
            }
            else if(text == '...'){
                ReplaceScript('...', undefined, 1);
            }
            else{
                ReplaceScript('GetVariable', text, 0);
            }
            text = '';
        }
        else if(e.key.length == 1){
            text+=e.key;
        }
        else if(e.key == 'Backspace'){
            text = text.substring(0, text.length-1);
        }
    }
    
}

Awake();
addEventListener('mousedown', MouseDown);
addEventListener('mouseup', MouseUp);
addEventListener('keydown', KeyDown);
addEventListener('mousemove', MouseMove);
addEventListener('resize', Resize);
document.body.appendChild(FileLoader({x:0,y:0,width:150,height:25}, f=>{root = JSON.parse(f);}));
Update();