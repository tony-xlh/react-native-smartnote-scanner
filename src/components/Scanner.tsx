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
import { getTemplate } from '../TemplateUtils';
import { DetectedQuadResult, Point } from 'vision-camera-dynamsoft-document-normalizer';

export interface ScannerProps{
  onScanned?: (photo:PhotoFile,results:DetectedQuadResult) => void;
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
  const [frameWidth,setFrameWidth] = useState(1920);
  const [frameHeight,setFrameHeight] = useState(1080);
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
    const template = getTemplate({scanRegions:regions,rotated:hasRotation()});
    console.log(template);
    DBR.initRuntimeSettingsFromString(template);
    setScanRegions(regions);
  }

  useEffect(() => {
    adaptScanRegionBasedOnFrameSize();
  }, [viewBox]);
  

  const getFrameSize = () => {
    let width, height;
    width = frameWidth;
    height = frameHeight;
    if (hasRotation()) {
      width = frameHeight;
      height = frameWidth;
    }
    return [width, height];
  };

  const hasRotation = () => {
    let rotated = false;
    if (frameWidth>frameHeight){
      if (Dimensions.get('window').width<=Dimensions.get('window').height) {
        console.log("Has rotation");
        rotated = true;
      }
    }else if (frameWidth<frameHeight) {
      if (Dimensions.get('window').width>=Dimensions.get('window').height) {
        console.log("Has rotation");
        rotated = true;
      }
    }
    return rotated;
  }

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


  const takePhoto = async (results:DBR.TextResult[]) => {
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
            photo,
            convertBarcodeResultsToDetectionResult(results,photo)
          );
        }
      }else{
        Alert.alert('','Failed to take a photo');
      }
    }
  };

  const scaledPointValue = (value:number,isHeight:boolean,photoWidth:number,photoHeight:number) => {
    console.log("scaledPointValue")
    console.log(getFrameSize())
    console.log(photoWidth)
    console.log(photoHeight)
    let frameW = getFrameSize()[0];
    let frameH = getFrameSize()[1];
    if (frameW<frameH && photoWidth>photoHeight) {
      let temp = photoWidth;
      photoWidth = photoHeight;
      photoHeight = temp;
    }
    if (isHeight) {
      return Math.ceil(value / (frameH / photoHeight));
    }else{
      return Math.ceil(value / (frameW / photoWidth));
    }
  };

  const convertBarcodeResultsToDetectionResult = (results:DBR.TextResult[],photo:PhotoFile):DetectedQuadResult => {
    let sorted = sortedResults(results);
    for (let index = 0; index < sorted.length; index++) {
      const result = sorted[index];
      result.x1 = scaledPointValue(result.x1,false,photo.width,photo.height);
      result.x2 = scaledPointValue(result.x2,false,photo.width,photo.height);
      result.x3 = scaledPointValue(result.x3,false,photo.width,photo.height);
      result.x4 = scaledPointValue(result.x4,false,photo.width,photo.height);
      result.y1 = scaledPointValue(result.y1,true,photo.width,photo.height);
      result.y2 = scaledPointValue(result.y2,true,photo.width,photo.height);
      result.y3 = scaledPointValue(result.y3,true,photo.width,photo.height);
      result.y4 = scaledPointValue(result.y4,true,photo.width,photo.height);
    }
    let point1 = {x:sorted[0].x3,y:sorted[0].y3};
    let point2 = {x:sorted[1].x1,y:sorted[1].y4};
    let point3 = {x:sorted[2].x1,y:sorted[2].y1};
    let point4 = {x:sorted[3].x2,y:sorted[3].y1};
    let points:[Point,Point,Point,Point] = [point1,point2,point3,point4];
    let detectionResult:DetectedQuadResult = {
      confidenceAsDocumentBoundary: 90,
      location: {
        points: points
      },
      area: 0
    }
    console.log(points)
    return detectionResult;
  }

  const sortedResults = (results:DBR.TextResult[]):DBR.TextResult[] => {
    let size = getFrameSize();
    let width = size[0];
    let height = size[1];
    let centerX = width/2;
    let centerY = height/2;
    let topLeftResult;
    let topRightResult;
    let bottomRightResult;
    let bottomLeftResult;
    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      if (result.x1 - centerX < 0 && result.y1 - centerY < 0) {
        topLeftResult = result;
      }else if (result.x1 - centerX > 0 && result.y1 - centerY < 0) {
        topRightResult = result;
      }else if (result.x1 - centerX > 0 && result.y1 - centerY > 0) {
        bottomRightResult = result;
      }else if (result.x1 - centerX < 0 && result.y1 - centerY > 0) {
        bottomLeftResult = result;
      }
    }
    return [topLeftResult,topRightResult,bottomRightResult,bottomLeftResult] as DBR.TextResult[];
  }

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
    console.log("barcodes count:"+converted.length);
    if (converted.length == 4) {
      takePhoto(converted);
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
      runAtTargetFps(5, () => {
        'worklet';
        updateFrameSizeJS(frame.width,frame.height)
        try {
          const results = DBR.decode(frame,{rotateImage:false,isFront:false,templateName:"MultiRegions"});
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
