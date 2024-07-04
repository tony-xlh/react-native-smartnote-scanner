import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Button,
  View,
  Text,
  BackHandler,
  Image,
  Alert,
} from 'react-native';
import * as DBR from 'vision-camera-dynamsoft-barcode-reader';
import * as DDN from 'vision-camera-dynamsoft-document-normalizer';
import Scanner from './components/Scanner';
import ResultViewer from './components/ResultViewer';
import { PhotoFile } from 'react-native-vision-camera';


function App(): React.JSX.Element {
  const [isScanning, setIsScanning] = useState(false);
  const [isShowResultViewer, setIsShowResultViewer] = useState(false);
  const [isShowMain, setIsShowMain] = useState(true);
  const [scanningResult,setScanningResult] = useState<any>();
  
  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', function () {
      if (!isScanning) {
        /**
         * When true is returned the event will not be bubbled up
         * & no other back action will execute
         */
        setIsScanning(false);
        setIsShowMain(true);
        return true;
      }
      /**
       * Returning false will let the event to bubble up & let other event listeners
       * or the system's default back action to be executed.
       */
      return false;
    });
    (async () => {
      const DBRLicenseResult = await DBR.initLicense(
        'DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAwMjI3NzYzLVRYbE5iMkpwYkdWUWNtOXFYMlJpY2ciLCJtYWluU2VydmVyVVJMIjoiaHR0cHM6Ly9tbHRzLmR5bmFtc29mdC5jb20iLCJvcmdhbml6YXRpb25JRCI6IjEwMDIyNzc2MyIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NsdHMuZHluYW1zb2Z0LmNvbSIsImNoZWNrQ29kZSI6MTQzODIxODMzfQ==',
      );
      const DDNLicenseResult = await DDN.initLicense(
        'DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAwMjI3NzYzLVRYbE5iMkpwYkdWUWNtOXEiLCJtYWluU2VydmVyVVJMIjoiaHR0cHM6Ly9tbHRzLmR5bmFtc29mdC5jb20iLCJvcmdhbml6YXRpb25JRCI6IjEwMDIyNzc2MyIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NsdHMuZHluYW1zb2Z0LmNvbSIsImNoZWNrQ29kZSI6LTM5MDUxMjkwOH0=',
      );
      console.log(DBRLicenseResult);
      console.log(DDNLicenseResult);
      if (DBRLicenseResult == false) {
        Alert.alert("","Dynamsoft Barcode Reader's License Invalid");
      }
      if (DDNLicenseResult == false) {
        Alert.alert("","Dynamsoft Document Normalizer's License Invalid");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onScanned = async (photo:PhotoFile,detectionResult:DDN.DetectedQuadResult) => {
    setIsScanning(false);
    setScanningResult({
      detectionResult:detectionResult,
      photoPath:photo.path
    })
    setIsShowResultViewer(true);
  };

  const onBack = () => {
    setIsShowResultViewer(false);
    setIsShowMain(true);
  }

  const startScanning = () => {
    setIsScanning(true);
    setIsShowMain(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      {isShowMain && (
        <View style={styles.main}>
          <Text style={styles.title}>
            SmartNote Scanner
          </Text>
          <Button title="Start Scanning" onPress={() => {startScanning()}} />
        </View>
      )}
      {isScanning && <Scanner onScanned={(photo,detectionResult)=> onScanned(photo,detectionResult)} />}
      {isShowResultViewer && <ResultViewer result={scanningResult} onBack={()=>{onBack()}} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  main: {
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginVertical: 8,
  },
  scannedLbl:{
    marginTop: 8,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 320,
    resizeMode: 'contain',
  },
});

export default App;
