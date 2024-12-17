/* scripts/audio.js */

let audioContext;
let kickBuffer;
let kickSource;
let delayNode;
let kickGainNode;
let delayGainNode;
let feedbackGainNode;

function getAudioContext(){
    return audioContext;
}

async function initializeAudio(){
    audioContext = new AudioContext();
    try {
      const response = await fetch('./assets/audio/kick.wav');
      const arrayBuffer = await response.arrayBuffer();
      kickBuffer = await audioContext.decodeAudioData(arrayBuffer);
       delayNode = audioContext.createDelay(5.0);
        kickGainNode = audioContext.createGain();
         delayGainNode = audioContext.createGain();
         feedbackGainNode = audioContext.createGain();
        kickGainNode.gain.value = 0.8; // set a default volume
        delayGainNode.gain.value = 0.8; // set a default volume
         feedbackGainNode.gain.value = 0; // set a default feedback volume
    } catch(error) {
        console.error('Error loading kick sample: ', error);
    }
  }

function setKickPulse(bpm, subdivisionFactor, delayActive) {
      const beatDuration = 60000 / bpm;
      const interval = beatDuration * subdivisionFactor/1000; // Convert ms to seconds
      const delayTime = beatDuration * subdivisionFactor/1000;
       delayNode.delayTime.value = delayTime;

      kickSource = audioContext.createBufferSource();
      kickSource.buffer = kickBuffer; // kick sample
      kickSource.loop = true;
       kickSource.connect(kickGainNode);

      if (delayActive) {
         kickGainNode.connect(delayNode);
         delayNode.connect(feedbackGainNode);
          feedbackGainNode.connect(delayGainNode);
         delayGainNode.connect(audioContext.destination);
         feedbackGainNode.connect(delayNode);
        } else {
            kickGainNode.connect(audioContext.destination);
        }

      kickSource.start(0);

       kickSource.onended = () => {
         kickSource = null; // Clear the kickSource when it has ended.
     };
}

function setDelay(subdivisionFactor){
     const beatDuration = 60000 / bpm;
      const delayTime = beatDuration * subdivisionFactor/1000;
     delayNode.delayTime.value = delayTime;
}

function setKickGain(gain){
    kickGainNode.gain.value = gain;
}

function setDelayGain(gain){
    delayGainNode.gain.value = gain;
}

function setFeedback(gain){
    feedbackGainNode.gain.value = gain;
}

function stopKickPulse(){
   if(kickSource) {
     kickSource.stop();
   }
 }

 export {initializeAudio, setKickPulse, stopKickPulse, getAudioContext, setDelay, setKickGain, setDelayGain, setFeedback };