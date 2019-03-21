'use strict';

var chartCanvas = document.getElementById("tgCanvas");
var canvasWidth = chartCanvas.width;
var canvasHeight = chartCanvas.height;
var axisColor = "#ECF0F3"
var markXPosition = -1;
var markValues = [];

var ctx = chartCanvas.getContext("2d");

var ctxState = new CanvasState(chartCanvas);
var result = parseColumns(charts[0]);
createChartsSelectionRadioButtons();
createChartSelectionCheckboxes();
drawScene();

document.querySelector('[data-switch-contrast]').addEventListener('click', function() {
    document.body.classList.toggle('nightmode');
    drawScene();
});

function drawLine(ctx, startX, startY, endX, endY, color){
    ctx.beginPath();
    ctx.moveTo(startX,startY);
    ctx.lineTo(endX,endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function parseColumns(chart) {
    var result = [];
    result.names = chart.names
    for(var i = 0; i < chart.columns.length; i++) {
        var column = chart.columns[i];
        var axe = {};
        axe.name = column[0];
        var values = column.slice(1);
        axe.min = Math.min.apply(null, values);
        axe.max = Math.max.apply(null, values);
        axe.values = values;
        if (axe.name[0] === "x") {
            axe.slope = canvasWidth / (axe.max - axe.min);
        }
        else {
            axe.slope = canvasHeight / (axe.max - axe.min);
            axe.color = chart.colors[axe.name];
        }
        result.push(axe);
    }
    
    return result;
}

function createChartsSelectionRadioButtons() {
    for (var i = 0; i < charts.length; i++) {
        var buttonsDiv = document.getElementById("chartsSelectionRadiobuttonsGroup");
        
        var newRadioButton = document.createElement('input');
        newRadioButton.type = 'radio';
        newRadioButton.classList.add('radio');
        newRadioButton.id = 'chartRadio' + i;
        newRadioButton.name = 'chartsRadio';
        newRadioButton.value = i;
        if (i === 0) {
            newRadioButton.checked = true;
        }
        
        newRadioButton.onclick = function() {
            result = parseColumns(charts[this.value]);
            createChartSelectionCheckboxes();
            drawScene();
        };
        
        var label = document.createElement('label')
        label.htmlFor = newRadioButton.id;
        label.appendChild(document.createTextNode('chart# ' + (i+1)));
        
        buttonsDiv.appendChild(newRadioButton);
        buttonsDiv.appendChild(label);
    }
}

function createChartSelectionCheckboxes() {
    var buttonsDiv = document.getElementById("chartSelectionCheckboxGroup");
    while (buttonsDiv.firstChild) {
        buttonsDiv.removeChild(buttonsDiv.firstChild);
    }
    
    Object.keys(result.names).forEach(function(key) {
        var newCheckBox = document.createElement('input');
        newCheckBox.type = 'checkbox';
        newCheckBox.classList.add('checkbox');
        newCheckBox.id = key;
        newCheckBox.value = key;
        newCheckBox.checked = true;
        newCheckBox.onclick = function() {
            drawScene();
        };
        
        var label = document.createElement('label')
        label.htmlFor = newCheckBox.id;
        label.appendChild(document.createTextNode(result.names[key]));
        
        buttonsDiv.appendChild(newCheckBox);
        buttonsDiv.appendChild(label);
    });
}

function drawScene() {
    ctxState.valid = false;
}

function drawChart(data, x, y, width, height, isDrawAxis, fromX, toX) {
    var drawableCharts = {};
    Object.keys(data.names).forEach(function(key) {
        drawableCharts[key] = document.getElementById(key).checked;
    });
    
    var yBounds = {};
    for (var i=1; i < data.length; ++i) {
        if (drawableCharts[data[i].name]) {
            if (yBounds.yMin === undefined) {
                yBounds.yMin = data[i].min;
            }
            else if (data[i].min < yBounds.yMin) {
                yBounds.yMin = data[i].min;
            }
            if (yBounds.yMax === undefined) {
                yBounds.yMax = data[i].max;
            }
            else if (data[i].max > yBounds.yMax) {
                yBounds.yMax = data[i].max;
            }
        }
    }
    
    yBounds.slope = height / (yBounds.yMax - yBounds.yMin);
    var newSlopeX = width / (toX - fromX);
    
    if (isDrawAxis) {
        drawAxis(data[0].min + fromX / data[0].slope, data[0].min + toX / data[0].slope, yBounds.yMin, yBounds.yMax, height);
    }
    
    for (var i=1; i < data[0].values.length; ++i) {
        var points = {}
        points.x = [];
        points.y = [];
        
        var shift = 1;
        for (var j=0; j < data.length; ++j) {
            if(data[j].name === "x") {
                var x1 = data[j].slope * (data[j].values[i-1] - data[j].min)
                var x2 = data[j].slope * (data[j].values[i] - data[j].min)
                if (x1 < fromX || x2 > toX) {
                    continue;
                }

                var x1 = (data[j].slope * (data[j].values[i-1] - data[j].min) - fromX) * newSlopeX;
                var x2 = (data[j].slope * (data[j].values[i] - data[j].min) - fromX) * newSlopeX;

                points.x.push(x1);
                points.x.push(x2);

                if(markXPosition >= x1 && markXPosition <= x2 && isDrawAxis) {
                    markXPosition = x1;
                    markValues = [];
                    markValues.push({name: 'x', value: data[j].values[i-1]});
                    for (var k=0; k < data.length; ++k) {
                        if(data[k].name !== "x" && drawableCharts[data[k].name]) {
                            markValues.push({name: data.names[data[k].name], value: data[k].values[i-1], color: data[k].color});
                        }
                    }
                }
            }
            else if (drawableCharts[data[j].name]) {
                points.y.push([yBounds.slope * (data[j].values[i-1] - data[j].min), yBounds.slope * (data[j].values[i] - data[j].min), data[j].color]);
            }
        }
        
        
        if (points.y.length > 0) {
            for (var j=0; j < points.y.length; ++j) {
                drawLine(ctx, x + points.x[0], y + height - points.y[j][0], x + points.x[1], y + height - points.y[j][1], points.y[j][2]);
            }
        }
        
    }
}

function formatDate(date) {
    var monthNames = [
                "Jan", "Feb", "Mar",
                "Apr", "May", "Jun", "Jul",
                "Aug", "Sep", "Oct",
                "Nov", "Dec"
            ];
    
    var day = date.getDate();
    var monthIndex = date.getMonth();
    
    return monthNames[monthIndex] + ' ' + day;
}

function drawAxis(xMin, xMax, yMin, yMax, chartHeight) {
    var grid_count = 6
    var grid_size = chartHeight / grid_count;
    var x_axis_step = (xMax - xMin) / grid_count;
    var y_axis_step = (yMax - yMin) / grid_count;
    
    var num_lines_x = Math.floor(chartHeight/grid_size);
    var num_lines_y = Math.floor(canvasWidth/grid_size);
    
    for(var i=0; i<=num_lines_x; i++) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = axisColor;
        
        if(i == num_lines_x) {
            ctx.moveTo(0, grid_size*i);
            ctx.lineTo(canvasWidth, grid_size*i);
        }
        else {
            ctx.moveTo(0, grid_size*i+0.5);
            ctx.lineTo(canvasWidth, grid_size*i+0.5);
        }
        ctx.stroke();
    }
    
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--color-primary-dark')
    ctx.font = '13px Arial';
    ctx.textAlign = 'start';
    for(i = 1; i < num_lines_x; i++) {
        ctx.fillText(formatDate(new Date((xMin +x_axis_step*i))), canvasWidth / grid_count*i, chartHeight + 15);
    }
    
    for(i=1; i < num_lines_y; i++) {
        ctx.fillText((yMin + y_axis_step*i).toFixed(1), 8, chartHeight - grid_size*i - 2);
    }
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke == 'undefined') {
    stroke = true;
  }
  if (typeof radius === 'undefined') {
    radius = 5;
  }
  if (typeof radius === 'number') {
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
    var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }

}


