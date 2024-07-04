import React, { useEffect, useState } from "react";
import { Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import * as DDN from "vision-camera-dynamsoft-document-normalizer";
import type { DetectedQuadResult } from "vision-camera-dynamsoft-document-normalizer";
import Share, { ShareOptions } from 'react-native-share';
import { TextResult } from "vision-camera-dynamsoft-barcode-reader";


export interface ResultViewerProps{
  result:{
    photoPath:string;
    results:TextResult[];
  }
  onBack?: () => void;
}


export default function ResultViewer(props:ResultViewerProps) {
  const [normalizedImagePath, setNormalizedImagePath] = useState<undefined|string>(undefined);

  useEffect(() => {
    console.log(props);
    normalize();
  }, []);

  const share = () => {
    console.log("save");
    let options:ShareOptions = {};
    options.url = "file://"+normalizedImagePath;
    Share.open(options);
  }

  const returnBack = () => {
    if (props.onBack) {
      props.onBack();
    }
  }

  const convertBarcodeResultsToDetectionResult = (results:TextResult[]):DetectedQuadResult => {
    let point1 = {x:results[0].x3,y:results[0].y3};
    let point2 = {x:results[1].x1,y:results[1].y3};
    let point3 = {x:results[2].x1,y:results[0].y1};
    let point4 = {x:results[0].x3,y:results[0].y1};
    let detectionResult:DetectedQuadResult = {
      confidenceAsDocumentBoundary: 90,
      location: {
        points: [point1,point2,point3,point4]
      },
      area: 0
    }
    return detectionResult;
  }

  const normalize = async () => {
    let templateName = "NormalizeDocument_Color";
    let detectionResult = convertBarcodeResultsToDetectionResult(props.result.results);
    let photoPath = props.result.photoPath;
    let normalizedImageResult = await DDN.normalizeFile(photoPath, detectionResult.location,{saveNormalizationResultAsFile:true},templateName);
    console.log(normalizedImageResult);
    if (normalizedImageResult.imageURL) {
      setNormalizedImagePath(normalizedImageResult.imageURL)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {normalizedImagePath && (
        <Image
          style={[StyleSheet.absoluteFill,styles.image]}
          source={{uri:"file://"+normalizedImagePath}}
        />
      )}
      <View style={styles.control}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={share} style={styles.button}>
            <Text style={{fontSize: 15, color: "black", alignSelf: "center"}}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={returnBack} style={styles.button}>
            <Text style={{fontSize: 15, color: "black", alignSelf: "center"}}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
  },
  control:{
    flexDirection:"row",
    position: 'absolute',
    bottom: 0,
    height: 100,
    width:"100%",
    alignSelf:"flex-start",
    alignItems: 'center',
  },
  radioContainer:{
    flex: 0.7,
    padding: 5,
    margin: 3,
  },
  buttonContainer:{
    flex: 0.3,
    padding: 5,
    margin: 3,
  },
  button: {
    backgroundColor: "ghostwhite",
    borderColor:"black", 
    borderWidth:2, 
    borderRadius:5,
    padding: 8,
    margin: 3,
  },
  image: {
    resizeMode:"contain",
  }
});