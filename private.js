function Counter() {
  var count = 0;
  var interval;

  this.startCounter = function() {
    count = 0;
    interval = setInterval(function() {
      count++;
    }, 1000);
  };

  this.continueCounter = function() {
    interval = setInterval(function() {
      count++;
    }, 1000);
  };

  this.stopCounter = function() {
    clearInterval(interval);
  };

  this.clearCounter = function() {
    count = 0;
    clearInterval(interval);
  };

};

var counter = new Counter();