function MarkOnChart(x, h) {
    this.x = x || 0;
    this.h = h || 0;
    this.visible = false;
}

MarkOnChart.prototype.draw = function(ctx) {
    if (this.visible) {

        var xShift = 10;
        if (this.x + 100 > canvasWidth) {
            xShift = -100;
        }

        drawLine(ctx, markXPosition, 0, markXPosition, this.h, axisColor);
        ctx. fillStyle = getComputedStyle(document.body).getPropertyValue('--color-primary-light');
        roundRect(ctx, this.x + 5 + xShift, 5, 90, 10 + markValues.length * 20, 5, true, true);

        for(var i=0; i < markValues.length; i++) {
            if (markValues[i].name === 'x') {
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--color-primary-dark');
                ctx.fillText(markValues[i].name + ": " + formatDate(new Date(markValues[i].value)), this.x + 10 + xShift, 20 + i * 20);
            }
            else {
                ctx.fillStyle = markValues[i].color;
                ctx.fillText(markValues[i].name + ": " + markValues[i].value, this.x + 10 + xShift, 20 + i * 20);
            }
        }
    }
}

function Shape(x, y, w, h, fill) {
    this.x = x || 0;
    this.y = y || 0;
    this.w = w || 1;
    this.h = h || 1;
    this.fill = fill || '#AAAAAA';
}

Shape.prototype.draw = function(ctx) {
    ctx.fillStyle = this.fill;
    ctx.fillRect(this.x, this.y, this.w, this.h);
}

