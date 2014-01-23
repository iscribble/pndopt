/**
 * 
 */
//Utility function to search for location in an array.
function locationOf(element, array, comparer, start, end) {
    if (array.length === 0)
        return -1;

    start = start || 0;
    end = end || array.length;
    var pivot = (start + end) >> 1;  //round down to even number

    var c = 0;
    if (element.compareTo && typeof element.compareTo == "function") {
      c = element.compareTo(array[pivot]);
    } else if (typeof comparer == "function") {
      c = comparer(element, array[pivot]);
    }
    if (end - start <= 1) return c == -1 ? pivot - 1 : pivot;

    switch (c) {
        case -1: return locationOf(element, array, comparer, start, pivot);
        case 0: return pivot;
        case 1: return locationOf(element, array, comparer, pivot, end);
    };
}

/**
 * Testing - to test runtime of a function, simply call beginTest() at the beginning and endTest() near the return.
 * An optional identifier (name) is available as an argument for both genin and end.
 * To view results, call printTestResults() from the console.
 */
var testResults = [], testMetrics = [];
function beginTest(name) {
	var myName = name, special = true;
	if (typeof name == "undefined") {
		special = false;
		myName = arguments.callee.caller.name;
		//myName = arguments.callee.toString();
		//myName = myName.substr('function '.length);
		//myName = myName.substr(0, myName.indexOf('('));
	}
	testMetrics.push({name:myName, start:new Date().getTime(), end:0, named:special});
}

function endTest(name) {
	var metric, tmxsCount = testMetrics.length, finishTime = new Date().getTime();
	if (typeof name == "undefined") {
		//99.9% of the time, it's going to be safe to pop so let's.
		metric = testMetrics.pop();
		
		if (metric.named) {
			//oops, put it back and find the index
			testMetrics.push(metric);
			console.log("Popped a named metric and put it back.");
			
			//find index of last unnamed test
			var tmxIdx = tmxsCount-1; //zero-indexed
			while (testMetrics[tmxIdx].named && tmxIdx >= 0) {
				tmxIdx--;
			}
			//We're going to put the named metrics at beginning of testMetrics array.
			//Use splice to pop end off of array
			var tmpArry = testMetrics.splice(tmxIdx,tmxsCount-tmxIdx);
			metric = tmpArry.shift(); //pop from front
			testMetrics = testMetrics.concat(tmpArry); //replace testMetrics
		}
	} else {
		for (var i=0; i<testMetrics.length; i++) {
			if (name == testMetrics[i].name) {
				metric = testMetrics.splice(i,1)[0];
				break;
			}
		}
	}
	metric.end = finishTime;
	testResults.push(metric);
	
}

function printTestResults(){
	var mergedNames = [];
	for (var i=0; i<testResults.length; i++) {
		if ($.inArray(testResults[i].name, mergedNames) < 0) {
			mergedNames.push(testResults[i].name);
			console.log("Execution time of function " + testResults[i].name + ": " + getAvgMetrics(testResults[i].name, testResults));
		}
	}
	testResults.length = 0;
}

function getAvgMetrics(fName, metricArray){
	var i, timeTotal = 0, matchingMetrics = [];
	for (i=0; i<metricArray.length; i++) {
		if (metricArray[i].name == fName) {
			matchingMetrics.push(metricArray[i]);
		}
	}
	
	for (i=0; i<matchingMetrics.length; i++) {
		timeTotal += (matchingMetrics[i].end - matchingMetrics[i].start);
	}
	
	i = matchingMetrics.length;
	if (i > 0) {
		timeTotal = timeTotal / matchingMetrics.length;
		if (i > 1) {
			return timeTotal + "ms (avg over " + i + " iterations)";
		}
		return timeTotal + "ms";
	}
	return "N/A";
}

//enable argument is optional, defaults to false; 
//  If set to true, el.selectstart will be re-enabled.
//namespace argument is optional, defaults to no namespace.
//  If provided, (and not "") then a namespace will be applied to
//  the selectstart event.
function disableSelection(el, namespace, enable){
  var ns="selectstart", en = enable || false;
  if (typeof namespace == "string" && namespace.length >0) {
    ns = "selectstart." + namespace;
  }
  if (!enable) {
    $(el).attr('unselectable','on')
     .css({'-moz-user-select':'-moz-none',
           '-moz-user-select':'none',
           '-o-user-select':'none',
           '-khtml-user-select':'none', /* you could also put this in a class */
           '-webkit-user-select':'none',/* and add the CSS class here instead */
           '-ms-user-select':'none',
           'user-select':'none'
     }).on(ns, function(){ return false; });
  } else {
    $(el).attr('unselectable','off')
     .css({'-moz-user-select':'text',
           '-moz-user-select':'text',
           '-o-user-select':'text',
           '-khtml-user-select':'text',
           '-webkit-user-select':'text',
           '-ms-user-select':'text',
           'user-select':'text'
     }).off(ns);
  }
}