/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useRef, useState} from 'react';
import {Alert, Dimensions, Platform, StyleSheet} from 'react-native';
import {
  Camera,
  PhotoFile,
  runAsync,
  runAtTargetFps,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {Svg, Polygon} from 'react-native-svg';
import * as DBR from 'vision-camera-dynamsoft-barcode-reader';
import {Worklets, useSharedValue} from 'react-native-worklets-core';
import {sleep} from '../Utils';

export interface ScannerProps{
  onScanned?: (photo:PhotoFile|null) => void;
}

export interface ScanRegion {
  left:number,
  width:number,
  top:number,
  height:number
}

function Scanner(props:ScannerProps): React.JSX.Element {
  const takenShared = useSharedValue(false);
  const camera = useRef<Camera|null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [viewBox, setViewBox] = useState('0 0 1080 1920');
  const [frameWidth,setFrameWidth] = useState(1280);
  const [frameHeight,setFrameHeight] = useState(720);
  const [barcodeResults, setBarcodeResults] = useState([] as DBR.TextResult[]);
  const [scanRegions,setScanRegions] = useState([] as ScanRegion[]);
  const device = useCameraDevice('back');
  const cameraFormat = useCameraFormat(device, [
    { videoAspectRatio: 16 / 9 },
    { photoAspectRatio: 16 / 9 },
    { videoResolution: { width: 1920, height: 1080 } },
    { fps: 25 },
  ]);
  const photoTaken = useRef(false);

  const adaptScanRegionBasedOnFrameSize = () => {
    //A5: 140x210mm
    console.log("adaptScanRegionBasedOnFrameSize")
    let size = getFrameSize();
    let width = size[0];
    let height = size[1];
    let regionWidth = 0.8*size[0];
    let desiredRegionHeight = regionWidth/(140/210);
    let regionHeightPercent = desiredRegionHeight/size[1];
    let topLeftRegion:ScanRegion = {
      left: 0.1*width,
      width: 0.8*width*0.3,
      top: 0.1*height,
      height: 0.8*width*0.3
    }
    let topRightRegion:ScanRegion = {
      left: 0.9*width - 0.8*width*0.3,
      width: 0.8*width*0.3,
      top: 0.1*height,
      height: 0.8*width*0.3
    }
    let bottomRightRegion:ScanRegion = {
      left: 0.9*width - 0.8*width*0.3,
      width: 0.8*width*0.3,
      top: 0.1*height + regionHeightPercent*height - 0.8*width*0.3,
      height: 0.8*width*0.3
    }
    let bottomLeftRegion:ScanRegion = {
      left: 0.1*width,
      width: 0.8*width*0.3,
      top: 0.1*height + regionHeightPercent*height - 0.8*width*0.3,
      height: 0.8*width*0.3
    }
    let regions = [topLeftRegion,topRightRegion,bottomRightRegion,bottomLeftRegion];
    console.log(regions);
    setScanRegions(regions);
  }

  useEffect(() => {
    adaptScanRegionBasedOnFrameSize();
  }, [viewBox]);
  

  const getFrameSize = () => {
    let width, height;
    width = frameWidth;
    height = frameHeight;
    if (frameWidth>frameHeight){
      if (Dimensions.get('window').width>Dimensions.get('window').height) {
        width = frameWidth;
        height = frameHeight;
      }else{
        console.log("Has rotation");
        width = frameHeight;
        height = frameWidth;
      }
    }else if (frameWidth<frameHeight) {
      if (Dimensions.get('window').width<Dimensions.get('window').height) {
        width = frameWidth;
        height = frameHeight;
      }else{
        console.log("Has rotation");
        width = frameHeight;
        height = frameWidth;
      }
    }
    return [width, height];
  };

  const updateViewBox = () => {
    const frameSize = getFrameSize();
    setViewBox('0 0 ' + frameSize[0] + ' ' + frameSize[1]);
    console.log('viewBox' + viewBox);
  };

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      setIsActive(true);
    })();
  }, []);


  const takePhoto = async () => {
    console.log('should take photo');
    if (camera.current && photoTaken.current === false) {
      console.log('take photo');
      photoTaken.current = true;
      takenShared.value = true;
      await sleep(100);
      const photo = await camera.current.takePhoto();
      if (photo) {
        setIsActive(false);
        if (props.onScanned) {
          props.onScanned(
            photo
          );
        }
      }else{
        Alert.alert('','Failed to take a photo');
      }
    }
  };

  const updateFrameSize = (width:number,height:number) => {
    if (width != frameWidth) {
      setFrameWidth(width);
      setFrameHeight(height);
    }
  }
  const updateFrameSizeJS = Worklets.createRunOnJS(updateFrameSize);
  const convertAndSetBarcodeResults = (results:Record<string,DBR.TextResult>) => {
    const converted:DBR.TextResult[] = [];
    for (let index = 0; index < Object.keys(results).length; index++) {
      const key = Object.keys(results)[index];
      converted.push(results[key]);
    }
    setBarcodeResults(converted);
  }
  const convertAndSetBarcodeResultsJS = Worklets.createRunOnJS(convertAndSetBarcodeResults);
  useEffect(() => {
    updateViewBox();
  }, [frameWidth,frameHeight]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (takenShared.value == false) {
      runAsync(frame, () => {
        'worklet';
        updateFrameSizeJS(frame.width,frame.height)
        try {
          const results = DBR.decode(frame);
          console.log(results);
          if (results) {
            convertAndSetBarcodeResultsJS(results);
          }
        } catch (error) {
          console.log(error);
        }
      });
    }
    
  }, []);

  const getPointsData = (lr:DBR.TextResult) => {
    var pointsData = lr.x1 + "," + lr.y1 + " ";
    pointsData = pointsData+lr.x2 + "," + lr.y2 +" ";
    pointsData = pointsData+lr.x3 + "," + lr.y3 +" ";
    pointsData = pointsData+lr.x4 + "," + lr.y4;
    return pointsData;
  }

  const getPointsDataFromRegion = (region:ScanRegion) => {
    var pointsData = region.left + "," + region.top + " ";
    pointsData = pointsData + (region.left+region.width) + "," + region.top +" ";
    pointsData = pointsData + (region.left+region.width) + "," + (region.top+region.height) +" ";
    pointsData = pointsData + region.left + "," + (region.top+region.height);
    return pointsData;
  }
  
  return (
    <>
      {device && hasPermission && (
        <>
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isActive}
            format={cameraFormat}
            photo={true}
            frameProcessor={frameProcessor}
            pixelFormat="yuv"
            resizeMode='contain'
          />
          <Svg
            style={StyleSheet.absoluteFill}
            preserveAspectRatio='xMidYMid slice'
            viewBox={viewBox}>
            {barcodeResults.map((barcode, idx) => (
              <Polygon key={"poly-"+idx}
                points={getPointsData(barcode)}
                fill="lime"
                stroke="green"
                opacity="0.5"
                strokeWidth="1"
              />
            ))}
            {scanRegions.map((region, idx) => (
              <Polygon key={"region-"+idx}
                points={getPointsDataFromRegion(region)}
                fill="transparent"
                stroke="red"
                opacity="0.5"
                strokeWidth="3"
              />
            ))}
          </Svg>
        </>
      )}
    </>
  );
}

export default Scanner;
