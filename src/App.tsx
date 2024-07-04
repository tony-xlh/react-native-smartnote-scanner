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
import { PhotoFile } from 'react-native-vision-camera';
import { DetectedQuadResult } from 'vision-camera-dynamsoft-document-normalizer';

function App(): React.JSX.Element {
  const [photoBase64, setPhotoBase64] = useState<string|undefined>();
  const [isScanning, setIsScanning] = useState(false);
  const [barcodeText, setBarcodeText] = useState("");
  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', function () {
      if (!isScanning) {
        /**
         * When true is returned the event will not be bubbled up
         * & no other back action will execute
         */
        setIsScanning(false);
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
  const onScanned = async (photo:PhotoFile|null,points?:DDN.Point[]|null) => {
    setIsScanning(false);
    console.log('onScanned');
    console.log(photo);
  };
  return (
    <SafeAreaView style={styles.container}>
      {!isScanning && (
        <View style={styles.main}>
          <Text style={styles.title}>
            SmartNote Scanner
          </Text>
          <Button title="Start Scanning" onPress={() => setIsScanning(true)} />
          {photoBase64 && (
            <>
              <Text style={styles.scannedLbl}>
                Scanned:
              </Text>
              <Text ellipsizeMode='tail' style={{maxHeight:150}} >
                {barcodeText}
              </Text>
              <Image
                style={styles.image}
                source={{
                  uri: 'data:image/jpeg;base64,' + photoBase64,
                }}
              />
            </>
          )}
        </View>
      )}
      {isScanning && <Scanner onScanned={(photo)=> onScanned(photo)} />}
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
