var _context = new AudioContext();
/**
 * @type {MediaElementAudioSourceNode}
 */
var _src;
/**
 * @type {AnalyserNode}
 */
var analyser;
if (document.getElementById("musicObject")) {
  _src = _context.createMediaElementSource(document.getElementById("musicObject"));
  analyser = _context.createAnalyser();
  _src.connect(analyser);
  analyser.connect(_context.destination);
  // clearInterval(_contextSrcInterval);
}
// var _contextSrcInterval = setInterval(function () {
// }, 0);

var avg = 0;
var avgSec = 0;
var visualizerActive = false;
var dim = 0;
function Visualizer() {
  dim = Settings.current.backgroundDim;
  if (!document.getElementById("musicObject")) {
    return console.error("musicObject doesn't exist");
  }
  if (visualizerActive) {
    return;
  }
  visualizerActive = true;
  let audio = document.getElementById("musicObject");
  /**
   * @type {HTMLCanvasElement}
   */
  var canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext("2d");

  analyser.fftSize = 512;

  var bufferLength = analyser.frequencyBinCount;
  //console.log(bufferLength);

  var dataArray = new Uint8Array(bufferLength);

  var WIDTH = canvas.width;
  var HEIGHT = canvas.height;

  var barWidth = (WIDTH / bufferLength) * 2.5;
  var barHeight;
  var x = 0;

  function renderFrame() {
    requestAnimationFrame(renderFrame);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    x = 0;
    dim = +dim;
    if (avg > 65) {
      if (dim > +Settings.current.backgroundDim-(+avg - 70)) {
        dim -= 1;
      }
      if (dim < +Settings.current.backgroundDim-(+avg - 70)) {
        dim += 1;
      }
    }
    else {
      if (dim < +Settings.current.backgroundDim) {
        dim += 2;
      }
      if (dim > +Settings.current.backgroundDim) {
        dim -= 1;
      }
    }

    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = "rgba(0, 0, 0, "+(dim/100)+")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    var intensity = Settings.current.visualizerIntensity/10;
    if (Settings.current.visualizer) {
      avg = 0;
      for (var i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i]*intensity-(10*intensity));
        
        var r = VisualizerProperties.r;
        var g = VisualizerProperties.g;
        var b = VisualizerProperties.b;
        
        ctx.fillStyle = "rgba(" + r + "," + g + "," + b + ", " + 0.3 + ")";
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
        avg += dataArray[i];
      }
      avg /= bufferLength;
      // console.log(avg);
      avgSec += avg;
      avg -= Settings.current.volume*0.5;
      // console.log(avg);
    }
    else {
      ctx.fillStyle = "rgba(0, 0, 0, "+(Settings.current.backgroundDim/100)+")";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }
  setInterval(() => {
    // console.log(avgSec);
    avgSec = 0;
  }, 1000);
  audio.play();
  renderFrame();
}
