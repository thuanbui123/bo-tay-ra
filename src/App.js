import './App.css';
import React, { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import soundURL from './assets/hey_sondn.mp3';
import {initNotifications, notify} from '@mycv/f8-notification';
const tf = require('@tensorflow/tfjs');
const mobilenetModule = require('@tensorflow-models/mobilenet');
const knnClassifier = require('@tensorflow-models/knn-classifier');

var sound = new Howl({
  src: [soundURL]
});

const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIME = 50;
const TOUCHED_CONFIDENCE = 0.8;

function App() {

  const video = useRef();
  const classifier = useRef();
  // const mobilenetModules = useRef();
  const canPlaySound = useRef(true);
  const [touched, setTouched] = useState(false);

  const init = async () => {
    console.log('init...');
    await setupCamera();
    console.log('succes');

    classifier.current = knnClassifier.create();

    mobilenetModule.current = await mobilenetModule.load();

    console.log('setup done');
    console.log('Không chạm tay lên mặt và bấm Train 1')

    initNotifications({ cooldown: 3000 });
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

        if (navigator.getUserMedia) {
          navigator.getUserMedia(
            {video: true},
            stream => {
              video.current.srcObject = stream;
              video.current.addEventListener('loadeddata', resolve);
            },
            error => reject(error)
          );
        } else {
          reject();
        }
    });
  }

  const train = async label => {
    console.log(`[${label}] Đang train cho máy mặt đẹp trai của bạn...`)
    for (let i = 0; i < TRAINING_TIME; ++i) {
      console.log(`Progress ${parseInt((i+1) / TRAINING_TIME *100)}%`)
      
      await training(label);
    }
    console.log(label);
  }

  const training = label => {
    return new Promise (async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  }

  const run = async() => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass (embedding);

    if (
      result.label === TOUCHED_LABEL && 
      result.confidences[result.label] > TOUCHED_CONFIDENCE) 
      {
        console.log('Touched');
        if (canPlaySound.current) {
          canPlaySound.current = false
          sound.play();
        }
        notify('Bỏ tay ra', { body: 'Bạn vừa chạm tay vào mặt!' });
        setTouched(true);
    } else {
      console.log('Not_Touch');
      setTouched(false);
    }

    await sleep(200);

    run();
  }

  const sleep = (ms = 0) =>{
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect (() => {
    init();

    sound.on ('end', function () {
      canPlaySound.current = true;
    })
    //cleanup
    return () => {

    }
  }, []);

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <video 
      ref={video}
      className='video'
      autoPlay
      />

      <div className='control'>
        <button className='btn notTouch' onClick = {() => train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button className='btn Touched' onClick = {() => train(TOUCHED_LABEL)}>Train 2</button>
        <button className='btn run' onClick = {() => run()}>Run</button>
      </div>
    </div>
  );
}

export default App;