Shape.prototype.contains = function(mx, my) {
    return  (this.x <= mx) && (this.x + this.w >= mx) &&
            (this.y <= my) && (this.y + this.h >= my);
}

function CanvasState(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext('2d');
    var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    if (document.defaultView && document.defaultView.getComputedStyle) {
        this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
        this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
        this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
        this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
    }
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;
    
    this.valid = false;

    var celectionColor = getComputedStyle(document.body).getPropertyValue('--color-selection')
    this.shape = new Shape(0, canvasHeight - 80, canvasWidth, 80, celectionColor);
    this.mainChartShape = new Shape(0, 0, canvasWidth, canvasHeight - 100);
    this.markOnChart = new MarkOnChart(0, this.mainChartShape.h)
    this.dragging = false;
    this.selection = null;
    this.dragoffx = 0;
    this.startx = 0;
    this.dragoffy = 0;
    this.dragoffw = 0;
    this.draggResizeLeft = false;
    this.draggResizeRight = false;
    
    var myState = this;
    
    canvas.addEventListener('mousedown', function(e) {
        var mouse = myState.getMouse(e);
        var mx = mouse.x;
        var my = mouse.y;
        if (myState.shape.contains(mx, my)) {
            var mySel = myState.shape;
            myState.startx = mx;
            myState.dragoffx = mx - mySel.x;
            myState.dragoffw = mySel.w;
            myState.dragging = true;
            myState.selection = mySel;
            myState.valid = false;
            return;
        }
        if (myState.selection) {
            myState.selection = null;
            myState.valid = false;
        }
    }, true);
    
    canvas.addEventListener('mousemove', function(e) {
        if (myState.dragging) {
            myState.markOnChart.visible = false;
            var mouse = myState.getMouse(e);
            
            if (myState.draggResizeLeft || mouse.x >= myState.selection.x && mouse.x <= myState.selection.x + 20) {
                myState.draggResizeLeft = true;
                var newWidth = myState.dragoffw - (mouse.x - myState.startx);
                if (newWidth < myState.width && newWidth > 100) {
                    myState.selection.w = newWidth;
                }
            }
            
            if (myState.draggResizeRight || mouse.x >= myState.selection.x + myState.selection.w - 20 && mouse.x <= myState.selection.x + myState.selection.w) {
                myState.draggResizeRight = true;

                var newWidth = myState.dragoffw - (myState.startx - mouse.x);
                if (newWidth < myState.width && newWidth > 100) {
                    myState.selection.w = newWidth;
                }
            }
            
            if (!myState.draggResizeRight) {
                if (mouse.x - myState.dragoffx >=0 && mouse.x - myState.dragoffx + myState.selection.w <= myState.width) {
                    myState.selection.x = mouse.x - myState.dragoffx;
                }
                else if (mouse.x - myState.dragoffx < 0) {
                    myState.selection.x = 0
                }
                else if (mouse.x - myState.dragoffx + myState.selection.w > myState.width) {
                    myState.selection.x = myState.width - myState.selection.w;
                }
            }
            
            myState.valid = false;
        }
    }, true);

    canvas.addEventListener('click', function(e) {
        var mouse = myState.getMouse(e);
        var contains = myState.mainChartShape.contains(mouse.x, mouse.y);
        if (contains) {
            markXPosition = mouse.x;
            myState.markOnChart.x = mouse.x;
            myState.markOnChart.visible = true;
            myState.valid = false;
        }
    }, true);
    
    canvas.addEventListener('mouseup', function(e) {
        myState.dragging = false;
        myState.draggResizeLeft = false;
        myState.draggResizeRight = false;
    }, true);
    canvas.addEventListener('mouseout', function(e) {
        myState.dragging = false;
        myState.draggResizeLeft = false;
        myState.draggResizeRight = false;
    }, true);
    
    this.interval = 30;
    setInterval(function() { myState.draw(); }, myState.interval);
}

CanvasState.prototype.clear = function() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

CanvasState.prototype.draw = function() {
    if (!this.valid) {
        var ctx = this.ctx;
        var shape = this.shape;
        var markOnChart = this.markOnChart;
        this.clear();
        
        drawChart(result, 0, 0, canvasWidth, canvasHeight - 100, true, shape.x, shape.x + shape.w);
        drawChart(result, 0, canvasHeight - 80, canvasWidth, 80, false, 0, canvasWidth);
        
        shape.draw(ctx);
        markOnChart.draw(ctx);
        
        this.valid = true;
    }
}

CanvasState.prototype.getMouse = function(e) {
    var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
    
    if (element.offsetParent !== undefined) {
        do {
            offsetX += element.offsetLeft;
            offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
    }
    
    offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
    offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;
    
    mx = e.pageX - offsetX;
    my = e.pageY - offsetY;
    
    return {x: mx, y: my};
}